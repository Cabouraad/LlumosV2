import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TYPES =============
type IntentType = 'discovery' | 'validation' | 'comparison' | 'recommendation' | 'action' | 'local_intent';
type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

interface GeneratedPrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string;
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
}

interface FunnelParams {
  minPerBucket?: number;
  totalDefault?: number;
}

interface FunnelStats {
  counts: { TOFU: number; MOFU: number; BOFO: number };
  coverage_ok: boolean;
  missing: { TOFU: number; MOFU: number; BOFU: number };
}

interface FunnelView {
  TOFU: GeneratedPrompt[];
  MOFU: GeneratedPrompt[];
  BOFU: GeneratedPrompt[];
  stats: FunnelStats;
}

// ============= DETERMINISTIC MAPPING =============
const INTENT_TO_FUNNEL: Record<IntentType, FunnelStage> = {
  discovery: 'TOFU',
  validation: 'MOFU',
  comparison: 'MOFU',
  recommendation: 'MOFU',
  action: 'BOFU',
  local_intent: 'BOFU', // Default; may be MOFU for informational-local
};

// Commercial intent priority within buckets (higher = more valuable)
const COMMERCIAL_PRIORITY: Record<IntentType, number> = {
  action: 6,
  local_intent: 5,
  recommendation: 4,
  comparison: 3,
  validation: 2,
  discovery: 1,
};

// ============= HELPER FUNCTIONS =============

/**
 * Normalize a prompt for comparison (lowercase, collapse whitespace)
 */
function normalizePrompt(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Deduplicate prompts by normalized text
 */
function dedupePrompts(prompts: GeneratedPrompt[]): GeneratedPrompt[] {
  const seen = new Set<string>();
  const result: GeneratedPrompt[] = [];
  for (const p of prompts) {
    const normalized = normalizePrompt(p.prompt);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(p);
    }
  }
  return result;
}

/**
 * Check if a local_intent prompt is informational (MOFU) vs transactional (BOFU)
 */
function isInformationalLocal(prompt: string): boolean {
  const informationalPatterns = [
    /what (?:to|should|do) (?:i|you) look for/i,
    /how (?:to|do i) (?:find|choose|pick)/i,
    /what makes a good/i,
    /tips for (?:finding|choosing)/i,
    /things to consider/i,
    /questions to ask/i,
  ];
  return informationalPatterns.some(pattern => pattern.test(prompt));
}

/**
 * Enforce correct funnel mapping based on intent_type
 * Fixes any inconsistencies from generation
 */
function enforceFunnelMapping(prompt: GeneratedPrompt): GeneratedPrompt {
  let expectedFunnel = INTENT_TO_FUNNEL[prompt.intent_type];
  
  // Special case: local_intent can be MOFU if informational
  if (prompt.intent_type === 'local_intent' && isInformationalLocal(prompt.prompt)) {
    expectedFunnel = 'MOFU';
  }
  
  // Only fix if different
  if (prompt.funnel_stage !== expectedFunnel) {
    console.log(`Correcting funnel: ${prompt.intent_type} ${prompt.funnel_stage} -> ${expectedFunnel}`);
    return { ...prompt, funnel_stage: expectedFunnel };
  }
  
  return prompt;
}

/**
 * Bucketize prompts into TOFU/MOFU/BOFU arrays
 */
function bucketizePrompts(prompts: GeneratedPrompt[]): { TOFU: GeneratedPrompt[]; MOFU: GeneratedPrompt[]; BOFU: GeneratedPrompt[] } {
  const buckets = { TOFU: [] as GeneratedPrompt[], MOFU: [] as GeneratedPrompt[], BOFU: [] as GeneratedPrompt[] };
  for (const p of prompts) {
    buckets[p.funnel_stage].push(p);
  }
  return buckets;
}

/**
 * Score a prompt for selection priority within its bucket
 */
function scorePrompt(prompt: GeneratedPrompt, primaryOfferings: string[]): number {
  let score = 0;
  
  // Commercial intent priority (0-6 points)
  score += COMMERCIAL_PRIORITY[prompt.intent_type] || 0;
  
  // Offering priority (0-2 points)
  if (primaryOfferings.includes(prompt.target_offering)) {
    score += 2;
  } else if (prompt.target_offering !== 'general') {
    score += 1;
  }
  
  // Length preference (35-110 chars is ideal, 0-1 points)
  const len = prompt.prompt.length;
  if (len >= 35 && len <= 110) {
    score += 1;
  } else if (len > 110) {
    score -= 0.5; // Slight penalty for too long
  }
  
  return score;
}

/**
 * Select top N prompts from a bucket, sorted by priority
 */
