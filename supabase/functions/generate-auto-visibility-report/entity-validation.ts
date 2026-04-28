// ============================================================================
// Entity validation module — pure, no npm/external imports.
// Extracted from index.ts so the regression tests can import it under Deno's
// default resolver (the main index.ts pulls in npm:resend/pdf-lib/supabase
// at module load and is not test-friendly without nodeModulesDir=auto).
//
// All public symbols are re-exported from index.ts so production code keeps
// importing from a single entrypoint.
// ============================================================================

export type EntityMentionStatus = 'named' | 'listed' | 'recommended' | 'preferred';

// Local copy of escapeRegExp (cheap, avoids circular import with index.ts).
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// VALIDATED ENTITY + EXCLUSION CATEGORY
// ---------------------------------------------------------------------------
export interface ValidatedEntity {
  rawText: string;
  canonicalName: string;
  entityType: string;
  confidenceScore: number;
  mentionStatus: EntityMentionStatus;
  includeInCompetitorLandscape: boolean;
  includeInShareOfVoice: boolean;
  excludedReason?: string;
  evidenceSnippet: string;
  provider: string;
  promptId: string;
  // Audit trail used by the admin debug logger to explain inclusion /
  // exclusion decisions on a per-entity basis.
  matchedValidationRules?: string[];
  matchedExclusionRules?: string[];
}

export type ExclusionCategory =
  | 'heading/advice phrase'
  | 'product feature'
  | 'sentence fragment'
  | 'legal/regulatory term'
  | 'duplicate child product'
  | 'generic noun'
  | 'low confidence'
  | 'not an organization'
  | 'other';

export function categorizeExclusionReason(reason?: string): ExclusionCategory {
  const r = (reason || '').toLowerCase();
  if (!r) return 'other';
  if (r.includes('regulatory') || r.includes('legal')) return 'legal/regulatory term';
  if (r.includes('heading') || r.includes('advice') || r.includes('criteria')) return 'heading/advice phrase';
  if (r.includes('feature') || r.includes('product feature')) return 'product feature';
  if (r.includes('sentence fragment') || r.includes('fragment') || r.includes('verb-led')) return 'sentence fragment';
  if (r.includes('duplicate') || r.includes('child product') || r.includes('rolled up')) return 'duplicate child product';
  if (r.includes('generic')) return 'generic noun';
  if (r.includes('confidence')) return 'low confidence';
  if (r.includes('not an organization') || r.includes('unknown entity') || r.includes('insufficient signal')) return 'not an organization';
  return 'other';
}

// ---------------------------------------------------------------------------
// ORG / ACRONYM PATTERNS
// ---------------------------------------------------------------------------
const ORG_SUFFIX_PATTERN = /\b(?:inc\.?|incorporated|llc|l\.l\.c\.?|llp|l\.l\.p\.?|plc|ltd\.?|limited|corp\.?|corporation|company|co\.?|group|holdings?|partners?|associates?|firm|law|lawyers|attorneys?|bank|bureau|association|foundation|fund|services|capital|credit|analytics|monitoring|repair|systems?|solutions?|technologies|technology|labs?|institute|agency|consulting|advisors?|advisory|enterprises?)\b/i;

const KNOWN_BRAND_ACRONYMS = new Set([
  'fico', 'jams', 'nam', 'irs', 'ftc', 'fdic',
  'aaa', 'adr', 'lacba', 'aba', 'naacp', 'aclu', 'bbb', 'nfib', 'usbc',
  'experian', 'equifax', 'transunion',
]);

// ---------------------------------------------------------------------------
// REGULATORY / LEGAL CONTEXT
// ---------------------------------------------------------------------------
const REGULATORY_LEGAL_ENTITIES = new Set<string>([
  'croa', 'fcra', 'fdcpa', 'gdpr', 'ccpa', 'sec', 'finra', 'sba', 'cfpb',
  'ein', 'soc', 'soc ii', 'soc 2', 'soc-ii', 'aml',
  'd-u-n-s number', 'duns number', 'd-u-n-s', 'duns',
  'credit repair organizations act',
  'fair credit reporting act',
  'fair debt collection practices act',
].map(s => s.toLowerCase()));

