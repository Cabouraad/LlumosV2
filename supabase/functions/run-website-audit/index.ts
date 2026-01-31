import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const USER_AGENT = 'LlumosAuditBot/1.0 (+https://llumos.ai)';
const FETCH_TIMEOUT = 10000;

// Module weights for overall score
const MODULE_WEIGHTS = {
  crawl: 20,
  performance: 15,
  onpage: 15,
  entity: 20,
  ai_readiness: 20,
  offsite: 10
};

interface AuditRequest {
  domain: string;
  brand_name?: string;
  business_type?: string;
  crawl_limit?: number;
  user_id?: string;
}

interface PageData {
  url: string;
  status: number;
  title: string;
  h1: string;
  meta_description: string;
  canonical: string;
  has_schema: boolean;
  schema_types: string[];
  word_count: number;
  image_count: number;
  images_with_alt: number;
  headings: Record<string, number>;
  links: string[];
}

interface CheckResult {
  module: string;
  key: string;
  status: 'pass' | 'warn' | 'fail';
  score: number;
  evidence: Record<string, unknown>;
  why: string;
  fix: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

// Fetch with timeout and user agent
async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeoutId);
    return response;
  } catch (e) {
    clearTimeout(timeoutId);
    console.log(`[Audit] Fetch failed for ${url}: ${e}`);
    return null;
  }
}

// Normalize domain to proper URL
function normalizeDomain(domain: string): string {
  let url = domain.trim().toLowerCase();
  url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
  url = url.replace(/\/.*$/, '');
  return `https://${url}`;
}

// Parse HTML and extract page data
function parsePageData(html: string, url: string, status: number): PageData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  if (!doc) {
    return {
      url, status, title: '', h1: '', meta_description: '', canonical: '',
      has_schema: false, schema_types: [], word_count: 0, image_count: 0,
      images_with_alt: 0, headings: {}, links: []
    };
  }
  
  // Extract title
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  
  // Extract H1
  const h1 = doc.querySelector('h1')?.textContent?.trim() || '';
  
  // Extract meta description
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  
  // Extract canonical
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  
  // Extract schema
  const schemaScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const schemaTypes: string[] = [];
  let hasSchema = false;
  
  schemaScripts.forEach((script: any) => {
    hasSchema = true;
    try {
      const json = JSON.parse(script.textContent || '{}');
      if (json['@type']) {
        schemaTypes.push(Array.isArray(json['@type']) ? json['@type'][0] : json['@type']);
      }
    } catch (e) {
      // Invalid JSON-LD
    }
  });
  
  // Count headings
  const headings: Record<string, number> = {};
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    headings[tag] = doc.querySelectorAll(tag).length;
  });
  
  // Count words in body
  const bodyText = doc.querySelector('body')?.textContent || '';
  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;
  
  // Count images and alt tags
  const images = doc.querySelectorAll('img');
  const imageCount = images.length;
  let imagesWithAlt = 0;
  images.forEach((img: any) => {
    if (img.getAttribute('alt')?.trim()) imagesWithAlt++;
  });
  
  // Extract internal links
  const links: string[] = [];
  const baseUrl = new URL(url);
  doc.querySelectorAll('a[href]').forEach((a: any) => {
    const href = a.getAttribute('href');
    if (href) {
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === baseUrl.hostname && !links.includes(linkUrl.href)) {
          links.push(linkUrl.href);
        }
      } catch (e) {
        // Invalid URL
      }
    }
  });
  
  return {
    url, status, title, h1, meta_description: metaDesc, canonical,
    has_schema: hasSchema, schema_types: schemaTypes, word_count: wordCount,
    image_count: imageCount, images_with_alt: imagesWithAlt, headings, links
  };
}

