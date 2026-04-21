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

interface ReportRequest {
  firstName: string;
  email: string;
  domain: string;
  score: number;
}

interface BrandProfile {
  primaryName: string;
  aliases: string[];
}

interface HomepageSignals {
  context: string;
  brandCandidates: string[];
}

interface ProviderResult {
  provider: string;
  prompt: string;
  response: string;
  brandMentioned: boolean;
  competitors: string[];
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

function normalizeEntityName(value: string): string {
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

function prettifyDomainLabel(domain: string): string {
  const base = domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\.(com|io|net|org|co|app|ai|dev)$/i, '')
    .split('.')[0]
    .toLowerCase();

  let label = base.replace(/[-_]+/g, ' ');
  const suffixes = ['team', 'group', 'labs', 'legal', 'law', 'marketing', 'media', 'partners', 'partner', 'agency', 'coaching', 'coach', 'consulting', 'services', 'studio'];
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

function buildBrandProfile(domain: string, businessContext: string, homepageSignals: HomepageSignals): BrandProfile {
  const fallbackName = prettifyDomainLabel(domain);
  const domainStem = domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\.(com|io|net|org|co|app|ai|dev)$/i, '')
    .split('.')[0];
  const normalizedStem = normalizeEntityName(domainStem);

  const candidates = dedupeBrandNames([
    ...homepageSignals.brandCandidates,
    ...extractBrandCandidatesFromContext(businessContext),
    fallbackName,
  ]).filter((c) => c && c.length >= 2 && !/^\d+$/.test(c.trim()));

  const primaryName = candidates
    .sort((a, b) => {
      const aNorm = normalizeEntityName(a);
      const bNorm = normalizeEntityName(b);
      const aScore = (aNorm === normalizedStem ? 20 : 0) + (aNorm.includes(normalizedStem) || normalizedStem.includes(aNorm) ? 10 : 0) + (a.split(/\s+/).length <= 3 ? 2 : 0);
      const bScore = (bNorm === normalizedStem ? 20 : 0) + (bNorm.includes(normalizedStem) || normalizedStem.includes(bNorm) ? 10 : 0) + (b.split(/\s+/).length <= 3 ? 2 : 0);
      return bScore - aScore || a.length - b.length;
    })[0] || fallbackName;

  return {
    primaryName,
    aliases: dedupeBrandNames([
      primaryName,
      fallbackName,
      domainStem,
      primaryName.replace(/\s+/g, ''),
      primaryName.replace(/\s+/g, '-'),
    ]).filter((alias) => normalizeEntityName(alias).length >= 3),
  };
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

function findBrandMention(text: string, brandProfile: BrandProfile): { index: number; alias: string } | null {
  let bestMatch: { index: number; alias: string } | null = null;

  for (const alias of brandProfile.aliases) {
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
  return findBrandMention(text, brandProfile) !== null;
}

function dedupeBrandNames(names: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const name of names) {
    const normalized = normalizeEntityName(name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(name.trim());
  }

  return deduped;
}

function hasBrandLikeShape(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return false;
  // Domain-like patterns (contains a dot)
  if (/\./.test(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  // Multi-word: at least one word starts with a capital letter AND not all words are common English
  if (words.length >= 2) {
    const hasCapital = words.some(w => /^[A-Z]/.test(w));
    const allCommon = words.every(w => COMMON_ENGLISH_WORDS.has(w.toLowerCase()));
    return hasCapital && !allCommon;
  }
  // Single word rules — much stricter to avoid sentence-start false positives
  // Reject if it's a common English word
  if (COMMON_ENGLISH_WORDS.has(trimmed.toLowerCase())) return false;
  if (GENERIC_COMPETITOR_TERMS.has(trimmed.toLowerCase())) return false;
  // Internal caps (e.g., "HubSpot", "LawRank")
  if (/[a-z][A-Z]/.test(trimmed)) return true;
  // Short all-caps acronym (e.g., "SAP", "IBM")
  if (/^[A-Z]{2,6}$/.test(trimmed)) return true;
  // Contains digits mixed with letters (e.g., "G2", "360i")
  if (/\d/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) return true;
  // Capitalized word 5+ chars — only if it looks "brand-like" (not a common word)
  // We already filtered common words above, so remaining 5+ char capitalized words are likely brands
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

  for (const rawPart of competitorSection.split(/,|;|\n|•|·|\||\s+and\s+/i)) {
    const cleaned = rawPart.trim().replace(/^[-–—\d.\s]+/, '').trim();
    if (isLikelyCompetitorBrand(cleaned, brandName, domain)) {
      candidates.push(cleaned);
    }
  }

  return dedupeBrandNames(candidates).slice(0, 15);
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
    for (const rawPart of match[1].split(/,|;|\/|\s+and\s+/i)) {
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
  brandName: string,
  businessContext: string,
): Promise<string[]> {
  const fallbackCandidates = parseCompetitorCandidatesFromResearch(businessContext, brandName, domain);

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
          .filter((item: string) => isLikelyCompetitorBrand(item, brandName, domain));

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

async function refineCompetitorCandidatesFromResults(
  domain: string,
  brandName: string,
  businessContext: string,
  results: ProviderResult[],
  initialCandidates: string[],
): Promise<string[]> {
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

  const combinedCandidates = dedupeBrandNames([
    ...trustedCandidates,
    ...singleProviderCandidates,
    ...initialCandidates,
  ]).slice(0, 20);

  if (combinedCandidates.length === 0) {
    return [];
  }

  // Strong-corroboration set: ≥2 providers OR ≥2 total mentions → trusted, bypass ALL gates.
  // Cross-provider/multi-mention corroboration is itself strong evidence the entity is real.
  const strongKeys = new Set(
    responseStats
      .filter((s) => s.providers.size >= 2 || s.mentions >= 2)
      .map((s) => normalizeEntityName(s.candidate)),
  );

  const trustedDirect = combinedCandidates.filter((c) => strongKeys.has(normalizeEntityName(c)));
  const weakCandidates = combinedCandidates.filter((c) => !strongKeys.has(normalizeEntityName(c)));

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
            );

            // Only apply OpenAI's filter if it kept a reasonable fraction; otherwise keep all weak
            // (protects against the LLM being overly aggressive)
            if (refined.length >= Math.ceil(weakCandidates.length * 0.5)) {
              weakAfterOpenAI = refined;
            } else {
              console.warn(
                `[AutoReport] OpenAI refine kept only ${refined.length}/${weakCandidates.length} — too aggressive, keeping all weak candidates`,
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

  // Perplexity is the final, strictest gate — only for weak candidates that survived OpenAI
  const validated = weakAfterOpenAI.length > 0
    ? await validateCompetitorsWithPerplexity(weakAfterOpenAI, brandName, domain, businessContext)
    : [];

  return dedupeBrandNames([...trustedDirect, ...validated]).slice(0, 15);
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
            content: `You are an expert at generating AI search prompts for competitive visibility audits. Generate exactly 8 UNBRANDED prompts that a real buyer would ask an AI assistant while evaluating providers in this category.

CRITICAL RULES:
- Do NOT include the brand name, company name, or domain in any prompt
- Prompts should be highly specific to what this business offers
- Prioritize buyer-intent and vendor-comparison phrasing over educational how-to phrasing
- At least 5 prompts should be likely to surface named firms, agencies, programs, consultants, or competing brands
- Avoid broad informational prompts unless they clearly imply provider selection
- Think about how someone would search before they know the brand but while they are choosing a solution
- Make prompts realistic - what would someone actually type into ChatGPT or Perplexity?`
          },
          {
            role: 'user',
            content: `Generate 8 unbranded AI search prompts for a business with domain "${domain}".

${businessContext ? `BUSINESS RESEARCH (use this to make prompts highly relevant):
${businessContext}` : 'Industry: General business'}

Generate prompts that potential customers of THIS SPECIFIC business would search for. Examples:
- For a running shoe company: "What are the best running shoes for marathon training?"
- For a CRM software: "How do I choose a CRM for my small business?"
- For a pizza restaurant: "Best pizza places near me with outdoor seating"

If the company sells services, prefer prompts asking for the best firms, agencies, providers, programs, or consultants in that niche.

Return ONLY a JSON array of 8 unbranded prompt strings, no other text:
["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5", "prompt 6", "prompt 7", "prompt 8"]`
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
        return prompts.slice(0, 8);
      }
    }
    
    return getDefaultPrompts(domain);
  } catch (error) {
    console.error('[AutoReport] Error generating prompts:', error);
    return getDefaultPrompts(domain);
  }
}

function getDefaultPrompts(domain: string): string[] {
  // Infer industry from domain for generic prompts
  const domainPart = domain.replace(/\.(com|io|net|org|co|app)$/i, '').toLowerCase();
  
  // Generic industry prompts that don't mention the brand
  return [
    `What are the best tools for ${domainPart.includes('crm') ? 'customer relationship management' : 'business productivity'}?`,
    `How do I choose the right software for my business needs?`,
    `What should I look for when evaluating SaaS solutions?`,
    `Best practices for improving business efficiency with technology`,
    `Top recommendations for enterprise software in 2025`,
    `What are the most trusted providers in the ${domainPart} space?`,
    `Compare the leading solutions for ${domainPart.includes('crm') ? 'CRM' : 'business'} management`,
    `Which companies are best known for ${domainPart.includes('crm') ? 'customer management' : 'business solutions'}?`
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
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

    const data = await response.json();
    result.response = data.choices[0]?.message?.content || '';
    result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    result.competitors = extractCompetitors(result.response, brandProfile.primaryName, competitorCandidates);
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
    });

    if (!response.ok) throw new Error(`Perplexity error: ${response.status}`);

    const data = await response.json();
    result.response = data.choices[0]?.message?.content || '';
    result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    result.competitors = extractCompetitors(result.response, brandProfile.primaryName, competitorCandidates);
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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`Claude error: ${response.status} ${response.statusText} — ${bodyText.slice(0, 300)}`);
    }

    const data = await response.json();
    result.response = (data.content || []).map((b: any) => b.text || '').join('\n').trim();
    result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    result.competitors = extractCompetitors(result.response, brandProfile.primaryName, competitorCandidates);
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

    const searchResponse = await fetch(googleSearchUrl.toString());
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

    const aioResponse = await fetch(aioUrl.toString());
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
    result.competitors = extractCompetitors(result.response, brandProfile.primaryName, competitorCandidates);
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
 * Extract only direct competitor brands from response text
 * Uses a researched company-specific competitor allowlist instead of generic pattern matching
 */
function extractCompetitors(text: string, brandName: string, competitorCandidates: string[]): string[] {
  if (!competitorCandidates.length || !text) return [];

  const textLower = text.toLowerCase();
  const brandLower = brandName.toLowerCase();

  return competitorCandidates.filter((candidate) => {
    const candidateLower = candidate.toLowerCase().trim();
    if (!candidateLower || candidateLower.length < 2) return false;
    if (candidateLower === brandLower) return false;

    // Use word-boundary matching to prevent false positives
    // For short names (< 4 chars), require exact word boundaries
    // For longer names, use a looser boundary that allows possessives and punctuation
    try {
      const escaped = escapeRegExp(candidateLower);
      const pattern = candidateLower.length < 4
        ? new RegExp(`\\b${escaped}\\b`, 'i')
        : new RegExp(`(?:^|[\\s,;:(/"'\\[])${escaped}(?=[\\s,;:)/"'\\].'!?]|$)`, 'i');
      return pattern.test(text);
    } catch {
      // Fallback to includes if regex fails
      return textLower.includes(candidateLower);
    }
  });
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

  const promptGroups = new Map<string, ProviderResult[]>();
  for (const result of validResults) {
    const arr = promptGroups.get(result.prompt) || [];
    arr.push(result);
    promptGroups.set(result.prompt, arr);
  }

  let totalPrompts = 0;
  let consistentPrompts = 0;

  for (const [, group] of promptGroups) {
    if (group.length < 2) continue;
    totalPrompts++;

    const mentionedCount = group.filter((result) => result.brandMentioned).length;
    // Only count as "consistent" if brand IS mentioned across all providers for that prompt
    // Unanimous absence is NOT consistency — it's invisibility
    if (mentionedCount === group.length) {
      consistentPrompts++;
    } else if (mentionedCount > 0 && mentionedCount < group.length) {
      // Partial mention — inconsistent
    } else {
      // All absent — count as neutral (not consistent, not inconsistent)
    }
  }

  if (totalPrompts === 0) {
    return { score: 0, label: 'Insufficient Data', detail: 'Not enough provider overlap to measure consistency.' };
  }

  // Weight by mention rate — can't have high consistency with low visibility
  const rawConsistency = consistentPrompts / totalPrompts;
  const score = Math.round(rawConsistency * mentionRate * 100);
  let label: string;
  let detail: string;

  if (score >= 60) {
    label = 'High Consistency';
    detail = 'AI platforms mostly agree about your brand — strong, reliable visibility signal.';
  } else if (score >= 30) {
    label = 'Mixed Signals';
    detail = 'Some AI platforms mention your brand while others don\'t — visibility is fragile.';
  } else if (totalMentions > 0) {
    label = 'Low Consistency';
    detail = `Your brand appeared in only ${totalMentions} of ${validResults.length} checks. Most AI platforms don't yet reference your brand consistently.`;
  } else {
    label = 'Inconsistent';
    detail = 'AI platforms disagree significantly about your brand — urgent attention needed.';
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

    for (const competitor of result.competitors) {
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
      matrix[competitor][prompt] = validResults.some((result) => result.competitors.includes(competitor));
    }
  }

  return { prompts: promptTexts, competitors, matrix, brandRow };
}

/**
 * Calculate visibility score for a provider result
 */
function calculateProviderScore(result: ProviderResult): number {
  let score = 0;
  
  if (result.brandMentioned) {
    score += 50; // Base score for being mentioned
    
    // Bonus for brand appearing early in the response (first 300 chars = prominent placement)
    // Use brandPosition if detected, otherwise check text position
    if (result.brandPosition !== null && result.brandPosition <= 3) {
      score += 25;
    } else if (result.brandPosition !== null && result.brandPosition <= 5) {
      score += 15;
    }
    // Note: firstMentionIndex removed — brandPosition already covers early-mention bonus
    
    // Bonus for positive context (simplified)
    const positiveTerms = ['best', 'top', 'leading', 'recommend', 'excellent', 'great'];
    for (const term of positiveTerms) {
      if (result.response.toLowerCase().includes(term)) {
        score += 5;
      }
    }
  }

  return Math.min(score, 100);
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
      for (const c of missed.competitors) {
        if (!existing.competitorsWinning.includes(c)) existing.competitorsWinning.push(c);
      }
    } else {
      gapsByPrompt.set(key, {
        prompt: topic,
        providers: [missed.provider],
        competitorsWinning: [...missed.competitors],
        recommendation: '',
      });
    }
  }

  const gaps = Array.from(gapsByPrompt.values())
    .sort((a, b) => b.providers.length - a.providers.length)
    .slice(0, 3);

  for (const g of gaps) {
    g.recommendation = buildGapRecommendation(g.prompt, g.competitorsWinning);
  }

  if (gaps.length === 0) {
    return [{
      prompt: 'Industry comparison and "best of" queries',
      providers: ['ChatGPT', 'Perplexity', 'Google AIO'],
      competitorsWinning: [],
      recommendation: 'Build comparison and listicle content targeting high-intent commercial queries in your category. Include FAQ schema and 3rd-party validation.',
    }];
  }

  return gaps;
}

/**
 * Generate executive summary based on results
 */
function generateExecutiveSummary(
  domain: string,
  overallScore: number,
  results: ProviderResult[],
  industryBenchmark: { industry: string; benchmark: number }
): string[] {
  const summary: string[] = [];
  
  // Score interpretation
  if (overallScore >= 70) {
    summary.push(`${domain} has strong AI visibility with a score of ${overallScore}/100.`);
  } else if (overallScore >= 40) {
    summary.push(`${domain} has moderate AI visibility (${overallScore}/100) with room for improvement.`);
  } else {
    summary.push(`${domain} has low AI visibility (${overallScore}/100) and is missing significant opportunities.`);
  }
  
  // Benchmark comparison
  const diff = overallScore - industryBenchmark.benchmark;
  if (diff >= 10) {
    summary.push(`You're performing ${diff} points above the ${industryBenchmark.industry} average.`);
  } else if (diff <= -10) {
    summary.push(`You're ${Math.abs(diff)} points below the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}.`);
  } else {
    summary.push(`You're performing close to the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}.`);
  }
  
  // Provider insights
  const validResults = results.filter(r => !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview'));
  const mentionRate = validResults.length > 0 ? validResults.filter(r => r.brandMentioned).length / validResults.length : 0;
  
  if (mentionRate >= 0.7) {
    summary.push(`AI models mention your brand in ${Math.round(mentionRate * 100)}% of relevant queries.`);
  } else if (mentionRate >= 0.4) {
    summary.push(`Your brand appears in ${Math.round(mentionRate * 100)}% of queries - competitors may be capturing the rest.`);
  } else {
    summary.push(`Critical: Only ${Math.round(mentionRate * 100)}% of AI queries mention your brand.`);
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
  businessContext: string = ''
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

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

  const scoreColor = (s: number) => s >= 70 ? green : s >= 40 ? amber : red;
  const scoreLabel = (s: number) => s >= 70 ? 'Strong' : s >= 40 ? 'Moderate' : 'Low';
  const scoreTlLabel = (s: number) => s >= 70 ? 'On Track' : s >= 40 ? 'In Progress' : 'Critical Priority';

  const industryBenchmark = getIndustryBenchmark(businessContext);
  const contentGaps = analyzeContentGaps(results, domain);
  const execSummary = generateExecutiveSummary(domain, overallScore, results, industryBenchmark);
  const validResults = results.filter(r => !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview'));

  // Aggregate competitor counts
  const competitorMentions = new Map<string, number>();
  for (const r of validResults) {
    for (const c of r.competitors) {
      competitorMentions.set(c, (competitorMentions.get(c) || 0) + 1);
    }
  }
  const sortedCompetitors = Array.from(competitorMentions.entries()).sort((a, b) => b[1] - a[1]);

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

  function drawWrappedText(pg: any, text: string, x: number, y: number, opts: { size: number; font: any; color: any; maxChars?: number; lineSpacing?: number }): number {
    const lines = wrapText(text, opts.maxChars || 90);
    const spacing = opts.lineSpacing || (opts.size + 4);
    for (const line of lines) {
      if (y < 50) { pg = newPage(); y = H - 60; }
      pg.drawText(line, { x, y, size: opts.size, font: opts.font, color: opts.color });
      y -= spacing;
    }
    return y;
  }

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
  // Segmented bar: red (low) | amber (mid) | green (high)
  page.drawRectangle({ x: M + 14, y: barY2, width: barW2 * 0.3, height: 8, color: red });
  page.drawRectangle({ x: M + 14 + barW2 * 0.3, y: barY2, width: barW2 * 0.3, height: 8, color: amber });
  page.drawRectangle({ x: M + 14 + barW2 * 0.6, y: barY2, width: barW2 * 0.4, height: 8, color: green });
  // Score marker
  const markerX = M + 14 + (overallScore / 100) * barW2;
  page.drawRectangle({ x: markerX - 2, y: barY2 - 4, width: 4, height: 16, color: white });

  y = y - scoreCardH - 12;

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

  // Executive Summary — assessment box
  y = drawSubsectionHeader(page, 'Executive Summary', y);
  const summaryText = execSummary.join(' ');
  y = drawAssessmentBox(page, summaryText, y);

  // Industry benchmark callout
  const bDiff = overallScore - industryBenchmark.benchmark;
  const bText = bDiff >= 0
    ? `Your score is ${bDiff} points above the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}/100.`
    : `Your score is ${Math.abs(bDiff)} points below the ${industryBenchmark.industry} average of ${industryBenchmark.benchmark}/100.`;
  y = drawCalloutBox(page, bText, y, bDiff >= 0 ? green : red);

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
    const insightText = avg >= 70 ? 'Strong visibility on this platform.' : avg >= 40 ? 'Moderate — room for improvement.' : 'Low visibility — significant gap.';
    page.drawText(insightText, { x: cx + 10, y: bodyY - 50, size: 8, font: helveticaOblique, color: light });
  }

  y -= Math.ceil(providerEntries.length / 2) * (provCardH + 12) + 10;

  // ====================== COMPETITOR LANDSCAPE ======================
  if (y < 200) { page = newPage(); y = H - 10; }

  y = drawSubsectionHeader(page, 'Competitor Landscape', y);

  if (sortedCompetitors.length > 0) {
    page.drawText('Brands mentioned by AI when your audience searches for relevant topics:', { x: M + 5, y, size: 9, font: helveticaOblique, color: light });
    y -= 18;

    for (const [name, count] of sortedCompetitors) {
      if (y < 60) { page = newPage(); y = H - 60; }

      // Competitor card row
      page.drawRectangle({ x: M, y: y - 18, width: contentW, height: 20, color: gray });
      page.drawRectangle({ x: M, y: y - 18, width: 3, height: 20, color: navy });
      page.drawText(name, { x: M + 10, y: y - 12, size: 10, font: helveticaBold, color: dark });

      const cBarW = Math.min(160, (count / validResults.length) * 200);
      page.drawRectangle({ x: M + 200, y: y - 14, width: cBarW, height: 10, color: navy });
      page.drawText(`${count}x mentioned`, { x: M + 205 + cBarW, y: y - 12, size: 8, font: helvetica, color: mid });

      y -= 24;
    }
  } else {
    y = drawCalloutBox(page, 'No direct competitor brands were explicitly named in these AI responses. That usually means the prompts were more educational than vendor-comparison oriented, or the models answered with tactics instead of naming providers.', y);
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

      const bodyContentH = 14 /* providers */ + (compLines.length * 11) + 6 + 14 /* "Action" label */ + (recLines.length * 11) + 14;
      const cardH = 22 + bodyContentH;
      if (y - cardH < 60) { page = newPage(); y = H - 60; }

      // Header bar
      page.drawRectangle({ x: M, y: y - 22, width: contentW, height: 22, color: navy });
      page.drawText(`Gap ${i + 1}: ${promptText}`, { x: M + 10, y: y - 16, size: 9, font: helveticaBold, color: white });

      // Badge
      const badgeText = 'Opportunity';
      const badgeW = helveticaBold.widthOfTextAtSize(badgeText, 7) + 12;
      page.drawRectangle({ x: M + contentW - badgeW - 8, y: y - 18, width: badgeW, height: 14, color: green });
      page.drawText(badgeText, { x: M + contentW - badgeW - 2, y: y - 15, size: 7, font: helveticaBold, color: white });

      // Body background
      page.drawRectangle({ x: M, y: y - cardH, width: contentW, height: cardH - 22, color: rgb(1.0, 0.99, 0.90) });

      // Providers line
      let by = y - 34;
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
    for (let i = 0; i < provResults.length && i < 5; i++) {
      const s = provResults[i].recommendationStrength;
      page.drawRectangle({ x: blockX + i * 22, y: y - 1, width: 18, height: 12, color: strengthColors[s] });
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
  y = drawWrappedText(page, consistency.detail, M + 15 + consPctW, y, { size: 9, font: helvetica, color: mid, maxChars: 60, lineSpacing: 13 });

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
      y = drawWrappedText(page, `P${i + 1}: ${truncPrompt}`, M + 5, y, { size: 8, font: helvetica, color: mid, maxChars: 95, lineSpacing: 11 });
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

      // Response excerpt
      if (r.response && !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview')) {
        const rawExcerpt = r.response.substring(0, 300).replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s+/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + (r.response.length > 300 ? '...' : '');
        y = drawWrappedText(page, rawExcerpt, M + 14, y, { size: 8, font: helvetica, color: mid, maxChars: 88, lineSpacing: 11 });
        y -= 4;
      }

      // Competitors
      if (r.competitors.length > 0) {
        if (y < 60) { page = newPage(); y = H - 60; }
        const compText = `Competitors: ${r.competitors.join(', ')}`;
        y = drawWrappedText(page, compText, M + 14, y, { size: 8, font: helveticaBold, color: navy, maxChars: 88, lineSpacing: 11 });
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
    y = drawWrappedText(page, `•  ${bullet}`, M + 10, y, { size: 8.5, font: helvetica, color: mid, maxChars: 84, lineSpacing: 12 });
    y -= 2;
  }

  return await pdfDoc.save();
}

/**
 * Wrap text to fit within character limit
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
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
  return lines.length > 0 ? lines : [text.substring(0, maxChars)];
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

  try {
    const body: ReportRequest = await req.json();
    firstName = body.firstName;
    email = body.email;
    domain = body.domain;
    score = body.score;

    console.log(`[AutoReport] Starting report generation for ${domain}`);

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
    const recentlySent = (recentRequests || []).find((r: any) => {
      const meta = r.metadata || {};
      const sentAtRaw = meta.reportGeneratedAt;
      if (!sentAtRaw || meta.emailSent !== true) return false;
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
    const inFlight = (recentRequests || []).find((r: any) => {
      if (r.status !== 'processing') return false;
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

    // Step 1: Build brand profile from homepage + research
    console.log('[AutoReport] Building brand profile...');
    const [businessContext, homepageSignals] = await Promise.all([
      researchBusiness(domain),
      fetchHomepageSignals(domain),
    ]);

    const brandProfile = buildBrandProfile(domain, businessContext, homepageSignals);
    const brandName = brandProfile.primaryName;
    console.log('[AutoReport] Brand profile:', { primaryName: brandProfile.primaryName, aliases: brandProfile.aliases });

    // Step 2: Identify competitor candidates
    console.log('[AutoReport] Identifying competitors...');
    const competitorCandidates = await identifyCompetitorCandidates(domain, brandName, businessContext);
    console.log('[AutoReport] Initial competitor candidates:', competitorCandidates);

    // Step 3: Generate industry-relevant prompts based on research
    console.log('[AutoReport] Generating prompts...');
    const prompts = await generateIndustryPrompts(domain, businessContext);
    console.log('[AutoReport] Generated prompts:', prompts);

    // Step 4: Query all providers for each prompt
    console.log('[AutoReport] Querying providers...');
    const allResults: ProviderResult[] = [];

    for (const prompt of prompts) {
      const [chatgptResult, perplexityResult, claudeResult, googleResult] = await Promise.all([
        queryChatGPT(prompt, brandProfile, competitorCandidates),
        queryPerplexity(prompt, brandProfile, competitorCandidates),
        queryClaude(prompt, brandProfile, competitorCandidates),
        queryGoogleAIO(prompt, brandProfile, competitorCandidates)
      ]);

      allResults.push(chatgptResult, perplexityResult, claudeResult, googleResult);
    }

    // Step 5: Refine competitors using actual AI response text
    const refinedCompetitorCandidates = await refineCompetitorCandidatesFromResults(
      domain,
      brandName,
      businessContext,
      allResults,
      competitorCandidates,
    );
    console.log('[AutoReport] Refined competitor candidates from AI responses:', refinedCompetitorCandidates);

    // Re-extract competitors and re-detect brand mentions with refined list
    for (const result of allResults) {
      result.competitors = extractCompetitors(result.response, brandName, refinedCompetitorCandidates);
      result.brandMentioned = brandMentionedInText(result.response, brandProfile);
    }

    // Step 3: Calculate overall score
    const validResults = allResults.filter(r => !r.response.startsWith('Error') && !r.response.startsWith('Provider not') && !r.response.startsWith('No AI Overview'));
    const overallScore = validResults.length > 0 
      ? Math.round(validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length)
      : 0;

    console.log(`[AutoReport] Overall score: ${overallScore}`);

    // Step 4: Generate PDF with enhanced content
    console.log('[AutoReport] Generating PDF with executive summary, benchmarks, and content gaps...');
    const pdfBytes = await generatePDF(firstName, domain, overallScore, allResults, businessContext);

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

    const updatePayload = {
      status: emailSent ? 'sent' : 'error',
      metadata: {
        firstName,
        reportGeneratedAt: new Date().toISOString(),
        calculatedScore: overallScore,
        promptsRun: prompts.length,
        providersQueried: 3,
        emailSent
      }
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
      
      // Update database record with error status
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from('visibility_report_requests')
          .update({
            status: 'error',
            metadata: {
              firstName,
              errorAt: new Date().toISOString(),
              errorMessage: error?.message || 'Unknown error',
              failureNotificationSent
            }
          })
          .eq('email', email)
          .eq('domain', domain)
          .order('created_at', { ascending: false })
          .limit(1);
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
