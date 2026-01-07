import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= OPTIMIZATION TYPE ENUM =============
type OptimizationType =
  | 'not_visible'
  | 'weak_visibility'
  | 'competitor_dominant'
  | 'local_gap'
  | 'strong_visibility'
  | 'high_intent_expand'
  | 'monitor_only'
  | 'insufficient_data';

interface PromptObject {
  prompt: string;
  intent_type: string;
  funnel_stage: string;
  target_offering?: string;
  needs_geo_variant?: boolean;
  confidence_score?: number;
  confidence_reasons?: string[];
  optimization_hint?: string;
  optimization_type?: OptimizationType;
  is_monitored?: boolean;
  [key: string]: unknown;
}

interface MonitoringStats {
  prompt_text: string;
  brand_mentions: number;
  competitor_mentions: number;
  total_runs: number;
  mention_rate: number; // 0-1 percentage
}

// ============= OPTIMIZATION HINTS (<=160 chars) =============
const OPTIMIZATION_HINTS: Record<OptimizationType, (ctx?: { confidence?: number }) => string> = {
  // RULE 1 - Not monitored
  high_intent_expand: () => 
    "High-intent prompt. Start monitoring to see if AI models mention your brand.",
  monitor_only: () => 
    "Monitor this prompt to understand how AI answers it today.",
  
  // RULE 2 - Monitored, brand not mentioned
  not_visible: () => 
    "Your brand isn't mentioned in AI answers for this prompt.",
  
  // RULE 3 - Competitors mentioned more
  competitor_dominant: () => 
    "Competitors are mentioned more often than your brand in AI answers.",
  
  // RULE 4 - Local intent with weak geo
  local_gap: () => 
    "Local signals are weak—AI answers lack clear geographic relevance.",
  
  // RULE 5 - Brand mentioned inconsistently
  weak_visibility: () => 
    "Your brand appears inconsistently in AI responses for this prompt.",
  
  // RULE 6 - Strong performance
  strong_visibility: () => 
    "Your brand is consistently referenced in AI answers for this prompt.",
  
  // RULE 7 - Fallback
  insufficient_data: () => 
    "Not enough data yet to assess AI visibility.",
};

/**
 * Deterministic optimization guidance rules - ORDER MATTERS
 * Returns the FIRST matching rule's result
 */
