import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Claude concurrency limiter ----
// Anthropic enforces a per-account concurrent-connections cap. With multiple
// reports running in parallel (each fanning out 8 prompts × 4 providers), naive
// Promise.all calls quickly exceed it and Claude returns 429 "Number of
// concurrent connections has exceeded your rate limit". Funnel every Claude
// request through a tiny semaphore + retry-with-backoff so other providers
// stay parallel but Claude is paced.
const CLAUDE_MAX_CONCURRENT = 2;
let claudeInFlight = 0;
const claudeWaiters: Array<() => void> = [];

async function acquireClaudeSlot(): Promise<void> {
  if (claudeInFlight < CLAUDE_MAX_CONCURRENT) {
    claudeInFlight++;
    return;
  }
  await new Promise<void>((resolve) => claudeWaiters.push(resolve));
  claudeInFlight++;
}

function releaseClaudeSlot(): void {
  claudeInFlight = Math.max(0, claudeInFlight - 1);
  const next = claudeWaiters.shift();
  if (next) next();
}

async function fetchClaudeWithBackoff(input: RequestInfo, init: RequestInit, maxAttempts = 4): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(input, init);
      if (resp.status !== 429 && resp.status !== 529) return resp;
      // Rate limited or overloaded — read body so the connection releases, then back off.
      await resp.text().catch(() => '');
      const backoff = Math.min(8000, 600 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
      console.warn(`[AutoReport] Claude ${resp.status} on attempt ${attempt}/${maxAttempts}, retrying in ${backoff}ms`);
      await new Promise((r) => setTimeout(r, backoff));
      lastErr = new Error(`Claude transient ${resp.status}`);
    } catch (err) {
      lastErr = err;
      const backoff = Math.min(8000, 600 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
      console.warn(`[AutoReport] Claude fetch threw on attempt ${attempt}/${maxAttempts}, retrying in ${backoff}ms`, err);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Claude request failed after retries');
}

interface ReportRequest {
  firstName: string;
  email: string;
  domain: string;
  score: number;
  /** Optional: ID of the visibility_report_requests row that triggered this run.
   *  When provided, the in-flight dedupe guard ignores that row so a caller
   *  (e.g. process-pending-reports) that already marked the row as 'processing'
   *  is not blocked by its own update. */
  requestId?: string;
  /** Optional: explicit brand/company name override. When provided, this takes
   *  precedence over homepage-extracted candidates so we don't end up with
   *  bogus primary names like "Client Login" or "A. Holt". */
  companyName?: string;
}

interface BrandProfile {
  primaryName: string;
  aliases: string[];
  domain?: string;
}

interface HomepageSignals {
  context: string;
  brandCandidates: string[];
}

// Mention status taxonomy:
//   named       — entity is referenced in passing (descriptive sentence, citation, footnote)
//   listed      — entity appears as a bulleted/numbered list item or in a "such as / include" list
//   recommended — AI explicitly recommends, suggests, or names entity as a top option
//   preferred   — AI ranks entity #1 / "best" / "go with" / "top choice"
export type EntityMentionStatus = 'named' | 'listed' | 'recommended' | 'preferred';

export interface AIMentionedEntity {
  entityName: string;
  canonicalName: string;
  provider: string;
  promptId: string;
  promptText: string;
  entityType: string;
  mentionCount: number;
  evidenceSnippet: string;
  mentionStatus: EntityMentionStatus;
}

export interface CompetitorRecommendationEvent {
  entityName: string;
  canonicalName: string;
  provider: string;
  promptId: string;
  promptText: string;
  entityType: string;
  recommendationStrength: 'strong' | 'moderate' | 'weak';
  position: number | null;
  evidenceSnippet: string;
}

interface ProviderResult {
  provider: string;
  prompt: string;
  response: string;
  brandMentioned: boolean;
  // ALL organizations/firms/services/etc. named anywhere in the response.
  // Powers: "Competitors Mentioned by AI", Competitor Types Found, Detailed
  // competitor landscape, Entity discovery.
  competitors: string[];
  // Strict subset of competitors whose mention pattern indicates the AI is
  // listing / suggesting / recommending / preferring them as an answer to the
  // prompt. Powers: Share of Voice, Head-to-Head Matrix, Content Gap
  // "competitors winning here", AI Opportunity Score competitor gap.
  recommendedEntities: string[];
  // Per-entity mention status, keyed by canonical (lowercase) name.
  entityMentionStatus: Record<string, EntityMentionStatus>;
  score: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'not_mentioned';
  recommendationStrength: 'strong' | 'moderate' | 'weak' | 'absent';
  brandPosition: number | null; // position in list if applicable (1-based), null if not in a list
}

// Only exclude platforms/channels/directories/AI models that are NEVER competitors
// Do NOT exclude software products here — they may be real competitors for many businesses
const NON_COMPETITOR_ENTITIES = new Set([
  // Social media platforms & ad channels (these are distribution channels, not competitors)
  'google', 'google ads', 'google analytics', 'google business profile', 'google my business', 'google maps',
  'facebook', 'facebook ads', 'instagram', 'instagram ads', 'linkedin', 'linkedin ads', 'x', 'twitter',
  'youtube', 'tiktok', 'tiktok ads', 'pinterest', 'reddit', 'snapchat', 'bing', 'apple maps',
  // Review sites and directories (these are listing platforms, not competitors)
  'yelp', 'bbb', 'better business bureau', 'g2', 'capterra', 'clutch', 'trustpilot', 'glassdoor', 'indeed',
  'avvo', 'findlaw', 'justia', 'lawyers com', 'lawyers.com', 'martindale', 'nolo', 'martindale-nolo',
  'martindale nolo', 'super lawyers', 'thumbtack', 'angi', 'angies list', 'homeadvisor',
  // Generic marketing terms (not brand names)
  'social media', 'email marketing', 'content marketing', 'seo', 'ppc', 'crm', 'analytics',
  'marketing', 'digital marketing', 'website optimization', 'small firms', 'implementation tips',
  'consensus across sources', 'key strategies ranked', 'optimized website', 'website', 'websites',
  'search engine optimization', 'law firms', 'small law firms', 'law firm marketing', 'legal marketing',
  'forward push', 'law firm growth program',
  // Service categories that frequently get mis-detected as brands
  'local seo', 'national seo', 'technical seo', 'on-page seo', 'off-page seo', 'enterprise seo',
  'strong seo', 'ai seo', 'seo agency', 'seo services', 'seo company', 'seo firm', 'seo consultant',
  'ppc agency', 'ppc services', 'ppc management', 'paid search', 'paid media', 'paid ads',
  'google ads management', 'facebook ads management', 'social media marketing', 'social media management',
  'online reviews', 'reputation management', 'review management', 'link building', 'backlinks',
  'content writing', 'copywriting', 'web design', 'web development', 'website design',
  'lead generation', 'demand generation', 'inbound marketing', 'outbound marketing',
  'targeted ppc', 'targeted google ads', 'targeted facebook ads', 'built-in seo',
  'agency types', 'remote.co', 'freelancer.com', 'fiverr pro', 'fiverr',
  // AI models (these are the tools generating responses, not competitors)
  'openai', 'chatgpt', 'perplexity', 'claude', 'anthropic', 'gemini', 'copilot', 'meta', 'microsoft',
  // Generic infrastructure
  'wordpress',
]);

const GENERIC_COMPETITOR_TERMS = new Set([
  'agency', 'agencies', 'company', 'companies', 'firm', 'firms', 'service', 'services', 'solutions',
  'strategy', 'strategies', 'marketing', 'digital', 'media', 'website', 'websites', 'optimization', 'growth',
  'consulting', 'consultancy', 'coaching', 'tips', 'guide', 'ranked', 'consensus', 'implementation',
  'small', 'legal', 'law', 'performance', 'evergreen', 'fireproof', 'premium', 'professional',
  'platform', 'platforms', 'tool', 'tools', 'software', 'product', 'products', 'system', 'systems',
  'seo', 'sem', 'ppc', 'cro', 'cms', 'crm', 'erp', 'cfo', 'cmo', 'ceo', 'cto', 'coo',
  'ai', 'ml', 'api', 'sdk', 'saas', 'b2b', 'b2c', 'roi', 'kpi',
  // Common multi-word generics treated as phrases
  'ai seo', 'ai marketing', 'cfo consulting', 'cmo consulting', 'seo agency', 'seo services',
  'digital marketing', 'content marketing', 'paid search', 'organic search', 'lead generation',
]);

// Words that, when they appear as the LAST word in a candidate, indicate it's a descriptive phrase
// rather than a brand name (e.g., "Fireproof Performance", "AI SEO consulting", "evergreen websites")
const DESCRIPTIVE_TRAILING_WORDS = new Set([
  'websites', 'website', 'services', 'solutions', 'platforms', 'platform', 'tools', 'software',
  'products', 'systems', 'consulting', 'consultancy', 'coaching', 'agencies', 'agency',
  'performance', 'optimization', 'marketing', 'strategy', 'strategies', 'growth', 'management',
  'development', 'design', 'analytics', 'automation', 'generation', 'support', 'experience',
]);

// Adjectives/modifiers that mark a phrase as descriptive marketing copy, not a brand
const DESCRIPTIVE_LEADING_MODIFIERS = new Set([
  'conversion-friendly', 'seo-optimized', 'ai-powered', 'data-driven', 'cloud-based', 'high-performance',
  'cost-effective', 'user-friendly', 'mobile-first', 'enterprise-grade', 'industry-leading',
  'best-in-class', 'full-service', 'all-in-one', 'end-to-end', 'turnkey', 'custom', 'bespoke',
  'affordable', 'premium', 'professional', 'specialized', 'dedicated', 'comprehensive',
]);

// Common English words that get falsely detected as brand names due to capitalization at start of sentences
const COMMON_ENGLISH_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are',
  'ensure', 'check', 'use', 'after', 'always', 'confirm', 'navigate', 'review', 'this', 'that', 'these',
  'those', 'here', 'there', 'when', 'where', 'how', 'what', 'which', 'who', 'why', 'will', 'would',
  'should', 'could', 'can', 'may', 'might', 'must', 'shall', 'have', 'has', 'had', 'been', 'being',
  'do', 'does', 'did', 'done', 'make', 'made', 'take', 'took', 'give', 'gave', 'get', 'got',
  'go', 'went', 'come', 'came', 'see', 'saw', 'know', 'knew', 'think', 'thought', 'find', 'found',
  'tell', 'told', 'ask', 'asked', 'work', 'worked', 'call', 'called', 'try', 'tried', 'need', 'needed',
  'keep', 'kept', 'let', 'start', 'started', 'show', 'showed', 'help', 'helped', 'run', 'running',
  'move', 'moved', 'live', 'believe', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose',
  'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch',
  'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk',
  'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send',
  'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass',
  'sell', 'require', 'report', 'decide', 'pull', 'develop', 'define', 'manage', 'access', 'enter',
  'click', 'select', 'apply', 'configure', 'setup', 'install', 'update', 'download', 'upload',
  'verify', 'enable', 'disable', 'connect', 'disconnect', 'login', 'logout', 'register', 'submit',
  'process', 'complete', 'finish', 'begin', 'end', 'close', 'save', 'delete', 'remove', 'edit',
  'view', 'display', 'handle', 'implement', 'integrate', 'test', 'debug', 'deploy', 'launch',
  'monitor', 'track', 'analyze', 'optimize', 'automate', 'customize', 'export', 'import',
  'first', 'second', 'third', 'fourth', 'fifth', 'next', 'last', 'new', 'old', 'best', 'top',
  'most', 'many', 'much', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'more', 'other',
  'such', 'only', 'same', 'just', 'also', 'very', 'often', 'however', 'too', 'usually', 'really',
  'already', 'still', 'even', 'well', 'back', 'then', 'now', 'here', 'there', 'today', 'once',
  'before', 'while', 'since', 'during', 'about', 'between', 'through', 'against', 'into', 'over',
  'under', 'above', 'below', 'around', 'among', 'within', 'without', 'along', 'across', 'behind',
  'beyond', 'toward', 'upon', 'throughout', 'despite', 'unlike', 'regarding',
  'key', 'step', 'steps', 'note', 'notes', 'example', 'examples', 'important', 'summary',
  'overview', 'details', 'benefits', 'features', 'options', 'results', 'data', 'information',
  'accounts payable aging', 'accounts receivable aging', 'balance sheet', 'income statement',
  'cash flow', 'general ledger', 'trial balance', 'profit and loss',
  // Additional sentence-start words commonly capitalized
  'several', 'forward', 'various', 'another', 'overall', 'whether', 'certain', 'specific',
  'popular', 'notable', 'common', 'additional', 'effective', 'comprehensive', 'recommended',
  'particular', 'relevant', 'similar', 'typical', 'general', 'primary', 'major', 'minor',
  'focus', 'focused', 'focusing', 'based', 'known', 'dedicated', 'specialized', 'experienced',
  'established', 'integrated', 'combined', 'tailored', 'customized', 'designed', 'aimed',
  // Imperative verbs commonly starting numbered/bulleted instruction lists (false positives)
  'contact', 'discuss', 'inquire', 'choose', 'attend', 'assemble', 'collect', 'gather',
  'cross-reference', 'crossreference', 'reference', 'schedule', 'request', 'submit', 'prepare',
  'compile', 'organize', 'arrange', 'coordinate', 'communicate', 'consult', 'evaluate',
  'assess', 'identify', 'determine', 'establish', 'maintain', 'develop', 'create', 'build',
  'visit', 'browse', 'explore', 'search', 'look', 'find', 'discover', 'investigate', 'research',
  'sign', 'signup', 'enroll', 'subscribe', 'join', 'attend', 'participate', 'engage',
  'avoid', 'prevent', 'protect', 'secure', 'ensure', 'maintain', 'preserve', 'sustain',
  'leverage', 'utilize', 'employ', 'adopt', 'adapt', 'modify', 'adjust', 'refine', 'improve',
  'enhance', 'upgrade', 'expand', 'extend', 'increase', 'decrease', 'reduce', 'minimize',
  'maximize', 'achieve', 'accomplish', 'attain', 'obtain', 'acquire', 'gain', 'earn',
  'review', 'examine', 'inspect', 'analyze', 'study', 'observe', 'notice', 'recognize',
  'understand', 'comprehend', 'grasp', 'realize', 'acknowledge', 'accept', 'embrace',
  'present', 'introduce', 'demonstrate', 'illustrate', 'explain', 'describe', 'outline',
  'discuss', 'address', 'tackle', 'handle', 'manage', 'oversee', 'supervise', 'direct',
  'guide', 'lead', 'mentor', 'coach', 'train', 'teach', 'educate', 'inform', 'notify',
  'alert', 'warn', 'caution', 'advise', 'suggest', 'recommend', 'propose', 'offer',
  'provide', 'supply', 'deliver', 'distribute', 'allocate', 'assign', 'designate',
  'appoint', 'nominate', 'elect', 'select', 'pick', 'opt', 'prefer', 'favor',
  'attempt', 'try', 'endeavor', 'strive', 'pursue', 'chase', 'follow',
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEntityName(value: string | null | undefined): string {
  if (typeof value !== 'string' || !value) return '';
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\[(\d+)\]/g, ' ')
    .replace(/\.(com|io|net|org|co|app|ai|dev)\b/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Canonicalize an entity name so the report doesn't display the same
 * organization under 3 different spellings (domain, abbreviation, with/without
 * legal suffix, punctuation variants, etc.).
 *
 * Pipeline:
 *   1. Strip URL noise (protocol, www, trailing path/query).
 *   2. Drop trailing parenthetical clarifications: "JAMS (Judicial...)" → "JAMS",
 *      "Los Angeles County Bar Association (LACBA)" → "Los Angeles County Bar Association".
 *   3. Normalize whitespace, common punctuation (commas inside firm names,
 *      ampersand spacing, "Inc." vs "Inc"), and trailing periods.
 *   4. Look up the result (and a punctuation-stripped key) against a
 *      KNOWN_ENTITY_MAP of domain → canonical name and abbreviation/short
 *      form → canonical name. First match wins.
 *   5. Fall back to a cleaned display string.
 *
 * Returns the preferred display name. For dedupe keys, callers should still
 * pass the result through normalizeEntityName().
 */
const KNOWN_ENTITY_MAP: Record<string, string> = {
  // domain → canonical
  'jamsadr.com': 'JAMS',
  'jamsadr': 'JAMS',
  'bettzedek.org': 'Bet Tzedek Legal Services',
  'bettzedek': 'Bet Tzedek Legal Services',
  'adrservices.com': 'ADR Services, Inc.',
  'adrservices': 'ADR Services, Inc.',
  'lacba.org': 'Los Angeles County Bar Association',
  'lacba': 'Los Angeles County Bar Association',
  'gibsondunn.com': 'Gibson Dunn & Crutcher LLP',
  'gibsondunn': 'Gibson Dunn & Crutcher LLP',
  'lw.com': 'Latham & Watkins LLP',
  'fbm.com': 'Farella Braun + Martel LLP',
  'quinnemanuel.com': 'Quinn Emanuel Urquhart & Sullivan LLP',
  'mto.com': 'Munger, Tolles & Olson LLP',

  // abbreviation / short form → canonical (lowercased keys)
  'jams': 'JAMS',
  'judicial arbitration and mediation services': 'JAMS',
  'bet tzedek': 'Bet Tzedek Legal Services',
  'adr services': 'ADR Services, Inc.',
  'adr services inc': 'ADR Services, Inc.',
  'los angeles county bar association': 'Los Angeles County Bar Association',
  'la county bar association': 'Los Angeles County Bar Association',
  'gibson dunn': 'Gibson Dunn & Crutcher LLP',
  'gibson dunn crutcher': 'Gibson Dunn & Crutcher LLP',
  'gibson dunn & crutcher': 'Gibson Dunn & Crutcher LLP',
  'latham watkins': 'Latham & Watkins LLP',
  'latham & watkins': 'Latham & Watkins LLP',
  'farella braun': 'Farella Braun + Martel LLP',
  'farella braun martel': 'Farella Braun + Martel LLP',
  'farella braun + martel': 'Farella Braun + Martel LLP',
  'quinn emanuel': 'Quinn Emanuel Urquhart & Sullivan LLP',
  'quinn emanuel urquhart sullivan': 'Quinn Emanuel Urquhart & Sullivan LLP',
  'munger tolles': 'Munger, Tolles & Olson LLP',
  'munger tolles olson': 'Munger, Tolles & Olson LLP',
  'munger, tolles & olson': 'Munger, Tolles & Olson LLP',
  'nam': 'National Arbitration and Mediation (NAM)',
  'national arbitration and mediation': 'National Arbitration and Mediation (NAM)',
  'resolute systems': 'Resolute Systems',
  'dti': 'DTI Global',
  'dti global': 'DTI Global',
  'legal aid foundation of los angeles': 'Legal Aid Foundation of Los Angeles',
  'lafla': 'Legal Aid Foundation of Los Angeles',
  'lafla.org': 'Legal Aid Foundation of Los Angeles',
  'state bar of california': 'State Bar of California',
  'calbar': 'State Bar of California',
  'calbar.ca.gov': 'State Bar of California',
};

const LEGAL_SUFFIX_RE = /\b(?:llp|l\.l\.p\.|llc|l\.l\.c\.|inc\.?|incorporated|corp\.?|corporation|ltd\.?|plc|p\.c\.|pc|pllc|p\.l\.l\.c\.|lp|l\.p\.|pa|p\.a\.|co\.?)\b/gi;

function stripUrlNoise(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#].*$/, '')   // drop path/query/hash
    .trim();
}

function entityLookupKey(value: string): string {
  // Lowercase, drop punctuation (incl. & + , .), drop legal suffixes, collapse whitespace.
  return value
    .toLowerCase()
    .replace(LEGAL_SUFFIX_RE, ' ')
    .replace(/[(),.&+'"`’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeEntityName(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '';
  let value = raw.trim();
  if (!value) return '';

  // 1. URL noise
  const urlStripped = stripUrlNoise(value);
  // If it looked like a domain (contains a dot, no spaces), check the domain map first.
  if (/\./.test(urlStripped) && !/\s/.test(urlStripped)) {
    const domLower = urlStripped.toLowerCase();
    if (KNOWN_ENTITY_MAP[domLower]) return KNOWN_ENTITY_MAP[domLower];
    const noTld = domLower.replace(/\.[a-z]{2,}$/i, '');
    if (KNOWN_ENTITY_MAP[noTld]) return KNOWN_ENTITY_MAP[noTld];
    // No known mapping → fall through using the bare domain label as a name candidate.
    value = noTld.replace(/[-_]+/g, ' ');
  } else {
    value = urlStripped;
  }

  // 2. Drop trailing parenthetical clarifications
  //    "Foo (bar baz)"  → "Foo"
  //    But only if the parenthetical isn't the whole thing.
  const parenMatch = value.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const head = parenMatch[1].trim();
    const inside = parenMatch[2].trim();
    // If inside is an abbreviation that maps, prefer the head expansion.
    // Otherwise just use the head.
    const insideKey = entityLookupKey(inside);
    if (insideKey && KNOWN_ENTITY_MAP[insideKey] && head.length >= 3) {
      value = head;
    } else {
      value = head;
    }
  }

  // 3. Normalize whitespace + stray punctuation
  value = value.replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim();

  // 4. Map lookup (with and without legal suffix / punctuation)
  const key = entityLookupKey(value);
  if (key && KNOWN_ENTITY_MAP[key]) return KNOWN_ENTITY_MAP[key];

  // 5. Light cleanup for display:
  //    - normalize commas inside multi-part firm names ("Gibson, Dunn" stays as-is)
  //    - normalize "& " spacing
  //    - normalize "Inc" → "Inc." for display consistency
  let display = value
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\binc\b(?!\.)/gi, 'Inc.')
    .replace(/\s+/g, ' ')
    .trim();

  return display;
}

function prettifyDomainLabel(domain: string | null | undefined): string {
  if (!domain || typeof domain !== 'string') return '';
  const base = domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\.(com|io|net|org|co|app|ai|dev)$/i, '')
    .split('.')[0]
    .toLowerCase();

  let label = base.replace(/[-_]+/g, ' ');

  // Iteratively strip legal-entity suffixes glued to the end (pllc, llc, inc, corp, etc.)
  // e.g., "gilmanlawpllc" -> "gilmanlaw"
  const legalSuffixes = ['pllc', 'llc', 'inc', 'corp', 'ltd', 'llp', 'lp', 'pc', 'pa', 'co'];
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const suffix of legalSuffixes) {
      if (!label.includes(' ') && label.endsWith(suffix) && label.length > suffix.length + 2) {
        label = label.slice(0, -suffix.length);
        stripped = true;
        break;
      }
    }
  }

  // Split a known business-type suffix (e.g., "gilmanlaw" -> "gilman law")
  const suffixes = ['team', 'group', 'labs', 'legal', 'law', 'marketing', 'media', 'partners', 'partner', 'agency', 'coaching', 'coach', 'consulting', 'services', 'studio', 'firm', 'attorneys', 'attorney', 'lawyers', 'lawyer', 'clinic', 'health', 'dental', 'realty', 'homes', 'tech', 'software', 'solutions', 'systems', 'capital', 'ventures'];
  const matchingSuffix = suffixes.find((suffix) => label.endsWith(suffix) && label.length > suffix.length + 2 && !label.includes(' '));

  if (matchingSuffix) {
    label = `${label.slice(0, -matchingSuffix.length)} ${matchingSuffix}`;
  }

  return label
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const uppercaseTokens = new Set(['ai', 'seo', 'ppc', 'cfo', 'crm', 'smb']);
      return uppercaseTokens.has(part)
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(' ')
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™');
}

function cleanTextSnippet(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBrandCandidatesFromContext(context: string): string[] {
  if (!context) return [];

  // Strip markdown bold markers before matching
  const clean = context.replace(/\*\*/g, '');
  const candidates: string[] = [];
  const patterns = [
    /^([A-Z][A-Za-z0-9&'.\- ]{1,50}?)\s+(?:is|helps|offers|provides|serves|specializes)/m,
    /^([A-Z][A-Za-z0-9&'.\- ]{1,50}?)\s*\|/m,
    /^([A-Z][A-Za-z0-9&'.\- ]{2,50}?)\s*\(/m, // "SMB Team (smbteam.com)"
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      const trimmed = match[1].trim();
      // Filter out numeric-only, single-char, or very short noise
      if (trimmed.length >= 2 && !/^\d+$/.test(trimmed)) {
        candidates.push(trimmed);
      }
    }
  }

  return dedupeBrandNames(candidates);
}

async function fetchHomepageSignals(domain: string): Promise<HomepageSignals> {
  for (const url of [`https://${domain}`, `http://${domain}`]) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LlumosBot/1.0; +https://llumos.app)',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      if (!html) continue;

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const ogSiteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
      const headingMatches = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi))
        .map((match) => cleanTextSnippet(match[1]))
        .filter(Boolean)
        .slice(0, 8);
      const paragraphMatches = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
        .map((match) => cleanTextSnippet(match[1]))
        .filter((text) => text.length > 40)
        .slice(0, 6);

      const title = cleanTextSnippet(titleMatch?.[1] || '');
      const firstTitleSegment = title.split(/\||–|—|-/)[0]?.trim() || '';
      const ogSiteName = cleanTextSnippet(ogSiteNameMatch?.[1] || '');
      const brandCandidates = dedupeBrandNames([
        firstTitleSegment,
        ogSiteName,
        ...headingMatches.filter((heading) => heading.split(/\s+/).length <= 5),
      ].filter(Boolean));

      return {
        context: [title, ...headingMatches, ...paragraphMatches].filter(Boolean).join('\n').slice(0, 3000),
        brandCandidates,
      };
    } catch (_error) {
      continue;
    }
  }

  return { context: '', brandCandidates: [] };
}

function buildBrandProfile(
  domain: string,
  businessContext: string,
  homepageSignals: HomepageSignals,
  companyNameOverride?: string,
): BrandProfile {
  const fallbackName = prettifyDomainLabel(domain);
  const domainStem = domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\.(com|io|net|org|co|app|ai|dev)$/i, '')
    .split('.')[0];
  const normalizedStem = normalizeEntityName(domainStem);

  const overrideName = (typeof companyNameOverride === 'string' ? companyNameOverride.trim() : '');

  // Filter homepage + research-context candidates: only keep those that share a token
  // with the domain stem. This kills noise like "Civil Litigation Attorneys" (a heading)
  // or "California" (first capitalized phrase in research context) being treated as the brand.
  const stemTokens = new Set(
    (normalizedStem.match(/[a-z]{4,}/g) || []).concat(
      // Also split a glued stem ("mclellanlawgroup") into pieces if any common suffix is present
      ['law', 'group', 'firm', 'team', 'media', 'agency', 'partners', 'studio'].flatMap((s) =>
        normalizedStem.includes(s) ? [normalizedStem.replace(s, '')] : []
      )
    ).filter((t) => t.length >= 4)
  );
  const sharesStemToken = (name: string): boolean => {
    const norm = normalizeEntityName(name);
    if (!norm) return false;
    if (norm === normalizedStem || norm.includes(normalizedStem) || normalizedStem.includes(norm)) return true;
    const tokens = norm.split(/\s+/).filter((t) => t.length >= 4);
    return tokens.some((t) => stemTokens.has(t) || normalizedStem.includes(t));
  };

  const externalCandidates = [
    ...homepageSignals.brandCandidates,
    ...extractBrandCandidatesFromContext(businessContext),
  ].filter((c) => c && sharesStemToken(c));

  const candidates = dedupeBrandNames([
    ...(overrideName ? [overrideName] : []),
    ...externalCandidates,
    fallbackName,
  ]).filter((c) => c && c.length >= 2 && !/^\d+$/.test(c.trim()));

  const primaryName = overrideName || (candidates
    .sort((a, b) => {
      const aNorm = normalizeEntityName(a);
      const bNorm = normalizeEntityName(b);
      const aScore = (aNorm === normalizedStem ? 20 : 0) + (aNorm.includes(normalizedStem) || normalizedStem.includes(aNorm) ? 10 : 0) + (a.split(/\s+/).length <= 3 ? 2 : 0);
      const bScore = (bNorm === normalizedStem ? 20 : 0) + (bNorm.includes(normalizedStem) || normalizedStem.includes(bNorm) ? 10 : 0) + (b.split(/\s+/).length <= 3 ? 2 : 0);
      return bScore - aScore || a.length - b.length;
    })[0] || fallbackName);

  const aliasSeed = expandBrandAliases([
    primaryName,
    fallbackName,
    domainStem,
    ...candidates,
  ]);

  return {
    primaryName,
    aliases: dedupeBrandNames([
      ...aliasSeed,
      ...aliasSeed.map((alias) => alias.replace(/\s+/g, '')),
      ...aliasSeed.map((alias) => alias.replace(/\s+/g, '-')),
    ]).filter((alias) => normalizeEntityName(alias).length >= 3),
    domain,
  };
}

function expandBrandAliases(names: string[]): string[] {
  const trailingBrandWords = new Set([
    'llc', 'inc', 'corp', 'corporation', 'ltd', 'llp', 'pllc', 'pc', 'pa', 'lp', 'co', 'company',
    'group', 'firm', 'legal', 'law', 'attorneys', 'attorney', 'lawyers', 'lawyer',
  ]);

  const expanded = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (typeof value !== 'string' || !value) return;
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 2) expanded.add(cleaned);
  };

  for (const name of (names || [])) {
    if (typeof name !== 'string' || !name) continue;
    const cleaned = name.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    add(cleaned);
    add(cleaned.replace(/\s*&\s*/g, ' and '));
    add(cleaned.replace(/\s*&\s*/g, ' '));
    add(cleaned.replace(/\band\b/gi, ' '));

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 2) add(words.slice(0, 2).join(' '));
    if (words.length >= 3) add(words.slice(0, 3).join(' '));

    let trimmedWords = [...words];
    while (trimmedWords.length > 1) {
      const lastWord = normalizeEntityName(trimmedWords[trimmedWords.length - 1]);
      if (!trailingBrandWords.has(lastWord)) break;
      trimmedWords = trimmedWords.slice(0, -1);
      add(trimmedWords.join(' '));
    }
  }

  return dedupeBrandNames([...expanded]);
}

