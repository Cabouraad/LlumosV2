import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RerunScanRequest {
  business_name: string;
  business_website?: string;
  city: string;
  category: string;
  lead_email?: string;
  force?: boolean;
}

// Normalize text for fingerprint: lowercase, trim, remove punctuation
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Extract domain from URL (hostname without www)
function extractDomain(url: string | null): string {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

// Compute fingerprint as a simple hash of normalized inputs
async function computeFingerprint(
  businessName: string,
  website: string | null,
  city: string,
  category: string
): Promise<string> {
  const normalized = [
    normalizeText(businessName),
    extractDomain(website),
    normalizeText(city),
    normalizeText(category),
  ].join('|');
  
  // Use SubtleCrypto for SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate the 6 standard prompts for local AI visibility
function generatePrompts(category: string, city: string): string[] {
  return [
    `Best ${category} near me in ${city}`,
    `Who is the most trusted ${category} in ${city}?`,
    `Which ${category} should I call in ${city}?`,
    `Top-rated ${category} in ${city}`,
    `Recommended ${category} in ${city}`,
    `Local ${category} businesses in ${city}`,
  ];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RerunScanRequest = await req.json();
    
    // Validate required fields
    if (!body.business_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'business_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.city?.trim()) {
      return new Response(
        JSON.stringify({ error: 'city is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.category?.trim()) {
      return new Response(
        JSON.stringify({ error: 'category is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user is authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    const businessName = body.business_name.trim();
    const businessWebsite = body.business_website?.trim() || null;
    const city = body.city.trim();
    const category = body.category.trim();
    const force = body.force === true;

    // Compute fingerprint
    const fingerprint = await computeFingerprint(businessName, businessWebsite, city, category);
    console.log(`[local-scan-rerun] Fingerprint: ${fingerprint.slice(0, 16)}... force=${force}`);

    // Check for cached result (unless force=true)
    if (!force) {
      const { data: cachedScan, error: cacheErr } = await supabase
        .from('local_ai_scans')
        .select('id, business_name, city, category, status, raw_score, max_raw_score, normalized_score, label, top_competitors, created_at, updated_at')
        .eq('input_fingerprint', fingerprint)
        .eq('status', 'completed')
        .gt('cache_expires_at', new Date().toISOString())
        .order('cache_expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cacheErr && cachedScan) {
        console.log(`[local-scan-rerun] Returning cached scan: ${cachedScan.id}`);
        return new Response(
          JSON.stringify({
            cached: true,
            scan_id: cachedScan.id,
            scan: {
              scan_id: cachedScan.id,
              business_name: cachedScan.business_name,
              city: cachedScan.city,
              category: cachedScan.category,
              status: cachedScan.status,
              raw_score: cachedScan.raw_score,
              max_raw_score: cachedScan.max_raw_score,
              normalized_score: cachedScan.normalized_score,
              label: cachedScan.label,
              top_competitors: cachedScan.top_competitors,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[local-scan-rerun] No cached result, creating new scan for: ${businessName}, ${city}`);

    // Create new scan with fingerprint and cache expiration
    const cacheExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    const { data: scan, error: scanError } = await supabase
      .from('local_ai_scans')
      .insert({
        user_id: userId,
        lead_email: userId ? null : body.lead_email || null,
        business_name: businessName,
        business_website: businessWebsite,
        city: city,
        category: category,
        status: 'created',
        input_fingerprint: fingerprint,
        cache_expires_at: cacheExpiresAt,
        last_run_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (scanError) {
      console.error('[local-scan-rerun] Failed to create scan:', scanError);
      throw new Error(`Failed to create scan: ${scanError.message}`);
    }

    const scanId = scan.id;
    console.log(`[local-scan-rerun] Created scan: ${scanId}`);

    // Generate and insert prompts
    const prompts = generatePrompts(category, city);
    const promptRecords = prompts.map((promptText, index) => ({
      scan_id: scanId,
      prompt_index: index + 1,
      prompt_text: promptText,
    }));

    const { error: promptsError } = await supabase
      .from('local_ai_scan_prompts')
      .insert(promptRecords);

    if (promptsError) {
      console.error('[local-scan-rerun] Failed to create prompts:', promptsError);
      await supabase.from('local_ai_scans').delete().eq('id', scanId);
      throw new Error(`Failed to create prompts: ${promptsError.message}`);
    }

    console.log(`[local-scan-rerun] Created ${prompts.length} prompts, returning scan_id for client to run`);

    // Return scan_id - client will call local-scan-run to execute
    return new Response(
      JSON.stringify({
        cached: false,
        scan_id: scanId,
        prompts_created: prompts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[local-scan-rerun] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