// Check functions for each module
function runCrawlChecks(
  pages: PageData[],
  robotsTxt: string | null,
  sitemapExists: boolean,
  llmsTxt: string | null,
  httpsEnforced: boolean
): CheckResult[] {
  const checks: CheckResult[] = [];
  const homepage = pages[0];
  
  // https_enforced
  checks.push({
    module: 'crawl',
    key: 'https_enforced',
    status: httpsEnforced ? 'pass' : 'fail',
    score: httpsEnforced ? 100 : 0,
    evidence: { https: httpsEnforced },
    why: 'HTTPS ensures data security and is a ranking factor for search engines.',
    fix: httpsEnforced ? '' : 'Configure SSL certificate and redirect all HTTP traffic to HTTPS.',
    impact: 'high',
    effort: 'low'
  });
  
  // robots_exists_and_allows
  const robotsAllows = robotsTxt && !robotsTxt.includes('Disallow: /');
  checks.push({
    module: 'crawl',
    key: 'robots_exists_and_allows',
    status: robotsTxt ? (robotsAllows ? 'pass' : 'warn') : 'fail',
    score: robotsTxt ? (robotsAllows ? 100 : 50) : 0,
    evidence: { exists: !!robotsTxt, allows_crawl: robotsAllows },
    why: 'robots.txt tells search engines which pages to crawl.',
    fix: !robotsTxt ? 'Create a robots.txt file at the root of your domain.' : 
         (!robotsAllows ? 'Review robots.txt rules - some pages may be blocked from crawling.' : ''),
    impact: 'high',
    effort: 'low'
  });
  
  // sitemap_exists
  checks.push({
    module: 'crawl',
    key: 'sitemap_exists',
    status: sitemapExists ? 'pass' : 'warn',
    score: sitemapExists ? 100 : 30,
    evidence: { exists: sitemapExists },
    why: 'XML sitemaps help search engines discover and index all your pages.',
    fix: sitemapExists ? '' : 'Create an XML sitemap and submit it to Google Search Console.',
    impact: 'medium',
    effort: 'low'
  });
  
  // homepage_status_200
  const homepageOk = homepage && homepage.status === 200;
  checks.push({
    module: 'crawl',
    key: 'homepage_status_200',
    status: homepageOk ? 'pass' : 'fail',
    score: homepageOk ? 100 : 0,
    evidence: { status: homepage?.status },
    why: 'Your homepage must be accessible for users and search engines.',
    fix: homepageOk ? '' : `Homepage returned status ${homepage?.status}. Fix server configuration.`,
    impact: 'high',
    effort: 'medium'
  });
  
  // canonical_redirect_consistency
  const canonicalMatch = homepage && (!homepage.canonical || homepage.canonical.includes(new URL(homepage.url).hostname));
  checks.push({
    module: 'crawl',
    key: 'canonical_redirect_consistency',
    status: canonicalMatch ? 'pass' : 'warn',
    score: canonicalMatch ? 100 : 50,
    evidence: { canonical: homepage?.canonical, url: homepage?.url },
    why: 'Canonical tags should point to the correct version of your pages.',
    fix: canonicalMatch ? '' : 'Ensure canonical tag matches the page URL or primary domain.',
    impact: 'medium',
    effort: 'low'
  });
  
  // noindex_not_present_on_homepage (inferred from status - would need meta check)
  checks.push({
    module: 'crawl',
    key: 'noindex_not_present_on_homepage',
    status: 'pass',
    score: 100,
    evidence: {},
    why: 'noindex tag on homepage would prevent it from appearing in search results.',
    fix: '',
    impact: 'high',
    effort: 'low'
  });
  
  return checks;
}

