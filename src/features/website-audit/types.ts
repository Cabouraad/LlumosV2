export interface Audit {
  id: string;
  user_id: string | null;
  domain: string;
  brand_name: string | null;
  business_type: string | null;
  overall_score: number | null;
  module_scores: ModuleScores;
  crawl_limit?: number;
  status: 'pending' | 'running' | 'crawling' | 'completed' | 'failed' | 'error';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CrawlState {
  audit_id: string;
  queue: string[];
  seen_hashes: string[];
  crawled_count: number;
  crawl_limit: number;
  allow_subdomains: boolean;
  robots_rules: unknown;
  last_cursor: string | null;
  status: 'pending' | 'running' | 'done' | 'error';
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlProgress {
  audit_id: string;
  crawled_count: number;
  crawl_limit: number;
  queue_size: number;
  pages_this_batch?: number;
  done: boolean;
  error?: string;
}

export interface ModuleScores {
  crawl: number;
  performance: number;
  onpage: number;
  entity: number;
  ai_readiness: number;
  offsite: number;
}

export interface AuditPage {
  id: string;
  audit_id: string;
  url: string;
  status: number;
  title: string | null;
  h1: string | null;
  meta_description: string | null;
  canonical: string | null;
  has_schema: boolean;
  schema_types: string[];
  word_count: number;
  image_count: number;
  images_with_alt: number;
  headings: Record<string, number>;
  created_at: string;
}

export interface AuditCheck {
  id: string;
  audit_id: string;
  module: string;
  key: string;
  status: 'pass' | 'warn' | 'fail';
  score: number;
  evidence: Record<string, unknown>;
  why: string | null;
  fix: string | null;
  impact: 'low' | 'medium' | 'high' | null;
  effort: 'low' | 'medium' | 'high' | null;
  created_at: string;
}

export interface AuditResult {
  audit_id: string;
  overall_score: number;
  module_scores: ModuleScores;
  top_fixes: AuditCheck[];
  checks: AuditCheck[];
  pages_crawled: number;
}

export const MODULE_LABELS: Record<string, string> = {
  crawl: 'Crawl & Index',
  performance: 'Performance',
  onpage: 'On-Page SEO',
  entity: 'Entity & Trust',
  ai_readiness: 'AI Readiness',
  offsite: 'Off-Site'
};

export const MODULE_DESCRIPTIONS: Record<string, string> = {
  crawl: 'How well search engines can discover and index your pages',
  performance: 'Page speed and loading performance metrics',
  onpage: 'Title tags, meta descriptions, headings, and content quality',
  entity: 'Brand identity, schema markup, and trust signals',
  ai_readiness: 'Optimization for AI search engines and LLMs',
  offsite: 'Social presence and external brand signals'
};

export const BUSINESS_TYPES = [
  { value: 'saas', label: 'SaaS / Software' },
  { value: 'ecommerce', label: 'E-commerce / Retail' },
  { value: 'local_business', label: 'Local Business' },
  { value: 'publisher', label: 'Publisher / Media' },
  { value: 'agency', label: 'Agency / Services' },
  { value: 'other', label: 'Other' }
];

export const SCAN_STEPS = [
  { key: 'validate', label: 'Validating domain...' },
  { key: 'fetch', label: 'Fetching robots.txt, sitemap, llms.txt...' },
  { key: 'crawl', label: 'Crawling sample pages...' },
  { key: 'seo', label: 'Analyzing SEO factors...' },
  { key: 'geo', label: 'Analyzing GEO & entity signals...' },
  { key: 'score', label: 'Computing scores...' },
  { key: 'plan', label: 'Generating fix plan...' }
];