function selectTopFromBucket(bucket: GeneratedPrompt[], n: number, primaryOfferings: string[]): GeneratedPrompt[] {
  return [...bucket]
    .map(p => ({ prompt: p, score: scorePrompt(p, primaryOfferings) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(x => x.prompt);
}

/**
 * Compute coverage stats
 */
function computeStats(buckets: { TOFU: GeneratedPrompt[]; MOFU: GeneratedPrompt[]; BOFU: GeneratedPrompt[] }, minPerBucket: number): FunnelStats {
  const counts = {
    TOFU: buckets.TOFU.length,
    MOFU: buckets.MOFU.length,
    BOFO: buckets.BOFU.length, // Note: typo preserved for backwards compat
  };
  
  const missing = {
    TOFU: Math.max(0, minPerBucket - buckets.TOFU.length),
    MOFU: Math.max(0, minPerBucket - buckets.MOFU.length),
    BOFU: Math.max(0, minPerBucket - buckets.BOFU.length),
  };
  
  const coverage_ok = missing.TOFU === 0 && missing.MOFU === 0 && missing.BOFU === 0;
  
  return { counts, coverage_ok, missing };
}

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    let brandId: string | null = null;
    let params: FunnelParams = { minPerBucket: 5, totalDefault: 15 };
    
    try {
      const body = await req.json();
      brandId = body?.brandId || body?.domainId || null;
      if (body?.params) params = { ...params, ...body.params };
      console.log('Funnel request:', { brandId, params });
    } catch (e) {
      console.log('No body or parse error');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Authentication failed');

    // Get user's org
    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();
    if (!userData) throw new Error('Could not get user organization');

    const orgId = userData.org_id;
    const minPerBucket = params.minPerBucket || 5;

    // Get org context for offering priority
    const { data: orgData } = await supabase
      .from('organizations')
      .select('products_services')
      .eq('id', orgId)
      .single();
    
    const primaryOfferings = (orgData?.products_services || '')
      .split(/[,;•\n]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 2)
      .slice(0, 5);

    // Step A: Call generate-intent-prompts to get base prompts
    console.log('Calling generate-intent-prompts...');
    
    const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-intent-prompts`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandId,
        params: { countPerIntent: 5, language: 'en-US' }
      }),
    });

    if (!generateResponse.ok) {
      const error = await generateResponse.text();
      console.error('generate-intent-prompts error:', error);
      throw new Error('Failed to generate base prompts');
    }

    const generateResult = await generateResponse.json();
    if (!generateResult.success) {
      throw new Error(generateResult.error || 'Failed to generate prompts');
    }

    let allPrompts: GeneratedPrompt[] = generateResult.data || [];
    const context = generateResult.context;
    
    console.log(`Received ${allPrompts.length} prompts from generator`);

    // Step B: Normalize and validate
    allPrompts = dedupePrompts(allPrompts);
    allPrompts = allPrompts.map(enforceFunnelMapping);

    // Step C: Initial bucketization
    let buckets = bucketizePrompts(allPrompts);
    let stats = computeStats(buckets, minPerBucket);

    console.log('Initial stats:', stats);

    // Step D: If coverage is missing, try with higher countPerIntent
    if (!stats.coverage_ok) {
      console.log('Coverage insufficient, retrying with countPerIntent=8...');
      
      const retryResponse = await fetch(`${supabaseUrl}/functions/v1/generate-intent-prompts`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          params: { countPerIntent: 8, language: 'en-US' }
        }),
      });

      if (retryResponse.ok) {
        const retryResult = await retryResponse.json();
        if (retryResult.success && retryResult.data) {
          allPrompts = dedupePrompts(retryResult.data);
          allPrompts = allPrompts.map(enforceFunnelMapping);
          buckets = bucketizePrompts(allPrompts);
          stats = computeStats(buckets, minPerBucket);
          console.log('After retry stats:', stats);
        }
      }
    }

    // Step E: Select top prompts per bucket
    const funnelView: FunnelView = {
      TOFU: selectTopFromBucket(buckets.TOFU, minPerBucket, primaryOfferings),
      MOFU: selectTopFromBucket(buckets.MOFU, minPerBucket, primaryOfferings),
      BOFU: selectTopFromBucket(buckets.BOFU, minPerBucket, primaryOfferings),
      stats: {
        counts: {
          TOFU: buckets.TOFU.length,
          MOFU: buckets.MOFU.length,
          BOFO: buckets.BOFU.length,
        },
        coverage_ok: stats.coverage_ok,
        missing: stats.missing,
      },
    };

    // Also group by intent for the alternate view
    const intentView: Record<string, GeneratedPrompt[]> = {};
    for (const p of allPrompts) {
      if (!intentView[p.intent_type]) intentView[p.intent_type] = [];
      intentView[p.intent_type].push(p);
    }

    return new Response(JSON.stringify({
      success: true,
      funnel_view: funnelView,
      intent_view: intentView,
      all_prompts: allPrompts,
      context,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-funnel-prompts:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