function computeOptimizationGuidance(
  prompt: PromptObject,
  monitoringStats: MonitoringStats | null
): { optimization_type: OptimizationType; optimization_hint: string } {
  const isMonitored = !!monitoringStats;
  const confidenceScore = prompt.confidence_score || 0;
  
  // RULE 1 — No monitoring data exists for this prompt
  if (!isMonitored) {
    if (confidenceScore >= 75) {
      return {
        optimization_type: 'high_intent_expand',
        optimization_hint: OPTIMIZATION_HINTS.high_intent_expand(),
      };
    }
    return {
      optimization_type: 'monitor_only',
      optimization_hint: OPTIMIZATION_HINTS.monitor_only(),
    };
  }

  const { brand_mentions, competitor_mentions, mention_rate } = monitoringStats;

  // RULE 2 — Prompt monitored, brand NOT mentioned
  if (brand_mentions === 0) {
    return {
      optimization_type: 'not_visible',
      optimization_hint: OPTIMIZATION_HINTS.not_visible(),
    };
  }

  // RULE 3 — Brand mentioned, competitors mentioned more
  if (brand_mentions > 0 && competitor_mentions > brand_mentions) {
    return {
      optimization_type: 'competitor_dominant',
      optimization_hint: OPTIMIZATION_HINTS.competitor_dominant(),
    };
  }

  // RULE 4 — Local intent with weak geo signals
  if (prompt.intent_type === 'local_intent' && prompt.needs_geo_variant === true) {
    return {
      optimization_type: 'local_gap',
      optimization_hint: OPTIMIZATION_HINTS.local_gap(),
    };
  }

  // RULE 5 — Brand mentioned inconsistently (<50% of runs)
  if (brand_mentions > 0 && mention_rate < 0.5) {
    return {
      optimization_type: 'weak_visibility',
      optimization_hint: OPTIMIZATION_HINTS.weak_visibility(),
    };
  }

  // RULE 6 — Strong performance (brand mentioned, no competitors)
  if (brand_mentions > 0 && competitor_mentions === 0) {
    return {
      optimization_type: 'strong_visibility',
      optimization_hint: OPTIMIZATION_HINTS.strong_visibility(),
    };
  }

  // RULE 7 — Fallback
  return {
    optimization_type: 'insufficient_data',
    optimization_hint: OPTIMIZATION_HINTS.insufficient_data(),
  };
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
    
    try {
      const body = await req.json();
      brandId = body?.brandId || body?.domainId || null;
      console.log('Generate optimization guidance request:', { brandId });
    } catch {
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
    if (!userData?.org_id) throw new Error('Could not get user organization');

    const orgId = userData.org_id;

    // Build query for prompt_suggestions (only scored ones)
    let query = supabase
      .from('prompt_suggestions')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'ready')
      .not('scored_at', 'is', null);

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data: suggestions, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch suggestions: ${fetchError.message}`);
    }

    if (!suggestions || suggestions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No scored suggestions to add guidance',
        processed: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${suggestions.length} suggestion records for guidance`);

    // Fetch monitoring data for prompts if available
    // Look for responses in prompt_provider_responses table
    const { data: monitoringData } = await supabase
      .from('prompt_provider_responses')
      .select('prompt_id, org_brand_present, competitors_count')
      .eq('org_id', orgId)
      .eq('status', 'success');

    // Build monitoring stats map keyed by prompt text (via prompt_id -> prompts)
    const monitoringStatsMap = new Map<string, MonitoringStats>();
    
    if (monitoringData && monitoringData.length > 0) {
      // Get prompt texts from prompts table
      const promptIds = [...new Set(monitoringData.map(m => m.prompt_id))];
      const { data: promptTexts } = await supabase
        .from('prompts')
        .select('id, text')
        .in('id', promptIds);
      
      const promptTextMap = new Map(promptTexts?.map(p => [p.id, p.text]) || []);
      
      // Aggregate monitoring stats per prompt text
      for (const response of monitoringData) {
        const promptText = promptTextMap.get(response.prompt_id)?.toLowerCase() || '';
        if (!promptText) continue;
        
        const existing = monitoringStatsMap.get(promptText) || {
          prompt_text: promptText,
          brand_mentions: 0,
          competitor_mentions: 0,
          total_runs: 0,
          mention_rate: 0,
        };
        
        existing.total_runs++;
        if (response.org_brand_present) existing.brand_mentions++;
        existing.competitor_mentions += response.competitors_count || 0;
        existing.mention_rate = existing.brand_mentions / existing.total_runs;
        
        monitoringStatsMap.set(promptText, existing);
      }
    }

    console.log(`Found monitoring data for ${monitoringStatsMap.size} unique prompts`);

    let totalProcessed = 0;

    for (const suggestion of suggestions) {
      const prompts = suggestion.prompts_json as PromptObject[];
      if (!Array.isArray(prompts) || prompts.length === 0) continue;

      // Apply guidance to each prompt
      const promptsWithGuidance = prompts.map(prompt => {
        const promptTextLower = (prompt.prompt || '').toLowerCase().trim();
        const monitoringStats = monitoringStatsMap.get(promptTextLower) || null;
        
        const { optimization_type, optimization_hint } = computeOptimizationGuidance(
          { ...prompt, is_monitored: !!monitoringStats },
          monitoringStats
        );
        
        return {
          ...prompt,
          optimization_type,
          optimization_hint,
          is_monitored: !!monitoringStats,
        };
      });

      const { error: updateError } = await supabase
        .from('prompt_suggestions')
        .update({
          prompts_json: promptsWithGuidance,
          guidance_generated_at: new Date().toISOString(),
          guidance_version: 1,
        })
        .eq('id', suggestion.id);

      if (updateError) {
        console.error(`Failed to update suggestion ${suggestion.id}:`, updateError);
        continue;
      }

      totalProcessed += promptsWithGuidance.length;
    }

    console.log(`Added guidance to ${totalProcessed} prompts across ${suggestions.length} records`);

    return new Response(JSON.stringify({
      success: true,
      processed: totalProcessed,
      records: suggestions.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-optimization-guidance:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