export function isRegulatoryLegalContext(rawText: string, canonicalName: string): boolean {
  const r = (rawText || '').trim().toLowerCase();
  const c = (canonicalName || '').trim().toLowerCase();
  return REGULATORY_LEGAL_ENTITIES.has(r) || REGULATORY_LEGAL_ENTITIES.has(c);
}

const PROVIDER_LIST_TRIGGERS = [
  'top providers include', 'top providers are', 'best options are', 'best options include',
  'recommended services', 'recommended providers', 'recommended options',
  'leading companies', 'leading providers', 'leading firms', 'leading services',
  'top companies', 'top firms', 'top services', 'top choices', 'top picks',
  'popular options', 'popular providers', 'notable firms', 'notable providers',
  'consider the following', 'options include', 'examples include', 'such as',
  'reputable firms', 'well-known firms', 'major providers',
];

const GENERIC_PHRASE_BLOCKLIST = new Set([
  'before', 'obtain', 'paid services', 'they', 'key', 'details', 'information',
  'step', 'step process', 'locate', 'ask', 'run', 'use', 'check', 'bumper',
  'vehicle history report', 'vehicle identification number', 'accident history',
  'title issues', 'overview', 'introduction', 'conclusion', 'summary',
  'pros', 'cons', 'pros and cons', 'features', 'benefits', 'tips', 'notes',
  'options', 'choices', 'considerations', 'recommendations',
  'best practices', 'how to', 'getting started', 'next steps',
]);

// ---------------------------------------------------------------------------
// EXCLUSION FILTER
// ---------------------------------------------------------------------------
const EXCLUSION_HEADINGS = new Set<string>([
  'key considerations', 'important considerations', 'additional considerations',
  'top recommendations', 'best free options', 'best overall options',
  'best value', 'bottom line', 'key differences', 'key alternatives',
  'source highlights', 'leading companies', 'major business credit bureaus',
  'business credit reports here', 'strengths and recommendations',
  'important implementation notes', 'recommended approach',
  'conclusion selecting',
].map(s => s.toLowerCase()));

const EXCLUSION_ADVICE = new Set<string>([
  'specific needs', 'customer reviews', 'reputation and reviews',
  'licensing and certification', 'personalized service', 'educational resources',
  'upfront fees', 'written contract', 'money-back guarantee',
  'understanding of credit laws', 'false claims', 'red flags', 'positive signs',
  'good bbb', 'services offered', 'services they should provide',
  'compare prices', 'trial periods', 'customer', 'your company',
  'your selection', 'coverage focus', 'integration needs',
  'compliance requirements',
].map(s => s.toLowerCase()));

const EXCLUSION_FEATURES = new Set<string>([
  'credit monitoring', 'credit scores', 'free credit scores',
  'identity theft protection', 'paid plans', 'bureaus monitored',
  'scoring model', 'credit building', 'business credit building',
  'credit report review', 'build credit responsibly', 'personal monitoring',
  'business credit risk score', 'payment index', 'business failure score',
  'small business risk score', 'financial stability risk',
  'live business identity', 'red flag alert', 'regulatory compliance',
  'credit score model', 'credit report access', 'secured credit cards',
  'business credit cards', 'vendor credit accounts', 'free credit reports',
  'personal finance apps',
].map(s => s.toLowerCase()));

const EXCLUSION_FRAGMENTS = new Set<string>([
  'provides', 'covers', 'monitors', 'updates', 'up to',
  'choose credit karma', 'choose experian', 'provides paydex',
  'offers d-u-n-s number', 'provides business credit score',
  'alongside transunion', 'their features other', 'and their features',
  'top recommendations these', 'important considerations when',
  'best practice most',
].map(s => s.toLowerCase()));

const EXCLUSION_GENERIC_NOUNS = new Set<string>([
  'credit', 'security', 'mobile apps', 'local nonprofits',
  'community organizations', 'local credit repair companies',
  'financial advisors', 'small businesses', 'startup tips',
  'california startups', 'california department',
  'california-specific considerations', 'california-compliant',
  'national foundation', 'credit counseling', 'credit union',
  'consumer credit counseling service',
].map(s => s.toLowerCase()));