function buildBrandSelfExclusionKeys(brandProfile: BrandProfile, domain?: string): Set<string> {
  const keys = new Set<string>();

  const add = (value: string | null | undefined) => {
    if (typeof value !== 'string' || !value) return;
    const normalized = normalizeEntityName(value);
    if (!normalized) return;
    keys.add(normalized);
    const withoutAnd = normalized.replace(/\band\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutAnd) keys.add(withoutAnd);
    const compact = normalized.replace(/\s+/g, '');
    if (compact) keys.add(compact);
  };

  add(brandProfile.primaryName);
  for (const alias of (brandProfile.aliases || [])) {
    add(alias);
  }

  if (domain) {
    const domainStem = domain
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('.')[0];
    add(domainStem);
    add(prettifyDomainLabel(domain));
  }

  return keys;
}

function isSelfBrandCandidate(name: string, brandProfile: BrandProfile, domain?: string): boolean {
  const normalizedCandidate = normalizeEntityName(name);
  if (!normalizedCandidate) return false;

  const exclusionKeys = buildBrandSelfExclusionKeys(brandProfile, domain);
  if (exclusionKeys.has(normalizedCandidate) || exclusionKeys.has(normalizedCandidate.replace(/\s+/g, ''))) {
    return true;
  }

  const candidateWords = normalizedCandidate.split(' ').filter(Boolean);
  if (candidateWords.length >= 2) {
    for (const alias of exclusionKeys) {
      const aliasWords = alias.split(' ').filter(Boolean);
      if (
        aliasWords.length > candidateWords.length &&
        aliasWords.slice(0, candidateWords.length).join(' ') === normalizedCandidate
      ) {
        return true;
      }
    }
  }

  return false;
}

function aliasToRegexSource(alias: string): string | null {
  const cleaned = alias
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/[^A-Za-z0-9\s.&'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;
  return cleaned.split(/\s+/).filter(Boolean).map((token) => escapeRegExp(token)).join('[\\s\\-._&]*');
}

// Generic legal/business descriptors that must NEVER be used as a single-token brand alias.
// These cause massive false positives (e.g., "law", "group", "team", "firm" appearing in every legal response).
const WEAK_SINGLE_TOKEN_ALIASES = new Set([
  'law', 'legal', 'group', 'firm', 'team', 'company', 'co', 'inc', 'llc', 'llp', 'pllc', 'pc', 'pa',
  'corp', 'corporation', 'ltd', 'lp', 'partners', 'partner', 'agency', 'studio', 'labs', 'media',
  'marketing', 'consulting', 'services', 'solutions', 'systems', 'tech', 'software', 'capital',
  'ventures', 'attorneys', 'attorney', 'lawyers', 'lawyer', 'clinic', 'health', 'dental', 'realty',
  'homes', 'office', 'offices', 'practice', 'global', 'national', 'international', 'associates',
  'and', 'the', 'of', 'for',
]);

/**
 * Collapse adjacent duplicated words inside a single name.
 * Fixes artifacts like "Gibson Dunn Dunn & Crutcher" → "Gibson Dunn & Crutcher"
 * which arise when two overlapping fragments of the same firm name get joined.
 * Comparison is case-insensitive and punctuation-tolerant.
 */
function collapseAdjacentDuplicateWords(name: string): string {
  if (!name) return name;
  const tokens = name.split(/(\s+)/); // keep whitespace tokens to preserve spacing
  const out: string[] = [];
  let lastWordKey = '';
  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) {
      out.push(tok);
      continue;
    }
    const key = tok.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key && key === lastWordKey) {
      // Drop this duplicate word AND the trailing whitespace pushed before it.
      if (out.length && /^\s+$/.test(out[out.length - 1])) out.pop();
      continue;
    }
    out.push(tok);
    if (key) lastWordKey = key;
  }
  return out.join('').replace(/\s+/g, ' ').trim();
}

function dedupeBrandNames(names: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const name of names) {
    if (typeof name !== 'string') continue;
    const cleaned = collapseAdjacentDuplicateWords(name.trim());
    const normalized = normalizeEntityName(cleaned);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(cleaned);
  }
  return deduped;
}

function isStrongAlias(alias: string, brandProfile: BrandProfile): boolean {
  const normalized = normalizeEntityName(alias);
  if (!normalized) return false;
  const words = normalized.split(' ').filter(Boolean);
  // Multi-word aliases are always strong (assuming they survived earlier filters)
  if (words.length >= 2) {
    // But reject if EVERY word is weak/generic
    if (words.every((w) => WEAK_SINGLE_TOKEN_ALIASES.has(w))) return false;
    return true;
  }
  // Single-token alias: must be ≥4 chars, not a generic descriptor, not a common english word
  const token = words[0];
  if (!token || token.length < 4) return false;
  if (WEAK_SINGLE_TOKEN_ALIASES.has(token)) return false;
  if (COMMON_ENGLISH_WORDS.has(token)) return false;
  if (GENERIC_COMPETITOR_TERMS.has(token)) return false;
  return true;
}

function findBrandMention(text: string, brandProfile: BrandProfile): { index: number; alias: string } | null {
  let bestMatch: { index: number; alias: string } | null = null;

  for (const alias of brandProfile.aliases) {
    if (!isStrongAlias(alias, brandProfile)) continue;
    const source = aliasToRegexSource(alias);
    if (!source) continue;

    const regex = new RegExp(`(^|[^a-z0-9])(${source})(?=[^a-z0-9]|$)`, 'i');
    const match = regex.exec(text);
    if (!match) continue;

    const index = match.index + (match[1]?.length || 0);
    if (!bestMatch || index < bestMatch.index) {
      bestMatch = { index, alias };
    }
  }

  return bestMatch;
}

function brandMentionedInText(text: string, brandProfile: BrandProfile): boolean {
  if (!text || !brandProfile) return false;

  // STRICT detection: only match the canonical primaryName, its compact form (no spaces),
  // or the domain stem. This is the SAME signal used by analyzeSentiment, ensuring the
  // scorecard, sentiment, and recommendation sections of the report cannot disagree.
  // We deliberately do NOT iterate the full alias list here — aliases are used only for
  // entity expansion elsewhere (e.g., self-exclusion in competitor extraction).
  const candidates = new Set<string>();
  const add = (s: string | undefined | null) => {
    if (typeof s !== 'string') return;
    const trimmed = s.trim();
    if (trimmed.length >= 4) candidates.add(trimmed);
  };

  add(brandProfile.primaryName);
  // Compact form: "McLellan Law Group" -> "McLellanLawGroup" / "mclellanlawgroup"
  if (brandProfile.primaryName) {
    add(brandProfile.primaryName.replace(/\s+/g, ''));
  }
  // Domain stem (the actual website identifier — most reliable brand token)
  const domainStem = brandProfile.aliases?.find((a) => /^[a-z0-9]+$/i.test(a) && a.length >= 4);
  if (domainStem) add(domainStem);

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    // Word-boundary match — same approach analyzeSentiment uses (substring),
    // but with boundary protection to avoid partial-word collisions.
    const source = aliasToRegexSource(candidate);
    if (!source) continue;
    const regex = new RegExp(`(^|[^a-z0-9])(${source})(?=[^a-z0-9]|$)`, 'i');
    if (regex.test(text)) return true;
    // Also accept compact substring presence (handles cases where the LLM concatenates)
    if (normalized.length >= 8 && text.toLowerCase().includes(normalized)) return true;
  }

  return false;
}

function hasBrandLikeShape(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (/\./.test(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    const hasCapital = words.some(w => /^[A-Z]/.test(w));
    const allCommon = words.every(w => COMMON_ENGLISH_WORDS.has(w.toLowerCase()));
    return hasCapital && !allCommon;
  }
  if (COMMON_ENGLISH_WORDS.has(trimmed.toLowerCase())) return false;
  if (GENERIC_COMPETITOR_TERMS.has(trimmed.toLowerCase())) return false;
  if (/[a-z][A-Z]/.test(trimmed)) return true;
  if (/^[A-Z]{2,6}$/.test(trimmed)) return true;
  if (/\d/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) return true;
  if (/^[A-Z][a-z]{4,}/.test(trimmed)) return true;
  return false;
}

function isLikelyCompetitorBrand(name: string, brandName: string, domain: string): boolean {
  const normalized = normalizeEntityName(name);
  const normalizedBrand = normalizeEntityName(brandName);
  const normalizedDomain = normalizeEntityName(domain);

  if (!normalized || normalized.length < 3) return false;
  if (!hasBrandLikeShape(name)) return false;
  if (normalized === normalizedBrand || normalized === normalizedDomain) return false;
  if (NON_COMPETITOR_ENTITIES.has(normalized)) return false;
  // Also check with hyphens replaced by spaces and vice versa
  if (NON_COMPETITOR_ENTITIES.has(normalized.replace(/-/g, ' '))) return false;
  if (NON_COMPETITOR_ENTITIES.has(normalized.replace(/\s+/g, '-'))) return false;
  if (GENERIC_COMPETITOR_TERMS.has(normalized)) return false;
  if (GENERIC_COMPETITOR_TERMS.has(normalized.replace(/-/g, ' '))) return false;
  if (COMMON_ENGLISH_WORDS.has(normalized)) return false;
  if (/^\d+$/.test(normalized)) return false;

  const words = normalized.split(' ').filter(Boolean);
  if (words.length > 4) return false;
  if (words.every((part) => GENERIC_COMPETITOR_TERMS.has(part))) return false;
  if (words.every((part) => COMMON_ENGLISH_WORDS.has(part))) return false;

  // Reject phrases that end with a descriptive trailing word (e.g., "Fireproof Performance",
  // "evergreen websites", "AI SEO consulting", "CFO consulting"). These are categories, not brands.
  if (words.length >= 2 && DESCRIPTIVE_TRAILING_WORDS.has(words[words.length - 1])) return false;

  // Reject service-category phrases ending in a channel/discipline noun (e.g. "Local SEO",
  // "Strong SEO", "Targeted PPC", "Premium Marketing", "Paid Ads"). These read as Title Case
  // but are service descriptors, not brand names. Only allow if the candidate looks brand-shaped
  // (contains digits, internal caps, or a TLD-like ".io"/".com").
  const CATEGORY_SUFFIXES = new Set(['seo', 'ppc', 'sem', 'cro', 'ads', 'marketing', 'media', 'advertising']);
  if (words.length === 2 && CATEGORY_SUFFIXES.has(words[words.length - 1])) {
    const looksLikeBrand = /\d/.test(name) || /[a-z][A-Z]/.test(name) || /\.(io|com|co|ai|app)\b/i.test(name);
    if (!looksLikeBrand) return false;
  }

  // Reject phrases that begin with a descriptive marketing modifier
  // (e.g., "conversion-friendly SEO-optimized websites")
  if (DESCRIPTIVE_LEADING_MODIFIERS.has(words[0])) return false;
  // Also handle compound modifiers anywhere in the phrase
  if (words.some((w) => DESCRIPTIVE_LEADING_MODIFIERS.has(w))) return false;

  // Reject if the original (untrimmed) input contains a descriptive hyphenated adjective
  // pattern like "X-friendly", "X-optimized", "X-powered", "X-driven", "X-based", "X-grade"
  if (/\b[a-z]+-(?:friendly|optimized|powered|driven|based|grade|ready|focused|first|leading|class)\b/i.test(name)) {
    return false;
  }

  // Multi-word phrases must be Title Case (every significant word starts with a capital letter or is a known acronym).
  // This kills phrases like "AI SEO consulting" (lowercase "consulting") and "evergreen websites".
  if (words.length >= 2) {
    const originalWords = name.trim().split(/\s+/);
    const titleCaseCount = originalWords.filter((w) => /^[A-Z0-9]/.test(w) || /^[A-Z]{2,6}$/.test(w)).length;
    // Allow short connector words (of, the, and, &) to be lowercase; require all OTHER words to start uppercase
    const significantWords = originalWords.filter((w) => !/^(of|the|and|&|for|to|in|on|at|de|la)$/i.test(w));
    const significantCapitalized = significantWords.filter((w) => /^[A-Z0-9]/.test(w)).length;
    if (significantCapitalized < significantWords.length) return false;
    if (titleCaseCount === 0) return false;
  }

  return true;
}

function parseCompetitorCandidatesFromResearch(
  businessContext: string,
  brandName: string,
  domain: string,
): string[] {
  if (!businessContext) return [];

  const candidates: string[] = [];
  const competitorSectionMatch = businessContext.match(/(?:key competitors?|top competitors?|direct competitors?|competitors?)\s*[:\-]\s*([\s\S]{0,500})/i);

  if (!competitorSectionMatch?.[1]) {
    return [];
  }

  const competitorSection = competitorSectionMatch[1]
    .replace(/\[[^\]]+\]/g, ' ')
    .split(/\n\n|\r\n\r\n/)[0];

  // Split on strong delimiters first (newlines, bullets, semicolons, pipes).
  // Do NOT split on bare commas here — multi-part firm names like
  // "Skadden, Arps, Slate, Meagher & Flom LLP" must stay intact.
  const segments = competitorSection.split(/\n|\r|•|·|\||;/);
  for (const segment of segments) {
    for (const rawPart of splitFirmAwareList(segment)) {
      const cleaned = rawPart.trim().replace(/^[-–—\d.\s]+/, '').trim();
      if (isLikelyCompetitorBrand(cleaned, brandName, domain)) {
        candidates.push(cleaned);
      }
    }
  }

  return dedupeBrandNames(candidates).slice(0, 15);
}

/**
 * Split a comma/and-separated list of brand or firm names into individual entries
 * while preserving multi-part firm names that contain internal commas (e.g.
 * "Skadden, Arps, Slate, Meagher & Flom LLP" or "Wachtell, Lipton, Rosen & Katz").
 *
 * Heuristic: tokenize on commas and the word "and"/"&" (when used as a separator),
 * then greedily merge consecutive comma-joined tokens that look like surname
 * fragments of a single firm. A run of comma-joined Title-Case single-word tokens
 * that terminates with an "& Word" tail or a firm suffix (LLP, LLC, PC, PLLC, PA,
 * LP, Inc, Ltd, Group, Partners) is treated as one firm name.
 */
function splitFirmAwareList(input: string): string[] {
  if (!input) return [];

  // First split on " and " used as a list separator (but keep "&" inside names).
  const andSplit = input.split(/\s+and\s+/i);

  const FIRM_SUFFIX_RE = /\b(LLP|LLC|PLLC|PC|PA|LP|Inc\.?|Ltd\.?|Group|Partners|Co\.?)$/i;
  const SURNAME_FRAGMENT_RE = /^[A-Z][A-Za-z'’.-]+$/; // single Title-Case token

  const results: string[] = [];

  for (const chunk of andSplit) {
    const tokens = chunk.split(',').map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) continue;

    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length === 0) return;
      results.push(buffer.join(', '));
      buffer = [];
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const isLast = i === tokens.length - 1;
      const isFragment = SURNAME_FRAGMENT_RE.test(token);
      const endsWithAmpTail = /&\s+[A-Z][A-Za-z'’.-]+/.test(token);
      const endsWithFirmSuffix = FIRM_SUFFIX_RE.test(token);

      if (buffer.length === 0) {
        buffer.push(token);
        // If standalone token is clearly a complete name, flush immediately when
        // the next token doesn't look like a continuation of THIS firm.
        if (isLast || (!SURNAME_FRAGMENT_RE.test(tokens[i + 1] ?? '') && !/^&/.test(tokens[i + 1] ?? ''))) {
          // Only flush if current token isn't itself a bare surname fragment
          // waiting for a tail — bare fragments get merged with whatever follows.
          if (!isFragment || endsWithAmpTail || endsWithFirmSuffix || token.includes(' ')) {
            flush();
          }
        }
      } else {
        // We're already accumulating a multi-part firm name.
        buffer.push(token);
        // Terminate the firm name when we hit a token containing "& Word" or a firm suffix.
        if (endsWithAmpTail || endsWithFirmSuffix || /&/.test(token)) {
          flush();
        } else if (isLast) {
          flush();
        }
      }
    }
    flush();
  }

  return results;
}

function extractBrandLikeCandidatesFromText(
  text: string,
  brandName: string,
  domain: string,
): string[] {
  if (!text) return [];

  const candidates: string[] = [];

  const addCandidate = (value: string) => {
    const cleaned = value
      .replace(/^[-–—\d.\s]+/, '')
      .replace(/[\[\](){}]/g, ' ')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (isLikelyCompetitorBrand(cleaned, brandName, domain)) {
      candidates.push(cleaned);
    }
  };

  for (const match of text.match(/\b(?:[a-z0-9-]+\.)+(?:com|io|net|org|co|app|ai|dev)\b/gi) || []) {
    addCandidate(match);
  }

  for (const match of text.matchAll(/(?:^|\n)\s*(?:\d+[.)]\s+|[-•*▪▸]\s+)([A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*){0,2})/gm)) {
    const candidate = match[1].trim();
    // Skip single-word candidates from list items — these are almost always imperative verbs
    // (e.g., "Contact", "Discuss", "Inquire", "Choose"), not brand names
    if (!candidate.includes(' ') && !/[.&]/.test(candidate)) continue;
    addCandidate(candidate);
  }

  for (const match of text.matchAll(/(?:include|includes|including|recommend|recommended|options(?:\s+include)?|such as|alternatives?\s+(?:include|are)|platforms?\s+(?:include|like))\s+([^.;:\n]{0,140})/gi)) {
    // Use firm-aware splitter so multi-part firm names (e.g. "Skadden, Arps, Slate,
    // Meagher & Flom LLP") aren't fragmented into individual surnames.
    for (const rawPart of splitFirmAwareList(match[1].replace(/\//g, ','))) {
      addCandidate(rawPart);
    }
  }

  return dedupeBrandNames(candidates);
}

function extractCompetitorCandidatesFromResults(
  results: ProviderResult[],
  brandName: string,
  domain: string,
): { candidate: string; providers: Set<string>; mentions: number }[] {
  const stats = new Map<string, { candidate: string; providers: Set<string>; mentions: number }>();

  for (const result of results) {
    if (!result.response || result.response.startsWith('Error') || result.response.startsWith('Provider not') || result.response.startsWith('No AI Overview')) {
      continue;
    }

    const candidates = extractBrandLikeCandidatesFromText(result.response, brandName, domain);
    for (const candidate of candidates) {
      const key = normalizeEntityName(candidate);
      const existing = stats.get(key);
      if (existing) {
        existing.providers.add(result.provider);
        existing.mentions += 1;
      } else {
        stats.set(key, { candidate, providers: new Set([result.provider]), mentions: 1 });
      }
    }
  }

  return Array.from(stats.values()).sort((a, b) =>
    b.providers.size - a.providers.size || b.mentions - a.mentions || a.candidate.localeCompare(b.candidate),
  );
}

async function identifyCompetitorCandidates(
  domain: string,
  brandProfile: BrandProfile,
  businessContext: string,
): Promise<string[]> {
  const brandName = brandProfile.primaryName;
  const fallbackCandidates = parseCompetitorCandidatesFromResearch(businessContext, brandName, domain)
    .filter((candidate) => !isSelfBrandCandidate(candidate, brandProfile, domain));

  if (!OPENAI_API_KEY) {
    return fallbackCandidates;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 350,
        messages: [
          {
            role: 'system',
            content: `You identify direct competitor brands for a company. Return ONLY a JSON array of 0-15 brand names. Include ONLY companies a buyer would compare directly against this brand for the same budget and problem. Exclude channels, directories, publishers, review sites, marketplaces, software categories, generic phrases, tactics, and broad platforms. If you are not confident a name is a direct competitor brand, leave it out.`
          },
          {
            role: 'user',
            content: `Company domain: ${domain}\nBrand name: ${brandName}\n\nBusiness research:\n${businessContext || 'No business research available.'}\n\nReturn only direct competitor brand names for this company as a JSON array of strings.`
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI competitor extraction error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        const aiCandidates = parsed
          .map((item: unknown) => typeof item === 'string' ? item : '')
          .filter((item: string) => isLikelyCompetitorBrand(item, brandName, domain))
          .filter((item: string) => !isSelfBrandCandidate(item, brandProfile, domain));

        const cleanedCandidates = dedupeBrandNames(aiCandidates).slice(0, 15);
        if (cleanedCandidates.length > 0) {
          return cleanedCandidates;
        }
      }
    }
  } catch (error) {
    console.error('[AutoReport] Error identifying competitor candidates:', error);
  }

  return fallbackCandidates;
}

/**
 * Validate candidates against Perplexity grounded web search.
 * Philosophy: Perplexity must ACTIVELY REJECT a candidate to remove it. Uncertain or
 * unanswered candidates are KEPT — corroboration from AI responses is itself evidence.
 * A candidate is removed ONLY if Perplexity says exists=false OR isDirectCompetitor=false
 * with confidence >= 0.7 (i.e., it's confidently wrong).
 */
async function validateCompetitorsWithPerplexity(
  candidates: string[],
  brandName: string,
  domain: string,
  businessContext: string,
): Promise<string[]> {
  if (!PERPLEXITY_API_KEY || candidates.length === 0) return candidates;

  const industryHint = businessContext.replace(/\s+/g, ' ').slice(0, 400);

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You verify whether candidate names are REAL, NAMED COMPANIES that compete with a target brand. Use web search. Be GENEROUS — if a name plausibly matches a real company in the same industry, mark exists=true. Only mark exists=false when you are confident the name is a generic phrase, marketing copy, service category, or non-existent entity. For competitors in the same broad industry, mark isDirectCompetitor=true.',
          },
          {
            role: 'user',
            content: `Target brand: ${brandName} (${domain})
Industry context: ${industryHint || 'Unknown'}

Candidates to verify:
${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For EACH candidate, determine:
- exists: Is this a real, named company you can find on the web? (true/false). Default to true if unsure.
- isDirectCompetitor: Does it operate in the same broad industry as ${brandName}? (true/false). Default to true if unsure.
- confidence: How confident are you in your verdict (0.0 - 1.0)?

Return ONLY a JSON array in this exact shape, in the same order as the candidates above:
[{"name":"<candidate>","exists":bool,"isDirectCompetitor":bool,"confidence":number}]

No prose, no markdown, just the JSON array.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[AutoReport] Perplexity competitor validation failed: ${response.status}`);
      return candidates;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[AutoReport] Perplexity validation returned no JSON, keeping originals');
      return candidates;
    }

    const verdicts = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(verdicts)) return candidates;

    const verdictMap = new Map<string, { exists: boolean; isDirectCompetitor: boolean; confidence: number }>();
    for (const v of verdicts) {
      if (v && typeof v.name === 'string') {
        verdictMap.set(normalizeEntityName(v.name), {
          exists: v.exists !== false, // default true if missing
          isDirectCompetitor: v.isDirectCompetitor !== false, // default true if missing
          confidence: typeof v.confidence === 'number' ? v.confidence : 0.5,
        });
      }
    }

    const kept: string[] = [];
    const rejected: Array<{ name: string; reason: string }> = [];
    for (const candidate of candidates) {
      const verdict = verdictMap.get(normalizeEntityName(candidate));
      // No verdict returned → KEEP (don't punish candidates Perplexity skipped)
      if (!verdict) {
        kept.push(candidate);
        continue;
      }
      // Only reject if Perplexity is CONFIDENTLY wrong (>=0.7) about either field
      const confidentlyRejected =
        verdict.confidence >= 0.7 && (!verdict.exists || !verdict.isDirectCompetitor);
      if (confidentlyRejected) {
        rejected.push({
          name: candidate,
          reason: `exists=${verdict.exists}, direct=${verdict.isDirectCompetitor}, conf=${verdict.confidence}`,
        });
      } else {
        kept.push(candidate);
      }
    }

    console.log(`[AutoReport] Perplexity validation: kept ${kept.length}/${candidates.length}`);
    if (rejected.length > 0) {
      console.log('[AutoReport] Rejected by Perplexity:', rejected.map(r => `${r.name} (${r.reason})`).join('; '));
    }

    return kept.length > 0 ? kept : candidates;
  } catch (error) {
    console.error('[AutoReport] Perplexity validation error:', error);
    return candidates;
  }
}

export interface CompetitorFilterMetrics {
  domain: string;
  brandName: string;
  initial: number;
  responseExtracted: number;
  trustedMultiProvider: number;
  singleProvider: number;
  afterCompoundSplit: number;
  trustedBypass: number;
  weakInput: number;
  weakAfterOpenAI: number;
  openAIApplied: boolean;
  openAIKeptAll: boolean;
  combinedForPerplexity: number;
  afterPerplexity: number;
  final: number;
  droppedByOpenAI: number;
  droppedByPerplexity: number;
  timestamp: string;
}

