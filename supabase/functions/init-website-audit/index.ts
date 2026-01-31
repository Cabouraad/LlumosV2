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
const MAX_CRAWL_LIMIT = 500;
const DEFAULT_CRAWL_LIMIT = 100;

// Tracking params to remove from URLs
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'gclsrc', 'dclid', 'msclkid', '_ga', 'mc_cid', 'mc_eid'
]);

// Non-HTML extensions to skip
const SKIP_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
  '.css', '.js', '.json', '.xml', '.zip', '.tar', '.gz', '.mp3', '.mp4',
  '.woff', '.woff2', '.ttf', '.eot', '.doc', '.docx', '.xls', '.xlsx'
]);

interface InitRequest {
  domain: string;
  brand_name?: string;
  business_type?: string;
  crawl_limit?: number;
  allow_subdomains?: boolean;
  user_id?: string;
}

interface RobotsRule {
  path: string;
  allow: boolean;
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
    console.log(`[InitAudit] Fetch failed for ${url}: ${e}`);
    return null;
  }
}

// Get registrable domain (e.g., example.com from www.example.com)
function getRegistrableDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  // Handle common TLDs like co.uk, com.au
  const commonSecondLevel = ['co', 'com', 'org', 'net', 'edu', 'gov'];
  if (parts.length >= 3 && commonSecondLevel.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

// Normalize domain to proper URL
function normalizeDomain(domain: string): string {
  let url = domain.trim().toLowerCase();
  url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
  url = url.replace(/\/.*$/, '');
  return `https://${url}`;
}

// Normalize URL for deduplication
function normalizeUrl(urlStr: string, baseHostname: string): string | null {
  try {
    const url = new URL(urlStr);
    
    // Check extension
    const pathname = url.pathname.toLowerCase();
    for (const ext of SKIP_EXTENSIONS) {
      if (pathname.endsWith(ext)) return null;
    }
    
    // Remove fragment
    url.hash = '';
    
    // Remove tracking params
    const params = new URLSearchParams(url.search);
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        params.delete(key);
      }
    }
    url.search = params.toString();
    
    // Normalize trailing slash for non-root paths
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    
    // Normalize to lowercase
    return url.href.toLowerCase();
  } catch {
    return null;
  }
}

// Check if URL is within allowed domain
function isAllowedDomain(urlHostname: string, baseHostname: string, allowSubdomains: boolean): boolean {
  const baseRegistrable = getRegistrableDomain(baseHostname);
  const urlRegistrable = getRegistrableDomain(urlHostname);
  
  if (allowSubdomains) {
    return urlRegistrable === baseRegistrable;
  }
  
  // Strict same-host matching (allow www variants)
  const normalizedBase = baseHostname.replace(/^www\./, '');
  const normalizedUrl = urlHostname.replace(/^www\./, '');
  return normalizedUrl === normalizedBase;
}

// Parse robots.txt and extract rules for our user agent
function parseRobotsTxt(robotsTxt: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  const lines = robotsTxt.split('\n');
  let appliesToUs = false;
  
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    
    if (trimmed.startsWith('user-agent:')) {
      const agent = trimmed.substring(11).trim();
      appliesToUs = agent === '*' || agent.includes('llumos') || agent.includes('bot');
    } else if (appliesToUs && trimmed.startsWith('disallow:')) {
      const path = trimmed.substring(9).trim();
      if (path) {
        rules.push({ path, allow: false });
      }
    } else if (appliesToUs && trimmed.startsWith('allow:')) {
      const path = trimmed.substring(6).trim();
      if (path) {
        rules.push({ path, allow: true });
      }
    }
  }
  
  return rules;
}

// Check if URL is allowed by robots.txt
function isAllowedByRobots(urlPath: string, rules: RobotsRule[]): boolean {
  const normalizedPath = urlPath.toLowerCase();
  
  for (const rule of rules) {
    if (normalizedPath.startsWith(rule.path)) {
      return rule.allow;
    }
  }
  
  return true; // Default allow
}

// Parse sitemap and extract URLs
async function parseSitemap(sitemapUrl: string, baseHostname: string, allowSubdomains: boolean, maxUrls = 200): Promise<string[]> {
  const urls: string[] = [];
  
  try {
    const response = await fetchWithTimeout(sitemapUrl);
    if (!response?.ok) return urls;
    
    const text = await response.text();
    
    // Check if it's a sitemap index
    if (text.includes('<sitemapindex')) {
      const sitemapMatches = text.matchAll(/<loc>([^<]+)<\/loc>/gi);
      const childSitemaps: string[] = [];
      
      for (const match of sitemapMatches) {
        if (childSitemaps.length < 5) { // Limit to first 5 child sitemaps
          childSitemaps.push(match[1]);
        }
      }
      
      // Recursively parse child sitemaps
      for (const childUrl of childSitemaps) {
        if (urls.length >= maxUrls) break;
        const childUrls = await parseSitemap(childUrl, baseHostname, allowSubdomains, maxUrls - urls.length);
        urls.push(...childUrls);
      }
    } else {
      // Regular sitemap
      const locMatches = text.matchAll(/<loc>([^<]+)<\/loc>/gi);
      
      for (const match of locMatches) {
        if (urls.length >= maxUrls) break;
        
        const normalized = normalizeUrl(match[1], baseHostname);
        if (normalized) {
          try {
            const urlObj = new URL(normalized);
            if (isAllowedDomain(urlObj.hostname, baseHostname, allowSubdomains)) {
              urls.push(normalized);
            }
          } catch {
            // Invalid URL
          }
        }
      }
    }
  } catch (e) {
    console.log(`[InitAudit] Error parsing sitemap ${sitemapUrl}: ${e}`);
  }
  
  return urls;
}