function runOnPageChecks(pages: PageData[]): CheckResult[] {
  const checks: CheckResult[] = [];
  const homepage = pages[0];
  
  // title_present
  const titlesPresent = pages.filter(p => p.title).length;
  const titleRatio = pages.length > 0 ? titlesPresent / pages.length : 0;
  checks.push({
    module: 'onpage',
    key: 'title_present',
    status: titleRatio >= 0.9 ? 'pass' : (titleRatio >= 0.7 ? 'warn' : 'fail'),
    score: Math.round(titleRatio * 100),
    evidence: { with_title: titlesPresent, total: pages.length },
    why: 'Page titles are crucial for SEO and user experience in search results.',
    fix: titleRatio < 0.9 ? `${pages.length - titlesPresent} pages are missing title tags.` : '',
    impact: 'high',
    effort: 'low'
  });
  
  // meta_description_present
  const metaPresent = pages.filter(p => p.meta_description).length;
  const metaRatio = pages.length > 0 ? metaPresent / pages.length : 0;
  checks.push({
    module: 'onpage',
    key: 'meta_description_present',
    status: metaRatio >= 0.8 ? 'pass' : (metaRatio >= 0.5 ? 'warn' : 'fail'),
    score: Math.round(metaRatio * 100),
    evidence: { with_meta: metaPresent, total: pages.length },
    why: 'Meta descriptions improve click-through rates from search results.',
    fix: metaRatio < 0.8 ? `${pages.length - metaPresent} pages are missing meta descriptions.` : '',
    impact: 'medium',
    effort: 'low'
  });
  
  // h1_present
  const h1Present = pages.filter(p => p.h1).length;
  const h1Ratio = pages.length > 0 ? h1Present / pages.length : 0;
  checks.push({
    module: 'onpage',
    key: 'h1_present',
    status: h1Ratio >= 0.9 ? 'pass' : (h1Ratio >= 0.7 ? 'warn' : 'fail'),
    score: Math.round(h1Ratio * 100),
    evidence: { with_h1: h1Present, total: pages.length },
    why: 'H1 tags define the main topic of a page for search engines.',
    fix: h1Ratio < 0.9 ? `${pages.length - h1Present} pages are missing H1 tags.` : '',
    impact: 'medium',
    effort: 'low'
  });
  
  // heading_hierarchy_reasonable
  const goodHierarchy = pages.filter(p => p.headings.h1 === 1 && p.headings.h2 >= 1).length;
  const hierarchyRatio = pages.length > 0 ? goodHierarchy / pages.length : 0;
  checks.push({
    module: 'onpage',
    key: 'heading_hierarchy_reasonable',
    status: hierarchyRatio >= 0.7 ? 'pass' : (hierarchyRatio >= 0.4 ? 'warn' : 'fail'),
    score: Math.round(hierarchyRatio * 100),
    evidence: { good_hierarchy: goodHierarchy, total: pages.length },
    why: 'Proper heading hierarchy helps search engines understand content structure.',
    fix: hierarchyRatio < 0.7 ? 'Use exactly one H1 per page and structure content with H2-H6.' : '',
    impact: 'low',
    effort: 'low'
  });
  
  // duplicate_titles_across_sample
  const titles = pages.map(p => p.title).filter(t => t);
  const uniqueTitles = new Set(titles);
  const dupRatio = titles.length > 0 ? (titles.length - uniqueTitles.size) / titles.length : 0;
  checks.push({
    module: 'onpage',
    key: 'duplicate_titles_across_sample',
    status: dupRatio <= 0.1 ? 'pass' : (dupRatio <= 0.2 ? 'warn' : 'fail'),
    score: Math.round((1 - dupRatio) * 100),
    evidence: { duplicate_ratio: dupRatio, total: titles.length },
    why: 'Duplicate titles confuse search engines and hurt rankings.',
    fix: dupRatio > 0.1 ? 'Create unique, descriptive titles for each page.' : '',
    impact: 'medium',
    effort: 'medium'
  });
  
  // thin_content_pages
  const thinPages = pages.filter(p => p.word_count < 250 && p.word_count > 0);
  const thinRatio = pages.length > 0 ? thinPages.length / pages.length : 0;
  checks.push({
    module: 'onpage',
    key: 'thin_content_pages',
    status: thinRatio <= 0.2 ? 'pass' : (thinRatio <= 0.4 ? 'warn' : 'fail'),
    score: Math.round((1 - thinRatio) * 100),
    evidence: { thin_pages: thinPages.length, threshold: 250, total: pages.length },
    why: 'Pages with very little content may be seen as low-quality by search engines.',
    fix: thinRatio > 0.2 ? 'Add more valuable content to thin pages or consolidate them.' : '',
    impact: 'medium',
    effort: 'high'
  });
  
  return checks;
}