async function refineCompetitorCandidatesFromResults(
  domain: string,
  brandProfile: BrandProfile,
  businessContext: string,
  results: ProviderResult[],
  initialCandidates: string[],
  metricsOut?: { metrics?: CompetitorFilterMetrics },
): Promise<string[]> {
  const brandName = brandProfile.primaryName;
  const responseStats = extractCompetitorCandidatesFromResults(results, brandName, domain);
  const responseCandidates = responseStats.map((s) => s.candidate);

  // Multi-provider corroboration: candidates seen by ≥2 providers are "trusted"
  // Single-provider candidates must survive the LLM refine + Perplexity validation gate
  const trustedCandidates = responseStats
    .filter((s) => s.providers.size >= 2)
    .map((s) => s.candidate);
  const singleProviderCandidates = responseStats
    .filter((s) => s.providers.size < 2)
    .map((s) => s.candidate);

  console.log(
    `[AutoReport] Response candidates: ${responseCandidates.length} (trusted ≥2 providers: ${trustedCandidates.length}, single-provider: ${singleProviderCandidates.length})`,
  );

  // Pre-split compound names: AI responses sometimes return "Facebook, LinkedIn" or "Acme/Beta"
  // as a single token. Split on commas/slashes/" and "/"&" and re-validate each fragment so the
  // exclusion list (channels, directories) catches the individual entities.
  //
  // IMPORTANT: Many law/professional firms legitimately contain "&" or "and" in their name
  // (e.g., "Morgan & Morgan", "Weitz & Luxenberg", "Cohen and Cohen"). We must NOT split these
  // or we'll destroy the firm name and Perplexity validation will reject the orphaned fragments.
  const splitCompound = (raw: string): string[] => {
    const trimmed = raw.trim();
    if (!/[,/]|\s+(?:and|&)\s+/i.test(trimmed)) return [trimmed];

    // Heuristic: treat as a single firm/brand name (do NOT split) when:
    //  - Short (<= 5 words) AND contains only one "&" / "and" connector AND no commas/slashes
    //    → covers "Morgan & Morgan", "Weitz & Luxenberg", "Cohen and Cohen Law", etc.
    //  - Repeated surname pattern "X & X" or "X and X" (always a single firm)
    const wordCount = trimmed.split(/\s+/).length;
    const hasComma = /,/.test(trimmed);
    const hasSlash = /\//.test(trimmed);
    const connectorMatches = trimmed.match(/\s+(?:and|&)\s+/gi) || [];

    // Repeated-surname pattern: "Morgan & Morgan", "Smith and Smith"
    const repeatMatch = trimmed.match(/^([A-Z][a-zA-Z'-]+)\s+(?:and|&)\s+\1(\s+[A-Z][\w&'.,-]*)*$/i);
    if (repeatMatch) return [trimmed];

    // Short firm-style name with a single "&"/"and" → keep intact
    if (!hasComma && !hasSlash && connectorMatches.length === 1 && wordCount <= 5) {
      return [trimmed];
    }

    // Trailing "& Partner" / "& Associates" / "& Co" style → keep intact
    if (!hasComma && !hasSlash && /\s+(?:&|and)\s+(?:Partners?|Associates?|Co\.?|Company|Sons?|Bros\.?|Brothers?|Daughters?)\b/i.test(trimmed)) {
      return [trimmed];
    }

    return trimmed
      .split(/\s*(?:,|\/|\s+and\s+|\s*&\s*)\s*/i)
      .map((s) => s.trim())
      .filter(Boolean);
  };
  const expandedCandidates = dedupeBrandNames(
    [...trustedCandidates, ...singleProviderCandidates, ...initialCandidates]
      .flatMap(splitCompound)
      .filter((c) => isLikelyCompetitorBrand(c, brandName, domain))
      .filter((c) => !isSelfBrandCandidate(c, brandProfile, domain)),
  );
  const combinedCandidates = expandedCandidates.slice(0, 20);

  if (combinedCandidates.length === 0) {
    return [];
  }

  // Strong-corroboration set: ≥2 providers OR ≥2 total mentions → trusted (skip OpenAI gate).
  // We STILL run Perplexity on trusted candidates to catch service categories like "Local SEO"
  // that organically show up across providers but aren't actually competitor brands.
  const initialKeys = new Set(initialCandidates.flatMap(splitCompound).map((c) => normalizeEntityName(c)));
  const strongKeys = new Set(
    responseStats
      .filter((s) => s.providers.size >= 2 || s.mentions >= 2)
      .flatMap((s) => splitCompound(s.candidate).map((c) => normalizeEntityName(c))),
  );

  const trustedDirect = combinedCandidates.filter((c) => {
    const key = normalizeEntityName(c);
    return strongKeys.has(key) || initialKeys.has(key);
  });
  const weakCandidates = combinedCandidates.filter((c) => {
    const key = normalizeEntityName(c);
    return !strongKeys.has(key) && !initialKeys.has(key);
  });

  console.log(
    `[AutoReport] Trusted (bypass all gates): ${trustedDirect.length}; weak (need OpenAI+Perplexity): ${weakCandidates.length}`,
  );

  // Only run the strict OpenAI/Perplexity gates on weak (single-mention, single-provider) candidates
  let weakAfterOpenAI: string[] = weakCandidates;

  if (OPENAI_API_KEY && weakCandidates.length > 0) {
    try {
      const snippets = results
        .filter((result) => result.response && !result.response.startsWith('Error') && !result.response.startsWith('Provider not') && !result.response.startsWith('No AI Overview'))
        .map((result, index) => `Snippet ${index + 1} (${result.provider}): ${result.response.replace(/\s+/g, ' ').trim().slice(0, 260)}`)
        .join('\n');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 400,
          messages: [
            {
              role: 'system',
              content: 'You filter a list of candidate competitor names. Your job is to REMOVE only obvious non-brands. Return ONLY a JSON array of the candidates that should be KEPT. KEEP any candidate that is plausibly the proper name of a real company — even if you are not 100% sure it exists, even if you have not heard of it. REMOVE only when the candidate is clearly: a descriptive phrase (e.g., "conversion-friendly websites"), a service category (e.g., "AI SEO", "CFO consulting"), a marketing tagline (e.g., "Fireproof Performance"), a common adjective (e.g., "Evergreen"), or a generic noun. When in doubt, KEEP. Bias heavily toward keeping.'
            },
            {
              role: 'user',
              content: `Target brand: ${brandName} (${domain})\n\nCandidates to filter:\n${weakCandidates.join('\n')}\n\nAI response snippets for context:\n${snippets}\n\nReturn ONLY a JSON array of the candidate strings to keep.`
            }
          ]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim() || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            const allowed = new Set(weakCandidates.map((candidate) => normalizeEntityName(candidate)));
            const refined = dedupeBrandNames(
              parsed
                .map((item: unknown) => typeof item === 'string' ? item : '')
                .filter((item: string) => isLikelyCompetitorBrand(item, brandName, domain))
                .filter((item: string) => allowed.has(normalizeEntityName(item)))
                .filter((item: string) => !isSelfBrandCandidate(item, brandProfile, domain))
            );

            // OpenAI is a SOFT signal — useful for removing obvious garbage, but it
            // routinely doesn't recognize small/local/niche brands (law firms, doctors,
            // local trades). If it would drop more than 60% of the weak candidates we
            // assume it's being over-aggressive and keep the union of OpenAI-kept
            // plus the top remaining candidates (so niche legitimate firms survive).
            if (refined.length > 0) {
              const minToKeep = Math.min(weakCandidates.length, Math.max(refined.length, Math.ceil(weakCandidates.length * 0.4)));
              if (refined.length >= minToKeep) {
                weakAfterOpenAI = refined;
              } else {
                // Backfill with weak candidates OpenAI dropped, preserving original order
                const refinedKeys = new Set(refined.map((c) => normalizeEntityName(c)));
                const backfill = weakCandidates.filter((c) => !refinedKeys.has(normalizeEntityName(c)));
                weakAfterOpenAI = dedupeBrandNames([...refined, ...backfill]).slice(0, minToKeep);
                console.log(
                  `[AutoReport] OpenAI refine kept ${refined.length}/${weakCandidates.length} — backfilled to ${weakAfterOpenAI.length} (40% floor) to protect niche brands`,
                );
              }
              if (weakAfterOpenAI.length < weakCandidates.length) {
                console.log(
                  `[AutoReport] OpenAI refine final: ${weakAfterOpenAI.length}/${weakCandidates.length} weak candidates kept`,
                );
              }
            } else {
              console.warn(
                `[AutoReport] OpenAI refine kept 0/${weakCandidates.length} — keeping all weak candidates`,
              );
            }
          }
        }
      } else {
        console.warn(`[AutoReport] OpenAI competitor refinement returned ${response.status}`);
      }
    } catch (error) {
      console.error('[AutoReport] Error refining competitor candidates from results:', error);
    }
  }

  // Perplexity is the final, strictest gate — now applied to BOTH trusted and weak candidates.
  // Trusted multi-provider candidates can still be service categories ("Local SEO") that
  // organically appear across providers, so they need verification too.
  const allForValidation = dedupeBrandNames([...trustedDirect, ...weakAfterOpenAI])
    .filter((candidate) => !isSelfBrandCandidate(candidate, brandProfile, domain));
  const validated = allForValidation.length > 0
    ? await validateCompetitorsWithPerplexity(allForValidation, brandName, domain, businessContext)
    : [];

  const finalList = dedupeBrandNames(validated)
    .filter((candidate) => !isSelfBrandCandidate(candidate, brandProfile, domain))
    .slice(0, 25);

  const metrics: CompetitorFilterMetrics = {
    domain,
    brandName,
    initial: initialCandidates.length,
    responseExtracted: responseCandidates.length,
    trustedMultiProvider: trustedCandidates.length,
    singleProvider: singleProviderCandidates.length,
    afterCompoundSplit: combinedCandidates.length,
    trustedBypass: trustedDirect.length,
    weakInput: weakCandidates.length,
    weakAfterOpenAI: weakAfterOpenAI.length,
    openAIApplied: !!OPENAI_API_KEY && weakCandidates.length > 0,
    openAIKeptAll: weakAfterOpenAI.length === weakCandidates.length,
    combinedForPerplexity: allForValidation.length,
    afterPerplexity: validated.length,
    final: finalList.length,
    droppedByOpenAI: Math.max(0, weakCandidates.length - weakAfterOpenAI.length),
    droppedByPerplexity: Math.max(0, allForValidation.length - validated.length),
    timestamp: new Date().toISOString(),
  };

  // Single-line structured log for easy querying / regression detection
  console.log(`[CompetitorFilterMetrics] ${JSON.stringify(metrics)}`);

  if (metricsOut) {
    metricsOut.metrics = metrics;
  }

  return finalList;
}

/**
 * Research the business to understand their industry and offerings
 * Caches results in the database to ensure consistency across runs
 */
async function researchBusiness(domain: string): Promise<string> {
  // Check DB cache first (keyed by domain, valid for 7 days)
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: cached } = await supabaseAdmin
      .from('free_checker_leads')
      .select('metadata')
      .eq('domain', domain)
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cachedResearch = (cached?.metadata as any)?.business_research;
    const cachedAt = (cached?.metadata as any)?.research_cached_at;
    if (cachedResearch && cachedAt) {
      const ageMs = Date.now() - new Date(cachedAt).getTime();
      if (ageMs < 7 * 24 * 60 * 60 * 1000) {
        console.log('[AutoReport] Using cached business research for', domain);
        return cachedResearch;
      }
    }
  } catch (e) {
    console.warn('[AutoReport] Cache lookup failed, will research fresh:', e);
  }

  if (!PERPLEXITY_API_KEY) {
    console.log('[AutoReport] No Perplexity key, skipping business research');
    return '';
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: `What does the company at ${domain} do? Provide a brief summary of:
1. Their industry/category
2. Their main products or services
3. Their target audience
4. Their key competitors

Keep the response concise (under 200 words).`
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity research error: ${response.status}`);
    }

    const data = await response.json();
    const businessContext = data.choices[0]?.message?.content || '';
    console.log('[AutoReport] Business research:', businessContext.substring(0, 200) + '...');

    // Persist to DB cache
    try {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: lead } = await supabaseAdmin
        .from('free_checker_leads')
        .select('id, metadata')
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lead) {
        await supabaseAdmin
          .from('free_checker_leads')
          .update({
            metadata: {
              ...(lead.metadata as any || {}),
              business_research: businessContext,
              research_cached_at: new Date().toISOString(),
            }
          })
          .eq('id', lead.id);
        console.log('[AutoReport] Cached business research for', domain);
      }
    } catch (e) {
      console.warn('[AutoReport] Failed to cache research:', e);
    }

    return businessContext;
  } catch (error) {
    console.error('[AutoReport] Error researching business:', error);
    return '';
  }
}

/**
 * Generate 8 industry-relevant prompts based on domain analysis
 */
async function generateIndustryPrompts(domain: string, businessContext: string): Promise<string[]> {
  if (!OPENAI_API_KEY) {
    console.log('[AutoReport] No OpenAI key, using default prompts');
    return getDefaultPrompts(domain);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at generating AI search prompts for competitive visibility audits. Generate exactly 8 UNBRANDED prompts that real buyers would ask an AI assistant while evaluating providers in this category.

CRITICAL RULES:
- Do NOT include the brand name, company name, or domain in any prompt
- Prompts must be UNBRANDED (no specific company names anywhere)
- All prompts should plausibly surface named firms, agencies, products, or competing brands

REQUIRED MIX (exactly 8 prompts following this distribution):
- 2 BROAD category prompts: "best [category]", "top [category] in 2025" or evergreen phrasing
- 3 LONG-TAIL intent prompts: include a specific buyer scenario, company size, geography, budget,
  use case, or industry vertical (e.g. "best CRM for a 10-person law firm", "marketing agency for B2B SaaS startups under $5M ARR")
- 2 COMPARISON / "vs" prompts: "X vs Y for [use case]" or "alternatives to [well-known incumbent] for [need]"
- 1 BUYER-DECISION prompt: "How do I choose…", "What should I look for in…", that requires the AI to name providers

YEAR RULES (STRICT):
- NEVER use the years 2020, 2021, 2022, 2023, or 2024 in any prompt under any circumstance.
- If a year is included, it MUST be 2025 or 2026, or use evergreen phrasing like "right now", "this year", or no year at all.
- Reject any phrasing like "in 2023" or "for 2024" — replace with "in 2025" or remove the year entirely.

Prompts must reflect what an actual buyer types when CHOOSING a provider, not what they type to learn the topic.`
          },
          {
            role: 'user',
            content: `Generate 8 unbranded AI search prompts for a business with domain "${domain}".

${businessContext ? `BUSINESS RESEARCH (use this to ground prompts in the right niche, geography, customer size, and use cases):
${businessContext}` : 'Industry: General business'}

Use the niche, ICP, geography, and competitors from the research to generate REALISTIC long-tail prompts. The more specific the better — vague prompts produce uninformative reports.

Return ONLY a JSON array of 8 prompt strings, no other text:
["broad 1", "broad 2", "long-tail 1", "long-tail 2", "long-tail 3", "vs 1", "vs 2", "buyer-decision 1"]`
          }
        ],
        temperature: 0,
        max_tokens: 800,
        seed: 42
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    // Parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const prompts = JSON.parse(jsonMatch[0]);
      if (Array.isArray(prompts) && prompts.length >= 8) {
        return prompts.slice(0, 8).map(sanitizePromptYear);
      }
    }
    
    return getDefaultPrompts(domain).map(sanitizePromptYear);
  } catch (error) {
    console.error('[AutoReport] Error generating prompts:', error);
    return getDefaultPrompts(domain).map(sanitizePromptYear);
  }
}

/**
 * Replace any stale year (2020-2024) with 2025 to keep prompts current.
 */
function sanitizePromptYear(prompt: string): string {
  if (typeof prompt !== 'string') return prompt;
  return prompt.replace(/\b20(1\d|2[0-4])\b/g, '2025');
}

function getDefaultPrompts(domain: string): string[] {
  const domainPart = domain.replace(/\.(com|io|net|org|co|app|ai|dev)$/i, '').toLowerCase();
  const niche = domainPart.includes('crm') ? 'CRM' : 'business software';

  return [
    // Broad
    `What are the best ${niche} platforms in 2025?`,
    `Top-rated ${niche} providers for growing companies`,
    // Long-tail intent
    `Best ${niche} for a 10-person team with a limited budget`,
    `Which ${niche} is best for B2B companies in North America?`,
    `Recommended ${niche} for an agency managing multiple clients`,
    // Comparison / vs
    `What are the best alternatives to the leading ${niche} platform?`,
    `Compare the top ${niche} vendors on pricing, support, and integrations`,
    // Buyer-decision
    `How do I choose the right ${niche} provider for my business?`,
  ];
}

/**
 * Determine failure reason based on domain and error context
 */
function getFailureReason(domain: string, errorMessage?: string): { reason: string; explanation: string } {
  const cleanDomain = domain?.trim().toLowerCase() || '';
  
  // Check for invalid domain patterns
  const validDomainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
  if (!validDomainRegex.test(cleanDomain)) {
    return {
      reason: "Invalid Domain Format",
      explanation: `The domain you entered ("${domain}") doesn't appear to be a valid website address. A valid domain looks like "example.com" or "mybusiness.io". Without a valid domain, we can't analyze how AI search engines perceive your brand.`
    };
  }
  
  // Check for common typos or incomplete domains
  if (cleanDomain.length < 4) {
    return {
      reason: "Domain Too Short",
      explanation: `The domain "${domain}" is too short to be a valid website. Please ensure you've entered your complete domain (e.g., "yourbrand.com").`
    };
  }
  
  // Check if it looks like just a brand name without TLD
  if (!cleanDomain.includes('.')) {
    return {
      reason: "Missing Domain Extension",
      explanation: `You entered "${domain}" which appears to be a brand name rather than a website domain. Please include the full domain with extension (e.g., "${domain}.com" or "${domain}.io").`
    };
  }
  
  // Generic error fallback
  if (errorMessage) {
    return {
      reason: "Technical Issue",
      explanation: `We encountered a technical issue while generating your report. Our team has been notified and is looking into it. This is usually temporary - please try again in a few minutes.`
    };
  }
  
  return {
    reason: "Unable to Analyze",
    explanation: `We weren't able to gather enough information about "${domain}" to generate a meaningful visibility report. This can happen with very new websites, private domains, or sites with limited online presence.`
  };
}

/**
 * Send failure notification email to user
 */
