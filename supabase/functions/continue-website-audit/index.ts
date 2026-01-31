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
const FETCH_TIMEOUT = 5000;
const BATCH_SIZE = 15;
const CONCURRENCY = 5;

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

interface ContinueRequest {
  audit_id: string;
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
    return null;
  }
}

// Get registrable domain
function getRegistrableDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  const commonSecondLevel = ['co', 'com', 'org', 'net', 'edu', 'gov'];
  if (parts.length >= 3 && commonSecondLevel.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

// Normalize URL for deduplication
function normalizeUrl(urlStr: string): string | null {
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
    
    // Normalize trailing slash
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    
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
  
  const normalizedBase = baseHostname.replace(/^www\./, '');
  const normalizedUrl = urlHostname.replace(/^www\./, '');
  return normalizedUrl === normalizedBase;
}

// Check if URL is allowed by robots.txt
function isAllowedByRobots(urlPath: string, rules: RobotsRule[]): boolean {
  const normalizedPath = urlPath.toLowerCase();
  
  for (const rule of rules) {
    if (normalizedPath.startsWith(rule.path)) {
      return rule.allow;
    }
  }
  
  return true;
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
    } catch {
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
  doc.querySelectorAll('a[href]').forEach((a: any) => {
    const href = a.getAttribute('href');
    if (href && links.length < 100) {
      try {
        const linkUrl = new URL(href, url);
        const normalized = normalizeUrl(linkUrl.href);
        if (normalized && !links.includes(normalized)) {
          links.push(normalized);
        }
      } catch {
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

// Process a single URL
async function processUrl(url: string): Promise<{ pageData: PageData | null; newLinks: string[] }> {
  try {
    const response = await fetchWithTimeout(url);
    
    if (!response) {
      return { pageData: null, newLinks: [] };
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Skip non-HTML responses
    if (!contentType.includes('text/html')) {
      await response.text(); // Consume body
      return { pageData: null, newLinks: [] };
    }
    
    const html = await response.text();
    const pageData = parsePageData(html, url, response.status);
    
    return { pageData, newLinks: pageData.links };
  } catch {
    return { pageData: null, newLinks: [] };
  }
}

// Pool-based concurrent fetching
async function processBatch(
  urls: string[],
  seenHashes: Set<string>,
  robotsRules: RobotsRule[],
  baseHostname: string,
  allowSubdomains: boolean,
  remainingCapacity: number
): Promise<{ pages: PageData[]; newUrls: string[]; processed: number }> {
  const pages: PageData[] = [];
  const newUrls: string[] = [];
  let processed = 0;
  
  // Take only what we can process
  const batchUrls = urls.slice(0, Math.min(BATCH_SIZE, remainingCapacity));
  
  // Process in concurrent chunks
  for (let i = 0; i < batchUrls.length; i += CONCURRENCY) {
    const chunk = batchUrls.slice(i, i + CONCURRENCY);
    
    const results = await Promise.all(
      chunk.map(url => processUrl(url))
    );
    
    for (const result of results) {
      processed++;
      
      if (result.pageData) {
        pages.push(result.pageData);
        
        // Filter and add new links
        for (const link of result.newLinks) {
          if (seenHashes.has(link)) continue;
          
          try {
            const linkUrl = new URL(link);
            if (!isAllowedDomain(linkUrl.hostname, baseHostname, allowSubdomains)) continue;
            if (!isAllowedByRobots(linkUrl.pathname, robotsRules)) continue;
            
            seenHashes.add(link);
            newUrls.push(link);
          } catch {
            // Invalid URL
          }
        }
      }
    }
  }
  
  return { pages, newUrls, processed };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audit_id }: ContinueRequest = await req.json();
    
    if (!audit_id) {
      return new Response(
        JSON.stringify({ error: 'audit_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Load crawl state
    const { data: crawlState, error: stateError } = await supabase
      .from('audit_crawl_state')
      .select('*')
      .eq('audit_id', audit_id)
      .single();

    if (stateError || !crawlState) {
      return new Response(
        JSON.stringify({ error: 'Crawl state not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (crawlState.status === 'done') {
      return new Response(
        JSON.stringify({
          audit_id,
          crawled_count: crawlState.crawled_count,
          crawl_limit: crawlState.crawl_limit,
          queue_size: 0,
          done: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (crawlState.status === 'error') {
      return new Response(
        JSON.stringify({
          audit_id,
          error: crawlState.error,
          done: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load audit to get domain
    const { data: audit } = await supabase
      .from('audits')
      .select('domain')
      .eq('id', audit_id)
      .single();

    if (!audit) {
      return new Response(
        JSON.stringify({ error: 'Audit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseHostname = audit.domain.replace(/^www\./, '');
    const queue: string[] = crawlState.queue as string[] || [];
    const seenHashes = new Set<string>(crawlState.seen_hashes || []);
    const robotsRules: RobotsRule[] = (crawlState.robots_rules as RobotsRule[]) || [];
    const allowSubdomains = crawlState.allow_subdomains || false;
    const crawlLimit = crawlState.crawl_limit || 100;
    let crawledCount = crawlState.crawled_count || 0;

    const remainingCapacity = crawlLimit - crawledCount;

    console.log(`[ContinueAudit] Processing batch for ${audit_id} - crawled: ${crawledCount}/${crawlLimit}, queue: ${queue.length}`);

    if (queue.length === 0 || remainingCapacity <= 0) {
      // Crawl is done
      await supabase
        .from('audit_crawl_state')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('audit_id', audit_id);

      return new Response(
        JSON.stringify({
          audit_id,
          crawled_count: crawledCount,
          crawl_limit: crawlLimit,
          queue_size: 0,
          done: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process batch
    const { pages, newUrls, processed } = await processBatch(
      queue,
      seenHashes,
      robotsRules,
      baseHostname,
      allowSubdomains,
      remainingCapacity
    );

    // Remove processed URLs from queue and add new ones
    const remainingQueue = queue.slice(processed);
    const updatedQueue = [...remainingQueue, ...newUrls];
    crawledCount += pages.length;

    console.log(`[ContinueAudit] Batch complete: processed ${processed}, found ${pages.length} HTML pages, ${newUrls.length} new URLs`);

    // Save pages to database
    if (pages.length > 0) {
      const { error: pagesError } = await supabase
        .from('audit_pages')
        .insert(pages.map(p => ({
          audit_id,
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

      if (pagesError) {
        console.error('[ContinueAudit] Error saving pages:', pagesError);
      }
    }

    // Check if done
    const isDone = updatedQueue.length === 0 || crawledCount >= crawlLimit;
    const newStatus = isDone ? 'done' : 'running';

    // Update crawl state
    await supabase
      .from('audit_crawl_state')
      .update({
        queue: updatedQueue,
        seen_hashes: [...seenHashes],
        crawled_count: crawledCount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('audit_id', audit_id);

    return new Response(
      JSON.stringify({
        audit_id,
        crawled_count: crawledCount,
        crawl_limit: crawlLimit,
        queue_size: updatedQueue.length,
        pages_this_batch: pages.length,
        done: isDone
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ContinueAudit] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