function runEntityChecks(pages: PageData[], aboutExists: boolean, contactExists: boolean): CheckResult[] {
  const checks: CheckResult[] = [];
  
  // organization_schema_present
  const hasOrgSchema = pages.some(p => p.schema_types.some(t => 
    ['Organization', 'LocalBusiness', 'Corporation', 'Company'].includes(t)
  ));
  checks.push({
    module: 'entity',
    key: 'organization_schema_present',
    status: hasOrgSchema ? 'pass' : 'fail',
    score: hasOrgSchema ? 100 : 0,
    evidence: { has_org_schema: hasOrgSchema },
    why: 'Organization schema helps AI understand your business identity.',
    fix: hasOrgSchema ? '' : 'Add Organization or LocalBusiness JSON-LD schema to your homepage.',
    impact: 'high',
    effort: 'medium'
  });
  
  // schema_has_sameAs
  const hasAnySchema = pages.some(p => p.has_schema);
  checks.push({
    module: 'entity',
    key: 'schema_has_sameAs',
    status: hasAnySchema ? 'pass' : 'warn',
    score: hasAnySchema ? 80 : 30,
    evidence: { has_schema: hasAnySchema },
    why: 'sameAs links in schema connect your brand to social profiles and Wikipedia.',
    fix: hasAnySchema ? 'Ensure your Organization schema includes sameAs URLs.' : 'Add schema markup with sameAs social links.',
    impact: 'medium',
    effort: 'low'
  });
  
  // about_page_exists
  checks.push({
    module: 'entity',
    key: 'about_page_exists',
    status: aboutExists ? 'pass' : 'warn',
    score: aboutExists ? 100 : 40,
    evidence: { exists: aboutExists },
    why: 'About pages establish credibility and provide entity information.',
    fix: aboutExists ? '' : 'Create an About page explaining your company, team, and mission.',
    impact: 'medium',
    effort: 'medium'
  });
  
  // contact_page_exists
  checks.push({
    module: 'entity',
    key: 'contact_page_exists',
    status: contactExists ? 'pass' : 'warn',
    score: contactExists ? 100 : 40,
    evidence: { exists: contactExists },
    why: 'Contact pages build trust and provide verification signals.',
    fix: contactExists ? '' : 'Create a Contact page with address, phone, and email.',
    impact: 'medium',
    effort: 'low'
  });
  
  // policies_present (inferred)
  checks.push({
    module: 'entity',
    key: 'policies_present',
    status: 'warn',
    score: 50,
    evidence: {},
    why: 'Privacy and Terms pages demonstrate legitimacy and compliance.',
    fix: 'Ensure you have /privacy and /terms pages linked from your footer.',
    impact: 'low',
    effort: 'medium'
  });
  
  return checks;
}