// Domain nouns that frequently combine into generic noun phrases that are
// NOT brands or providers (e.g. "Credit Card", "Bad Credit", "Pay Rent",
// "Build Credit", "Credit Monitoring", "Identity Theft Protection",
// "Annual Fee", "Travel Rewards"). If every meaningful token of a phrase is
// in this set AND the phrase has no org-identity signal, the phrase is
// rejected as a generic noun phrase.
const DOMAIN_NOUN_TOKENS = new Set<string>([
  'credit', 'card', 'cards', 'score', 'scores', 'scoring', 'report', 'reports',
  'reporting', 'monitoring', 'monitor', 'history', 'limit', 'utilization',
  'building', 'builder', 'build', 'repair', 'check', 'tracking', 'alerts',
  'alert', 'identity', 'theft', 'protection', 'fraud', 'security',
  'bad', 'good', 'fair', 'excellent', 'poor', 'free', 'paid', 'premium',
  'best', 'top', 'key', 'major', 'notable', 'leading', 'preferred', 'expert',
  'recommended', 'additional', 'important', 'essential', 'standout', 'better',
  'common', 'general', 'specific', 'overall',
  'fee', 'fees', 'apr', 'rate', 'rates', 'reward', 'rewards', 'bonus', 'bonuses',
  'cashback', 'cash', 'back', 'savings', 'saver', 'sign', 'sign-up', 'signup',
  'introductory', 'offer', 'offers', 'plan', 'plans', 'option', 'options',
  'pricing', 'price', 'prices', 'comparison', 'comparisons', 'review', 'reviews',
  'feature', 'features', 'rankings', 'tier', 'tiers', 'trial',
  'student', 'students', 'business', 'businesses', 'consumer', 'consumers',
  'customer', 'customers', 'user', 'users', 'family', 'parental', 'guidance',
  'small', 'large', 'enterprise', 'startup', 'startups', 'company', 'companies',
  'service', 'services', 'tool', 'tools', 'platform', 'platforms', 'app', 'apps',
  'provider', 'providers', 'solution', 'solutions',
  'model', 'models', 'access', 'scorecard', 'scorecards', 'counseling',
  'counselling', 'counselor', 'counsellor', 'union', 'unions', 'national',
  'vendor', 'vendors', 'account', 'accounts', 'personal', 'finance', 'financial',
  'pay', 'paying', 'payment', 'payments', 'spend', 'spending', 'habits',
  'considerations', 'consideration', 'differences', 'similarities',
  'recommendations', 'recommendation', 'options', 'choices', 'alternatives',
  'highlights', 'insights', 'analysis', 'overview', 'introduction',
  'conclusion', 'summary', 'tips', 'notes', 'steps', 'guide', 'approach',
  'method', 'methods', 'rules', 'criteria', 'requirements', 'needs',
  'monitoring', 'coverage', 'data', 'accuracy', 'speed', 'real-time',
  'real', 'time', 'live', 'mobile', 'desktop', 'web', 'online',
  'rent', 'bill', 'bills', 'loan', 'loans', 'debt', 'debts',
  'unsecured', 'secured', 'visa', 'mastercard', 'discover', 'amex',
  'reserve', 'platinum', 'gold', 'silver', 'sapphire', 'freedom', 'venture',
  'savor', 'savorone', 'quicksilver', 'chrome',
  'and', 'or', 'of', 'the', 'a', 'an', 'with', 'for', 'to', 'from', 'in', 'on',
  'these', 'those', 'this', 'that', 'their', 'your', 'our', 'my',
  'is', 'are', 'was', 'were', 'be', 'being', 'been',
  'use', 'uses', 'using', 'choose', 'choosing', 'select', 'selecting',
  'consider', 'considering', 'compare', 'comparing',
  'before', 'after', 'when', 'where', 'why', 'how', 'what',
  'reputation', 'licensing', 'certification', 'compliance', 'privacy',
  'positive', 'negative', 'red', 'green', 'flags', 'flag', 'signs', 'sign',
  'drawbacks', 'benefits', 'pros', 'cons', 'protections',
  'educational', 'resources', 'resource', 'guidance',
  'dark', 'light', 'web',
  'foundation', 'hybrid', 'guided', 'diy',
  'bureau', 'bureaus', 'agency', 'agencies', 'industry',
  'period', 'periods', 'limit', 'limits', 'access',
  'cap', 'caps', 'first', 'second', 'third', 'next', 'last',
  'work', 'monthly', 'annual', 'yearly', 'weekly', 'daily',
  'i', 'ii', 'iii', 'iv', 'v',
  'innovator', 'leader', 'technology', 'tech',
  'rewards', 'preferred', 'unlimited', 'reflect', 'one',
]);