// Extract links from HTML
function extractLinks(html: string, baseUrl: string, baseHostname: string, allowSubdomains: boolean): string[] {
  const links: string[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    if (!doc) return links;
    
    // Extract from nav, header, footer (high-priority links)
    const prioritySelectors = ['nav a', 'header a', 'footer a', '[role="navigation"] a'];
    
    for (const selector of prioritySelectors) {
      doc.querySelectorAll(selector).forEach((a: any) => {
        const href = a.getAttribute('href');
        if (href) {
          try {
            const fullUrl = new URL(href, baseUrl);
            const normalized = normalizeUrl(fullUrl.href, baseHostname);
            if (normalized && isAllowedDomain(fullUrl.hostname, baseHostname, allowSubdomains)) {
              if (!links.includes(normalized)) {
                links.push(normalized);
              }
            }
          } catch {
            // Invalid URL
          }
        }
      });
    }
    
    // Extract remaining links from body
    doc.querySelectorAll('a[href]').forEach((a: any) => {
      const href = a.getAttribute('href');
      if (href && links.length < 200) {
        try {
          const fullUrl = new URL(href, baseUrl);
          const normalized = normalizeUrl(fullUrl.href, baseHostname);
          if (normalized && isAllowedDomain(fullUrl.hostname, baseHostname, allowSubdomains)) {
            if (!links.includes(normalized)) {
              links.push(normalized);
            }
          }
        } catch {
          // Invalid URL
        }
      }
    });
  } catch (e) {
    console.log(`[InitAudit] Error extracting links: ${e}`);
  }
  
  return links;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      domain, 
      brand_name, 
      business_type, 
      crawl_limit = DEFAULT_CRAWL_LIMIT,
      allow_subdomains = false,
      user_id 
    }: InitRequest = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const effectiveCrawlLimit = Math.min(Math.max(1, crawl_limit), MAX_CRAWL_LIMIT);
    console.log(`[InitAudit] Starting audit init for ${domain} (limit: ${effectiveCrawlLimit})`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const baseUrl = normalizeDomain(domain);
    const baseHostname = new URL(baseUrl).hostname;
    
    // Create audit record
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert({
        domain: baseUrl.replace('https://', ''),
        brand_name,
        business_type,
        user_id: user_id || null,
        crawl_limit: effectiveCrawlLimit,
        status: 'crawling'
      })
      .select()
      .single();

    if (auditError) throw auditError;
    const auditId = audit.id;
    console.log(`[InitAudit] Created audit record: ${auditId}`);

    // Fetch key files in parallel
    const [homepageRes, robotsRes, sitemapRes, llmsRes] = await Promise.all([
      fetchWithTimeout(baseUrl),
      fetchWithTimeout(`${baseUrl}/robots.txt`),
      fetchWithTimeout(`${baseUrl}/sitemap.xml`),
      fetchWithTimeout(`${baseUrl}/llms.txt`)
    ]);

    // Parse robots.txt
    let robotsRules: RobotsRule[] = [];
    if (robotsRes?.ok) {
      const robotsTxt = await robotsRes.text();
      robotsRules = parseRobotsTxt(robotsTxt);
    }

    // Seed URLs from sitemap
    const sitemapUrls: string[] = [];
    if (sitemapRes?.ok) {
      const urls = await parseSitemap(`${baseUrl}/sitemap.xml`, baseHostname, allow_subdomains);
      sitemapUrls.push(...urls);
      console.log(`[InitAudit] Found ${sitemapUrls.length} URLs in sitemap`);
    }

    // Seed URLs from homepage links
    const homepageLinks: string[] = [];
    if (homepageRes?.ok) {
      const html = await homepageRes.text();
      const links = extractLinks(html, baseUrl, baseHostname, allow_subdomains);
      homepageLinks.push(...links);
      console.log(`[InitAudit] Found ${homepageLinks.length} links on homepage`);
    }

    // Build initial queue - prioritize homepage, then nav links, then sitemap
    const seenHashes = new Set<string>();
    const queue: string[] = [];
    
    // Always add homepage first
    const normalizedHomepage = normalizeUrl(baseUrl, baseHostname);
    if (normalizedHomepage && isAllowedByRobots(new URL(normalizedHomepage).pathname, robotsRules)) {
      queue.push(normalizedHomepage);
      seenHashes.add(normalizedHomepage);
    }
    
    // Add homepage links (high priority - nav/footer links)
    for (const url of homepageLinks) {
      if (!seenHashes.has(url) && isAllowedByRobots(new URL(url).pathname, robotsRules)) {
        queue.push(url);
        seenHashes.add(url);
      }
    }
    
    // Add sitemap URLs
    for (const url of sitemapUrls) {
      if (!seenHashes.has(url) && isAllowedByRobots(new URL(url).pathname, robotsRules)) {
        queue.push(url);
        seenHashes.add(url);
      }
    }

    console.log(`[InitAudit] Initial queue size: ${queue.length}`);

    // Create crawl state
    const { error: crawlStateError } = await supabase
      .from('audit_crawl_state')
      .insert({
        audit_id: auditId,
        queue: queue,
        seen_hashes: [...seenHashes],
        crawled_count: 0,
        crawl_limit: effectiveCrawlLimit,
        allow_subdomains: allow_subdomains,
        robots_rules: robotsRules,
        status: 'running'
      });

    if (crawlStateError) throw crawlStateError;

    return new Response(
      JSON.stringify({
        audit_id: auditId,
        queue_size: queue.length,
        crawl_limit: effectiveCrawlLimit,
        status: 'running'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[InitAudit] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