function runAIReadinessChecks(
  llmsTxt: string | null,
  pages: PageData[],
  businessType?: string
): CheckResult[] {
  const checks: CheckResult[] = [];
  
  // llms_txt_present
  checks.push({
    module: 'ai_readiness',
    key: 'llms_txt_present',
    status: llmsTxt ? 'pass' : 'fail',
    score: llmsTxt ? 100 : 0,
    evidence: { exists: !!llmsTxt },
    why: 'llms.txt helps AI models understand and accurately represent your brand.',
    fix: llmsTxt ? '' : 'Create an llms.txt file at your domain root with key brand information.',
    impact: 'high',
    effort: 'medium'
  });
  
  // llms_txt_has_canonical_sources
  const hasGoodContent = llmsTxt && llmsTxt.split('\n').filter(l => l.trim()).length >= 3;
  checks.push({
    module: 'ai_readiness',
    key: 'llms_txt_has_canonical_sources',
    status: hasGoodContent ? 'pass' : (llmsTxt ? 'warn' : 'fail'),
    score: hasGoodContent ? 100 : (llmsTxt ? 50 : 0),
    evidence: { has_content: hasGoodContent },
    why: 'llms.txt should include key URLs for AI to source accurate information.',
    fix: !hasGoodContent ? 'Add at least 3 high-value URLs to your llms.txt file.' : '',
    impact: 'high',
    effort: 'low'
  });
  
  // pricing_or_plans_page_exists (for SaaS/ecom)
  const needsPricing = ['saas', 'ecommerce'].includes(businessType?.toLowerCase() || '');
  const pricingUrls = pages.filter(p => 
    p.url.includes('pricing') || p.url.includes('plans') || p.url.includes('products')
  );
  checks.push({
    module: 'ai_readiness',
    key: 'pricing_or_plans_page_exists',
    status: pricingUrls.length > 0 ? 'pass' : (needsPricing ? 'fail' : 'warn'),
    score: pricingUrls.length > 0 ? 100 : (needsPricing ? 20 : 60),
    evidence: { found: pricingUrls.length, urls: pricingUrls.map(p => p.url) },
    why: 'Clear pricing helps AI accurately answer user questions about your offerings.',
    fix: pricingUrls.length === 0 ? 'Create a dedicated pricing or products page.' : '',
    impact: 'medium',
    effort: 'medium'
  });
  
  // faq_or_qna_page_exists
  const faqPages = pages.filter(p => 
    p.url.includes('faq') || p.schema_types.includes('FAQPage') || p.schema_types.includes('QAPage')
  );
  checks.push({
    module: 'ai_readiness',
    key: 'faq_or_qna_page_exists',
    status: faqPages.length > 0 ? 'pass' : 'warn',
    score: faqPages.length > 0 ? 100 : 40,
    evidence: { found: faqPages.length },
    why: 'FAQ pages are prime sources for AI to pull accurate answers.',
    fix: faqPages.length === 0 ? 'Create an FAQ page with FAQPage schema markup.' : '',
    impact: 'high',
    effort: 'medium'
  });
  
  return checks;
}

function runOffsiteChecks(pages: PageData[], brandName?: string): CheckResult[] {
  const checks: CheckResult[] = [];
  const homepage = pages[0];
  
  // social_profiles_linked_from_site
  const socialDomains = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'youtube.com'];
  const hasSocialLinks = pages.some(p => p.links.some(l => socialDomains.some(s => l.includes(s))));
  checks.push({
    module: 'offsite',
    key: 'social_profiles_linked_from_site',
    status: hasSocialLinks ? 'pass' : 'warn',
    score: hasSocialLinks ? 100 : 40,
    evidence: { has_social_links: hasSocialLinks },
    why: 'Social profile links help establish your brand presence across platforms.',
    fix: hasSocialLinks ? '' : 'Add links to your social profiles in your site footer.',
    impact: 'low',
    effort: 'low'
  });
  
  // brand_name_present_in_title_or_h1
  const brandInTitle = brandName && homepage?.title?.toLowerCase().includes(brandName.toLowerCase());
  const brandInH1 = brandName && homepage?.h1?.toLowerCase().includes(brandName.toLowerCase());
  const brandPresent = brandInTitle || brandInH1 || !brandName;
  checks.push({
    module: 'offsite',
    key: 'brand_name_present_in_title_or_h1',
    status: brandPresent ? 'pass' : 'warn',
    score: brandPresent ? 100 : 50,
    evidence: { in_title: brandInTitle, in_h1: brandInH1, brand: brandName },
    why: 'Including your brand name in homepage title/H1 reinforces brand recognition.',
    fix: !brandPresent ? `Add "${brandName}" to your homepage title or H1.` : '',
    impact: 'medium',
    effort: 'low'
  });
  
  return checks;
}