// Common English stopwords for token analysis.
const STOPWORD_TOKENS = new Set<string>([
  'and', 'or', 'of', 'the', 'a', 'an', 'with', 'for', 'to', 'from', 'in', 'on',
  'at', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'these', 'those', 'this',
  'that', 'their', 'your', 'our', 'my', 'its', 'it', 's', '&',
]);

function isGenericDomainNounPhrase(rawText: string): boolean {
  const tokens = rawText
    .toLowerCase()
    .replace(/[^\w\s&-]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !STOPWORD_TOKENS.has(t));
  if (tokens.length === 0) return false;
  // Every meaningful token is a domain noun → it's a noun phrase, not an entity.
  return tokens.every(t => DOMAIN_NOUN_TOKENS.has(t));
}

const EXCLUSION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /^(key|important|additional|top|best|leading|major|recommended|notable|popular)\s+\w+/i,
    reason: 'heading' },
  { pattern: /^(choose|provides|offers|monitors|covers|updates|alongside|select)\s+/i,
    reason: 'sentence fragment' },
  { pattern: /\b(their features|and their features)\b/i, reason: 'sentence fragment' },
  { pattern: /^california[- ]/i, reason: 'generic noun' },
  { pattern: /\b(requirements|considerations|recommendations|needs|focus|reviews|fees|guarantee|signs|flags)$/i,
    reason: 'advice phrase' },
];

export function matchesExclusionFilter(rawText: string): string | null {
  const lower = (rawText || '').trim().toLowerCase();
  if (!lower) return null;
  if (EXCLUSION_HEADINGS.has(lower))       return 'heading';
  if (EXCLUSION_ADVICE.has(lower))         return 'advice phrase';
  if (EXCLUSION_FEATURES.has(lower))       return 'product feature';
  if (EXCLUSION_FRAGMENTS.has(lower))      return 'sentence fragment';
  if (EXCLUSION_GENERIC_NOUNS.has(lower))  return 'generic noun';
  for (const { pattern, reason } of EXCLUSION_PATTERNS) {
    if (pattern.test(lower)) return reason;
  }
  return null;
}

function looksLikeDomain(s: string): boolean {
  return /\b[a-z0-9][a-z0-9-]*\.(?:com|net|org|io|co|app|ai|gov|edu)\b/i.test(s);
}