async function sendFailureNotificationEmail(
  email: string,
  firstName: string,
  domain: string,
  errorMessage?: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log('[AutoReport] No Resend key, cannot send failure notification');
    return false;
  }

  const { reason, explanation } = getFailureReason(domain, errorMessage);
  const calendlyLink = "https://calendly.com/llumos-info/llumos-demo";
  const displayName = firstName?.trim() || 'there';

  try {
    const resend = new Resend(RESEND_API_KEY);
    
    await resend.emails.send({
      from: "Llumos AI <reports@llumos.app>",
      to: email,
      subject: `Your AI Visibility Report Could Not Be Generated`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 28px;">🔍</span>
              </div>
              <h1 style="margin: 0; color: #1f2937; font-size: 24px;">
                Llumos AI Visibility Report
              </h1>
            </div>

            <!-- Main Content Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); margin-bottom: 24px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${displayName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for your interest in understanding your brand's AI search visibility! Unfortunately, we weren't able to generate your report for <strong style="color: #4f46e5;">${domain}</strong>.
              </p>

              <!-- Reason Box -->
              <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                  ⚠️ ${reason}
                </h3>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                  ${explanation}
                </p>
              </div>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                <strong>We'd love to help!</strong> If you believe there's been an error or you'd like personalized assistance with your AI visibility analysis, our team is here for you.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${calendlyLink}" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                  📅 Schedule a Free Consultation
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                In a 15-minute call, we can help you:
              </p>
              <ul style="color: #6b7280; font-size: 14px; line-height: 1.8; margin: 12px 0 0 0; padding-left: 20px;">
                <li>Understand your current AI search visibility</li>
                <li>Identify opportunities to improve your brand's presence</li>
                <li>Get personalized recommendations for your industry</li>
              </ul>
            </div>

            <!-- Alternative Action -->
            <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0;">
                Want to try again with a different domain?
              </p>
              <a href="https://llumos.app" style="color: #4f46e5; font-weight: 600; text-decoration: none;">
                Visit llumos.app →
              </a>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Llumos AI. All rights reserved.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
                You received this email because you requested an AI visibility report.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[AutoReport] Failure notification sent to ${email} for domain ${domain}`);
    return true;
  } catch (error) {
    console.error('[AutoReport] Error sending failure notification:', error);
    return false;
  }
}

/**
 * Query ChatGPT (OpenAI)
 */
async function queryChatGPT(prompt: string, brandProfile: BrandProfile, competitorCandidates: string[]): Promise<ProviderResult> {
  const result: ProviderResult = {
    provider: 'ChatGPT',
    prompt,
    response: '',
    brandMentioned: false,
    competitors: [],
    recommendedEntities: [],
    entityMentionStatus: {},
    score: 0,
    sentiment: 'not_mentioned',
    recommendationStrength: 'absent',
    brandPosition: null,
  };

  if (!OPENAI_API_KEY) {
    result.response = 'Provider not configured';
    return result;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

    const data = await response.json();
    result.response = data.choices[0]?.message?.content || '';
    result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    result.competitors = extractCompetitors(result.response, brandProfile, competitorCandidates);
    {
      const __cls = classifyEntityMentions(result.competitors, result.response);
      result.recommendedEntities = __cls.recommended;
      result.entityMentionStatus = __cls.statuses;
    }
    result.score = calculateProviderScore(result);
    result.sentiment = analyzeSentiment(result.response, brandProfile.primaryName);
    result.recommendationStrength = analyzeRecommendationStrength(result.response, brandProfile.primaryName);
    result.brandPosition = detectBrandPosition(result.response, brandProfile.primaryName);
  } catch (error) {
    console.error('[AutoReport] ChatGPT error:', error);
    result.response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

/**
 * Query Perplexity
 */
async function queryPerplexity(prompt: string, brandProfile: BrandProfile, competitorCandidates: string[]): Promise<ProviderResult> {
  const result: ProviderResult = {
    provider: 'Perplexity',
    prompt,
    response: '',
    brandMentioned: false,
    competitors: [],
    recommendedEntities: [],
    entityMentionStatus: {},
    score: 0,
    sentiment: 'not_mentioned',
    recommendationStrength: 'absent',
    brandPosition: null,
  };

  if (!PERPLEXITY_API_KEY) {
    result.response = 'Provider not configured';
    return result;
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        return_citations: true
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) throw new Error(`Perplexity error: ${response.status}`);

    const data = await response.json();
    result.response = data.choices[0]?.message?.content || '';
    result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    result.competitors = extractCompetitors(result.response, brandProfile, competitorCandidates);
    {
      const __cls = classifyEntityMentions(result.competitors, result.response);
      result.recommendedEntities = __cls.recommended;
      result.entityMentionStatus = __cls.statuses;
    }
    result.score = calculateProviderScore(result);
    result.sentiment = analyzeSentiment(result.response, brandProfile.primaryName);
    result.recommendationStrength = analyzeRecommendationStrength(result.response, brandProfile.primaryName);
    result.brandPosition = detectBrandPosition(result.response, brandProfile.primaryName);
  } catch (error) {
    console.error('[AutoReport] Perplexity error:', error);
    result.response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

/**
 * Query Claude (Anthropic)
 */
async function queryClaude(prompt: string, brandProfile: BrandProfile, competitorCandidates: string[]): Promise<ProviderResult> {
  const result: ProviderResult = {
    provider: 'Claude',
    prompt,
    response: '',
    brandMentioned: false,
    competitors: [],
    recommendedEntities: [],
    entityMentionStatus: {},
    score: 0,
    sentiment: 'not_mentioned',
    recommendationStrength: 'absent',
    brandPosition: null,
  };

  if (!ANTHROPIC_API_KEY) {
    result.response = 'Provider not configured';
    return result;
  }

  try {
    await acquireClaudeSlot();
    let response: Response;
    try {
      response = await fetchClaudeWithBackoff('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(45_000),
      });
    } finally {
      releaseClaudeSlot();
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`Claude error: ${response.status} ${response.statusText} — ${bodyText.slice(0, 300)}`);
    }

    const data = await response.json();
    result.response = (data.content || []).map((b: any) => b.text || '').join('\n').trim();
    result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    result.competitors = extractCompetitors(result.response, brandProfile, competitorCandidates);
    {
      const __cls = classifyEntityMentions(result.competitors, result.response);
      result.recommendedEntities = __cls.recommended;
      result.entityMentionStatus = __cls.statuses;
    }
    result.score = calculateProviderScore(result);
    result.sentiment = analyzeSentiment(result.response, brandProfile.primaryName);
    result.recommendationStrength = analyzeRecommendationStrength(result.response, brandProfile.primaryName);
    result.brandPosition = detectBrandPosition(result.response, brandProfile.primaryName);
  } catch (error) {
    console.error('[AutoReport] Claude error:', error);
    result.response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

/**
 * Query Google AI Overview via SerpAPI
 */
async function queryGoogleAIO(prompt: string, brandProfile: BrandProfile, competitorCandidates: string[]): Promise<ProviderResult> {
  const result: ProviderResult = {
    provider: 'Google AI',
    prompt,
    response: '',
    brandMentioned: false,
    competitors: [],
    recommendedEntities: [],
    entityMentionStatus: {},
    score: 0,
    sentiment: 'not_mentioned',
    recommendationStrength: 'absent',
    brandPosition: null,
  };

  if (!SERPAPI_KEY) {
    result.response = 'Provider not configured';
    return result;
  }

  try {
    const googleSearchUrl = new URL('https://serpapi.com/search.json');
    googleSearchUrl.searchParams.set('engine', 'google');
    googleSearchUrl.searchParams.set('q', prompt);
    googleSearchUrl.searchParams.set('api_key', SERPAPI_KEY);
    googleSearchUrl.searchParams.set('gl', 'us');
    googleSearchUrl.searchParams.set('hl', 'en');

    const searchResponse = await fetch(googleSearchUrl.toString(), {
      signal: AbortSignal.timeout(25_000),
    });
    if (!searchResponse.ok) throw new Error(`SerpAPI search error: ${searchResponse.status}`);

    const searchData = await searchResponse.json();
    const pageToken = searchData.ai_overview?.page_token;

    if (!pageToken) {
      result.response = 'No AI Overview available for this query';
      return result;
    }

    const aioUrl = new URL('https://serpapi.com/search.json');
    aioUrl.searchParams.set('engine', 'google_ai_overview');
    aioUrl.searchParams.set('page_token', pageToken);
    aioUrl.searchParams.set('api_key', SERPAPI_KEY);

    const aioResponse = await fetch(aioUrl.toString(), {
      signal: AbortSignal.timeout(25_000),
    });
    if (!aioResponse.ok) throw new Error(`SerpAPI AIO error: ${aioResponse.status}`);

    const aioData = await aioResponse.json();
    const aiOverview = aioData.ai_overview || aioData;

    if (aiOverview.text_blocks && Array.isArray(aiOverview.text_blocks)) {
      result.response = aiOverview.text_blocks
        .map((block: any) => block.snippet || block.text || '')
        .filter(Boolean)
        .join(' ')
        .trim();
    } else if (aiOverview.snippet || aiOverview.text) {
      result.response = aiOverview.snippet || aiOverview.text || '';
    }

    result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    result.competitors = extractCompetitors(result.response, brandProfile, competitorCandidates);
    {
      const __cls = classifyEntityMentions(result.competitors, result.response);
      result.recommendedEntities = __cls.recommended;
      result.entityMentionStatus = __cls.statuses;
    }
    result.score = calculateProviderScore(result);
    result.sentiment = analyzeSentiment(result.response, brandProfile.primaryName);
    result.recommendationStrength = analyzeRecommendationStrength(result.response, brandProfile.primaryName);
    result.brandPosition = detectBrandPosition(result.response, brandProfile.primaryName);
  } catch (error) {
    console.error('[AutoReport] Google AIO error:', error);
    result.response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

/**
 * Full-text entity extraction.
 *
 * Scans the FULL raw response text for organization/entity names — not just a
 * curated allowlist. Captures:
 *   - Domains (foo.com, bar.io)
 *   - Acronyms 2-6 chars (JAMS, NAM, LACBA, DTI, ADR)
 *   - Multi-word Title Case names ("Latham & Watkins", "Lewis Brisbois")
 *   - Names with firm/org suffixes (LLP, LLC, Inc, Group, Services,
 *     Association, Bar, Systems, Center, Foundation, Institute, Society,
 *     Council, Partners, Global, Legal Services)
 *   - Multi-part firm names with internal commas
 *     ("Munger, Tolles & Olson LLP", "Quinn Emanuel Urquhart & Sullivan LLP",
 *     "Farella Braun + Martel LLP")
 *
 * The result is filtered through isLikelyCompetitorBrand and self-brand
 * exclusion. Acronyms that look organization-shaped are admitted even if
 * they don't pass the strict multi-word title-case rule.
 */
const ORG_SUFFIX_RE =
  /\b(LLP|LLC|PLLC|PC|APC|APLC|PA|LP|PLC|Inc\.?|Ltd\.?|Co\.?|Group|Partners|Holdings|Services|Solutions|Systems|Global|Worldwide|International|Association|Bar Association|Bar|Foundation|Institute|Society|Council|Center|Centre|Network|Alliance|Coalition|Legal Services|Legal Group|Legal Aid|Law Group|Law Firm|Law Offices?|Mediation Center|Mediation Centre|Mediation Program|Mediation Services|Arbitration Association|Arbitration Services|Dispute Resolution Services|Dispute Resolution Center|& Associates|& Co\.?|& Partners)\b/i;

function extractAllOrgEntitiesFromText(
  text: string,
  brandProfile: BrandProfile,
  domain: string,
): string[] {
  if (!text) return [];

  const brandName = brandProfile.primaryName;
  const found: string[] = [];

  const push = (raw: string) => {
    const cleaned = raw
      // Strip leading list markers / punctuation
      .replace(/^[\s\-–—•·*▪▸:]+/, '')
      .replace(/[\s\-–—•·*▪▸:]+$/, '')
      // Strip surrounding quotes/brackets/parens
      .replace(/^["'`(\[]+|["'`)\]]+$/g, '')
      // Strip trailing citation markers like " [1]", "[2,3]"
      .replace(/\s*\[\d+(?:[,\s]+\d+)*\]\s*$/g, '')
      // Strip trailing URLs glued to the name
      .replace(/\s+\(?\bhttps?:\/\/\S+\)?$/i, '')
      // Strip trailing parenthetical descriptions ("Foo (a leading firm)")
      .replace(/\s*\([^)]{0,120}\)\s*$/g, '')
      // Strip trailing dash/colon descriptions ("Foo — leading firm", "Foo: trusted")
      .replace(/\s*[–—\-:]\s+[a-z].*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return;
    if (isSelfBrandCandidate(cleaned, brandProfile, domain)) return;
    found.push(cleaned);
  };

  // Pre-clean: strip inline citation markers so they don't break entity matches
  // ("JAMS [1]" → "JAMS ").
  const cleanText = text.replace(/\[\d+(?:[,\s]+\d+)*\]/g, ' ');

  // 1. Domains
  for (const m of cleanText.match(/\b(?:[a-z0-9-]+\.)+(?:com|io|net|org|co|app|ai|dev|law|legal|gov|edu)\b/gi) || []) {
    push(m);
  }

  // 2. Acronyms (JAMS, NAM, LACBA, DTI, ADR) — 2-6 uppercase letters,
  //    not at sentence start where they could be a normal capitalized word.
  //    We accept any all-caps token of length 2-6 except a small stoplist.
  const ACRONYM_STOP = new Set([
    'A', 'I', 'AI', 'AM', 'PM', 'US', 'USA', 'UK', 'EU', 'OK', 'TV', 'NO',
    'YES', 'CEO', 'CTO', 'CFO', 'COO', 'VP', 'IT', 'HR', 'PR', 'QA', 'UX',
    'UI', 'API', 'URL', 'PDF', 'FAQ', 'SEO', 'PPC', 'CRM', 'ERP', 'SaaS',
    'B2B', 'B2C', 'ROI', 'KPI', 'LLC', 'LLP', 'INC', 'LTD', 'PC', 'PA', 'PLLC',
    'APC', 'PLC', 'LP', 'APLC',
  ]);
  for (const m of cleanText.match(/\b[A-Z]{2,6}\b/g) || []) {
    if (ACRONYM_STOP.has(m)) continue;
    push(m);
  }

  // 3. Multi-part firm names with internal commas + "&" or "+" tail and
  //    optional firm suffix. Matches "Munger, Tolles & Olson LLP",
  //    "Quinn Emanuel Urquhart & Sullivan LLP", "Farella Braun + Martel LLP".
  const FIRM_COMPOUND_RE =
    /\b([A-Z][A-Za-z'’.-]+(?:[ ,]+[A-Z][A-Za-z'’.-]+){0,4}\s*[&+]\s*[A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){0,3})(?:\s+(?:LLP|LLC|PLLC|PC|APC|APLC|PA|LP|PLC|Inc\.?|Ltd\.?|Group|Partners))?/g;
  for (const m of cleanText.matchAll(FIRM_COMPOUND_RE)) {
    push(m[0]);
  }

  // 4. Names ending in an org/firm suffix ("Lewis Brisbois", "Duane Morris LLP",
  //    "Tactical Law Group LLP", "DTI Global", "Bet Tzedek Legal Services",
  //    "Los Angeles County Bar Association", "ADR Services", "Resolute Systems",
  //    "Smith APC", "Doe PLC").
  const NAME_WITH_SUFFIX_RE =
    /\b([A-Z][A-Za-z'’.&-]+(?:\s+[A-Z][A-Za-z'’.&-]+){0,5})\s+(LLP|LLC|PLLC|PC|APC|APLC|PA|LP|PLC|Inc\.?|Ltd\.?|Co\.?|Group|Partners|Holdings|Services|Solutions|Systems|Global|Worldwide|International|Association|Foundation|Institute|Society|Council|Center|Centre|Network|Alliance|Coalition)\b/g;
  for (const m of cleanText.matchAll(NAME_WITH_SUFFIX_RE)) {
    push(`${m[1]} ${m[2]}`);
  }

  // 5. Compound suffixes — legal/ADR/nonprofit specific:
  //    "X Bar Association", "X County Bar Association", "X State Bar",
  //    "X Legal Services / Group / Aid", "X Law Group / Firm / Offices",
  //    "X Mediation Center / Program / Services",
  //    "X Arbitration Association / Services",
  //    "X Dispute Resolution Services / Center",
  //    "X & Associates", "X & Partners".
  const COMPOUND_SUFFIX_RE =
    /\b([A-Z][A-Za-z'’.&-]+(?:\s+[A-Z][A-Za-z'’.&-]+){0,5})\s+(Bar Association|County Bar Association|State Bar|Bar Foundation|Legal Services|Legal Group|Legal Aid Foundation|Legal Aid Society|Legal Aid|Law Group|Law Firm|Law Offices|Law Office|Mediation Center|Mediation Centre|Mediation Program|Mediation Services|Arbitration Association|Arbitration Services|Dispute Resolution Services|Dispute Resolution Center|Dispute Resolution Centre|& Associates|& Partners)\b/g;
  for (const m of cleanText.matchAll(COMPOUND_SUFFIX_RE)) {
    push(`${m[1]} ${m[2]}`);
  }

  // 5b. "<City/State> Bar Association" / "State Bar" without a leading firm name.
  for (const m of cleanText.matchAll(/\b((?:[A-Z][A-Za-z'’.-]+\s+){1,4})(County Bar Association|State Bar|Bar Association)\b/g)) {
    push(`${m[1].trim()} ${m[2]}`);
  }

  // 6. Plain Title Case multi-word phrases (2-4 words).
  //    Captures "Lewis Brisbois", "Latham Watkins", "Gibson Dunn", etc.
  const TITLE_CASE_RE =
    /\b([A-Z][A-Za-z'’.-]{2,}(?:\s+(?:&|of|and)\s+|\s+)[A-Z][A-Za-z'’.-]{2,}(?:\s+[A-Z][A-Za-z'’.-]{2,}){0,2})\b/g;
  for (const m of cleanText.matchAll(TITLE_CASE_RE)) {
    push(m[1]);
  }

  // 7. Bulleted / numbered list items — extract the leading entity portion
  //    even when followed by a description, parenthetical, citation, or URL.
  for (const m of cleanText.matchAll(/(?:^|\n)\s*(?:\d+[.)]\s+|[-•*▪▸]\s+)([A-Z][A-Za-z0-9&'’.+,\- ]{2,120})/gm)) {
    // Use firm-aware splitter for items with commas
    if (m[1].includes(',')) {
      for (const part of splitFirmAwareList(m[1])) push(part);
    } else {
      push(m[1]);
    }
  }

  // 8. After trigger phrases ("such as", "include", "like", "alternatives include",
  //    "options include", "consider", "recommend", "providers include",
  //    "mediators include", "arbitrators include", "associations include").
  for (const m of cleanText.matchAll(
    /(?:include|includes|including|recommend|recommended|recommendation|options?(?:\s+include)?|such as|alternatives?(?:\s+(?:include|are))?|consider|try|platforms?\s+(?:include|like)|firms?\s+(?:include|like|such as)|companies?\s+(?:include|like|such as)|providers?\s+(?:include|like)|mediators?\s+(?:include|like)|arbitrators?\s+(?:include|like)|associations?\s+(?:include|like))\s*[:\-]?\s*([^.;:\n]{0,240})/gi,
  )) {
    for (const part of splitFirmAwareList(m[1].replace(/\//g, ','))) push(part);
  }


  // Deduplicate (case-insensitive normalized) and filter through brand-likeness.
  const seen = new Map<string, string>();
  for (const candidate of found) {
    const key = normalizeEntityName(candidate);
    if (!key || key.length < 2) continue;
    // Acronyms (all-caps 2-6 chars) bypass hasBrandLikeShape's multi-word
    // requirement but still go through self-brand exclusion above.
    const isAcronym = /^[A-Z]{2,6}$/.test(candidate);
    if (!isAcronym && !isLikelyCompetitorBrand(candidate, brandName, domain)) continue;
    // Acronyms still get a minimal sanity check
    if (isAcronym) {
      const norm = normalizeEntityName(candidate);
      if (NON_COMPETITOR_ENTITIES.has(norm)) continue;
      if (GENERIC_COMPETITOR_TERMS.has(norm)) continue;
      if (normalizeEntityName(brandName) === norm) continue;
    }
    if (!seen.has(key)) seen.set(key, candidate);
  }

  return Array.from(seen.values());
}

/**
 * Extract entities/competitors from the FULL raw response text.
 *
 * Strategy:
 *   1. Start with curated competitor candidates that the research/refinement
 *      pipeline produced (high-precision allowlist matches).
 *   2. ALWAYS also scan the full response with extractAllOrgEntitiesFromText
 *      so named organizations the allowlist missed (long firm names, acronyms
 *      like JAMS / NAM / LACBA, "X Bar Association", "X Legal Services", etc.)
 *      still surface in the report.
 *   3. Deduplicate by normalized name and exclude the brand itself.
 */
function extractCompetitors(text: string, brandProfile: BrandProfile, competitorCandidates: string[]): string[] {
  if (!text) return [];

  const seen = new Map<string, string>();
  const addIfFound = (candidate: string) => {
    const candidateClean = candidate.trim();
    if (!candidateClean || candidateClean.length < 2) return;
    if (isSelfBrandCandidate(candidateClean, brandProfile)) return;
    // Canonicalize so domain forms, abbreviations, punctuation/suffix variants
    // all collapse to one preferred display name across the report.
    const canonical = canonicalizeEntityName(candidateClean) || candidateClean;
    if (isSelfBrandCandidate(canonical, brandProfile)) return;
    const key = normalizeEntityName(canonical);
    if (!key) return;
    // Prefer the longer / more complete display when we see the same key twice
    // (e.g., "JAMS" beats "jamsadr.com"; "Gibson Dunn & Crutcher LLP" beats "Gibson Dunn").
    const existing = seen.get(key);
    if (!existing || canonical.length > existing.length) seen.set(key, canonical);
  };

  // 1. Curated allowlist matches (word-boundary safe)
  if (competitorCandidates && competitorCandidates.length) {
    for (const candidate of competitorCandidates) {
      const candidateLower = candidate.toLowerCase().trim();
      if (!candidateLower || candidateLower.length < 2) continue;
      try {
        const escaped = escapeRegExp(candidateLower);
        const pattern = candidateLower.length < 4
          ? new RegExp(`\\b${escaped}\\b`, 'i')
          : new RegExp(`(?:^|[\\s,;:(/"'\\[])${escaped}(?=[\\s,;:)/"'\\].'!?]|$)`, 'i');
        if (pattern.test(text)) addIfFound(candidate);
      } catch {
        if (text.toLowerCase().includes(candidateLower)) addIfFound(candidate);
      }
    }
  }

  // 2. Full-text entity extraction (always runs, even if allowlist is empty)
  const domain = brandProfile.domain || '';
  for (const entity of extractAllOrgEntitiesFromText(text, brandProfile, domain)) {
    addIfFound(entity);
  }

  return Array.from(seen.values());
}

/**
 * Classify HOW an entity is mentioned in the response.
 *
 *   preferred   — entity is ranked #1 / "best" / "top choice" / "go with"
 *   recommended — explicit "recommend / suggest / I'd go with / consider X"
 *                 within ~80 chars of the entity
 *   listed      — appears as a numbered/bulleted list item, or after a
 *                 trigger phrase like "such as / include / options include /
 *                 alternatives / consider / try / firms include"
 *   named       — referenced in body prose only (background, citation, footnote)
 *
 * The classifier is intentionally conservative: when in doubt, returns 'named'.
 * Only 'listed' / 'recommended' / 'preferred' count as recommendation events.
 */
function classifyEntityMentionStatus(entity: string, response: string): EntityMentionStatus {
  if (!entity || !response) return 'named';
  const lower = response.toLowerCase();
  const eLower = entity.toLowerCase();
  if (!lower.includes(eLower)) return 'named';

  let escaped: string;
  try {
    escaped = escapeRegExp(eLower);
  } catch {
    return 'named';
  }

  // PREFERRED: ranked #1 / explicitly the top pick
  const preferredPatterns: RegExp[] = [
    new RegExp(`(?:^|\\n)\\s*(?:#?\\s*)?1[.):\\-\\s][^\\n]{0,160}${escaped}`, 'i'),
    new RegExp(`${escaped}[^.\\n]{0,80}(?:is the best|is recommended|stands out|top choice|#1|number one|leading choice|go-to|gold standard)`, 'i'),
    new RegExp(`(?:best|top pick|first choice|go with|our pick|standout)[^.\\n]{0,80}${escaped}`, 'i'),
  ];
  for (const p of preferredPatterns) {
    try { if (p.test(lower)) return 'preferred'; } catch { /* ignore */ }
  }

  // RECOMMENDED: explicit recommendation language near the entity
  const recommendedPatterns: RegExp[] = [
    new RegExp(`(?:recommend|recommended|suggest|i['’]?d go with|consider|notable|reputable|well[- ]regarded|highly regarded|trusted)[^.\\n]{0,80}${escaped}`, 'i'),
    new RegExp(`${escaped}[^.\\n]{0,80}(?:is (?:a |an )?(?:strong|solid|excellent|great|good|reputable|reliable|trusted|leading)|comes (?:highly )?recommended)`, 'i'),
  ];
  for (const p of recommendedPatterns) {
    try { if (p.test(lower)) return 'recommended'; } catch { /* ignore */ }
  }

  // LISTED: appears in a numbered/bulleted list, OR follows a "such as / include" trigger
  // Look for the line containing the entity and check if it begins with a list marker.
  const lines = response.split('\n');
  for (const line of lines) {
    if (!line.toLowerCase().includes(eLower)) continue;
    if (/^\s*(?:\d+[.)]|[-•*▪▸])\s+/.test(line)) return 'listed';
  }

  const triggerListPatterns: RegExp[] = [
    new RegExp(`(?:include|includes|including|options?(?:\\s+include)?|such as|alternatives?(?:\\s+(?:include|are))?|firms?\\s+(?:include|like|such as)|companies?\\s+(?:include|like|such as)|platforms?\\s+(?:include|like)|try|consider)\\s*[:\\-]?[^.\\n]{0,260}${escaped}`, 'i'),
  ];
  for (const p of triggerListPatterns) {
    try { if (p.test(lower)) return 'listed'; } catch { /* ignore */ }
  }

  return 'named';
}

/**
 * Build the per-result map of canonical entity → mention status, plus the
 * strict subset of entities that count as recommendation events
 * (status ∈ {listed, recommended, preferred}).
 */
function classifyEntityMentions(
  entities: string[],
  response: string,
): { statuses: Record<string, EntityMentionStatus>; recommended: string[] } {
  const statuses: Record<string, EntityMentionStatus> = {};
  const recommended: string[] = [];
  const seenRec = new Set<string>();
  for (const e of entities) {
    const canon = e.toLowerCase().trim();
    if (!canon) continue;
    const status = classifyEntityMentionStatus(e, response);
    statuses[canon] = status;
    if (status !== 'named' && !seenRec.has(canon)) {
      seenRec.add(canon);
      recommended.push(e);
    }
  }
  return { statuses, recommended };
}

/**
 * Pull a short ±80-char evidence snippet around the first mention of `entity`
 * in `response`. Used by aiMentionedEntities + competitorRecommendationEvents.
 */
function buildEvidenceSnippet(entity: string, response: string, radius = 80): string {
  if (!entity || !response) return '';
  const lower = response.toLowerCase();
  const idx = lower.indexOf(entity.toLowerCase());
  if (idx < 0) return '';
  const start = Math.max(0, idx - radius);
  const end = Math.min(response.length, idx + entity.length + radius);
  let snippet = response.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = '…' + snippet;
  if (end < response.length) snippet = snippet + '…';
  return snippet;
}

/**
 * Count occurrences of entity in response (case-insensitive, word-boundary safe).
 */
function countEntityMentions(entity: string, response: string): number {
  if (!entity || !response) return 0;
  try {
    const re = new RegExp(`\\b${escapeRegExp(entity.toLowerCase())}\\b`, 'gi');
    return (response.match(re) || []).length;
  } catch {
    const lower = response.toLowerCase();
    const target = entity.toLowerCase();
    let count = 0;
    let i = 0;
    while ((i = lower.indexOf(target, i)) !== -1) { count++; i += target.length; }
    return count;
  }
}

/**
 * Detect 1-based position of an arbitrary entity inside a numbered/bulleted
 * list in the response. Mirrors detectBrandPosition() but for any entity.
 */
function detectEntityPosition(entity: string, response: string): number | null {
  if (!entity || !response) return null;
  const lower = entity.toLowerCase();
  const lines = response.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (!line.includes(lower)) continue;
    const numMatch = line.match(/^(?:#?\s*)?(\d+)[.):\-\s]/);
    if (numMatch) return parseInt(numMatch[1]);
    if (/^[-•*▪▸]/.test(line)) {
      let pos = 0;
      for (let j = 0; j <= i; j++) {
        if (/^[-•*▪▸]/.test(lines[j].trim())) pos++;
      }
      return pos;
    }
  }
  return null;
}


/**
 * Analyze sentiment of brand mention in response
 */
function analyzeSentiment(response: string, brandName: string): 'positive' | 'neutral' | 'negative' | 'not_mentioned' {
  if (!response.toLowerCase().includes(brandName.toLowerCase())) return 'not_mentioned';

  const text = response.toLowerCase();
  const brandIdx = text.indexOf(brandName.toLowerCase());
  // Look at ~300 chars around the brand mention
  const context = text.substring(Math.max(0, brandIdx - 150), Math.min(text.length, brandIdx + brandName.length + 150));

  const positiveTerms = ['best', 'top', 'leading', 'recommend', 'excellent', 'great', 'outstanding', 'trusted', 'popular', 'highly rated', 'well-known', 'reputable', 'premier', 'innovative', 'preferred', 'standout', 'notable', 'strong', 'impressive', 'ideal'];
  const negativeTerms = ['worst', 'poor', 'avoid', 'limited', 'lacking', 'expensive', 'overpriced', 'complaints', 'issues', 'problems', 'drawback', 'downside', 'criticism', 'disappointing', 'outdated'];
  // Note: 'however', 'but', 'although' removed - these are common transition words, not sentiment indicators

  let positiveScore = 0;
  let negativeScore = 0;

  for (const term of positiveTerms) {
    if (context.includes(term)) positiveScore++;
  }
  for (const term of negativeTerms) {
    if (context.includes(term)) negativeScore++;
  }

  if (positiveScore > negativeScore + 1) return 'positive';
  if (negativeScore > positiveScore + 1) return 'negative';
  return 'neutral';
}

/**
 * Analyze how strongly the AI platform recommends the brand
 */
function analyzeRecommendationStrength(response: string, brandName: string): 'strong' | 'moderate' | 'weak' | 'absent' {
  if (!response.toLowerCase().includes(brandName.toLowerCase())) return 'absent';

  const text = response.toLowerCase();
  const brandLower = brandName.toLowerCase();

  // Strong: brand is first mentioned, or explicitly recommended
  const strongPatterns = [
    new RegExp(`(?:recommend|suggest|top pick|best option|first choice|go with|standout)[^.]{0,60}${escapeRegExp(brandLower)}`),
    new RegExp(`${escapeRegExp(brandLower)}[^.]{0,60}(?:is the best|is recommended|stands out|is ideal|top choice|leading|#1|number one)`),
    new RegExp(`^[^.]{0,120}${escapeRegExp(brandLower)}`), // mentioned in first sentence
    new RegExp(`1[.)\\s]+[^.]*${escapeRegExp(brandLower)}`), // listed as #1
  ];

  for (const pattern of strongPatterns) {
    if (pattern.test(text)) return 'strong';
  }

  // Moderate: brand is mentioned among several options with some positive context
  const moderatePatterns = [
    new RegExp(`(?:also|another|consider|option|alternative)[^.]{0,60}${escapeRegExp(brandLower)}`),
    new RegExp(`${escapeRegExp(brandLower)}[^.]{0,60}(?:also|offers|provides|includes|features)`),
    new RegExp(`[2-5][.)\\s]+[^.]*${escapeRegExp(brandLower)}`), // listed in positions 2-5
  ];

  for (const pattern of moderatePatterns) {
    if (pattern.test(text)) return 'moderate';
  }

  return 'weak';
}

/**
 * Detect brand position in a ranked list (1-based), or null if not in a list
 */
function detectBrandPosition(response: string, brandName: string): number | null {
  if (!response.toLowerCase().includes(brandName.toLowerCase())) return null;

  const brandLower = brandName.toLowerCase();
  const lines = response.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (!line.includes(brandLower)) continue;

    // Check for numbered list patterns: "1.", "1)", "#1", "1 -"
    const numMatch = line.match(/^(?:#?\s*)?(\d+)[.):\-\s]/);
    if (numMatch) return parseInt(numMatch[1]);

    // Check for bullet lists - count position
    if (/^[-•*▪▸]/.test(line)) {
      let pos = 0;
      for (let j = 0; j <= i; j++) {
        if (/^[-•*▪▸]/.test(lines[j].trim())) pos++;
      }
      return pos;
    }
  }

  return null;
}

/**
 * Calculate provider consistency score
 * Returns 0-100: how consistently the brand is mentioned across providers for the same prompt
 */
function calculateProviderConsistency(results: ProviderResult[]): { score: number; label: string; detail: string } {
  const validResults = results.filter(
    (result) => result.response && !result.response.startsWith('Error') && !result.response.startsWith('Provider not') && !result.response.startsWith('No AI Overview')
  );

  if (validResults.length === 0) {
    return { score: 0, label: 'Insufficient Data', detail: 'Not enough valid responses to measure consistency.' };
  }

  const totalMentions = validResults.filter((result) => result.brandMentioned).length;
  const mentionRate = totalMentions / validResults.length;

  if (totalMentions === 0) {
    return {
      score: 0,
      label: 'No Visibility',
      detail: 'Your brand was not mentioned in any AI response, so consistency cannot be measured.'
    };
  }

  // Compute per-PROVIDER mention rates and measure how tightly providers agree with each other.
  // True consistency = providers behave similarly. Wide variance (e.g. ChatGPT 8/8, Google 1/8)
  // indicates LOW consistency, no matter how strong any single provider's signal is.
  const providerMentionRates = new Map<string, { mentioned: number; total: number }>();
  for (const r of validResults) {
    const cur = providerMentionRates.get(r.provider) || { mentioned: 0, total: 0 };
    cur.total += 1;
    if (r.brandMentioned) cur.mentioned += 1;
    providerMentionRates.set(r.provider, cur);
  }

  const rates = Array.from(providerMentionRates.entries()).map(([provider, v]) => ({
    provider,
    rate: v.total > 0 ? v.mentioned / v.total : 0,
    mentioned: v.mentioned,
    total: v.total,
  }));

  if (rates.length < 2) {
    const r0 = rates[0];
    const score = r0 ? Math.round(r0.rate * 100) : 0;
    return {
      score,
      label: score >= 60 ? 'Single Provider' : 'Insufficient Data',
      detail: r0
        ? `Only one provider returned valid responses: ${r0.provider} mentioned your brand in ${r0.mentioned}/${r0.total} prompts.`
        : 'Not enough valid provider responses to measure consistency.',
    };
  }

  // Spread = max-rate minus min-rate. Lower spread = higher consistency.
  const maxRate = Math.max(...rates.map((r) => r.rate));
  const minRate = Math.min(...rates.map((r) => r.rate));
  const spread = maxRate - minRate;

  // Average mention rate across providers (the visibility floor)
  const avgRate = rates.reduce((sum, r) => sum + r.rate, 0) / rates.length;

  // Consistency score: penalize spread heavily, but require some visibility for "high" labels.
  // - 0% spread + any visibility -> 100 * sqrt(avgRate) (so 100% mentions = 100, 25% mentions = 50)
  // - 50%+ spread (e.g., 8/8 vs 1/8 = 87.5% spread) -> dramatically reduced
  const agreementFactor = Math.max(0, 1 - spread); // 1.0 = perfect agreement, 0 = total disagreement
  const visibilityFactor = Math.sqrt(avgRate); // dampens — partial visibility yields partial consistency
  const score = Math.round(agreementFactor * visibilityFactor * 100);

  // Build human-readable detail showing the provider-by-provider breakdown
  const breakdown = rates
    .sort((a, b) => b.rate - a.rate)
    .map((r) => `${r.provider} ${r.mentioned}/${r.total}`)
    .join(', ');

  let label: string;
  let detail: string;
  if (avgRate === 0) {
    label = 'No Visibility';
    detail = 'Your brand was not mentioned in any AI response, so consistency cannot be measured.';
  } else if (spread <= 0.15 && avgRate >= 0.6) {
    label = 'High Consistency';
    detail = `AI platforms agree about your brand: ${breakdown}. A reliable, repeatable visibility signal.`;
  } else if (spread <= 0.35) {
    label = 'Moderate Consistency';
    detail = `Providers mostly agree but with some variance: ${breakdown}.`;
  } else {
    label = 'Low Consistency';
    detail = `Provider results diverge sharply: ${breakdown}. Visibility is platform-dependent rather than universal.`;
  }

  return { score, label, detail };
}

/**
 * Build competitor head-to-head matrix
 * Returns: { promptText -> { competitorName -> mentioned:boolean } }
 */
function buildHeadToHeadMatrix(results: ProviderResult[], brandName: string): {
  prompts: string[];
  competitors: string[];
  matrix: Record<string, Record<string, boolean>>;
  brandRow: Record<string, boolean>;
} {
  const allCompetitors = new Set<string>();
  const competitorCounts = new Map<string, number>();
  const promptTexts: string[] = [];
  const promptSet = new Set<string>();

  for (const result of results) {
    if (!promptSet.has(result.prompt)) {
      promptSet.add(result.prompt);
      promptTexts.push(result.prompt);
    }

    // Head-to-Head Matrix uses RECOMMENDATION EVENTS only — entities the AI
    // actually listed/recommended/preferred. Background-mention entities are
    // surfaced separately in the Competitor Landscape section.
    for (const competitor of result.recommendedEntities || []) {
      allCompetitors.add(competitor);
      competitorCounts.set(competitor, (competitorCounts.get(competitor) || 0) + 1);
    }
  }

  const competitors = Array.from(allCompetitors).sort(
    (a, b) => (competitorCounts.get(b) || 0) - (competitorCounts.get(a) || 0) || a.localeCompare(b)
  );
  const matrix: Record<string, Record<string, boolean>> = {};
  const brandRow: Record<string, boolean> = {};

  for (const prompt of promptTexts) {
    const promptResults = results.filter((result) => result.prompt === prompt);
    const validResults = promptResults.filter(
      (result) => !result.response.startsWith('Error') && !result.response.startsWith('Provider not') && !result.response.startsWith('No AI Overview')
    );

    brandRow[prompt] = validResults.some((result) => result.brandMentioned);

    for (const competitor of competitors) {
      if (!matrix[competitor]) matrix[competitor] = {};
      matrix[competitor][prompt] = validResults.some((result) => (result.recommendedEntities || []).includes(competitor));
    }
  }

  return { prompts: promptTexts, competitors, matrix, brandRow };
}

/**
 * Calculate visibility score for a provider result.
 *
 * Rebalanced to better reflect the response signal:
 * - Mentioned at all: 45 (raised from 35 — being named at all is the hardest threshold to cross)
 * - Strong recommendation: +25, Moderate: +15, Weak: +5
 * - Position bonus: top-3 +15, top-5 +8, otherwise +4 if mentioned (don't over-penalize unknown position)
 * - Share-of-voice bonus within prompt: up to +10 when brand outshines competitors in the same response
 * - Positive context terms: +2 each (capped at +8)
 */
function calculateProviderScore(result: ProviderResult): number {
  if (!result.brandMentioned) return 0;

  let score = 45;

  if (result.recommendationStrength === 'strong') score += 25;
  else if (result.recommendationStrength === 'moderate') score += 15;
  else score += 5;

  if (result.brandPosition !== null && result.brandPosition <= 3) score += 15;
  else if (result.brandPosition !== null && result.brandPosition <= 5) score += 8;
  else score += 4; // mentioned but position unknown — small credit so we don't strand at 45

  // Share of voice within this single response: brand vs competitors named in the same answer
  // Use recommendation events (not background mentions) so the brand isn't
  // penalized when the AI merely name-checks unrelated entities in passing.
  const competitorCount = result.recommendedEntities?.length || 0;
  const totalNamed = competitorCount + 1; // +1 for the brand itself
  const sov = 1 / totalNamed;
  score += Math.round(sov * 10); // up to +10 when brand is the only one named

  const positiveTerms = ['best', 'top', 'leading', 'recommend', 'excellent', 'great', 'trusted'];
  let posBonus = 0;
  const lower = result.response.toLowerCase();
  for (const term of positiveTerms) {
    if (lower.includes(term)) posBonus += 2;
  }
  score += Math.min(posBonus, 8);

  return Math.min(score, 100);
}

/**
 * Category visibility diagnostic (D).
 * Tells us whether 0 mentions are because the brand is invisible, or because the
 * AI categorically doesn't surface ANY brand-style answer for this category.
 *
 * IMPORTANT: This is purely a diagnostic. It MUST NOT contribute points to the
 * AI Visibility Score. The `adjustment` field is retained at 0 for shape
 * compatibility with existing PDF/persistence call sites.
 */
function computeCategoryVisibility(results: ProviderResult[]): {
  coverage: number;
  label: 'Active Category' | 'Sparse Category' | 'Invisible Category';
  adjustment: number;
  detail: string;
  interpretation: string;
} {
  const valid = results.filter(
    r => r.response && !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview')
  );
  if (valid.length === 0) {
    return {
      coverage: 0,
      label: 'Invisible Category',
      adjustment: 0,
      detail: 'No valid AI responses to evaluate.',
      interpretation: 'No AI responses were available, so category difficulty cannot be assessed.',
    };
  }
  const withAnyBrand = valid.filter(r => r.brandMentioned || (r.competitors && r.competitors.length > 0)).length;
  const coverage = withAnyBrand / valid.length;
  const pct = Math.round(coverage * 100);

  if (coverage >= 0.6) {
    return {
      coverage,
      label: 'Active Category',
      adjustment: 0,
      detail: `AI search engines name specific brands in ${pct}% of these queries — this is a competitive, brand-aware category.`,
      interpretation: 'AI platforms regularly name specific brands for this query set, so visibility is earned by being one of the brands they choose to name.',
    };
  }
  if (coverage >= 0.25) {
    return {
      coverage,
      label: 'Sparse Category',
      adjustment: 0,
      detail: `AI search engines name specific brands in only ${pct}% of these queries.`,
      interpretation: 'AI platforms inconsistently name brands for this query set. Visibility is harder to earn here, but the category context does not add points to your score.',
    };
  }
  return {
    coverage,
    label: 'Invisible Category',
    adjustment: 0,
    detail: `AI search engines almost never name specific brands for these queries (${pct}% coverage).`,
    interpretation: 'AI platforms rarely name specific brands for this query set, which means you have an opportunity to define the category — but you do not receive visibility points unless your brand is actually mentioned.',
  };
}

/**
 * Competitor type taxonomy. Used to make the competitor landscape less misleading
 * (e.g. don't lump JAMS, an ADR provider, in with actual law firms).
 */
type CompetitorType =
  | 'Direct Competitor'
  | 'Large Firm / Enterprise Competitor'
  | 'Local or Boutique Competitor'
  | 'Marketplace / Directory'
  | 'Software Platform'
  | 'ADR Provider'
  | 'Adjacent Service Provider'
  | 'Irrelevant / Excluded';

interface ClassifiedCompetitor {
  name: string;
  canonical: string;          // lowercased dedupe key
  type: CompetitorType;
  source: 'ai_mentioned' | 'research_backed';
  mentionCount: number;       // 0 if research_backed only
  reason?: string;            // short note explaining classification
}

/**
 * Best-effort industry inference for the report. Used to switch competitor
 * classification rules (e.g. law-firm reports treat ADR + software differently).
 */
function inferReportIndustry(businessContext: string, prompts: string[] = []): 'legal' | 'saas' | 'ecommerce' | 'agency' | 'general' {
  const blob = (businessContext + '\n' + prompts.join('\n')).toLowerCase();
  if (/\b(law\s*firm|attorney|attorneys|lawyer|lawyers|litigation|paralegal|counsel|legal services|personal injury|family law|estate planning|criminal defense)\b/.test(blob)) {
    return 'legal';
  }
  if (/\b(saas|software|platform|api|crm|erp|developer|cloud|app)\b/.test(blob)) return 'saas';
  if (/\b(ecommerce|e-commerce|shopify|store|dtc|d2c|retail|brand)\b/.test(blob)) return 'ecommerce';
  if (/\b(agency|marketing agency|consultancy|consulting firm)\b/.test(blob)) return 'agency';
  return 'general';
}

// Curated lookups for entities that consistently get miscategorized.
const KNOWN_ADR_PROVIDERS = new Set([
  'jams', 'aaa', 'american arbitration association', 'cpr', 'cpr institute',
  'icc', 'international chamber of commerce', 'finra', 'icdr', 'judicate west',
  'arbitration resolution services', 'ars', 'ncdr', 'mediate.com', 'fedarb',
]);

const KNOWN_LEGAL_DIRECTORIES = new Set([
  'avvo', 'findlaw', 'justia', 'lawyers.com', 'lawyers com', 'martindale',
  'martindale-hubbell', 'martindale hubbell', 'nolo', 'martindale-nolo',
  'super lawyers', 'superlawyers', 'lawinfo', 'best lawyers', 'chambers',
  'chambers and partners', 'legal500', 'legal 500', 'lawyer.com',
]);

const KNOWN_LEGAL_SOFTWARE = new Set([
  'clio', 'mycase', 'practicepanther', 'practice panther', 'smokeball',
  'rocket matter', 'lawpay', 'casetext', 'lex machina', 'westlaw', 'lexisnexis',
  'lexis nexis', 'lexis', 'fastcase', 'thomson reuters', 'bloomberg law',
  'filevine', 'litify', 'centerbase', 'cosmolex', 'zola suite', 'leap',
]);

const LARGE_NATIONAL_LAW_FIRMS = new Set([
  'morgan & morgan', 'morgan and morgan', 'jacoby & meyers', 'jacoby and meyers',
  'cellino law', 'cellino & barnes', 'sokolove law', 'parker waichman',
  'weitz & luxenberg', 'weitz and luxenberg', 'baker mckenzie', 'baker & mckenzie',
  'kirkland & ellis', 'kirkland and ellis', 'latham & watkins', 'dla piper',
  'jones day', 'sidley austin', 'skadden', 'gibson dunn', 'white & case',
  'allen overy', 'allen & overy', 'clifford chance', 'norton rose fulbright',
  'mayer brown', 'hogan lovells', 'reed smith', 'greenberg traurig',
]);

const ADJACENT_SERVICE_KEYWORDS = [
  'insurance', 'consultant', 'consulting', 'mediator', 'expert witness',
  'process server', 'court reporter', 'investigator', 'accountant', 'cpa',
];

const SOFTWARE_KEYWORDS = [
  'software', 'platform', 'app', 'tool', 'tools', 'saas', 'system',
  'crm', 'cms', 'api', 'cloud', 'analytics',
];

const DIRECTORY_KEYWORDS = [
  'directory', 'marketplace', 'listing', 'reviews', 'review site', 'rankings',
];

const LARGE_FIRM_NAME_HINTS = [
  // Ampersand or multi-partner naming patterns common in big firms
  /\s&\s/, /\s+and\s+/i,
];

function classifyEntity(
  rawName: string,
  industry: 'legal' | 'saas' | 'ecommerce' | 'agency' | 'general',
  context?: { promptText?: string }
): { type: CompetitorType; reason: string } {
  const name = rawName.trim();
  const lower = name.toLowerCase();
  const promptLower = (context?.promptText || '').toLowerCase();
  const promptAsksForSoftware = /\b(software|platform|app|tool|tools|saas|crm|system)\b/.test(promptLower);

  if (!name || name.length < 2) return { type: 'Irrelevant / Excluded', reason: 'too short' };

  // Curated lookups (highest priority)
  if (KNOWN_ADR_PROVIDERS.has(lower)) return { type: 'ADR Provider', reason: 'known ADR provider' };
  if (KNOWN_LEGAL_DIRECTORIES.has(lower)) return { type: 'Marketplace / Directory', reason: 'known legal directory' };
  if (KNOWN_LEGAL_SOFTWARE.has(lower)) {
    // For law firm reports, software is NOT a direct competitor unless prompt asks for software.
    if (industry === 'legal' && !promptAsksForSoftware) {
      return { type: 'Software Platform', reason: 'legal software (not a law-firm competitor)' };
    }
    return { type: 'Software Platform', reason: 'known legal-tech software' };
  }
  if (LARGE_NATIONAL_LAW_FIRMS.has(lower)) {
    return { type: 'Large Firm / Enterprise Competitor', reason: 'known large/national law firm' };
  }

  // Heuristic keyword checks
  if (DIRECTORY_KEYWORDS.some(k => lower.includes(k))) {
    return { type: 'Marketplace / Directory', reason: 'directory/marketplace keyword' };
  }
  if (SOFTWARE_KEYWORDS.some(k => lower.includes(k))) {
    if (industry === 'legal' && !promptAsksForSoftware) {
      return { type: 'Software Platform', reason: 'software keyword (not law-firm competitor)' };
    }
    return { type: 'Software Platform', reason: 'software keyword' };
  }
  if (ADJACENT_SERVICE_KEYWORDS.some(k => lower.includes(k))) {
    return { type: 'Adjacent Service Provider', reason: 'adjacent service keyword' };
  }

  if (industry === 'legal') {
    const looksLikeFirm = /\b(law|legal|attorneys?|lawyers?|llp|pllc|p\.c\.|pc|firm|associates|& associates)\b/i.test(name);
    if (looksLikeFirm) {
      // Multi-partner naming usually = large firm
      if (LARGE_FIRM_NAME_HINTS.some(rx => rx.test(name)) && /[A-Z][a-z]+\s*[&,]\s*[A-Z]/.test(name)) {
        return { type: 'Large Firm / Enterprise Competitor', reason: 'multi-partner law firm naming' };
      }
      return { type: 'Local or Boutique Competitor', reason: 'law-firm naming pattern' };
    }
    // Generic org with no legal signal in a legal report — adjacent at best.
    return { type: 'Adjacent Service Provider', reason: 'no clear legal signal' };
  }

  // Non-legal industries: default to Direct Competitor.
  return { type: 'Direct Competitor', reason: 'default classification' };
}

/**
 * Share of Voice — based on AI-mentioned RECOMMENDATION EVENTS only.
 * Research-backed competitors that never appeared in any AI response are excluded.
 *
 *   sov = brandRecommendationEvents / (brandRecommendationEvents + competitorRecommendationEvents)
 *
 * A "recommendation event" is a valid AI response where the entity was named
 * (and for the brand, framed at minimum as a moderate/strong recommendation).
 * Backwards-compat fields `brandMentions` / `competitorMentions` are kept but
 * now mirror the recommendation-event counts.
 */
function computeShareOfVoice(
  results: ProviderResult[],
  options?: { excludedCompetitorTypes?: Set<CompetitorType>; classify?: (name: string) => CompetitorType }
): { sov: number; brandMentions: number; competitorMentions: number; brandRecommendationEvents: number; competitorRecommendationEvents: number } {
  let brandRecommendationEvents = 0;
  let competitorRecommendationEvents = 0;
  const excluded = options?.excludedCompetitorTypes ?? new Set<CompetitorType>(['Irrelevant / Excluded']);

  for (const r of results) {
    if (r.brandMentioned && (r.recommendationStrength === 'strong' || r.recommendationStrength === 'moderate')) {
      brandRecommendationEvents += 1;
    }
    // Per-response competitor recommendation event: the response NAMED at least one competitor.
    // Research-backed entities are not in r.competitors (extractCompetitors only keeps names found in the text),
    // so they are naturally excluded here.
    // SoV uses RECOMMENDATION EVENTS only (entities the AI listed/recommended/preferred),
    // never background mentions. Keeps SoV conservative even as we capture more entities.
    const namedCompetitors = (r.recommendedEntities || []).filter(c => {
      if (!options?.classify) return true;
      const t = options.classify(c);
      return !excluded.has(t);
    });
    if (namedCompetitors.length > 0) {
      competitorRecommendationEvents += 1;
    }
  }

  const total = brandRecommendationEvents + competitorRecommendationEvents;
  const sov = total === 0 ? 0 : brandRecommendationEvents / total;
  return {
    sov,
    brandMentions: brandRecommendationEvents,
    competitorMentions: competitorRecommendationEvents,
    brandRecommendationEvents,
    competitorRecommendationEvents,
  };
}


// Pure visibility scoring lives in ./scoring.ts so it can be unit-tested
// without pulling in npm: imports. Re-exported for convenience.
import { computeVisibilityScore, type VisibilityScoreBreakdown } from './scoring.ts';
export { computeVisibilityScore, type VisibilityScoreBreakdown };

/**
 * AI Opportunity Score — answers "How much room is there to win visibility in this category?"
 * This is INTENTIONALLY separate from the AI Visibility Score and must NOT be blended into it.
 *
 * Components:
 *   1. Category Opportunity (0-35)
 *   2. Competitor Gap       (0-25)
 *   3. Prompt Intent Opportunity (0-20) — share of high-intent prompts where the brand is absent
 *   4. Provider Opportunity (0-20) — share of providers where the brand never appears
 */
const HIGH_INTENT_PROMPT_TERMS = [
  'best', 'top', 'near me', 'alternative', 'alternatives',
  'company', 'companies', 'firm', 'firms', 'agency', 'agencies',
  'provider', 'providers', 'service', 'services',
  'attorney', 'attorneys', 'lawyer', 'lawyers',
];

/**
 * Buyer-intent classification for prompts. Drives weighted coverage,
 * opportunity scoring, and content-gap prioritization.
 *
 * Weights (per spec):
 *   High Commercial Intent  → 1.25
 *   Provider Search Intent  → 1.00
 *   Comparison / Evaluation → 0.75
 *   Educational             → 0.50
 */
type PromptIntent =
  | 'High Commercial Intent'
  | 'Provider Search Intent'
  | 'Comparison / Evaluation Intent'
  | 'Educational Intent';

const PROMPT_INTENT_WEIGHTS: Record<PromptIntent, number> = {
  'High Commercial Intent': 1.25,
  'Provider Search Intent': 1.0,
  'Comparison / Evaluation Intent': 0.75,
  'Educational Intent': 0.5,
};

const PROMPT_INTENT_PRIORITY: Record<PromptIntent, 'High' | 'Medium' | 'Low'> = {
  'High Commercial Intent': 'High',
  'Provider Search Intent': 'High',
  'Comparison / Evaluation Intent': 'Medium',
  'Educational Intent': 'Low',
};

function classifyPromptIntent(prompt: string): { intent: PromptIntent; weight: number; priority: 'High' | 'Medium' | 'Low' } {
  const p = (prompt || '').toLowerCase();

  // 1. High Commercial Intent — superlatives, "near me", alternative-to, "[role] for X"
  const highCommercial =
    /\b(best|top|leading|#1|number\s+one|cheapest|most\s+(?:trusted|recommended|reputable)|highest[-\s]rated|five[-\s]star)\b/.test(p) ||
    /\bnear\s+me\b/.test(p) ||
    /\balternatives?\s+to\b/.test(p) ||
    /\b(law\s*firm|attorney|lawyer|agency|company|provider|service|firm)\s+for\b/.test(p);

  if (highCommercial) {
    return { intent: 'High Commercial Intent', weight: PROMPT_INTENT_WEIGHTS['High Commercial Intent'], priority: PROMPT_INTENT_PRIORITY['High Commercial Intent'] };
  }

  // 3. Comparison / Evaluation
  const comparison =
    /\b(vs|versus|compare|comparison|difference\s+between)\b/.test(p) ||
    /\bwhat\s+(?:should\s+i\s+)?look\s+for\b/.test(p) ||
    /\bhow\s+(?:do\s+i|to)\s+choose\b/.test(p) ||
    /\bpros\s+and\s+cons\b/.test(p) ||
    /\bquestions\s+to\s+ask\b/.test(p);
  if (comparison) {
    return { intent: 'Comparison / Evaluation Intent', weight: PROMPT_INTENT_WEIGHTS['Comparison / Evaluation Intent'], priority: PROMPT_INTENT_PRIORITY['Comparison / Evaluation Intent'] };
  }

  // 4. Educational Intent — "what is", "how does ... work", "guide", "tutorial"
  const educational =
    /\b(what\s+is|what\s+are|how\s+does\b.*\bwork|how\s+do\b.*\bwork|why\s+(?:is|do|does)|definition\s+of)\b/.test(p) ||
    /\b(guide|tutorial|introduction|overview|explained|explainer|basics\s+of|101)\b/.test(p);
  if (educational) {
    return { intent: 'Educational Intent', weight: PROMPT_INTENT_WEIGHTS['Educational Intent'], priority: PROMPT_INTENT_PRIORITY['Educational Intent'] };
  }

  // 2. Provider Search Intent — names a provider role + a context (industry / location / specialty / use case)
  const providerRole =
    /\b(attorney|attorneys|lawyer|lawyers|firm|firms|law\s*firm|agency|agencies|provider|providers|company|companies|service|services|consultant|consultants|specialist|expert)\b/.test(p);
  const providerContext =
    /\b(in\s+[a-z][a-z\s]{2,}|for\s+(?:a|an|my|our)\s+\w+|for\s+\w+|near\s+\w+|specializing\s+in|that\s+(?:does|handles|covers))\b/.test(p) ||
    /\b(litigation|dispute|probate|estate|criminal|family|employment|real\s+estate|injury|tax|patent|trademark|immigration|bankruptcy|civil)\b/.test(p);
  if (providerRole && providerContext) {
    return { intent: 'Provider Search Intent', weight: PROMPT_INTENT_WEIGHTS['Provider Search Intent'], priority: PROMPT_INTENT_PRIORITY['Provider Search Intent'] };
  }
  if (providerRole) {
    // Bare provider role without strong commercial superlatives → still provider search.
    return { intent: 'Provider Search Intent', weight: PROMPT_INTENT_WEIGHTS['Provider Search Intent'], priority: PROMPT_INTENT_PRIORITY['Provider Search Intent'] };
  }

  // Default: treat as educational (lowest weight) so unknown phrasing never inflates the score.
  return { intent: 'Educational Intent', weight: PROMPT_INTENT_WEIGHTS['Educational Intent'], priority: PROMPT_INTENT_PRIORITY['Educational Intent'] };
}

function isHighIntentPrompt(prompt: string): boolean {
  // Backwards-compat helper used by AI Opportunity Score's prompt-intent component.
  // High-intent now means commercial OR provider-search (the two priorities sales cares about).
  const { intent } = classifyPromptIntent(prompt);
  return intent === 'High Commercial Intent' || intent === 'Provider Search Intent';
}

function computeAIOpportunityScore(
  results: ProviderResult[],
  categoryCoverage: number,
): {
  score: number;
  label: 'High Opportunity' | 'Moderate Opportunity' | 'Low Opportunity';
  breakdown: {
    categoryOpportunity: number;
    competitorGapScore: number;
    promptIntentOpportunityScore: number;
    providerOpportunityScore: number;
    absentHighIntentPromptRate: number;
    providerOpportunity: number;
    brandRecommendationEvents: number;
    competitorRecommendationEvents: number;
    highIntentPromptCount: number;
    absentHighIntentPromptCount: number;
    totalProviders: number;
    providersWhereBrandWasAbsent: number;
  };
} {
  const valid = results.filter(
    r => r.response && !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview')
  );

  // 1. Category Opportunity (0-35)
  let categoryOpportunity = 15;
  if (categoryCoverage < 0.25) categoryOpportunity = 35;
  else if (categoryCoverage < 0.6) categoryOpportunity = 25;

  // 2. Competitor Gap (0-25)
  // Recommendation event = a valid response where the entity is recommended/preferred (strong signal).
  let brandRecommendationEvents = 0;
  let competitorRecommendationEvents = 0;
  for (const r of valid) {
    if (r.brandMentioned && (r.recommendationStrength === 'strong' || r.recommendationStrength === 'moderate')) {
      brandRecommendationEvents += 1;
    }
    // Competitor gap counts only RECOMMENDATION EVENTS — entities the AI
    // listed/recommended/preferred. Background mentions don't represent a
    // visibility threat for the brand.
    if (r.recommendedEntities && r.recommendedEntities.length > 0) {
      competitorRecommendationEvents += 1;
    }
  }

  let competitorGapScore = 5;
  if (competitorRecommendationEvents > 0 && brandRecommendationEvents === 0) {
    competitorGapScore = 25;
  } else if (competitorRecommendationEvents > 0 && brandRecommendationEvents > 0) {
    competitorGapScore = 10;
  }

  // 3. Prompt Intent Opportunity (0-20)
  // Weighted by prompt buyer intent: missing a "best X near me" prompt costs more
  // opportunity than missing "what is X". A prompt is "brand present" if the brand
  // was mentioned in ANY provider for that prompt.
  const promptMap = new Map<string, { intentWeight: number; highIntent: boolean; brandPresent: boolean }>();
  for (const r of valid) {
    const key = r.prompt || '';
    const intentInfo = classifyPromptIntent(key);
    const entry = promptMap.get(key) || {
      intentWeight: intentInfo.weight,
      highIntent: intentInfo.intent === 'High Commercial Intent' || intentInfo.intent === 'Provider Search Intent',
      brandPresent: false,
    };
    if (r.brandMentioned) entry.brandPresent = true;
    promptMap.set(key, entry);
  }
  const allPrompts = Array.from(promptMap.values());
  const highIntentPrompts = allPrompts.filter(p => p.highIntent);
  const highIntentPromptCount = highIntentPrompts.length;
  const absentHighIntentPromptCount = highIntentPrompts.filter(p => !p.brandPresent).length;
  // Intent-weighted absence: sum(weight if absent) / sum(weight)
  let weightedAbsenceNum = 0;
  let weightedAbsenceDen = 0;
  for (const p of allPrompts) {
    weightedAbsenceDen += p.intentWeight;
    if (!p.brandPresent) weightedAbsenceNum += p.intentWeight;
  }
  const absentHighIntentPromptRate = weightedAbsenceDen > 0 ? weightedAbsenceNum / weightedAbsenceDen : 0;
  const promptIntentOpportunityScore = Math.round(absentHighIntentPromptRate * 20);

  // 4. Provider Opportunity (0-20)
  const providerSet = new Map<string, { mentioned: boolean }>();
  for (const r of valid) {
    const entry = providerSet.get(r.provider) || { mentioned: false };
    if (r.brandMentioned) entry.mentioned = true;
    providerSet.set(r.provider, entry);
  }
  const totalProviders = providerSet.size;
  const providersWhereBrandWasAbsent = Array.from(providerSet.values()).filter(p => !p.mentioned).length;
  const providerOpportunity = totalProviders > 0 ? providersWhereBrandWasAbsent / totalProviders : 0;
  const providerOpportunityScore = Math.round(providerOpportunity * 20);

  let score = categoryOpportunity + competitorGapScore + promptIntentOpportunityScore + providerOpportunityScore;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const label: 'High Opportunity' | 'Moderate Opportunity' | 'Low Opportunity' =
    score >= 70 ? 'High Opportunity' : score >= 40 ? 'Moderate Opportunity' : 'Low Opportunity';

  return {
    score,
    label,
    breakdown: {
      categoryOpportunity,
      competitorGapScore,
      promptIntentOpportunityScore,
      providerOpportunityScore,
      absentHighIntentPromptRate,
      providerOpportunity,
      brandRecommendationEvents,
      competitorRecommendationEvents,
      highIntentPromptCount,
      absentHighIntentPromptCount,
      totalProviders,
      providersWhereBrandWasAbsent,
    },
  };
}

/**
 * Apply blur effect to text by replacing with asterisks
 */
function blurText(text: string): string {
  return text.replace(/[a-zA-Z0-9]/g, '•');
}

/**
 * Industry benchmark data (average scores by industry category)
 */
const INDUSTRY_BENCHMARKS: Record<string, number> = {
  'legal': 30,
  'law firm': 30,
  'attorney': 30,
  'consulting': 33,
  'marketing agency': 35,
  'digital marketing': 35,
  'technology': 45,
  'software': 42,
  'saas': 40,
  'ecommerce': 35,
  'retail': 32,
  'finance': 48,
  'healthcare': 38,
  'education': 36,
  'manufacturing': 28,
  'automotive': 34,
  '3d printing': 30,
  'consumer electronics': 38,
  'real estate': 32,
  'insurance': 35,
  'professional services': 33,
  'default': 35
};

/**
 * Get industry benchmark score based on business context
 * Uses weighted keyword matching to find the most relevant industry
 */
function getIndustryBenchmark(businessContext: string): { industry: string; benchmark: number } {
  const contextLower = businessContext.toLowerCase();
  
  // Score each industry by how many times its keyword appears
  let bestIndustry = 'all industries';
  let bestScore = 0;
  let bestBenchmark = INDUSTRY_BENCHMARKS.default;
  
  for (const [industry, benchmark] of Object.entries(INDUSTRY_BENCHMARKS)) {
    if (industry === 'default') continue;
    // Count occurrences for better matching
    const regex = new RegExp(industry.replace(/\s+/g, '\\s+'), 'gi');
    const matches = contextLower.match(regex);
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestIndustry = industry;
      bestBenchmark = benchmark;
    }
  }
  
  return { industry: bestIndustry, benchmark: bestBenchmark };
}

/**
 * Analyze content gaps from the results — returns specific, actionable opportunities
 */
interface ContentGap {
  prompt: string;
  providers: string[];           // which AI platforms returned this gap
  competitorsWinning: string[];  // who is currently being recommended instead
  recommendation: string;        // specific action the brand should take
  intent: PromptIntent;
  intentWeight: number;
  priority: 'High' | 'Medium' | 'Low';
}

function buildGapRecommendation(prompt: string, competitorsWinning: string[]): string {
  const promptLower = prompt.toLowerCase();
  const competitorPhrase = competitorsWinning.length > 0
    ? `Currently AI recommends ${competitorsWinning.slice(0, 3).join(', ')}.`
    : 'No clear leader yet — strong first-mover opportunity.';

  if (/best|top|leading|recommend/.test(promptLower)) {
    return `${competitorPhrase} Publish a comparison/listicle page targeting this exact phrase, with FAQ + ItemList schema and 3rd-party validation (reviews, awards, case studies).`;
  }
  if (/how to|guide|tutorial|tips/.test(promptLower)) {
    return `${competitorPhrase} Create an authoritative how-to guide with step-by-step instructions, expert quotes, and a clear byline. AI models prefer educational content with named experts.`;
  }
  if (/vs|versus|compare|comparison|alternative/.test(promptLower)) {
    return `${competitorPhrase} Build a side-by-side comparison page that includes your brand alongside named competitors, with objective criteria and a recommendation matrix.`;
  }
  if (/cost|pricing|price|cheap|affordable/.test(promptLower)) {
    return `${competitorPhrase} Publish transparent pricing/cost content with examples and ranges. Add Service or Offer schema so AI can extract concrete numbers.`;
  }
  if (/near me|local|city|area|in [a-z ]{3,}/.test(promptLower)) {
    return `${competitorPhrase} Strengthen local AEO: optimize Google Business Profile, build city-specific landing pages, and earn citations from local directories AI training sets reference.`;
  }
  if (/specialize|specialist|expert|firm for/.test(promptLower)) {
    return `${competitorPhrase} Publish a dedicated practice/specialty page with credentials, representative cases, and outcomes. Add Person schema for key practitioners.`;
  }
  return `${competitorPhrase} Create a focused page answering this exact query — H1 matching the question, FAQ schema, and authoritative backlinks from industry publications.`;
}

function analyzeContentGaps(results: ProviderResult[], brandName: string): ContentGap[] {
  const gapsByPrompt = new Map<string, ContentGap>();

  for (const missed of results.filter(r => !r.brandMentioned && !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview'))) {
    const topic = missed.prompt.replace(/\?/g, '').trim();
    if (topic.length <= 10 || topic.length >= 160) continue;
    const key = topic.toLowerCase();

    const existing = gapsByPrompt.get(key);
    if (existing) {
      if (!existing.providers.includes(missed.provider)) existing.providers.push(missed.provider);
      for (const c of (missed.recommendedEntities || [])) {
        if (!existing.competitorsWinning.includes(c)) existing.competitorsWinning.push(c);
      }
    } else {
      const intentInfo = classifyPromptIntent(topic);
      gapsByPrompt.set(key, {
        prompt: topic,
        providers: [missed.provider],
        competitorsWinning: [...(missed.recommendedEntities || [])],
        recommendation: '',
        intent: intentInfo.intent,
        intentWeight: intentInfo.weight,
        priority: intentInfo.priority,
      });
    }
  }

  // Sort by intent weight first (high-intent prompts surface first), then by provider breadth.
  const gaps = Array.from(gapsByPrompt.values())
    .sort((a, b) => {
      if (b.intentWeight !== a.intentWeight) return b.intentWeight - a.intentWeight;
      return b.providers.length - a.providers.length;
    })
    .slice(0, 5);

  for (const g of gaps) {
    g.recommendation = buildGapRecommendation(g.prompt, g.competitorsWinning);
  }

  if (gaps.length === 0) {
    const fallbackIntent = classifyPromptIntent('best providers in industry');
    return [{
      prompt: 'Industry comparison and "best of" queries',
      providers: ['ChatGPT', 'Perplexity', 'Google AIO'],
      competitorsWinning: [],
      recommendation: 'Build comparison and listicle content targeting high-intent commercial queries in your category. Include FAQ schema and 3rd-party validation.',
      intent: fallbackIntent.intent,
      intentWeight: fallbackIntent.weight,
      priority: fallbackIntent.priority,
    }];
  }

  return gaps;
}

/**
 * Generate executive summary based on results
 */
/**
 * AI Visibility Score bands — single source of truth for label copy.
 *   0–9   Invisible
 *   10–24 Critical
 *   25–44 Weak
 *   45–64 Emerging
 *   65–79 Competitive
 *   80–100 Dominant
 */
function getVisibilityBand(score: number): {
  label: 'Invisible' | 'Critical' | 'Weak' | 'Emerging' | 'Competitive' | 'Dominant';
  tier: 'red' | 'amber' | 'green';
} {
  if (score >= 80) return { label: 'Dominant',    tier: 'green' };
  if (score >= 65) return { label: 'Competitive', tier: 'green' };
  if (score >= 45) return { label: 'Emerging',    tier: 'amber' };
  if (score >= 25) return { label: 'Weak',        tier: 'amber' };
  if (score >= 10) return { label: 'Critical',    tier: 'red'   };
  return              { label: 'Invisible',   tier: 'red'   };
}

function generateExecutiveSummary(
  domain: string,
  overallScore: number,
  results: ProviderResult[],
  industryBenchmark: { industry: string; benchmark: number },
  context?: {
    aiOpportunity?: { score: number; label: string };
    categoryDiagnostic?: { coverage: number; label: string };
    shareOfVoiceInfo?: { sov: number; brandMentions: number; competitorMentions: number };
    classifiedCompetitors?: ClassifiedCompetitor[];
  }
): string[] {
  const summary: string[] = [];

  // Verified mention count is the source of truth for the "0/100" wording.
  const validResults = results.filter(r => !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview'));
  const mentionedResults = validResults.filter(r => r.brandMentioned);
  const mentionRate = validResults.length > 0 ? mentionedResults.length / validResults.length : 0;
  const verifiedMentionCount = mentionedResults.length;
  const band = getVisibilityBand(overallScore);

  const aiOpp = context?.aiOpportunity;
  const catDiag = context?.categoryDiagnostic;
  const sov = context?.shareOfVoiceInfo;
  const classified = (context?.classifiedCompetitors || []).filter(c => c.type !== 'Irrelevant / Excluded');
  const competitorCount = classified.length;
  const aiMentionedCount = classified.filter(c => c.source === 'ai_mentioned').length;

  // === Headline ===
  if (verifiedMentionCount === 0) {
    summary.push(
      `${domain} has an AI Visibility Score of 0/100 — Invisible. Your brand was not verified in any of the ${validResults.length} AI responses tested. ` +
      `This means there is currently no measurable AI recommendation visibility for this query set.`
    );
  } else {
    summary.push(
      `${domain} has an AI Visibility Score of ${overallScore}/100 — ${band.label}. ` +
      `Your brand was verified in ${verifiedMentionCount} of ${validResults.length} AI responses tested (${Math.round(mentionRate * 100)}% mention rate).`
    );
  }

  // === AI Opportunity Score ===
  if (aiOpp) {
    summary.push(`AI Opportunity Score: ${aiOpp.score}/100 — ${aiOpp.label}. This measures how much room exists to win visibility in this category, separate from your current visibility.`);
  }

  // === Category Difficulty (separate from score) ===
  if (catDiag) {
    const pct = Math.round((catDiag.coverage || 0) * 100);
    summary.push(`Category Difficulty: ${catDiag.label} (${pct}% category coverage). This describes the market context across AI platforms and is reported separately — it does not add to your AI Visibility Score.`);
  }

  // === Share of Voice ===
  if (sov && (sov.brandMentions + sov.competitorMentions) > 0) {
    const sovPct = Math.round(sov.sov * 100);
    summary.push(`Share of Voice: ${sovPct}% (${sov.brandMentions} brand recommendation events vs. ${sov.competitorMentions} competitor recommendation events across all AI responses).`);
  } else if (sov) {
    summary.push(`Share of Voice: 0% — neither your brand nor competitors were recommended in measurable volume across the responses tested.`);
  }

  // === Competitors / adjacent providers found ===
  if (competitorCount > 0) {
    summary.push(`${competitorCount} competitor${competitorCount === 1 ? '' : 's'} or adjacent provider${competitorCount === 1 ? '' : 's'} were identified in the landscape (${aiMentionedCount} appeared directly in AI responses).`);
  }

  // === Closing context for 0-mention case ===
  if (verifiedMentionCount === 0) {
    if (aiMentionedCount > 0 || competitorCount > 0) {
      summary.push(
        'However, competitors and adjacent providers appeared in several responses, which indicates an opportunity to build category authority and become a recommended option.'
      );
    }
    summary.push('Category difficulty and competitor presence are reported separately and explain the market context — they do not increase your visibility score. Visibility points are only awarded when your brand is actually named.');
  } else {
    // Benchmark comparison only when we have mentions
    const diff = overallScore - industryBenchmark.benchmark;
    if (diff >= 10) {
      summary.push(`You're performing ${diff} points above the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}/100.`);
    } else if (diff <= -10) {
      summary.push(`You're ${Math.abs(diff)} points below the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}/100.`);
    } else {
      summary.push(`You're performing close to the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}/100.`);
    }
  }

  return summary;
}

/**
 * Generate professional PDF report — SMB Team executive formatting
 */
async function generatePDF(
  firstName: string,
  domain: string,
  overallScore: number,
  results: ProviderResult[],
  businessContext: string = '',
  categoryDiagnostic?: { coverage: number; label: string; adjustment: number; detail: string; interpretation?: string },
  shareOfVoiceInfo?: { sov: number; brandMentions: number; competitorMentions: number },
  refinedCompetitors: string[] = [],
  aiOpportunity?: { score: number; label: string; breakdown: any },
  classifiedCompetitors: ClassifiedCompetitor[] = [],
  scoreBreakdown?: {
    components: {
      mentionCoverage:  { score: number; max: number };
      promptCoverage:   { score: number; max: number };
      providerCoverage: { score: number; max: number };
      mentionQuality:   { score: number; max: number };
      competitiveSov:   { score: number; max: number };
    };
    diagnostics: {
      validResponses: number;
      verifiedBrandMentions: number;
      promptsCovered: string;
      providersCovered: string;
      competitorRecommendationEvents: number;
      categoryCoverage: string;
      categoryDifficulty: string;
    };
    finalScore: number;
    note: string;
  },
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Patch widthOfTextAtSize on each font to sanitize non-WinAnsi characters
  // (emojis, exotic Unicode) that pdf-lib's standard fonts cannot encode.
  for (const f of [helvetica, helveticaBold, helveticaOblique]) {
    const orig = f.widthOfTextAtSize.bind(f);
    f.widthOfTextAtSize = (text: string, size: number) => orig(sanitizePdfText(text), size);
  }

  // Embed SMB Team logo
  let smbTeamLogo: any = null;
  try {
    const smbLogoUrl = 'https://lumos-ai-optimize.lovable.app/images/smbteam-logo.png';
    const logoRes = await fetch(smbLogoUrl);
    if (logoRes.ok) {
      const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
      smbTeamLogo = await pdfDoc.embedPng(logoBytes);
    }
  } catch (e) {
    console.warn('Could not load SMB Team logo:', e);
  }

  // Embed Llumos logo
  let llumosLogo: any = null;
  try {
    const llumosLogoUrl = 'https://lumos-ai-optimize.lovable.app/images/llumos-logo.png';
    const llumosLogoRes = await fetch(llumosLogoUrl);
    if (llumosLogoRes.ok) {
      const llumosLogoBytes = new Uint8Array(await llumosLogoRes.arrayBuffer());
      llumosLogo = await pdfDoc.embedPng(llumosLogoBytes);
    }
  } catch (e) {
    console.warn('Could not load Llumos logo:', e);
  }

  const W = 612;
  const H = 792;
  const M = 40; // margin
  const contentW = W - M * 2;

  // === SMB Team-inspired colour palette ===
  const navy   = rgb(0.02, 0.16, 0.27);    // #052A46
  const green  = rgb(0.46, 0.73, 0.11);    // #75BB1C
  const yellow = rgb(1.0, 0.89, 0.0);      // #FFE300
  const amber  = rgb(0.96, 0.65, 0.14);    // #F5A623
  const red    = rgb(0.85, 0.0, 0.05);     // #D9000D
  const gray   = rgb(0.96, 0.96, 0.96);    // #F5F5F5
  const white  = rgb(1, 1, 1);
  const dark   = rgb(0.10, 0.10, 0.10);    // #1A1A1A
  const mid    = rgb(0.33, 0.33, 0.33);
  const light  = rgb(0.55, 0.55, 0.55);
  const faint  = rgb(0.88, 0.88, 0.90);
  const accent = navy; // primary accent is navy

  // Color + label use the new 6-band visibility model (see getVisibilityBand).
  const tierColor = (tier: 'red' | 'amber' | 'green') => tier === 'green' ? green : tier === 'amber' ? amber : red;
  const scoreColor = (s: number) => tierColor(getVisibilityBand(s).tier);
  const scoreLabel = (s: number) => getVisibilityBand(s).label;
  const scoreTlLabel = (s: number) => getVisibilityBand(s).label;

  const industryBenchmark = getIndustryBenchmark(businessContext);
  const contentGaps = analyzeContentGaps(results, domain);
  const execSummary = generateExecutiveSummary(domain, overallScore, results, industryBenchmark, {
    aiOpportunity,
    categoryDiagnostic,
    shareOfVoiceInfo,
    classifiedCompetitors,
  });
  const validResults = results.filter(r => !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview'));

  // Aggregate competitor counts, but preserve the full refined/research-backed set for display.
  const competitorMentions = new Map<string, number>();
  for (const r of validResults) {
    for (const c of r.competitors) {
      competitorMentions.set(c, (competitorMentions.get(c) || 0) + 1);
    }
  }

  const sortedCompetitors = (refinedCompetitors.length > 0
    ? refinedCompetitors.map((name, index) => ({ name, count: competitorMentions.get(name) || 0, index }))
    : Array.from(competitorMentions.entries()).map(([name, count], index) => ({ name, count, index }))
  )
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.index - b.index;
    })
    .map(({ name, count }) => [name, count] as const);

  // Provider aggregate stats
  const providerStats: Record<string, { total: number; count: number; mentioned: number }> = {};
  for (const r of validResults) {
    if (!providerStats[r.provider]) providerStats[r.provider] = { total: 0, count: 0, mentioned: 0 };
    providerStats[r.provider].total += r.score;
    providerStats[r.provider].count++;
    if (r.brandMentioned) providerStats[r.provider].mentioned++;
  }

  const brandLabel = prettifyDomainLabel(domain);
  const mentionCount = validResults.filter(r => r.brandMentioned).length;
  const mentionRate = validResults.length > 0 ? Math.round((mentionCount / validResults.length) * 100) : 0;
  const promptsTested = new Set(results.map(r => r.prompt)).size;
  const providersUsed = Object.keys(providerStats).length;

  // ---- Drawing helpers ----
  function drawFooter(pg: any) {
    // Green top border on footer
    pg.drawRectangle({ x: 0, y: 30, width: W, height: 2, color: green });
    pg.drawText('llumos.app × SMBTeam', { x: M, y: 14, size: 7, font: helvetica, color: light });
    pg.drawText('AI Visibility Report', { x: W / 2 - 40, y: 14, size: 7, font: helvetica, color: light });
    pg.drawText(`${domain}`, { x: W - M - helvetica.widthOfTextAtSize(domain, 7), y: 14, size: 7, font: helvetica, color: light });
  }

  function newPage() {
    const pg = pdfDoc.addPage([W, H]);
    // Patch drawText to sanitize non-WinAnsi characters (emojis, exotic Unicode)
    // that pdf-lib's standard fonts (Helvetica) cannot encode.
    const origDrawText = pg.drawText.bind(pg);
    pg.drawText = (text: string, options: any) => {
      return origDrawText(sanitizePdfText(text), options);
    };
    drawFooter(pg);
    return pg;
  }

  /** Full-width navy section header bar */
  function drawSectionHeader(pg: any, title: string, subtitle: string | null, y: number): number {
    const barH = subtitle ? 48 : 36;
    pg.drawRectangle({ x: 0, y: y - barH, width: W, height: barH, color: navy });
    pg.drawText(title, { x: M, y: y - (subtitle ? 20 : 24), size: 16, font: helveticaBold, color: white });
    if (subtitle) {
      pg.drawText(subtitle, { x: M, y: y - 38, size: 10, font: helvetica, color: rgb(0.75, 0.75, 0.75) });
    }
    return y - barH - 16;
  }

  /** Subsection header with green left border accent */
  function drawSubsectionHeader(pg: any, title: string, y: number): number {
    const barH = 24;
    pg.drawRectangle({ x: M, y: y - barH, width: contentW, height: barH, color: navy });
    pg.drawRectangle({ x: M, y: y - barH, width: 4, height: barH, color: green }); // green left border
    pg.drawText(title, { x: M + 14, y: y - 17, size: 12, font: helveticaBold, color: white });
    return y - barH - 12;
  }

  /** Navy assessment box with white text */
  function drawAssessmentBox(pg: any, text: string, y: number): number {
    const lines = wrapText(text, 82);
    const boxH = lines.length * 14 + 20;
    pg.drawRectangle({ x: M, y: y - boxH, width: contentW, height: boxH, color: navy, borderColor: navy, borderWidth: 0 });
    let ty = y - 14;
    for (const line of lines) {
      pg.drawText(line, { x: M + 14, y: ty, size: 10, font: helvetica, color: white });
      ty -= 14;
    }
    return y - boxH - 8;
  }

  /** Gray callout box with navy left border */
  function drawCalloutBox(pg: any, text: string, y: number, leftBorderColor?: any): number {
    const lines = wrapText(text, 80);
    const boxH = lines.length * 13 + 16;
    pg.drawRectangle({ x: M, y: y - boxH, width: contentW, height: boxH, color: gray });
    pg.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: leftBorderColor || navy });
    let ty = y - 12;
    for (const line of lines) {
      pg.drawText(line, { x: M + 14, y: ty, size: 9, font: helvetica, color: dark });
      ty -= 13;
    }
    return y - boxH - 8;
  }

  /** Traffic light dot */
  function drawTlDot(pg: any, x: number, y: number, color: any, size: number = 10) {
    // Approximate circle with a small rounded rectangle
    pg.drawRectangle({ x: x, y: y - size / 2, width: size, height: size, color: color, borderColor: white, borderWidth: 1 });
  }

  // NOTE: When this helper triggers a page break it MUST mutate the caller's page
  // reference. We use a shared `pageRef` object so callers stay in sync with the
  // page actually being drawn on. Previously, reassigning the local `pg` parameter
  // caused subsequent caller writes to land on the OLD (full) page, producing
  // overlapping text and what looked like duplicated footer/SMBTeam text.
  function drawWrappedText(pg: any, text: string, x: number, y: number, opts: { size: number; font: any; color: any; maxChars?: number; lineSpacing?: number }): number {
    const lines = wrapText(text, opts.maxChars || 90);
    const spacing = opts.lineSpacing || (opts.size + 4);
    for (const line of lines) {
      if (y < 50) {
        const np = newPage();
        // Sync caller's outer `page` variable via the shared ref (set just below).
        pageRef.page = np;
        pg = np;
        y = H - 60;
      }
      pg.drawText(line, { x, y, size: opts.size, font: opts.font, color: opts.color });
      y -= spacing;
    }
    // Keep the ref in sync with whatever page we ended on.
    pageRef.page = pg;
    return y;
  }

  // Shared page reference — callers should read `pageRef.page` after calling
  // drawWrappedText if they want to know which page is currently active.
  const pageRef: { page: any } = { page: null as any };

  // ====================== PAGE 1: COVER ======================
  let page = pdfDoc.addPage([W, H]);
  // No footer on cover

  // Full navy background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: navy });

  // Co-branding logos at top — larger SMB Team logo
  let coverY = H - 100;
  if (smbTeamLogo) {
    const logoDims = smbTeamLogo.scale(1);
    const logoH2 = 50;
    const logoW2 = (logoDims.width / logoDims.height) * logoH2;
    const logoX = (W - logoW2) / 2;
    page.drawImage(smbTeamLogo, { x: logoX, y: coverY, width: logoW2, height: logoH2 });
    coverY -= 40;
  }

  // "Powered by Llumos" directly under SMB Team logo — text then logo
  const poweredText = 'Powered by Llumos';
  const poweredFontSize = 16;
  const poweredTextW = helveticaBold.widthOfTextAtSize(poweredText, poweredFontSize);
  if (llumosLogo) {
    const llLogoDims = llumosLogo.scale(1);
    const llLogoH = 22;
    const llLogoW = (llLogoDims.width / llLogoDims.height) * llLogoH;
    const gap = 8;
    const totalW2 = poweredTextW + gap + llLogoW;
    const startX = (W - totalW2) / 2;
    page.drawText(poweredText, { x: startX, y: coverY, size: poweredFontSize, font: helveticaBold, color: rgb(0.65, 0.65, 0.70) });
    page.drawImage(llumosLogo, { x: startX + poweredTextW + gap, y: coverY - 3, width: llLogoW, height: llLogoH });
  } else {
    page.drawText(poweredText, { x: (W - poweredTextW) / 2, y: coverY, size: poweredFontSize, font: helveticaBold, color: rgb(0.65, 0.65, 0.70) });
  }
  coverY -= 60;

  // Report title
  const titleText = 'AI Visibility Report';
  const titleW = helveticaBold.widthOfTextAtSize(titleText, 32);
  page.drawText(titleText, { x: (W - titleW) / 2, y: coverY, size: 32, font: helveticaBold, color: white });
  coverY -= 50;

  // Company / brand name
  const companyW = helveticaBold.widthOfTextAtSize(brandLabel, 24);
  page.drawText(brandLabel, { x: (W - companyW) / 2, y: coverY, size: 24, font: helveticaBold, color: yellow });
  coverY -= 30;

  // Yellow divider line
  const dividerW = 300;
  page.drawRectangle({ x: (W - dividerW) / 2, y: coverY, width: dividerW, height: 3, color: yellow });
  coverY -= 50;

  // Prepared for / domain / date
  const preparedFor = firstName ? `Prepared for: ${firstName}` : '';
  const domainLine = `Domain: ${domain}`;
  const dateLine = `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  const infoLines = [preparedFor, domainLine, dateLine].filter(Boolean);
  for (const line of infoLines) {
    const lineW = helvetica.widthOfTextAtSize(line, 13);
    page.drawText(line, { x: (W - lineW) / 2, y: coverY, size: 13, font: helvetica, color: rgb(0.75, 0.75, 0.80) });
    coverY -= 22;
  }

  // ====================== PAGE 2: EXECUTIVE SCORECARD ======================
  page = newPage();
  let y = H - 10;

  y = drawSectionHeader(page, 'AI Visibility Scorecard', brandLabel, y);

  // Traffic light legend
  const legendY = y;
  page.drawRectangle({ x: M, y: legendY - 50, width: contentW, height: 50, color: gray });
  const legends = [
    { label: 'Green — On Track', color: green, desc: 'Functioning well' },
    { label: 'Amber — In Progress', color: amber, desc: 'Significant gaps' },
    { label: 'Red — Critical', color: red, desc: 'Actively costing visibility' },
  ];
  for (let i = 0; i < legends.length; i++) {
    const lx = M + 10 + i * (contentW / 3);
    const ly = legendY - 20;
    drawTlDot(page, lx, ly + 4, legends[i].color, 10);
    page.drawText(legends[i].label, { x: lx + 14, y: ly, size: 8, font: helveticaBold, color: dark });
    page.drawText(legends[i].desc, { x: lx + 14, y: ly - 12, size: 7, font: helvetica, color: light });
  }
  y = legendY - 60;

  // Overall score card — large
  const scoreCardH = 80;
  page.drawRectangle({ x: M, y: y - scoreCardH, width: contentW, height: scoreCardH, color: navy });

  const scoreLabelText = 'AI Visibility Score';
  page.drawText(scoreLabelText, { x: M + 14, y: y - 16, size: 9, font: helvetica, color: rgb(0.75, 0.75, 0.75) });

  const scoreText = `${overallScore}`;
  page.drawText(scoreText, { x: M + 14, y: y - 55, size: 48, font: helveticaBold, color: yellow });
  const stW = helveticaBold.widthOfTextAtSize(scoreText, 48);
  page.drawText('/ 100', { x: M + 18 + stW, y: y - 45, size: 16, font: helvetica, color: rgb(0.75, 0.75, 0.75) });

  // Traffic light dot for overall score
  const tlColor = scoreColor(overallScore);
  drawTlDot(page, M + contentW - 130, y - 30, tlColor, 20);
  page.drawText(scoreTlLabel(overallScore), { x: M + contentW - 105, y: y - 35, size: 9, font: helveticaBold, color: white });

  // Score bar
  const barY2 = y - scoreCardH + 10;
  const barW2 = contentW - 28;
  page.drawRectangle({ x: M + 14, y: barY2, width: barW2, height: 8, color: rgb(0.15, 0.25, 0.35) });
  // Segmented bar aligned with the 6-band visibility model:
  // red 0–24 (Invisible/Critical) | amber 25–64 (Weak/Emerging) | green 65–100 (Competitive/Dominant)
  page.drawRectangle({ x: M + 14, y: barY2, width: barW2 * 0.25, height: 8, color: red });
  page.drawRectangle({ x: M + 14 + barW2 * 0.25, y: barY2, width: barW2 * 0.40, height: 8, color: amber });
  page.drawRectangle({ x: M + 14 + barW2 * 0.65, y: barY2, width: barW2 * 0.35, height: 8, color: green });
  // Score marker
  const markerX = M + 14 + (overallScore / 100) * barW2;
  page.drawRectangle({ x: markerX - 2, y: barY2 - 4, width: 4, height: 16, color: white });

  y = y - scoreCardH - 12;

  // ===== AI Opportunity Score card — separate from AI Visibility Score =====
  if (aiOpportunity) {
    const oppScore = aiOpportunity.score;
    const oppCardH = 80;
    page.drawRectangle({ x: M, y: y - oppCardH, width: contentW, height: oppCardH, color: navy });

    page.drawText('AI Opportunity Score', { x: M + 14, y: y - 16, size: 9, font: helvetica, color: rgb(0.75, 0.75, 0.75) });
    page.drawText('How much room is there to win visibility in this category?', {
      x: M + 14, y: y - 28, size: 7, font: helveticaOblique, color: rgb(0.65, 0.65, 0.7),
    });

    const oppText = `${oppScore}`;
    page.drawText(oppText, { x: M + 14, y: y - 62, size: 44, font: helveticaBold, color: yellow });
    const otW = helveticaBold.widthOfTextAtSize(oppText, 44);
    page.drawText('/ 100', { x: M + 18 + otW, y: y - 52, size: 16, font: helvetica, color: rgb(0.75, 0.75, 0.75) });

    // Opportunity is INVERSE: high opportunity is a positive signal (room to grow), not a "good score".
    const oppColor = oppScore >= 70 ? amber : oppScore >= 40 ? yellow : green;
    drawTlDot(page, M + contentW - 130, y - 30, oppColor, 20);
    page.drawText(aiOpportunity.label, { x: M + contentW - 105, y: y - 35, size: 9, font: helveticaBold, color: white });

    // Opportunity bar (gradient from low->high opportunity)
    const oppBarY = y - oppCardH + 10;
    const oppBarW = contentW - 28;
    page.drawRectangle({ x: M + 14, y: oppBarY, width: oppBarW, height: 8, color: rgb(0.15, 0.25, 0.35) });
    page.drawRectangle({ x: M + 14, y: oppBarY, width: oppBarW * 0.4, height: 8, color: green });
    page.drawRectangle({ x: M + 14 + oppBarW * 0.4, y: oppBarY, width: oppBarW * 0.3, height: 8, color: yellow });
    page.drawRectangle({ x: M + 14 + oppBarW * 0.7, y: oppBarY, width: oppBarW * 0.3, height: 8, color: amber });
    const oppMarkerX = M + 14 + (oppScore / 100) * oppBarW;
    page.drawRectangle({ x: oppMarkerX - 2, y: oppBarY - 4, width: 4, height: 16, color: white });

    y = y - oppCardH - 12;

    // Opportunity breakdown callout
    const b = aiOpportunity.breakdown;
    const oppDetail =
      `Category Opportunity: ${b.categoryOpportunity}/35   |   Competitor Gap: ${b.competitorGapScore}/25   |   ` +
      `Prompt Intent: ${b.promptIntentOpportunityScore}/20   |   Provider Coverage Gap: ${b.providerOpportunityScore}/20\n` +
      `Brand was absent from ${b.absentHighIntentPromptCount} of ${b.highIntentPromptCount} high-intent prompts and ${b.providersWhereBrandWasAbsent} of ${b.totalProviders} AI providers.`;
    y = drawCalloutBox(page, oppDetail, y, oppColor);
  }

  // Key metrics — 2x2 grid pillar-style cards
  const metricCols = [
    { label: 'Prompts Tested', value: `${promptsTested}`, color: green },
    { label: 'AI Platforms', value: `${providersUsed}`, color: green },
    { label: 'Mention Rate', value: `${mentionRate}%`, color: scoreColor(mentionRate) },
    { label: 'Total Checks', value: `${validResults.length}`, color: green },
  ];
  const mcW = (contentW - 12) / 4;
  for (let i = 0; i < metricCols.length; i++) {
    const mx = M + i * (mcW + 4);
    // Card header (navy)
    page.drawRectangle({ x: mx, y: y - 22, width: mcW, height: 22, color: navy });
    const lblW2 = helveticaBold.widthOfTextAtSize(metricCols[i].label, 8);
    page.drawText(metricCols[i].label, { x: mx + (mcW - lblW2) / 2, y: y - 16, size: 8, font: helveticaBold, color: white });
    // Card body
    page.drawRectangle({ x: mx, y: y - 58, width: mcW, height: 36, color: white, borderColor: faint, borderWidth: 0.5 });
    const valW2 = helveticaBold.widthOfTextAtSize(metricCols[i].value, 20);
    page.drawText(metricCols[i].value, { x: mx + (mcW - valW2) / 2, y: y - 48, size: 20, font: helveticaBold, color: dark });
  }
  y -= 70;

  // ===== AI Visibility Score Breakdown — transparent component scoring =====
  if (scoreBreakdown) {
    if (y < 240) { page = newPage(); y = H - 10; }
    y = drawSubsectionHeader(page, 'AI Visibility Score Breakdown', y);

    const c = scoreBreakdown.components;
    const rows: Array<{ label: string; score: number; max: number }> = [
      { label: 'Mention Coverage',          score: c.mentionCoverage.score,   max: c.mentionCoverage.max },
      { label: 'Prompt Coverage',           score: c.promptCoverage.score,    max: c.promptCoverage.max },
      { label: 'Provider Coverage',         score: c.providerCoverage.score,  max: c.providerCoverage.max },
      { label: 'Mention Quality',           score: c.mentionQuality.score,    max: c.mentionQuality.max },
      { label: 'Competitive Share of Voice',score: c.competitiveSov.score,    max: c.competitiveSov.max },
    ];

    const rowH = 18;
    const tableH = rowH * (rows.length + 1) + 8;
    // Outline
    page.drawRectangle({ x: M, y: y - tableH, width: contentW, height: tableH, color: white, borderColor: faint, borderWidth: 0.5 });

    // Header
    page.drawRectangle({ x: M, y: y - rowH, width: contentW, height: rowH, color: navy });
    page.drawText('Component', { x: M + 10, y: y - 13, size: 9, font: helveticaBold, color: white });
    page.drawText('Score', { x: M + contentW - 140, y: y - 13, size: 9, font: helveticaBold, color: white });
    page.drawText('Bar', { x: M + contentW - 90, y: y - 13, size: 9, font: helveticaBold, color: white });

    // Rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const ry = y - rowH - i * rowH;
      // Zebra stripe
      if (i % 2 === 0) {
        page.drawRectangle({ x: M, y: ry - rowH, width: contentW, height: rowH, color: gray });
      }
      page.drawText(r.label, { x: M + 10, y: ry - 13, size: 9, font: helvetica, color: dark });
      page.drawText(`${r.score}/${r.max}`, { x: M + contentW - 140, y: ry - 13, size: 9, font: helveticaBold, color: dark });
      // Mini bar (80px) representing share of max
      const barXp = M + contentW - 90;
      const barWp = 80;
      page.drawRectangle({ x: barXp, y: ry - 12, width: barWp, height: 6, color: faint });
      const ratio = r.max > 0 ? Math.max(0, Math.min(1, r.score / r.max)) : 0;
      const barColor = ratio >= 0.7 ? green : ratio >= 0.4 ? amber : red;
      if (ratio > 0) {
        page.drawRectangle({ x: barXp, y: ry - 12, width: Math.max(1, barWp * ratio), height: 6, color: barColor });
      }
    }

    // Final row
    const fy = y - rowH - rows.length * rowH;
    page.drawRectangle({ x: M, y: fy - rowH, width: contentW, height: rowH, color: navy });
    page.drawText('Final AI Visibility Score', { x: M + 10, y: fy - 13, size: 9, font: helveticaBold, color: white });
    page.drawText(`${scoreBreakdown.finalScore}/100`, { x: M + contentW - 140, y: fy - 13, size: 10, font: helveticaBold, color: yellow });

    y = fy - rowH - 10;

    // Diagnostics row (4 + 3 layout)
    const d = scoreBreakdown.diagnostics;
    const diagItems: Array<{ label: string; value: string }> = [
      { label: 'Valid Responses',                  value: `${d.validResponses}` },
      { label: 'Verified Brand Mentions',          value: `${d.verifiedBrandMentions}` },
      { label: 'Prompts Covered',                  value: d.promptsCovered },
      { label: 'Providers Covered',                value: d.providersCovered },
      { label: 'Competitor Recommendation Events', value: `${d.competitorRecommendationEvents}` },
      { label: 'Category Coverage',                value: d.categoryCoverage },
      { label: 'Category Difficulty',              value: d.categoryDifficulty },
    ];
    // Render as a 2-column compact list to keep within page width
    const colW = (contentW - 8) / 2;
    const rowsCount = Math.ceil(diagItems.length / 2);
    const diagH = rowsCount * 16 + 8;
    page.drawRectangle({ x: M, y: y - diagH, width: contentW, height: diagH, color: gray, borderColor: faint, borderWidth: 0.5 });
    for (let i = 0; i < diagItems.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const dx = M + 10 + col * colW;
      const dy = y - 14 - row * 16;
      page.drawText(diagItems[i].label + ':', { x: dx, y: dy, size: 8, font: helveticaBold, color: mid });
      const lblW = helveticaBold.widthOfTextAtSize(diagItems[i].label + ':', 8);
      page.drawText(diagItems[i].value, { x: dx + lblW + 6, y: dy, size: 8, font: helvetica, color: dark });
    }
    y -= diagH + 8;

    // Note callout
    y = drawCalloutBox(page, scoreBreakdown.note, y, amber);
  }

  // Executive Summary — assessment box
  if (y < 180) { page = newPage(); y = H - 10; }
  y = drawSubsectionHeader(page, 'Executive Summary', y);
  const summaryText = execSummary.join(' ');
  y = drawAssessmentBox(page, summaryText, y);

  // Industry benchmark callout
  const bDiff = overallScore - industryBenchmark.benchmark;
  const bText = bDiff >= 0
    ? `Your score is ${bDiff} points above the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}/100.`
    : `Your score is ${Math.abs(bDiff)} points below the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}/100.`;
  y = drawCalloutBox(page, bText, y, bDiff >= 0 ? green : red);

  // Category visibility diagnostic — explains the market context. NOT part of the score.
  if (categoryDiagnostic) {
    const catColor =
      categoryDiagnostic.label === 'Active Category' ? green :
      categoryDiagnostic.label === 'Sparse Category' ? amber : red;
    const pct = Math.round((categoryDiagnostic.coverage || 0) * 100);
    const interp = categoryDiagnostic.interpretation || categoryDiagnostic.detail;
    const catText = `Category Difficulty: ${categoryDiagnostic.label}   |   Category Coverage: ${pct}%\nInterpretation: ${interp}`;
    y = drawCalloutBox(page, catText, y, catColor);
  }

  // Share of Voice callout — context for the score
  if (shareOfVoiceInfo && (shareOfVoiceInfo.brandMentions + shareOfVoiceInfo.competitorMentions) > 0) {
    const sovPct = Math.round(shareOfVoiceInfo.sov * 100);
    const sovText = `Share of Voice: ${sovPct}% (${shareOfVoiceInfo.brandMentions} mentions of your brand vs. ${shareOfVoiceInfo.competitorMentions} competitor mentions across all AI responses).`;
    const sovColor = sovPct >= 30 ? green : sovPct >= 10 ? amber : red;
    y = drawCalloutBox(page, sovText, y, sovColor);
  }

  // ====================== PAGE 3: PLATFORM PERFORMANCE ======================
  page = newPage();
  y = H - 10;

  y = drawSectionHeader(page, 'Visibility by AI Platform', brandLabel, y);

  // Platform pillar cards (similar to SMB's 2x2 scorecard grid)
  const providerEntries = Object.entries(providerStats);
  const provCardW = (contentW - 12) / 2;
  const provCardH = 100;

  for (let i = 0; i < providerEntries.length; i++) {
    const [provider, data] = providerEntries[i];
    const avg = Math.round(data.total / data.count);
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = M + col * (provCardW + 12);
    const cy = y - row * (provCardH + 12);

    if (cy - provCardH < 50) {
      page = newPage();
      y = H - 60;
    }

    // Card header with traffic light
    page.drawRectangle({ x: cx, y: cy - 26, width: provCardW, height: 26, color: navy });
    drawTlDot(page, cx + 8, cy - 12, scoreColor(avg), 12);
    page.drawText(provider, { x: cx + 24, y: cy - 18, size: 11, font: helveticaBold, color: white });

    // Card body
    page.drawRectangle({ x: cx, y: cy - provCardH, width: provCardW, height: provCardH - 26, color: white, borderColor: faint, borderWidth: 0.5 });

    const bodyY = cy - 40;
    page.drawText(`Average Score: ${avg}/100`, { x: cx + 10, y: bodyY, size: 10, font: helveticaBold, color: scoreColor(avg) });
    page.drawText(`Mentioned: ${data.mentioned}/${data.count} queries`, { x: cx + 10, y: bodyY - 16, size: 9, font: helvetica, color: mid });

    // Progress bar
    const pBarW = provCardW - 20;
    page.drawRectangle({ x: cx + 10, y: bodyY - 32, width: pBarW, height: 8, color: faint });
    page.drawRectangle({ x: cx + 10, y: bodyY - 32, width: Math.max(1, (avg / 100) * pBarW), height: 8, color: scoreColor(avg) });

    // Insight note
    const insightText =
      avg >= 80 ? 'Dominant visibility on this platform.' :
      avg >= 65 ? 'Competitive visibility — well represented.' :
      avg >= 45 ? 'Emerging visibility — room to strengthen.' :
      avg >= 25 ? 'Weak visibility — significant gap.' :
      avg >= 10 ? 'Critical visibility — rarely surfaced.' :
                  'Invisible — brand was not surfaced on this platform.';
    page.drawText(insightText, { x: cx + 10, y: bodyY - 50, size: 8, font: helveticaOblique, color: light });
  }

  y -= Math.ceil(providerEntries.length / 2) * (provCardH + 12) + 10;

  // ====================== COMPETITOR LANDSCAPE ======================
  if (y < 220) { page = newPage(); y = H - 10; }

  // Build classification-aware lookup so each row in the existing landscape
  // can show its competitor type. Falls back gracefully if classification is empty.
  const classificationByCanon = new Map<string, ClassifiedCompetitor>();
  for (const cc of classifiedCompetitors) classificationByCanon.set(cc.canonical, cc);

  const aiMentionedClassified = classifiedCompetitors.filter(c => c.source === 'ai_mentioned' && c.type !== 'Irrelevant / Excluded');
  const researchBackedClassified = classifiedCompetitors.filter(c => c.source === 'research_backed' && c.type !== 'Irrelevant / Excluded');

  y = drawSubsectionHeader(page, 'Competitors Mentioned by AI', y);
  if (aiMentionedClassified.length > 0) {
    page.drawText('Entities AI assistants actually named in their answers:', {
      x: M + 5, y, size: 9, font: helveticaOblique, color: light,
    });
    y -= 18;

    const sortedAi = aiMentionedClassified.slice().sort((a, b) => b.mentionCount - a.mentionCount);
    for (const cc of sortedAi) {
      if (y < 60) { page = newPage(); y = H - 60; }
      page.drawRectangle({ x: M, y: y - 18, width: contentW, height: 20, color: gray });
      page.drawRectangle({ x: M, y: y - 18, width: 3, height: 20, color: navy });
      page.drawText(cc.name, { x: M + 10, y: y - 12, size: 10, font: helveticaBold, color: dark });
      // Type badge
      page.drawText(`[${cc.type}]`, { x: M + 200, y: y - 12, size: 7, font: helveticaBold, color: mid });
      // Mention count bar
      const cBarW = Math.min(120, (cc.mentionCount / Math.max(validResults.length, 1)) * 160);
      if (cBarW > 0) {
        page.drawRectangle({ x: M + contentW - 160, y: y - 14, width: cBarW, height: 10, color: navy });
      }
      page.drawText(`${cc.mentionCount}x mentioned`, {
        x: M + contentW - 160 + cBarW + 4, y: y - 12, size: 8, font: helvetica, color: mid,
      });
      y -= 24;
    }
  } else {
    y = drawCalloutBox(page, 'No direct competitor brands were explicitly named in these AI responses. That usually means the prompts were more educational than vendor-comparison oriented, or the models answered with tactics instead of naming providers.', y);
  }

  // Research-backed competitors — shown SEPARATELY, never blended into AI-mentioned counts.
  if (researchBackedClassified.length > 0) {
    if (y < 120) { page = newPage(); y = H - 10; }
    y = drawSubsectionHeader(page, 'Research-Backed Competitors (not seen in AI responses)', y);
    page.drawText('Validated market competitors that did NOT appear in any AI answer for these prompts. Excluded from Share of Voice.', {
      x: M + 5, y, size: 9, font: helveticaOblique, color: light,
    });
    y -= 18;
    for (const cc of researchBackedClassified) {
      if (y < 60) { page = newPage(); y = H - 60; }
      page.drawRectangle({ x: M, y: y - 18, width: contentW, height: 20, color: gray });
      page.drawRectangle({ x: M, y: y - 18, width: 3, height: 20, color: amber });
      page.drawText(cc.name, { x: M + 10, y: y - 12, size: 10, font: helveticaBold, color: dark });
      page.drawText(`[${cc.type}]`, { x: M + 200, y: y - 12, size: 7, font: helveticaBold, color: mid });
      page.drawText('research-backed only', { x: M + contentW - 110, y: y - 12, size: 8, font: helvetica, color: mid });
      y -= 24;
    }
  }

  // ====================== COMPETITOR TYPES FOUND ======================
  if (classifiedCompetitors.length > 0) {
    if (y < 200) { page = newPage(); y = H - 10; }
    y = drawSubsectionHeader(page, 'Competitor Types Found', y);
    page.drawText('Entities grouped by type so the landscape is not misleading (e.g. ADR providers and software platforms are not direct law-firm competitors).', {
      x: M + 5, y, size: 9, font: helveticaOblique, color: light,
    });
    y -= 18;

    const typeOrder: CompetitorType[] = [
      'Direct Competitor',
      'Local or Boutique Competitor',
      'Large Firm / Enterprise Competitor',
      'ADR Provider',
      'Software Platform',
      'Marketplace / Directory',
      'Adjacent Service Provider',
      'Irrelevant / Excluded',
    ];
    const grouped = new Map<CompetitorType, ClassifiedCompetitor[]>();
    for (const cc of classifiedCompetitors) {
      if (cc.type === 'Irrelevant / Excluded') continue;
      const arr = grouped.get(cc.type) || [];
      arr.push(cc);
      grouped.set(cc.type, arr);
    }

    for (const t of typeOrder) {
      const arr = grouped.get(t);
      if (!arr || arr.length === 0) continue;
      if (y < 80) { page = newPage(); y = H - 60; }
      // Type heading row
      page.drawRectangle({ x: M, y: y - 16, width: contentW, height: 18, color: navy });
      page.drawText(`${t}  (${arr.length})`, { x: M + 8, y: y - 11, size: 9, font: helveticaBold, color: white });
      y -= 22;
      // Members — wrap as comma-separated list
      const aiNames = arr.filter(c => c.source === 'ai_mentioned').map(c => `${c.name} (${c.mentionCount}x)`);
      const researchNames = arr.filter(c => c.source === 'research_backed').map(c => `${c.name} (research)`);
      const lines = wrapText([...aiNames, ...researchNames].join(', '), 95);
      for (const ln of lines) {
        if (y < 50) { page = newPage(); y = H - 60; }
        page.drawText(ln, { x: M + 10, y: y - 8, size: 9, font: helvetica, color: dark });
        y -= 12;
      }
      y -= 6;
    }
  }


  // ====================== CONTENT GAP OPPORTUNITIES ======================
  if (contentGaps.length > 0) {
    if (y < 200) { page = newPage(); y = H - 10; }

    y = drawSubsectionHeader(page, 'Content Gap Opportunities', y);
    page.drawText('Specific queries where your brand is absent — with how to win them back:', { x: M + 5, y, size: 9, font: helveticaOblique, color: light });
    y -= 18;

    for (let i = 0; i < contentGaps.length; i++) {
      const gap = contentGaps[i];
      const promptText = gap.prompt.length > 80 ? gap.prompt.substring(0, 78) + '...' : gap.prompt;

      // Wrap recommendation text to estimate card height
      const recLines = wrapText(gap.recommendation, 95);
      const competitorLine = gap.competitorsWinning.length > 0
        ? `Competitors winning here: ${gap.competitorsWinning.slice(0, 4).join(', ')}`
        : 'No clear competitor winning yet — first-mover opportunity.';
      const compLines = wrapText(competitorLine, 95);
      const providerLine = `Missing on: ${gap.providers.map(p => p === 'openai' ? 'ChatGPT' : p === 'perplexity' ? 'Perplexity' : p === 'google' ? 'Google AIO' : p).join(', ')}`;

      // Extra row inside body for Intent + Priority labels.
      const intentLine = `Intent: ${gap.intent}    Priority: ${gap.priority}`;
      const bodyContentH = 14 /* intent */ + 14 /* providers */ + (compLines.length * 11) + 6 + 14 /* "Action" label */ + (recLines.length * 11) + 14;
      const cardH = 22 + bodyContentH;
      if (y - cardH < 60) { page = newPage(); y = H - 60; }

      // Header bar
      page.drawRectangle({ x: M, y: y - 22, width: contentW, height: 22, color: navy });
      page.drawText(`Gap ${i + 1}: ${promptText}`, { x: M + 10, y: y - 16, size: 9, font: helveticaBold, color: white });

      // Priority badge — color-coded by gap.priority
      const priorityBadgeColor = gap.priority === 'High' ? red : gap.priority === 'Medium' ? amber : green;
      const badgeText = `${gap.priority} Priority`;
      const badgeW = helveticaBold.widthOfTextAtSize(badgeText, 7) + 12;
      page.drawRectangle({ x: M + contentW - badgeW - 8, y: y - 18, width: badgeW, height: 14, color: priorityBadgeColor });
      page.drawText(badgeText, { x: M + contentW - badgeW - 2, y: y - 15, size: 7, font: helveticaBold, color: white });

      // Body background
      page.drawRectangle({ x: M, y: y - cardH, width: contentW, height: cardH - 22, color: rgb(1.0, 0.99, 0.90) });

      // Intent line
      let by = y - 34;
      page.drawText(intentLine, { x: M + 10, y: by, size: 8, font: helveticaBold, color: navy });
      by -= 14;

      // Providers line
      page.drawText(providerLine, { x: M + 10, y: by, size: 8, font: helveticaBold, color: mid });
      by -= 14;

      // Competitors line(s)
      for (const line of compLines) {
        page.drawText(line, { x: M + 10, y: by, size: 9, font: helvetica, color: dark });
        by -= 11;
      }
      by -= 6;

      // Recommendation
      page.drawText('RECOMMENDED ACTION', { x: M + 10, y: by, size: 7, font: helveticaBold, color: light });
      by -= 12;
      for (const line of recLines) {
        page.drawText(line, { x: M + 10, y: by, size: 9, font: helvetica, color: dark });
        by -= 11;
      }

      y -= cardH + 10;
    }
  }

  // ====================== PAGE: BRAND INTELLIGENCE ======================
  page = newPage();
  y = H - 10;

  y = drawSectionHeader(page, 'Brand Intelligence Analysis', brandLabel, y);

  // Sentiment Analysis — pillar card style
  y = drawSubsectionHeader(page, 'Brand Sentiment Analysis', y);
  page.drawText('How AI platforms perceive your brand when they mention it:', { x: M + 5, y, size: 9, font: helveticaOblique, color: light });
  y -= 18;

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0, not_mentioned: 0 };
  for (const r of validResults) { sentimentCounts[r.sentiment]++; }

  const sentimentData = [
    { label: 'Positive', count: sentimentCounts.positive, color: green },
    { label: 'Neutral', count: sentimentCounts.neutral, color: amber },
    { label: 'Negative', count: sentimentCounts.negative, color: red },
    { label: 'Not Mentioned', count: sentimentCounts.not_mentioned, color: light },
  ];

  const sentTotal = validResults.length || 1;
  const sentBarW = contentW - 20;

  for (const s of sentimentData) {
    const pct = Math.round((s.count / sentTotal) * 100);
    const barPx = Math.max(1, (s.count / sentTotal) * sentBarW * 0.6);

    // Row with dot
    drawTlDot(page, M + 5, y + 3, s.color, 8);
    page.drawText(s.label, { x: M + 18, y, size: 9, font: helveticaBold, color: dark });
    page.drawText(`${s.count} (${pct}%)`, { x: M + 120, y, size: 9, font: helvetica, color: mid });
    page.drawRectangle({ x: M + 190, y: y + 1, width: barPx, height: 8, color: s.color });
    y -= 18;
  }

  // Sentiment insight callout
  y -= 4;
  const totalSentimentMentions = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
  const notMentionedPct = Math.round((sentimentCounts.not_mentioned / sentTotal) * 100);
  let sentimentInsight: string;
  if (totalSentimentMentions === 0) {
    sentimentInsight = 'No sentiment signal is available because your brand was not mentioned in any AI response. Building authoritative content is the first step.';
  } else if (notMentionedPct >= 70) {
    sentimentInsight = `Your brand was absent from ${notMentionedPct}% of AI responses. The ${totalSentimentMentions} mention${totalSentimentMentions > 1 ? 's' : ''} detected ${sentimentCounts.positive > 0 ? 'leaned positive' : 'were neutral'}, but the primary opportunity is increasing overall visibility.`;
  } else if (sentimentCounts.positive > sentimentCounts.negative + 1) {
    sentimentInsight = 'AI platforms generally portray your brand favorably — this is a strong trust signal.';
  } else if (sentimentCounts.negative > sentimentCounts.positive) {
    sentimentInsight = 'Warning: AI platforms are associating negative sentiment with your brand. Content strategy review needed.';
  } else {
    sentimentInsight = 'AI mentions are mostly neutral. Creating more distinctive, authoritative content could improve sentiment.';
  }
  y = drawAssessmentBox(page, sentimentInsight, y);

  // Recommendation Strength — pillar card style
  y = drawSubsectionHeader(page, 'AI Platform Recommendation Strength', y);
  page.drawText('How strongly each AI platform recommends your brand:', { x: M + 5, y, size: 9, font: helveticaOblique, color: light });
  y -= 18;

  const strengthColors = { strong: green, moderate: amber, weak: red, absent: light };
  const strengthLabels = { strong: 'STRONG', moderate: 'MODERATE', weak: 'WEAK', absent: 'ABSENT' };

  for (const [provider, _data] of Object.entries(providerStats)) {
    const provResults = validResults.filter(r => r.provider === provider);
    const strengthCount = { strong: 0, moderate: 0, weak: 0, absent: 0 };
    for (const r of provResults) strengthCount[r.recommendationStrength]++;
    const dominant: keyof typeof strengthCount = strengthCount.strong > 0 ? 'strong'
      : strengthCount.moderate > 0 ? 'moderate'
      : strengthCount.weak > 0 ? 'weak'
      : 'absent';

    // Row with traffic light
    drawTlDot(page, M + 5, y + 3, strengthColors[dominant], 10);
    page.drawText(provider, { x: M + 20, y, size: 10, font: helveticaBold, color: dark });

    // Strength blocks
    const blockX = M + 140;
    for (let i = 0; i < provResults.length && i < 8; i++) {
      const s = provResults[i].recommendationStrength;
      page.drawRectangle({ x: blockX + i * 14, y: y - 1, width: 12, height: 12, color: strengthColors[s] });
    }

    page.drawText(strengthLabels[dominant], { x: M + 260, y, size: 8, font: helveticaBold, color: strengthColors[dominant] });

    const positions = provResults.map(r => r.brandPosition).filter(p => p !== null) as number[];
    if (positions.length > 0) {
      const avgPos = Math.round(positions.reduce((a, b) => a + b, 0) / positions.length * 10) / 10;
      page.drawText(`Avg Position: #${avgPos}`, { x: M + 350, y, size: 8, font: helvetica, color: mid });
    }

    y -= 22;
  }

  // Provider Consistency Score
  y -= 8;
  const consistency = calculateProviderConsistency(results);
  const consistencyColor = consistency.label === 'No Visibility' ? red : consistency.score >= 80 ? green : consistency.score >= 50 ? amber : red;

  y = drawSubsectionHeader(page, 'Provider Consistency Score', y);
  y -= 24;
  const consPctText = `${consistency.score}%`;
  page.drawText(consPctText, { x: M + 10, y: y - 5, size: 28, font: helveticaBold, color: consistencyColor });
  const consPctW = helveticaBold.widthOfTextAtSize(consPctText, 28);
  page.drawText(consistency.label, { x: M + 15 + consPctW, y: y + 2, size: 11, font: helveticaBold, color: dark });
  y -= 18;
  y = drawWrappedText(page, consistency.detail, M + 15 + consPctW, y, { size: 9, font: helvetica, color: mid, maxChars: 60, lineSpacing: 13 }); page = pageRef.page || page;

  // ====================== COMPETITOR HEAD-TO-HEAD ======================
  const h2h = buildHeadToHeadMatrix(results, domain);

  if (h2h.competitors.length > 0 && h2h.prompts.length > 0) {
    page = newPage();
    y = H - 10;
    y = drawSectionHeader(page, 'Competitor Head-to-Head Matrix', null, y);

    page.drawText('Which brands AI recommends for each query (your brand highlighted):', { x: M + 5, y, size: 9, font: helveticaOblique, color: light });
    y -= 20;

    const maxCols = Math.min(h2h.prompts.length, 8);
    const colStartX = M + 140;
    const matColW = (contentW - 150) / maxCols;

    for (let i = 0; i < maxCols; i++) {
      page.drawText(`P${i + 1}`, { x: colStartX + i * matColW + matColW / 2 - 5, y, size: 9, font: helveticaBold, color: navy });
    }
    y -= 4;
    page.drawRectangle({ x: M, y: y, width: contentW, height: 1, color: faint });
    y -= 14;

    // Brand row (highlighted navy)
    page.drawRectangle({ x: M, y: y - 4, width: contentW, height: 18, color: navy });
    page.drawText(brandLabel.toUpperCase(), { x: M + 8, y, size: 9, font: helveticaBold, color: yellow });

    for (let i = 0; i < maxCols; i++) {
      const prompt = h2h.prompts[i];
      const present = h2h.brandRow[prompt];
      const cx = colStartX + i * matColW + matColW / 2 - 4;
      if (present) {
        page.drawRectangle({ x: cx - 2, y: y - 2, width: 14, height: 12, color: green });
        page.drawText('Y', { x: cx + 1, y, size: 8, font: helveticaBold, color: white });
      } else {
        page.drawRectangle({ x: cx - 2, y: y - 2, width: 14, height: 12, color: red });
        page.drawText('N', { x: cx + 1, y, size: 8, font: helveticaBold, color: white });
      }
    }
    y -= 22;

    // Competitor rows
    const displayCompetitors = h2h.competitors.slice(0, 10);
    for (const comp of displayCompetitors) {
      if (y < 80) break;

      const isEven = displayCompetitors.indexOf(comp) % 2 === 0;
      if (isEven) {
        page.drawRectangle({ x: M, y: y - 4, width: contentW, height: 16, color: gray });
      }

      const compLabel = comp.length > 24 ? comp.substring(0, 22) + '..' : comp;
      page.drawText(compLabel, { x: M + 8, y, size: 9, font: helvetica, color: dark });

      for (let i = 0; i < maxCols; i++) {
        const prompt = h2h.prompts[i];
        const present = h2h.matrix[comp]?.[prompt] ?? false;
        const cx = colStartX + i * matColW + matColW / 2 - 4;
        if (present) {
          page.drawRectangle({ x: cx - 2, y: y - 2, width: 14, height: 12, color: navy });
          page.drawText('Y', { x: cx + 1, y, size: 8, font: helveticaBold, color: white });
        } else {
          page.drawText('-', { x: cx + 2, y, size: 8, font: helvetica, color: faint });
        }
      }
      y -= 18;
    }

    // Prompt legend
    y -= 10;
    page.drawRectangle({ x: M, y: y, width: contentW, height: 1, color: faint });
    y -= 14;
    page.drawText('PROMPT KEY:', { x: M + 5, y, size: 8, font: helveticaBold, color: navy });
    y -= 14;

    for (let i = 0; i < maxCols; i++) {
      const truncPrompt = h2h.prompts[i].length > 80 ? h2h.prompts[i].substring(0, 78) + '...' : h2h.prompts[i];
      y = drawWrappedText(page, `P${i + 1}: ${truncPrompt}`, M + 5, y, { size: 8, font: helvetica, color: mid, maxChars: 95, lineSpacing: 11 }); page = pageRef.page || page;
      y -= 4;
    }
  }

  // ====================== DETAILED PROMPT ANALYSIS ======================
  page = newPage();
  y = H - 10;

  y = drawSectionHeader(page, 'Detailed Prompt Analysis', null, y);

  const promptGroups = new Map<string, ProviderResult[]>();
  for (const r of results) {
    const arr = promptGroups.get(r.prompt) || [];
    arr.push(r);
    promptGroups.set(r.prompt, arr);
  }

  let promptIdx = 0;
  for (const [prompt, providerResults] of promptGroups) {
    promptIdx++;

    if (y < 160) { page = newPage(); y = H - 60; }

    // Prompt header — subsection style
    const promptHeaderH = 22;
    page.drawRectangle({ x: M, y: y - promptHeaderH, width: contentW, height: promptHeaderH, color: navy });
    page.drawRectangle({ x: M, y: y - promptHeaderH, width: 4, height: promptHeaderH, color: green });
    page.drawText(`Prompt ${promptIdx}`, { x: M + 14, y: y - 15, size: 10, font: helveticaBold, color: white });
    y -= promptHeaderH + 6;

    // Prompt text in quote callout style
    const promptLines = wrapText(`"${prompt}"`, 85);
    const promptBoxH = promptLines.length * 12 + 12;
    page.drawRectangle({ x: M, y: y - promptBoxH, width: contentW, height: promptBoxH, color: gray });
    page.drawRectangle({ x: M, y: y - promptBoxH, width: 4, height: promptBoxH, color: navy });
    let pty = y - 10;
    for (const pl of promptLines) {
      page.drawText(pl, { x: M + 14, y: pty, size: 9, font: helveticaOblique, color: mid });
      pty -= 12;
    }
    y -= promptBoxH + 8;

    for (const r of providerResults) {
      if (y < 120) { page = newPage(); y = H - 60; }

      // Provider result row
      const mentioned = r.brandMentioned;
      const statusColor = mentioned ? green : red;
      const statusText = mentioned ? 'MENTIONED' : 'NOT FOUND';
      const statusDotColor = mentioned ? green : red;

      drawTlDot(page, M + 8, y + 3, statusDotColor, 8);
      page.drawText(r.provider, { x: M + 20, y, size: 10, font: helveticaBold, color: dark });
      page.drawText(statusText, { x: M + 110, y, size: 8, font: helveticaBold, color: statusColor });
      page.drawText(`Score: ${r.score}/100`, { x: M + 190, y, size: 8, font: helvetica, color: light });

      if (r.sentiment !== 'not_mentioned') {
        const sentColor = r.sentiment === 'positive' ? green : r.sentiment === 'negative' ? red : amber;
        page.drawText(`Sentiment: ${r.sentiment}`, { x: M + 270, y, size: 7, font: helvetica, color: sentColor });
      }
      if (r.recommendationStrength !== 'absent') {
        const strColor = strengthColors[r.recommendationStrength];
        page.drawText(`Rec: ${r.recommendationStrength}`, { x: M + 370, y, size: 7, font: helvetica, color: strColor });
      }

      y -= 16;

      // Response excerpt — always render SOMETHING so blank Google AI sections are not mistaken for "no data"
      const rawResp = (r.response || '').trim();
      const isNoOverview = rawResp.startsWith('No AI Overview');
      const isError = rawResp.startsWith('Error') || rawResp.startsWith('Provider not');
      if (isError) {
        y = drawWrappedText(page, `(${rawResp})`, M + 14, y, { size: 8, font: helveticaOblique, color: light, maxChars: 88, lineSpacing: 11 }); page = pageRef.page || page;
        y -= 4;
      } else if (isNoOverview || rawResp.length === 0) {
        const placeholder = r.provider.toLowerCase().includes('google')
          ? '(Google did not return an AI Overview for this query — Google AI Overviews are only generated for ~30–40% of searches.)'
          : '(No content returned for this query.)';
        y = drawWrappedText(page, placeholder, M + 14, y, { size: 8, font: helveticaOblique, color: light, maxChars: 88, lineSpacing: 11 }); page = pageRef.page || page;
        y -= 4;
      } else {
        const rawExcerpt = rawResp.substring(0, 300).replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s+/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + (rawResp.length > 300 ? '...' : '');
        y = drawWrappedText(page, rawExcerpt, M + 14, y, { size: 8, font: helvetica, color: mid, maxChars: 88, lineSpacing: 11 }); page = pageRef.page || page;
        y -= 4;
      }

      // Competitors
      if (r.competitors.length > 0) {
        if (y < 60) { page = newPage(); y = H - 60; }
        const compText = `Competitors: ${r.competitors.join(', ')}`;
        y = drawWrappedText(page, compText, M + 14, y, { size: 8, font: helveticaBold, color: navy, maxChars: 88, lineSpacing: 11 }); page = pageRef.page || page;
        y -= 4;
      }

      if (r.brandPosition !== null) {
        if (y < 60) { page = newPage(); y = H - 60; }
        page.drawText(`Brand listed at position #${r.brandPosition}`, { x: M + 14, y, size: 8, font: helvetica, color: green });
        y -= 12;
      }

      y -= 6;
    }

    // Divider
    page.drawRectangle({ x: M, y: y, width: contentW, height: 1, color: faint });
    y -= 16;
  }

  // ====================== FINAL PAGE: CTA ======================
  page = newPage();

  // Green callout banner at top
  const bannerH = 50;
  page.drawRectangle({ x: 0, y: H - bannerH, width: W, height: bannerH, color: green });
  const bannerText = 'Ready to dominate AI search results?';
  const bannerTextW = helveticaBold.widthOfTextAtSize(bannerText, 18);
  page.drawText(bannerText, { x: (W - bannerTextW) / 2, y: H - 34, size: 18, font: helveticaBold, color: white });

  y = H - bannerH - 30;

  // ============ TOP HALF: SMB Team ============
  y = drawSubsectionHeader(page, 'Grow Your Law Firm with SMB Team', y);

  page.drawText('SMB Team helps law firms scale with proven growth systems:', { x: M + 10, y, size: 11, font: helvetica, color: mid });
  y -= 22;

  const smbBenefits = [
    'Done-for-you marketing built specifically for law firms',
    'Lead generation systems that fill your pipeline predictably',
    'Coaching and training from attorneys who scaled 7- and 8-figure firms',
    'Operations, hiring, and intake playbooks for sustainable growth',
    'A community of ambitious law firm owners pushing each other forward',
  ];

  for (const b of smbBenefits) {
    page.drawText(`•  ${b}`, { x: M + 14, y, size: 10, font: helvetica, color: dark });
    y -= 16;
  }

  y -= 14;

  // SMB Team CTA button
  const smbCtaW = 280;
  const smbCtaX = (W - smbCtaW) / 2;
  page.drawRectangle({ x: smbCtaX, y: y - 5, width: smbCtaW, height: 32, color: navy });
  const smbCtaText = 'Learn More   smbteam.com';
  const smbCtaTextW = helveticaBold.widthOfTextAtSize(smbCtaText, 12);
  page.drawText(smbCtaText, { x: smbCtaX + (smbCtaW - smbCtaTextW) / 2, y: y + 5, size: 12, font: helveticaBold, color: yellow });

  y -= 40;

  // Divider between halves
  page.drawRectangle({ x: M, y: y, width: contentW, height: 1, color: faint });
  y -= 20;

  // ============ BOTTOM HALF: Llumos ============
  y = drawSubsectionHeader(page, 'Track AI Visibility with Llumos', y);

  page.drawText('This report is a snapshot. With Llumos, you can:', { x: M + 10, y, size: 11, font: helvetica, color: mid });
  y -= 22;

  const benefits = [
    'Track AI visibility changes week over week',
    'See exactly which competitors AI recommends instead of you',
    'Get actionable optimization recommendations',
    'Monitor citations and source authority across platforms',
    'Receive automated weekly visibility reports',
  ];

  for (const b of benefits) {
    page.drawText(`•  ${b}`, { x: M + 14, y, size: 10, font: helvetica, color: dark });
    y -= 16;
  }

  y -= 14;

  // Llumos CTA button
  const ctaW = 280;
  const ctaX = (W - ctaW) / 2;
  page.drawRectangle({ x: ctaX, y: y - 5, width: ctaW, height: 32, color: navy });
  const ctaText = 'Schedule a Demo   llumos.app';
  const ctaTextW = helveticaBold.widthOfTextAtSize(ctaText, 12);
  page.drawText(ctaText, { x: ctaX + (ctaW - ctaTextW) / 2, y: y + 5, size: 12, font: helveticaBold, color: yellow });

  y -= 36;
  const qText = 'Questions? Reach us at hello@llumos.app';
  const qTextW = helvetica.widthOfTextAtSize(qText, 9);
  page.drawText(qText, { x: (W - qTextW) / 2, y, size: 9, font: helvetica, color: light });

  // Methodology — assessment box style
  y -= 24;
  y = drawSubsectionHeader(page, 'Methodology Snapshot', y);
  for (const bullet of [
    `${new Set(validResults.map((r) => r.prompt)).size} prompts × ${new Set(validResults.map((r) => r.provider)).size} AI providers = ${validResults.length} total checks`,
    'Competitors shown are only brands explicitly named in AI responses',
    'Scores reflect presence, recommendation strength, and competitive crowding',
    'A 0 visibility score means no verified brand mention was found in the audited responses',
  ]) {
    y = drawWrappedText(page, `•  ${bullet}`, M + 10, y, { size: 8.5, font: helvetica, color: mid, maxChars: 84, lineSpacing: 12 }); page = pageRef.page || page;
    y -= 2;
  }

  return await pdfDoc.save();
}

/**
 * Wrap text to fit within character limit
 */
function sanitizePdfText(text: string): string {
  if (text == null) return '';
  const s = String(text);
  // Replace common smart punctuation with ASCII equivalents
  let out = s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
  // Strip any remaining character outside the WinAnsi (Latin-1 supplement) range
  // pdf-lib's standard Helvetica only supports WinAnsi-encodable glyphs.
  // Allow ASCII (0x20-0x7E), tab/newline, and Latin-1 supplement (0xA0-0xFF).
  out = out.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF×]/g, '');
  return out;
}

function wrapText(text: string, maxChars: number): string[] {
  const sanitized = sanitizePdfText(text);
  const words = sanitized.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxChars) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [sanitized.substring(0, maxChars)];
}

/**
 * Send email with PDF attachment
 */
async function sendReportEmail(
  email: string,
  firstName: string,
  domain: string,
  score: number,
  pdfBytes: Uint8Array
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('[AutoReport] No Resend API key configured');
    return false;
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    
    // Convert PDF to base64
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
    
    const { data, error: emailError } = await resend.emails.send({
      from: "Llumos × SMBTeam Reports <reports@llumos.app>",
      to: email,
      subject: `Your AI Visibility Report for ${domain}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1f2e;">Hi ${firstName}!</h1>
          
          <p style="font-size: 16px; color: #374151;">
            Your AI Visibility Report for <strong>${domain}</strong> is ready.
          </p>
          
          <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Llumos Score</p>
            <p style="margin: 10px 0; font-size: 48px; font-weight: bold; color: ${score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'};">
              ${score}
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">out of 100</p>
          </div>
          
          <p style="font-size: 16px; color: #374151;">
            We've attached a detailed PDF report showing how your brand appears across ChatGPT, Perplexity, and Google AI Overviews.
          </p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #92400e;">
              <strong>🔓 Unlock More Insights</strong>
            </p>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f;">
              Request a demo to access competitor analysis, optimization recommendations, source citations, and historical tracking data.
            </p>
          </div>
          
          <p style="font-size: 16px; color: #374151;">
            <strong>Ready to dominate AI search results?</strong> Schedule a call with our team to see how Llumos can help you track, monitor, and optimize your brand's visibility across all major AI platforms.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://calendly.com/llumos-info/llumos-demo" style="background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Schedule a Demo Call
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Or <a href="https://llumos.app/demo" style="color: #4f46e5; text-decoration: underline;">watch our recorded demo</a> to see Llumos in action.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © Llumos.app × SMBTeam - AI Visibility Intelligence
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `AI-Visibility-Report-${domain.replace(/\./g, '-')}.pdf`,
          content: pdfBase64
        }
      ]
    });

    if (emailError) {
      console.error('[AutoReport] Resend API error:', JSON.stringify(emailError));
      return false;
    }

    console.log(`[AutoReport] Email sent successfully to ${email}, ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('[AutoReport] Error sending email:', error);
    return false;
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Declare variables outside try block for access in catch
  let firstName = '';
  let email = '';
  let domain = '';
  let score = 0;
  let trackingRowIdOuter: string | null = null;

  try {
    const body: ReportRequest = await req.json();
    firstName = body.firstName;
    email = body.email;
    domain = body.domain;
    score = body.score;
    const callerRequestId = body.requestId || null;
    const companyNameOverride = (typeof body.companyName === 'string' ? body.companyName.trim() : '') || undefined;

    console.log(`[AutoReport] Starting report generation for ${domain}${callerRequestId ? ` (caller row: ${callerRequestId})` : ''}${companyNameOverride ? ` (companyName: ${companyNameOverride})` : ''}`);

    // ===== Idempotency guard: prevent duplicate emails for the same email+domain =====
    const dedupeClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedDomain = (domain || '').trim().toLowerCase();

    const { data: recentRequests } = await dedupeClient
      .from('visibility_report_requests')
      .select('id, status, created_at, metadata')
      .eq('email', normalizedEmail)
      .eq('domain', normalizedDomain)
      .order('created_at', { ascending: false })
      .limit(10);

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const EIGHT_MIN_MS = 8 * 60 * 1000;

    // Hard guard #1: if ANY row for this email+domain has emailSent=true in the last 24h, skip.
    // Use metadata.reportGeneratedAt as the authoritative "sent at" timestamp (NOT created_at,
    // which reflects when the request was submitted, not when the email went out).
    // EXCEPTION: when callerRequestId is provided, the caller explicitly wants a new run
    // (e.g., a fresh queue entry for the same email+domain) — only check whether the SPECIFIC
    // caller row has already been sent, not any historical row.
    const recentlySent = (recentRequests || []).find((r: any) => {
      const meta = r.metadata || {};
      const sentAtRaw = meta.reportGeneratedAt;
      if (!sentAtRaw || meta.emailSent !== true) return false;
      // When caller provided a request ID, only block on that exact row.
      if (callerRequestId && r.id !== callerRequestId) return false;
      const sentAt = new Date(sentAtRaw).getTime();
      return Number.isFinite(sentAt) && (now - sentAt) < ONE_DAY_MS;
    });
    if (recentlySent) {
      console.log(`[AutoReport] Skipping duplicate — report already emailed within 24h (id: ${recentlySent.id})`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'already_sent_recently' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hard guard #2: if another invocation is currently generating (started within last 8 min), skip.
    // IMPORTANT: ignore the caller's own row (callerRequestId) — the caller may have just marked
    // it as 'processing' before invoking us, which would otherwise cause a self-block.
    const inFlight = (recentRequests || []).find((r: any) => {
      if (r.status !== 'processing') return false;
      if (callerRequestId && r.id === callerRequestId) return false;
      const meta = r.metadata || {};
      const startedAt = meta.generationStartedAt || meta.backgroundTriggeredAt || meta.processingStartedAt || r.created_at;
      const startedMs = new Date(startedAt).getTime();
      return Number.isFinite(startedMs) && (now - startedMs) < EIGHT_MIN_MS;
    });
    if (inFlight) {
      console.log(`[AutoReport] Skipping duplicate — another generation is in flight (id: ${inFlight.id})`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'already_in_flight' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the tracking row. If no request row exists (e.g., direct/manual invocation),
    // insert one immediately so dedupe works for retries and concurrent calls.
    let trackingRowId: string | null = (recentRequests && recentRequests[0]?.id) || null;
    if (!trackingRowId) {
      const { data: inserted } = await dedupeClient
        .from('visibility_report_requests')
        .insert({
          email: normalizedEmail,
          domain: normalizedDomain,
          score: score || 0,
          status: 'processing',
          metadata: { firstName, generationStartedAt: new Date().toISOString(), source: 'direct_invocation' },
        })
        .select('id')
        .maybeSingle();
      trackingRowId = inserted?.id || null;
      console.log(`[AutoReport] Created tracking row for direct invocation: ${trackingRowId}`);
    } else {
      // Mark as processing with a fresh timestamp so concurrent invocations bail out above
      await dedupeClient
        .from('visibility_report_requests')
        .update({
          status: 'processing',
          metadata: { firstName, generationStartedAt: new Date().toISOString() }
        })
        .eq('id', trackingRowId);
    }
    trackingRowIdOuter = trackingRowId;

    // Step 1: Build brand profile from homepage + research
    console.log('[AutoReport] Building brand profile...');
    const [businessContext, homepageSignals] = await Promise.all([
      researchBusiness(domain),
      fetchHomepageSignals(domain),
    ]);

    const brandProfile = buildBrandProfile(domain, businessContext, homepageSignals, companyNameOverride);
    const brandName = brandProfile.primaryName;
    console.log('[AutoReport] Brand profile:', { primaryName: brandProfile.primaryName, aliases: brandProfile.aliases });

    // Step 2: Identify competitor candidates
    console.log('[AutoReport] Identifying competitors...');
    const competitorCandidates = await identifyCompetitorCandidates(domain, brandProfile, businessContext);
    console.log('[AutoReport] Initial competitor candidates:', competitorCandidates);

    // Step 3: Generate industry-relevant prompts based on research
    console.log('[AutoReport] Generating prompts...');
    const prompts = await generateIndustryPrompts(domain, businessContext);
    console.log('[AutoReport] Generated prompts:', prompts);

    // Step 4: Query all providers for each prompt — run all prompts concurrently
    // (each prompt fans out to 4 providers; ~32 in-flight max with 8 prompts).
    console.log('[AutoReport] Querying providers...');
    const perPromptResults = await Promise.all(
      prompts.map((prompt) =>
        Promise.all([
          queryChatGPT(prompt, brandProfile, competitorCandidates),
          queryPerplexity(prompt, brandProfile, competitorCandidates),
          queryClaude(prompt, brandProfile, competitorCandidates),
          queryGoogleAIO(prompt, brandProfile, competitorCandidates),
        ])
      )
    );
    const allResults: ProviderResult[] = perPromptResults.flat();

    // Step 5: Refine competitors using actual AI response text
    const filterMetricsRef: { metrics?: CompetitorFilterMetrics } = {};
    const refinedCompetitorCandidates = await refineCompetitorCandidatesFromResults(
      domain,
      brandProfile,
      businessContext,
      allResults,
      competitorCandidates,
      filterMetricsRef,
    );
    console.log('[AutoReport] Refined competitor candidates from AI responses:', refinedCompetitorCandidates);

    // Persist per-run filter metrics to the request row for regression tracking
    if (filterMetricsRef.metrics && trackingRowId) {
      try {
        const { data: existingReq } = await dedupeClient
          .from('visibility_report_requests')
          .select('metadata')
          .eq('id', trackingRowId)
          .maybeSingle();
        const mergedMeta = {
          ...((existingReq?.metadata as Record<string, unknown>) ?? {}),
          competitorFilterMetrics: filterMetricsRef.metrics,
        };
        await dedupeClient
          .from('visibility_report_requests')
          .update({ metadata: mergedMeta })
          .eq('id', trackingRowId);
      } catch (metricsErr) {
        console.warn('[AutoReport] Failed to persist competitor filter metrics:', metricsErr);
      }
    }

    // Re-extract competitors and re-detect brand mentions with refined list
    for (const result of allResults) {
      result.competitors = extractCompetitors(result.response, brandProfile, refinedCompetitorCandidates);
      {
        const __cls = classifyEntityMentions(result.competitors, result.response);
        result.recommendedEntities = __cls.recommended;
        result.entityMentionStatus = __cls.statuses;
      }
      result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    }

    // Step 3: Calculate overall AI Visibility Score.
    // Category difficulty is a SEPARATE diagnostic and never adds points to the score.
    const validResults = allResults.filter(r => !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview'));

    // ===== CROSS-VALIDATION GUARDRAIL =====
    // The strict-substring sentiment analyzer is the most conservative truth signal.
    // If sentiment says the brand was never mentioned (across ALL valid responses),
    // reset per-result mention flags so the scorecard, sentiment, recommendation,
    // and matrix sections cannot disagree. Run BEFORE scoring so the helper sees
    // the corrected flags.
    const sentimentMentionCount = validResults.filter(r => r.sentiment !== 'not_mentioned').length;
    const preGuardrailMentioned = validResults.filter(r => r.brandMentioned).length;
    if (validResults.length > 0 && sentimentMentionCount === 0 && preGuardrailMentioned > 0) {
      console.warn(`[AutoReport] Guardrail triggered: brandMentioned=${preGuardrailMentioned} but sentiment=0 across ${validResults.length} responses. Resetting mention flags to match sentiment truth.`);
      for (const r of allResults) {
        r.brandMentioned = false;
        r.score = 0;
        r.recommendationStrength = 'absent';
        r.brandPosition = null;
      }
    }
    const mentionedResults = validResults.filter(r => r.brandMentioned);

    // Diagnostic only — NOT added to overall score.
    const categoryVisibility = computeCategoryVisibility(allResults);

    // Classify every entity we know about (AI-mentioned + research-backed) into a competitor type.
    // Industry inference drives law-firm-aware rules (e.g. ADR providers and software are NOT direct competitors).
    const reportIndustry = inferReportIndustry(businessContext, prompts);
    const aiMentionedCounts = new Map<string, number>(); // canonical -> count
    const aiMentionedDisplay = new Map<string, string>(); // canonical -> first-seen display name
    for (const r of validResults) {
      for (const c of r.competitors || []) {
        const canon = c.toLowerCase().trim();
        if (!canon) continue;
        aiMentionedCounts.set(canon, (aiMentionedCounts.get(canon) || 0) + 1);
        if (!aiMentionedDisplay.has(canon)) aiMentionedDisplay.set(canon, c);
      }
    }
    const classifiedCompetitors: ClassifiedCompetitor[] = [];
    const seenCanon = new Set<string>();
    for (const [canon, count] of aiMentionedCounts.entries()) {
      seenCanon.add(canon);
      const display = aiMentionedDisplay.get(canon) || canon;
      const { type, reason } = classifyEntity(display, reportIndustry);
      classifiedCompetitors.push({
        name: display, canonical: canon, type, source: 'ai_mentioned', mentionCount: count, reason,
      });
    }
    for (const c of refinedCompetitorCandidates) {
      const canon = c.toLowerCase().trim();
      if (!canon || seenCanon.has(canon)) continue;
      seenCanon.add(canon);
      const { type, reason } = classifyEntity(c, reportIndustry);
      classifiedCompetitors.push({
        name: c, canonical: canon, type, source: 'research_backed', mentionCount: 0, reason,
      });
    }
    const classificationLookup = new Map<string, CompetitorType>();
    for (const cc of classifiedCompetitors) classificationLookup.set(cc.canonical, cc.type);
    const classifyByName = (name: string): CompetitorType => {
      const t = classificationLookup.get(name.toLowerCase().trim());
      if (t) return t;
      return classifyEntity(name, reportIndustry).type;
    };

    // SoV uses AI-mentioned RECOMMENDATION EVENTS only — research-backed competitors are excluded.
    const shareOfVoice = computeShareOfVoice(validResults, {
      excludedCompetitorTypes: new Set<CompetitorType>(['Irrelevant / Excluded']),
      classify: classifyByName,
    });

    console.log(`[AutoReport] Industry inferred as "${reportIndustry}". Classified ${classifiedCompetitors.length} entities (${classifiedCompetitors.filter(c => c.source === 'ai_mentioned').length} AI-mentioned, ${classifiedCompetitors.filter(c => c.source === 'research_backed').length} research-backed).`);

    // ===== Build aiMentionedEntities + competitorRecommendationEvents =====
    // aiMentionedEntities  → every named org/firm/service/etc. (powers the
    //                        Detailed Competitor Landscape, Competitors Mentioned
    //                        by AI, Competitor Types Found, Entity Discovery).
    // competitorRecommendationEvents → strict subset where the AI listed /
    //                        recommended / preferred the entity (powers SoV,
    //                        Head-to-Head Matrix, Content Gap "competitors
    //                        winning here", AI Opportunity competitor gap).
    const aiMentionedEntities: AIMentionedEntity[] = [];
    const competitorRecommendationEvents: CompetitorRecommendationEvent[] = [];
    let promptIdCounter = 0;
    const promptIdMap = new Map<string, string>();
    const promptIdFor = (promptText: string): string => {
      const existing = promptIdMap.get(promptText);
      if (existing) return existing;
      promptIdCounter += 1;
      const id = `p${promptIdCounter}`;
      promptIdMap.set(promptText, id);
      return id;
    };
    for (const r of validResults) {
      const promptId = promptIdFor(r.prompt);
      for (const entity of r.competitors || []) {
        const canonical = entity.toLowerCase().trim();
        if (!canonical) continue;
        const status = (r.entityMentionStatus && r.entityMentionStatus[canonical]) || 'named';
        const entityType = classifyByName(entity);
        const evidence = buildEvidenceSnippet(entity, r.response);
        const mentionCount = countEntityMentions(entity, r.response);
        aiMentionedEntities.push({
          entityName: entity,
          canonicalName: canonical,
          provider: r.provider,
          promptId,
          promptText: r.prompt,
          entityType,
          mentionCount,
          evidenceSnippet: evidence,
          mentionStatus: status,
        });

        if (status === 'listed' || status === 'recommended' || status === 'preferred') {
          // Map mention status → recommendation strength.
          //   preferred   → strong
          //   recommended → moderate
          //   listed      → weak
          const recommendationStrength: 'strong' | 'moderate' | 'weak' =
            status === 'preferred' ? 'strong' : status === 'recommended' ? 'moderate' : 'weak';
          competitorRecommendationEvents.push({
            entityName: entity,
            canonicalName: canonical,
            provider: r.provider,
            promptId,
            promptText: r.prompt,
            entityType,
            recommendationStrength,
            position: detectEntityPosition(entity, r.response),
            evidenceSnippet: evidence,
          });
        }
      }
    }
    console.log(`[AutoReport] Entities — aiMentioned=${aiMentionedEntities.length} (unique=${new Set(aiMentionedEntities.map(e => e.canonicalName)).size}), recommendationEvents=${competitorRecommendationEvents.length} (unique=${new Set(competitorRecommendationEvents.map(e => e.canonicalName)).size})`);

    // ===== Single source of truth for the AI Visibility Score =====
    // All five components (Mention Coverage, Prompt Coverage, Provider Coverage,
    // Mention Quality, Competitive SoV) and the zero-mention + single-mention
    // guardrails live in computeVisibilityScore(). Tests cover every guardrail.
    const visibility = computeVisibilityScore(validResults, shareOfVoice.sov);
    const overallScore = visibility.finalScore;
    const verifiedMentionCount = visibility.diagnostics.verifiedBrandMentions;

    // Build the prospect-facing breakdown (PDF + persisted metadata).
    const scoreBreakdown = {
      components: visibility.components,
      diagnostics: {
        validResponses: visibility.diagnostics.validResponses,
        verifiedBrandMentions: verifiedMentionCount,
        promptsCovered: visibility.diagnostics.promptsCovered,
        providersCovered: visibility.diagnostics.providersCovered,
        competitorRecommendationEvents: shareOfVoice.competitorRecommendationEvents,
        categoryCoverage: `${Math.round((categoryVisibility.coverage || 0) * 100)}%`,
        categoryDifficulty: categoryVisibility.label,
      },
      finalScore: overallScore,
      note:
        'Category Difficulty is not added to the AI Visibility Score. ' +
        'It is shown separately to explain whether AI platforms are naming brands in this category at all.',
    };

    const c = visibility.components;
    console.log(`[AutoReport] Score breakdown — mention:${c.mentionCoverage.score}/40 prompt:${c.promptCoverage.score}/20 provider:${c.providerCoverage.score}/15 quality:${c.mentionQuality.score}/15 sov:${c.competitiveSov.score}/10 → final:${overallScore}/100 (verifiedMentions=${verifiedMentionCount}, sentimentMentions=${sentimentMentionCount}, singleMentionGuardrail=${visibility.diagnostics.singleMentionGuardrailApplied}, category(diagnostic only)=${categoryVisibility.label} ${(categoryVisibility.coverage*100).toFixed(0)}%)`);


    // AI Opportunity Score — separate from AI Visibility Score. Answers:
    // "How much room is there to win visibility in this category?"
    const aiOpportunity = computeAIOpportunityScore(allResults, categoryVisibility.coverage);
    console.log(`[AutoReport] AI Opportunity Score: ${aiOpportunity.score}/100 (${aiOpportunity.label}) — categoryOpp=${aiOpportunity.breakdown.categoryOpportunity}, competitorGap=${aiOpportunity.breakdown.competitorGapScore}, promptIntent=${aiOpportunity.breakdown.promptIntentOpportunityScore} (absentRate=${(aiOpportunity.breakdown.absentHighIntentPromptRate*100).toFixed(0)}% of ${aiOpportunity.breakdown.highIntentPromptCount} HI prompts), providerOpp=${aiOpportunity.breakdown.providerOpportunityScore} (${aiOpportunity.breakdown.providersWhereBrandWasAbsent}/${aiOpportunity.breakdown.totalProviders} providers absent)`);

    // Step 4: Generate PDF with enhanced content
    console.log('[AutoReport] Generating PDF with executive summary, benchmarks, and content gaps...');
    const pdfBytes = await generatePDF(firstName, domain, overallScore, allResults, businessContext, categoryVisibility, shareOfVoice, refinedCompetitorCandidates, aiOpportunity, classifiedCompetitors, scoreBreakdown);

    console.log(`[AutoReport] PDF generated: ${pdfBytes.length} bytes`);

    // Step 5: Send email
    console.log('[AutoReport] Sending email...');
    const emailSent = await sendReportEmail(email, firstName, domain, overallScore, pdfBytes);

    // Step 6: Update database record — use tracking row id when available so we don't accidentally
    // update an unrelated row for the same email+domain.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 6a: Persist the report (PDF in storage + row in visibility_reports)
    let savedPdfUrl: string | null = null;
    let savedStoragePath: string | null = null;
    try {
      const safeDomain = normalizedDomain.replace(/[^a-z0-9.-]/gi, '-');
      const storagePath = `${safeDomain}/${Date.now()}-ai-visibility-report.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('visibility-reports')
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false,
        });
      if (uploadError) {
        console.error('[AutoReport] PDF upload failed:', uploadError.message);
      } else {
        savedStoragePath = storagePath;
        const { data: pub } = supabase.storage.from('visibility-reports').getPublicUrl(storagePath);
        savedPdfUrl = pub?.publicUrl ?? null;
      }

      // Try to associate to an org via brand domain
      let orgIdForReport: string | null = null;
      try {
        const { data: brandRow } = await supabase
          .from('brands')
          .select('org_id')
          .ilike('domain', normalizedDomain)
          .limit(1)
          .maybeSingle();
        orgIdForReport = brandRow?.org_id ?? null;
      } catch (e) {
        console.warn('[AutoReport] org lookup by domain failed:', (e as Error).message);
      }

      const { error: insertError } = await supabase
        .from('visibility_reports')
        .insert({
          org_id: orgIdForReport,
          domain: normalizedDomain,
          brand_name: brandName,
          recipient_email: normalizedEmail,
          recipient_first_name: firstName || null,
          overall_score: overallScore,
          prompts_run: prompts.length,
          providers_queried: 4,
          pdf_url: savedPdfUrl,
          pdf_storage_path: savedStoragePath,
          source: 'lead_magnet',
          summary: {
            emailSent,
            providers: ['chatgpt', 'perplexity', 'claude', 'google_aio'],
            generatedAt: new Date().toISOString(),
            scoreBreakdown,
            categoryVisibility: {
              coverage: Number(categoryVisibility.coverage.toFixed(2)),
              label: categoryVisibility.label,
              detail: categoryVisibility.detail,
              interpretation: categoryVisibility.interpretation,
            },
            shareOfVoice: {
              ratio: Number(shareOfVoice.sov.toFixed(2)),
              brandMentions: shareOfVoice.brandMentions,
              competitorMentions: shareOfVoice.competitorMentions,
              brandRecommendationEvents: shareOfVoice.brandRecommendationEvents,
              competitorRecommendationEvents: shareOfVoice.competitorRecommendationEvents,
              note: 'SoV is computed from AI-mentioned recommendation events only. Research-backed competitors are excluded.',
            },
            aiOpportunity: {
              score: aiOpportunity.score,
              label: aiOpportunity.label,
              breakdown: aiOpportunity.breakdown,
              note: 'AI Opportunity Score is separate from AI Visibility Score and is never blended into it.',
            },
            reportIndustry,
            classifiedCompetitors: classifiedCompetitors.map(c => ({
              name: c.name, type: c.type, source: c.source, mentionCount: c.mentionCount,
            })),
            competitorTypeCounts: classifiedCompetitors.reduce((acc, c) => {
              if (c.type === 'Irrelevant / Excluded') return acc;
              acc[c.type] = (acc[c.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            promptIntents: prompts.map((p) => {
              const info = classifyPromptIntent(p);
              return { prompt: p, intent: info.intent, weight: info.weight, priority: info.priority };
            }),
            // Two separate arrays so the report can show ALL named entities
            // while keeping Share of Voice / Head-to-Head / Content Gap
            // conservative (recommendation events only).
            aiMentionedEntities: aiMentionedEntities.slice(0, 1000),
            competitorRecommendationEvents: competitorRecommendationEvents.slice(0, 500),
            entityCounts: {
              aiMentionedTotal: aiMentionedEntities.length,
              aiMentionedUnique: new Set(aiMentionedEntities.map(e => e.canonicalName)).size,
              recommendationEventsTotal: competitorRecommendationEvents.length,
              recommendationEventsUnique: new Set(competitorRecommendationEvents.map(e => e.canonicalName)).size,
            },
          },
        });
      if (insertError) {
        console.error('[AutoReport] visibility_reports insert failed:', insertError.message);
      } else {
        console.log('[AutoReport] visibility_reports row saved');
      }
    } catch (persistErr: any) {
      console.error('[AutoReport] Persist report failed:', persistErr?.message);
    }

    // Merge with existing metadata so we don't wipe competitorFilterMetrics or other prior fields
    let existingMetaForUpdate: Record<string, unknown> = {};
    if (trackingRowId) {
      const { data: existingRow } = await supabase
        .from('visibility_report_requests')
        .select('metadata')
        .eq('id', trackingRowId)
        .maybeSingle();
      existingMetaForUpdate = (existingRow?.metadata as Record<string, unknown>) ?? {};
    }

    const updatePayload = {
      status: emailSent ? 'sent' : 'error',
      metadata: {
        ...existingMetaForUpdate,
        firstName,
        reportGeneratedAt: new Date().toISOString(),
        calculatedScore: overallScore,
        promptsRun: prompts.length,
        providersQueried: 4,
        categoryVisibility: categoryVisibility.label,
        shareOfVoice: Number(shareOfVoice.sov.toFixed(2)),
        aiOpportunityScore: aiOpportunity.score,
        aiOpportunityLabel: aiOpportunity.label,
        emailSent,
      },
    };

    if (trackingRowId) {
      await supabase.from('visibility_report_requests').update(updatePayload).eq('id', trackingRowId);
    } else {
      await supabase
        .from('visibility_report_requests')
        .update(updatePayload)
        .eq('email', normalizedEmail)
        .eq('domain', normalizedDomain)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    console.log(`[AutoReport] Report generation complete for ${domain}`);

    return new Response(
      JSON.stringify({
        success: true,
        score: overallScore,
        emailSent,
        promptsRun: prompts.length,
        resultsCount: allResults.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[AutoReport] Error:", error);
    
    // Send failure notification email if we have user details
    let failureNotificationSent = false;
    if (email && domain) {
      console.log(`[AutoReport] Sending failure notification to ${email} for ${domain}`);
      failureNotificationSent = await sendFailureNotificationEmail(
        email,
        firstName,
        domain,
        error?.message
      );
      
      // Update database record with error status — target the specific tracking row when known
      // so we never accidentally reset the dedupe guard on a previously-sent row.
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        if (trackingRowIdOuter) {
          const { data: existingErrRow } = await supabase
            .from('visibility_report_requests')
            .select('metadata')
            .eq('id', trackingRowIdOuter)
            .maybeSingle();
          const existingErrMeta = (existingErrRow?.metadata as Record<string, unknown>) ?? {};
          await supabase
            .from('visibility_report_requests')
            .update({
              status: 'error',
              metadata: {
                ...existingErrMeta,
                firstName,
                errorAt: new Date().toISOString(),
                errorMessage: error?.message || 'Unknown error',
                failureNotificationSent,
              },
            })
            .eq('id', trackingRowIdOuter);
        } else {
          // No tracking row id available — fall back to email+domain but only update rows
          // that are NOT already in 'sent' status, to protect the dedupe guard.
          await supabase
            .from('visibility_report_requests')
            .update({
              status: 'error',
              metadata: {
                firstName,
                errorAt: new Date().toISOString(),
                errorMessage: error?.message || 'Unknown error',
                failureNotificationSent,
              },
            })
            .eq('email', email)
            .eq('domain', domain)
            .neq('status', 'sent')
            .order('created_at', { ascending: false })
            .limit(1);
        }
      } catch (dbError) {
        console.error('[AutoReport] Failed to update database with error status:', dbError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        failureNotificationSent 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