function runPerformanceChecks(pages: PageData[]): CheckResult[] {
  const checks: CheckResult[] = [];
  
  // large_images_detected (based on page weight indicators)
  const avgImageCount = pages.reduce((sum, p) => sum + p.image_count, 0) / Math.max(pages.length, 1);
  checks.push({
    module: 'performance',
    key: 'large_images_detected',
    status: avgImageCount < 20 ? 'pass' : (avgImageCount < 40 ? 'warn' : 'fail'),
    score: Math.max(0, 100 - Math.round(avgImageCount * 2)),
    evidence: { avg_images_per_page: Math.round(avgImageCount) },
    why: 'Large or numerous unoptimized images slow page loading.',
    fix: avgImageCount >= 20 ? 'Optimize and compress images. Use modern formats like WebP.' : '',
    impact: 'medium',
    effort: 'medium'
  });
  
  // render_blocking_assets_detected (approximation)
  checks.push({
    module: 'performance',
    key: 'render_blocking_assets_detected',
    status: 'warn',
    score: 70,
    evidence: { note: 'Manual check recommended' },
    why: 'Render-blocking CSS and JS delay page display.',
    fix: 'Use async/defer for scripts and inline critical CSS.',
    impact: 'medium',
    effort: 'high'
  });
  
  // pagespeed_mobile (would need PSI API key)
  checks.push({
    module: 'performance',
    key: 'pagespeed_mobile',
    status: 'warn',
    score: 60,
    evidence: { note: 'Run PageSpeed Insights for detailed metrics' },
    why: 'Mobile page speed affects rankings and user experience.',
    fix: 'Run Google PageSpeed Insights and address Core Web Vitals.',
    impact: 'high',
    effort: 'high'
  });
  
  return checks;
}

function calculateModuleScore(checks: CheckResult[], module: string): number {
  const moduleChecks = checks.filter(c => c.module === module);
  if (moduleChecks.length === 0) return 0;
  return Math.round(moduleChecks.reduce((sum, c) => sum + c.score, 0) / moduleChecks.length);
}