function looksLikeProperOrgName(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  if (looksLikeDomain(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  const titleWords = words.filter(w => /^[A-Z][A-Za-z0-9&\-\.']{1,}/.test(w));
  if (words.length >= 2 && titleWords.length >= Math.ceil(words.length / 2)) return true;
  if (words.length === 1 && /^[A-Z][A-Za-z0-9]{3,}$/.test(words[0])) return true;
  return false;
}

function appearsInProviderListContext(entity: string, response: string): boolean {
  if (!entity || !response) return false;
  const lower = response.toLowerCase();
  const entLower = entity.toLowerCase();
  const idx = lower.indexOf(entLower);
  if (idx < 0) return false;
  const window = lower.slice(Math.max(0, idx - 400), idx);
  if (PROVIDER_LIST_TRIGGERS.some(t => window.includes(t))) return true;
  const lines = response.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.toLowerCase().includes(entLower)) continue;
    if (/^(?:\d+[.)]\s|[-•*▪▸]\s)/.test(trimmed)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// CURATED ENTITY TYPE CLASSIFIER
// ---------------------------------------------------------------------------
export type EntityType =
  | 'Direct Competitor'
  | 'Credit Bureau / Scoring Provider'
  | 'Credit Monitoring Platform'
  | 'Credit Repair Company'
  | 'Business Credit Provider'
  | 'Financial Services Platform'
  | 'Marketplace / Directory'
  | 'Nonprofit / Counseling Resource'
  | 'Government / Regulatory Resource'
  | 'Regulatory / Legal Context'
  | 'Software Platform'
  | 'Adjacent Service Provider'
  | 'Excluded / Unknown';

const ENTITY_TYPE_MAP: Record<string, EntityType> = {
  'experian': 'Credit Bureau / Scoring Provider',
  'equifax': 'Credit Bureau / Scoring Provider',
  'transunion': 'Credit Bureau / Scoring Provider',
  'fico': 'Credit Bureau / Scoring Provider',
  'dun & bradstreet': 'Credit Bureau / Scoring Provider',

  'credit karma': 'Credit Monitoring Platform',
  'credit sesame': 'Credit Monitoring Platform',
  'identity guard': 'Credit Monitoring Platform',
  'chase credit journey': 'Credit Monitoring Platform',
  'capital one creditwise': 'Credit Monitoring Platform',

  'lexington law': 'Credit Repair Company',
  'sky blue credit': 'Credit Repair Company',
  'credit saint': 'Credit Repair Company',
  'the credit people': 'Credit Repair Company',
  'the credit pros': 'Credit Repair Company',
  'pyramid credit repair': 'Credit Repair Company',
  'safeport law': 'Credit Repair Company',
  'creditrepair.com': 'Credit Repair Company',

  'nav': 'Business Credit Provider',
  'credit suite': 'Business Credit Provider',
  "moody's analytics creditedge": 'Business Credit Provider',
  'moodys analytics creditedge': 'Business Credit Provider',
  'zywave': 'Business Credit Provider',

  'bestcompany': 'Marketplace / Directory',
  'bestcompany.com': 'Marketplace / Directory',
  'consumeraffairs': 'Marketplace / Directory',
  'bbb': 'Marketplace / Directory',
  'better business bureau': 'Marketplace / Directory',

  'money management international': 'Nonprofit / Counseling Resource',
  'mission asset fund': 'Nonprofit / Counseling Resource',
  'score': 'Nonprofit / Counseling Resource',

  'cfpb': 'Government / Regulatory Resource',
  'sba': 'Government / Regulatory Resource',
  'annualcreditreport.com': 'Government / Regulatory Resource',
};

function entityTypeKey(name: string): string {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function classifyEntityType(canonicalName: string): EntityType | null {
  const key = entityTypeKey(canonicalName);
  if (!key) return null;
  return ENTITY_TYPE_MAP[key] ?? null;
}

// ---------------------------------------------------------------------------
// VALIDATE ENTITY
// ---------------------------------------------------------------------------
export function validateEntity(args: {
  rawText: string;
  canonicalName: string;
  classifiedType: string;
  mentionStatus: EntityMentionStatus;
  evidenceSnippet: string;
  provider: string;
  promptId: string;
  response: string;
  knownAliases: Set<string>;
}): ValidatedEntity {
  const {
    rawText, canonicalName, classifiedType, mentionStatus,
    evidenceSnippet, provider, promptId, response, knownAliases,
  } = args;

  const base = {
    rawText,
    canonicalName,
    mentionStatus,
    evidenceSnippet,
    provider,
    promptId,
  };

  const cleaned = (rawText || '').trim();
  const lower = cleaned.toLowerCase();

  if (!cleaned || cleaned.length < 2) {
    return { ...base, entityType: 'Excluded / Unknown', confidenceScore: 0,
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: 'empty or too short',
      matchedValidationRules: [], matchedExclusionRules: ['empty_or_too_short'] };
  }
  if (!/[a-z]/i.test(cleaned)) {
    return { ...base, entityType: 'Excluded / Unknown', confidenceScore: 0,
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: 'no alphabetic content',
      matchedValidationRules: [], matchedExclusionRules: ['no_alphabetic_content'] };
  }
  if (isRegulatoryLegalContext(cleaned, canonicalName)) {
    return { ...base, entityType: 'Regulatory / Legal Context', confidenceScore: 0.9,
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: 'regulatory / legal context — not a competitor',
      matchedValidationRules: [], matchedExclusionRules: ['regulatory_legal_context'] };
  }
  if (GENERIC_PHRASE_BLOCKLIST.has(lower)) {
    return { ...base, entityType: 'Excluded / Unknown', confidenceScore: 0.05,
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: 'generic term / not an organization',
      matchedValidationRules: [], matchedExclusionRules: ['generic_phrase_blocklist'] };
  }
  const exclusionReason = matchesExclusionFilter(cleaned);
  if (exclusionReason) {
    return { ...base, entityType: 'Excluded / Unknown', confidenceScore: 0,
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: `${exclusionReason} / not an organization`,
      matchedValidationRules: [], matchedExclusionRules: [`exclusion_filter:${exclusionReason}`] };
  }
  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount > 8) {
    return { ...base, entityType: 'Excluded / Unknown', confidenceScore: 0.05,
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: 'sentence fragment / not an organization',
      matchedValidationRules: [], matchedExclusionRules: ['too_many_words_sentence_fragment'] };
  }

  const matchesAlias = knownAliases.has(lower) || knownAliases.has(canonicalName.toLowerCase());
  const hasOrgSuffix = ORG_SUFFIX_PATTERN.test(cleaned);
  const inProviderList = appearsInProviderListContext(cleaned, response);
  const isKnownAcronym = KNOWN_BRAND_ACRONYMS.has(lower);
  const isDomainStyle = looksLikeDomain(cleaned);
  const properOrgShape = looksLikeProperOrgName(cleaned);

  // Reject generic domain noun phrases ("Bad Credit", "Credit Card",
  // "Important Considerations", "Pay Rent", "Identity Theft Protection",
  // "Travel Rewards", "Annual Fee", "Credit Monitoring", etc.) UNLESS the
  // phrase is a known alias, has an org suffix, looks like a domain, or is a
  // known brand acronym. Two-or-three-word title-cased noun phrases are the
  // single biggest source of false positives in the AI Visibility Report.
  if (
    !matchesAlias && !hasOrgSuffix && !isDomainStyle && !isKnownAcronym &&
    isGenericDomainNounPhrase(cleaned)
  ) {
    return { ...base, entityType: 'Excluded / Unknown', confidenceScore: 0.05,
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: 'generic noun phrase / not an organization',
      matchedValidationRules: [], matchedExclusionRules: ['generic_domain_noun_phrase'] };
  }

  const NEARBY_KEYWORDS_RE = /\b(provider|providers|company|companies|service|services|platform|platforms|bureau|bureaus|firm|firms|tool|tools|app|apps|recommended|best|alternative|alternatives)\b/i;
  let hasNearbyKeyword = false;
  if (response) {
    const idx = response.toLowerCase().indexOf(lower);
    if (idx >= 0) {
      const window = response.slice(Math.max(0, idx - 120), idx + cleaned.length + 120);
      hasNearbyKeyword = NEARBY_KEYWORDS_RE.test(window);
    }
  }

  const repetitionCount = response
    ? (response.toLowerCase().match(new RegExp(`\\b${escapeRegExp(lower)}\\b`, 'g')) || []).length
    : 0;
  const repeatedAcrossContext = repetitionCount >= 2;

  const VERB_LED_RE = /^(provides?|offers?|covers?|monitors?|updates?|choose|select|alongside|use|run|check|consider)\b/i;
  const isVerbLed = VERB_LED_RE.test(cleaned);

  const isUnknownAcronym = /^[A-Z]{2,5}$/.test(cleaned) && !isKnownAcronym;

  const isGenericNoun = wordCount <= 2
    && !hasOrgSuffix && !isDomainStyle && !isKnownAcronym && !matchesAlias
    && !properOrgShape;

  // A "strong org-identity signal" means we have evidence the phrase actually
  // names an organization — not just that it appears next to one. Pure
  // context (provider list + nearby keyword + repetition) on a generic
  // title-cased phrase is NOT enough to admit it as a competitor.
  const strongProperOrg = properOrgShape && (
    // 3+ tokens with at least 2 capitalised tokens, OR
    cleaned.split(/\s+/).filter(w => /^[A-Z]/.test(w)).length >= 3 ||
    // a single distinctive CamelCase / capitalised token of 4+ chars
    (wordCount === 1 && /^[A-Z][A-Za-z0-9]{3,}$/.test(cleaned))
  );
  const hasOrgIdentitySignal =
    matchesAlias || hasOrgSuffix || isDomainStyle || isKnownAcronym || strongProperOrg;

  let confidence = 0;
  if (matchesAlias)         confidence += 0.40;
  if (hasOrgSuffix)         confidence += 0.25;
  if (inProviderList)       confidence += 0.20;
  if (hasNearbyKeyword)     confidence += 0.20;
  if (repeatedAcrossContext) confidence += 0.15;
  if (isDomainStyle)        confidence += 0.20;
  if (isKnownAcronym)       confidence += 0.20;
  if (properOrgShape)       confidence += 0.10;

  if (isUnknownAcronym)     confidence -= 0.40;
  if (isVerbLed)            confidence -= 0.30;
  if (isGenericNoun)        confidence -= 0.25;

  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  const strongProviderContext = inProviderList && hasNearbyKeyword;
  const meetsHighThreshold = confidence >= 0.65;
  const meetsMidThreshold  = confidence >= 0.45 && (matchesAlias || strongProviderContext);

  const matchedValidationRules: string[] = [];
  if (matchesAlias)         matchedValidationRules.push('alias_map_match');
  if (hasOrgSuffix)         matchedValidationRules.push('org_suffix');
  if (inProviderList)       matchedValidationRules.push('provider_list_context');
  if (hasNearbyKeyword)     matchedValidationRules.push('nearby_keyword');
  if (repeatedAcrossContext) matchedValidationRules.push('repeated_in_context');
  if (isDomainStyle)        matchedValidationRules.push('domain_style');
  if (isKnownAcronym)       matchedValidationRules.push('known_brand_acronym');
  if (properOrgShape)       matchedValidationRules.push('proper_org_shape');
  if (strongProperOrg)      matchedValidationRules.push('strong_proper_org_shape');
  if (hasOrgIdentitySignal) matchedValidationRules.push('org_identity_signal');
  const matchedExclusionRules: string[] = [];
  if (isUnknownAcronym)     matchedExclusionRules.push('unknown_acronym_penalty');
  if (isVerbLed)            matchedExclusionRules.push('verb_led_penalty');
  if (isGenericNoun)        matchedExclusionRules.push('generic_noun_penalty');

  if (!meetsHighThreshold && !meetsMidThreshold) {
    return { ...base, entityType: 'Excluded / Unknown',
      confidenceScore: Number(confidence.toFixed(2)),
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: confidence < 0.45
        ? 'confidence < 0.45 / insufficient signal'
        : 'confidence 0.45–0.64 without alias or strong provider context',
      matchedValidationRules,
      matchedExclusionRules: [...matchedExclusionRules, 'below_confidence_threshold'] };
  }

  // STRICT GATE: even with high confidence from contextual signals, we
  // require an actual organization-identity signal. Without it, the phrase
  // is almost certainly a noun phrase that happens to live next to brands.
  if (!hasOrgIdentitySignal) {
    return { ...base, entityType: 'Excluded / Unknown',
      confidenceScore: Number(confidence.toFixed(2)),
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: 'no organization-identity signal (alias / suffix / domain / acronym / strong proper-org shape)',
      matchedValidationRules,
      matchedExclusionRules: [...matchedExclusionRules, 'no_org_identity_signal'] };
  }

  const curatedType = classifyEntityType(canonicalName) || classifyEntityType(cleaned);
  const upstreamType = classifiedType && classifiedType !== 'unknown' && classifiedType !== 'Direct Competitor'
    ? classifiedType
    : null;
  const strongOrgSignal = matchesAlias || hasOrgSuffix || isDomainStyle;
  let finalType: string =
    curatedType
    || upstreamType
    || (meetsHighThreshold && strongOrgSignal ? 'Direct Competitor' : 'Excluded / Unknown');

  if (finalType === 'Excluded / Unknown') {
    return { ...base, entityType: finalType,
      confidenceScore: Number(confidence.toFixed(2)),
      includeInCompetitorLandscape: false, includeInShareOfVoice: false,
      excludedReason: 'unknown entity / insufficient signal for Direct Competitor',
      matchedValidationRules,
      matchedExclusionRules: [...matchedExclusionRules, 'no_resolved_entity_type'] };
  }

  const SOV_ELIGIBLE_TYPES = new Set<string>([
    'Direct Competitor',
    'Credit Bureau / Scoring Provider',
    'Credit Monitoring Platform',
    'Credit Repair Company',
    'Business Credit Provider',
    'Financial Services Platform',
    'Marketplace / Directory',
    'Nonprofit / Counseling Resource',
    'Software Platform',
    'Adjacent Service Provider',
  ]);

  const includeInShareOfVoice =
    meetsHighThreshold
    && (mentionStatus === 'listed' || mentionStatus === 'recommended' || mentionStatus === 'preferred')
    && SOV_ELIGIBLE_TYPES.has(finalType);

  return {
    ...base,
    entityType: finalType,
    confidenceScore: Number(confidence.toFixed(2)),
    includeInCompetitorLandscape: true,
    includeInShareOfVoice,
    matchedValidationRules,
    matchedExclusionRules,
  };
}
