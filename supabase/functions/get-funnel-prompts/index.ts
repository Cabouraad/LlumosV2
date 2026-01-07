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
  competitor_name?: string;
  geo_target?: string;
  source?: 'core' | 'competitive' | 'local';
}

interface FunnelParams {
  minPerBucket?: number;
  totalDefault?: number;
  includeCompetitive?: boolean;
  includeLocal?: boolean;
}

interface FunnelStats {
  counts: { TOFU: number; MOFU: number; BOFO: number };
  coverage_ok: boolean;
  missing: { TOFU: number; MOFU: number; BOFU: number };
  local_merged?: number;
  competitive_merged?: number;
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
  local_intent: 'BOFU',
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

function normalizePrompt(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

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

function enforceFunnelMapping(prompt: GeneratedPrompt): GeneratedPrompt {
  let expectedFunnel = INTENT_TO_FUNNEL[prompt.intent_type];
  
  if (prompt.intent_type === 'local_intent' && isInformationalLocal(prompt.prompt)) {
    expectedFunnel = 'MOFU';
  }
  
  if (prompt.funnel_stage !== expectedFunnel) {
    return { ...prompt, funnel_stage: expectedFunnel };
  }
  
  return prompt;
}

function bucketizePrompts(prompts: GeneratedPrompt[]): { TOFU: GeneratedPrompt[]; MOFU: GeneratedPrompt[]; BOFU: GeneratedPrompt[] } {
  const buckets = { TOFU: [] as GeneratedPrompt[], MOFU: [] as GeneratedPrompt[], BOFU: [] as GeneratedPrompt[] };
  for (const p of prompts) {
    buckets[p.funnel_stage].push(p);
  }
  return buckets;
}

function scorePrompt(prompt: GeneratedPrompt, primaryOfferings: string[]): number {
  let score = 0;
  
  score += COMMERCIAL_PRIORITY[prompt.intent_type] || 0;
  
  if (primaryOfferings.includes(prompt.target_offering)) {
    score += 2;
  } else if (prompt.target_offering !== 'general') {
    score += 1;
  }
  
  const len = prompt.prompt.length;
  if (len >= 35 && len <= 110) {
    score += 1;
  } else if (len > 110) {
    score -= 0.5;
  }
  
  return score;
}

function selectTopFromBucket(bucket: GeneratedPrompt[], n: number, primaryOfferings: string[]): GeneratedPrompt[] {
  return [...bucket]
    .map(p => ({ prompt: p, score: scorePrompt(p, primaryOfferings) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(x => x.prompt);
}

function computeStats(buckets: { TOFU: GeneratedPrompt[]; MOFU: GeneratedPrompt[]; BOFU: GeneratedPrompt[] }, minPerBucket: number, competitiveMerged = 0): FunnelStats {
  const counts = {
    TOFU: buckets.TOFU.length,
    MOFU: buckets.MOFU.length,
    BOFO: buckets.BOFU.length,
  };
  
  const missing = {
    TOFU: Math.max(0, minPerBucket - buckets.TOFU.length),
    MOFU: Math.max(0, minPerBucket - buckets.MOFU.length),
    BOFU: Math.max(0, minPerBucket - buckets.BOFU.length),
  };
  
  const coverage_ok = missing.TOFU === 0 && missing.MOFU === 0 && missing.BOFU === 0;
  
  return { counts, coverage_ok, missing, competitive_merged: competitiveMerged, local_merged: 0 };
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
    let params: FunnelParams = { minPerBucket: 5, totalDefault: 15, includeCompetitive: false, includeLocal: false };
    
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

    let allPrompts: GeneratedPrompt[] = (generateResult.data || []).map((p: GeneratedPrompt) => ({
      ...p,
      source: 'core' as const
    }));
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
          allPrompts = dedupePrompts(retryResult.data.map((p: GeneratedPrompt) => ({
            ...p,
            source: 'core' as const
          })));
          allPrompts = allPrompts.map(enforceFunnelMapping);
          buckets = bucketizePrompts(allPrompts);
          stats = computeStats(buckets, minPerBucket);
          console.log('After retry stats:', stats);
        }
      }
    }

    // Step E: Optionally merge competitive prompts
    let competitiveMerged = 0;
    if (params.includeCompetitive) {
      console.log('Fetching competitive prompts for merge...');
      
      // Fetch cached competitive prompts from database
      const { data: competitiveRow } = await supabase
        .from('prompt_suggestions')
        .select('prompts_json')
        .eq('org_id', orgId)
        .eq('suggestion_type', 'competitive')
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (competitiveRow && Array.isArray(competitiveRow.prompts_json)) {
        const competitivePrompts: GeneratedPrompt[] = (competitiveRow.prompts_json as GeneratedPrompt[]).map(p => ({
          ...p,
          source: 'competitive' as const
        }));
        
        console.log(`Found ${competitivePrompts.length} competitive prompts to merge`);
        
        // Add to appropriate buckets based on funnel_stage
        for (const p of competitivePrompts) {
          const stage = p.funnel_stage || 'MOFU';
          if (buckets[stage]) {
            buckets[stage].push(p);
            competitiveMerged++;
          }
        }
        
        // Dedupe across merged sets
        buckets.TOFU = dedupePrompts(buckets.TOFU);
        buckets.MOFU = dedupePrompts(buckets.MOFU);
        buckets.BOFU = dedupePrompts(buckets.BOFU);
        
        // Recombine for allPrompts
        allPrompts = [...buckets.TOFU, ...buckets.MOFU, ...buckets.BOFU];
      }
    }

    // Step E2: Optionally merge local geo prompts
    let localMerged = 0;
    if (params.includeLocal) {
      console.log('Fetching local geo prompts for merge...');
      
      // Fetch cached local geo prompts from database
      const { data: localRow } = await supabase
        .from('prompt_suggestions')
        .select('prompts_json')
        .eq('org_id', orgId)
        .eq('suggestion_type', 'local_geo')
        .in('status', ['ready', 'partial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (localRow && Array.isArray(localRow.prompts_json)) {
        const localPrompts: GeneratedPrompt[] = (localRow.prompts_json as GeneratedPrompt[]).map(p => ({
          ...p,
          source: 'local' as const
        }));
        
        console.log(`Found ${localPrompts.length} local geo prompts to merge`);
        
        // Add to appropriate buckets based on funnel_stage (mostly BOFU, some MOFU)
        for (const p of localPrompts) {
          const stage = p.funnel_stage || 'BOFU';
          if (buckets[stage]) {
            buckets[stage].push(p);
            localMerged++;
          }
        }
        
        // Dedupe across merged sets
        buckets.TOFU = dedupePrompts(buckets.TOFU);
        buckets.MOFU = dedupePrompts(buckets.MOFU);
        buckets.BOFU = dedupePrompts(buckets.BOFU);
        
        // Recombine for allPrompts
        allPrompts = [...buckets.TOFU, ...buckets.MOFU, ...buckets.BOFU];
      }
    }

    // Recompute stats after potential merge
    stats = computeStats(buckets, minPerBucket, competitiveMerged);
    stats.local_merged = localMerged;

    // Step F: Select top prompts per bucket
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
        competitive_merged: competitiveMerged,
        local_merged: localMerged,
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