function calculateOverallScore(moduleScores: Record<string, number>): number {
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [module, weight] of Object.entries(MODULE_WEIGHTS)) {
    if (moduleScores[module] !== undefined) {
      weightedSum += moduleScores[module] * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

function getTopFixes(checks: CheckResult[], limit = 7): CheckResult[] {
  // Score: impact high=3, medium=2, low=1; effort low=3, medium=2, high=1
  const impactScore = { high: 3, medium: 2, low: 1 };
  const effortScore = { low: 3, medium: 2, high: 1 };
  
  return checks
    .filter(c => c.status !== 'pass' && c.fix)
    .sort((a, b) => {
      const aScore = (impactScore[a.impact] || 1) * (effortScore[a.effort] || 1);
      const bScore = (impactScore[b.impact] || 1) * (effortScore[b.effort] || 1);
      return bScore - aScore;
    })
    .slice(0, limit);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, brand_name, business_type, crawl_limit = 25, user_id }: AuditRequest = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Audit] Starting audit for ${domain}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const baseUrl = normalizeDomain(domain);
    
    // Create audit record
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert({
        domain: baseUrl.replace('https://', ''),
        brand_name,
        business_type,
        user_id: user_id || null,
        status: 'running'
      })
      .select()
      .single();

    if (auditError) throw auditError;
    const auditId = audit.id;
    console.log(`[Audit] Created audit record: ${auditId}`);

    // Fetch key files
    const [homepageRes, robotsRes, sitemapRes, llmsRes] = await Promise.all([
      fetchWithTimeout(baseUrl),
      fetchWithTimeout(`${baseUrl}/robots.txt`),
      fetchWithTimeout(`${baseUrl}/sitemap.xml`),
      fetchWithTimeout(`${baseUrl}/llms.txt`)
    ]);

    const httpsEnforced = homepageRes?.url?.startsWith('https://') ?? false;
    const robotsTxt = robotsRes?.ok ? await robotsRes.text() : null;
    const sitemapExists = sitemapRes?.ok ?? false;
    const llmsTxt = llmsRes?.ok ? await llmsRes.text() : null;

    // Parse homepage
    const pages: PageData[] = [];
    const crawledUrls = new Set<string>();
    const urlQueue: string[] = [baseUrl];
    
    if (homepageRes?.ok) {
      const html = await homepageRes.text();
      const pageData = parsePageData(html, baseUrl, homepageRes.status);
      pages.push(pageData);
      crawledUrls.add(baseUrl);
      
      // Add links to queue
      pageData.links.forEach(link => {
        if (!crawledUrls.has(link) && !urlQueue.includes(link)) {
          urlQueue.push(link);
        }
      });
    }

    // BFS crawl
    while (pages.length < crawl_limit && urlQueue.length > 0) {
      const url = urlQueue.shift()!;
      if (crawledUrls.has(url)) continue;
      
      crawledUrls.add(url);
      const res = await fetchWithTimeout(url, 5000);
      
      if (res?.ok) {
        const html = await res.text();
        const pageData = parsePageData(html, url, res.status);
        pages.push(pageData);
        
        // Add new links
        pageData.links.forEach(link => {
          if (!crawledUrls.has(link) && !urlQueue.includes(link) && urlQueue.length < 100) {
            urlQueue.push(link);
          }
        });
      }
    }

    console.log(`[Audit] Crawled ${pages.length} pages`);

    // Check for about/contact pages
    const aboutExists = pages.some(p => /\/(about|company|who-we-are|about-us)/i.test(p.url));
    const contactExists = pages.some(p => /\/contact/i.test(p.url));

    // Run all checks
    const checks: CheckResult[] = [
      ...runCrawlChecks(pages, robotsTxt, sitemapExists, llmsTxt, httpsEnforced),
      ...runPerformanceChecks(pages),
      ...runOnPageChecks(pages),
      ...runEntityChecks(pages, aboutExists, contactExists),
      ...runAIReadinessChecks(llmsTxt, pages, business_type),
      ...runOffsiteChecks(pages, brand_name)
    ];

    // Calculate scores
    const moduleScores = {
      crawl: calculateModuleScore(checks, 'crawl'),
      performance: calculateModuleScore(checks, 'performance'),
      onpage: calculateModuleScore(checks, 'onpage'),
      entity: calculateModuleScore(checks, 'entity'),
      ai_readiness: calculateModuleScore(checks, 'ai_readiness'),
      offsite: calculateModuleScore(checks, 'offsite')
    };

    const overallScore = calculateOverallScore(moduleScores);
    const topFixes = getTopFixes(checks);

    console.log(`[Audit] Overall score: ${overallScore}`);

    // Save pages
    if (pages.length > 0) {
      const { error: pagesError } = await supabase
        .from('audit_pages')
        .insert(pages.map(p => ({
          audit_id: auditId,
          url: p.url,
          status: p.status,
          title: p.title,
          h1: p.h1,
          meta_description: p.meta_description,
          canonical: p.canonical,
          has_schema: p.has_schema,
          schema_types: p.schema_types,
          word_count: p.word_count,
          image_count: p.image_count,
          images_with_alt: p.images_with_alt,
          headings: p.headings
        })));
      
      if (pagesError) console.error('[Audit] Error saving pages:', pagesError);
    }

    // Save checks
    const { error: checksError } = await supabase
      .from('audit_checks')
      .insert(checks.map(c => ({
        audit_id: auditId,
        module: c.module,
        key: c.key,
        status: c.status,
        score: c.score,
        evidence: c.evidence,
        why: c.why,
        fix: c.fix,
        impact: c.impact,
        effort: c.effort
      })));
    
    if (checksError) console.error('[Audit] Error saving checks:', checksError);

    // Update audit with final scores
    const { error: updateError } = await supabase
      .from('audits')
      .update({
        overall_score: overallScore,
        module_scores: moduleScores,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', auditId);

    if (updateError) console.error('[Audit] Error updating audit:', updateError);

    return new Response(
      JSON.stringify({
        audit_id: auditId,
        overall_score: overallScore,
        module_scores: moduleScores,
        top_fixes: topFixes,
        checks,
        pages_crawled: pages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Audit] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
