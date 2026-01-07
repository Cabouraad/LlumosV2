import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= REASON CODES =============
type ReasonCode =
  | 'high_commercial_intent'
  | 'primary_offering_match'
  | 'secondary_offering_match'
  | 'clear_user_language'
  | 'good_length'
  | 'unique_angle'
  | 'includes_brand_when_helpful'
  | 'competitive_interception'
  | 'local_relevance'
  | 'ambiguous_offering'
  | 'too_generic'
  | 'too_long'
  | 'duplicate_like'
  | 'weak_commercial_intent'
  | 'missing_geo_data';

interface ScoringContext {
  offerings: {
    primary: string[];
    secondary: string[];
    excluded?: string[];
  };
  geo?: {
    scope?: 'local' | 'regional' | 'national' | 'global';
    cities?: string[];
    states?: string[];
  };
  keywords?: string[];
}

interface PromptObject {
  prompt: string;
  intent_type: string;
  funnel_stage: string;
  target_offering?: string;
  needs_geo_variant?: boolean;
  seed_topic?: string;
  why_relevant?: string;
  suggestion_type?: string;
  confidence_score?: number;
  confidence_reasons?: ReasonCode[];
  [key: string]: unknown;
}

// Intent weights
const INTENT_WEIGHTS: Record<string, number> = {
  action: 18,
  local_intent: 16,
  recommendation: 12,
  comparison: 10,
  validation: 6,
  discovery: 2,
};

// Funnel weights
const FUNNEL_WEIGHTS: Record<string, number> = {
  BOFU: 12,
  MOFU: 8,
  TOFU: 2,
};

// Natural phrasing cues
const PHRASING_CUES = ['should i', 'which', 'who', 'best', 'near me', 'vs', 'alternative', 'recommend'];

// Compute Levenshtein distance for similarity check
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function normalizedSimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(s1, s2) / maxLen;
}

function scorePrompt(
  prompt: PromptObject,
  context: ScoringContext,
  allPrompts: PromptObject[],
  currentIndex: number
): { score: number; reasons: ReasonCode[] } {
  let score = 50;
  const reasons: ReasonCode[] = [];
  const promptText = prompt.prompt || '';
  const promptLower = promptText.toLowerCase();
  const len = promptText.length;

  // Intent weights
  const intentWeight = INTENT_WEIGHTS[prompt.intent_type] || 0;
  score += intentWeight;
  if (intentWeight >= 12) {
    reasons.push('high_commercial_intent');
  } else if (intentWeight <= 4) {
    reasons.push('weak_commercial_intent');
  }

  // Funnel weights
  score += FUNNEL_WEIGHTS[prompt.funnel_stage] || 0;

  // Offering match
  const targetOffering = (prompt.target_offering || '').toLowerCase();
  if (targetOffering && targetOffering !== 'general') {
    const primaryMatch = context.offerings.primary.some(o => 
      targetOffering.includes(o.toLowerCase()) || o.toLowerCase().includes(targetOffering)
    );
    const secondaryMatch = context.offerings.secondary.some(o => 
      targetOffering.includes(o.toLowerCase()) || o.toLowerCase().includes(targetOffering)
    );
    
    if (primaryMatch) {
      score += 12;
      reasons.push('primary_offering_match');
    } else if (secondaryMatch) {
      score += 6;
      reasons.push('secondary_offering_match');
    }
  }

  // Excluded offering check
  if (context.offerings.excluded && context.offerings.excluded.length > 0) {
    const hasExcluded = context.offerings.excluded.some(ex => 
      promptLower.includes(ex.toLowerCase())
    );
    if (hasExcluded) {
      score = Math.min(score, 25);
      reasons.push('ambiguous_offering');
    }
  }

  // Length heuristics
  if (len >= 35 && len <= 110) {
    score += 6;
    reasons.push('good_length');
  } else if ((len >= 15 && len < 35) || (len > 110 && len <= 140)) {
    score += 2;
  } else if (len > 140) {
    score -= 10;
    reasons.push('too_long');
  }

  // Natural phrasing cues
  if (PHRASING_CUES.some(cue => promptLower.includes(cue))) {
    score += 4;
    reasons.push('clear_user_language');
  }

  // Generic check
  const offeringKeywords = [...context.offerings.primary, ...context.offerings.secondary]
    .map(k => k.toLowerCase());
  const hasOfferingRef = offeringKeywords.some(k => promptLower.includes(k));
  const hasIntentCue = PHRASING_CUES.some(cue => promptLower.includes(cue));
  
  if (!hasOfferingRef && !hasIntentCue && len < 50) {
    score -= 12;
    reasons.push('too_generic');
  }

  // Competitive/local bonuses
  const suggestionType = prompt.suggestion_type || '';
  if (suggestionType === 'competitive') {
    score += 10;
    reasons.push('competitive_interception');
  }

  if (prompt.intent_type === 'local_intent' || suggestionType === 'local_geo') {
    score += 8;
    reasons.push('local_relevance');
  }

  // Missing geo data penalty
  if (prompt.needs_geo_variant && context.geo) {
    const isLocalRegional = context.geo.scope === 'local' || context.geo.scope === 'regional';
    const hasCities = context.geo.cities && context.geo.cities.length > 0;
    const hasStates = context.geo.states && context.geo.states.length > 0;
    
    if (isLocalRegional && !hasCities && !hasStates) {
      score -= 6;
      reasons.push('missing_geo_data');
    }
  }

  // Dedup penalty - check similarity with previous prompts
  const normalizedCurrent = promptLower.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < currentIndex; i++) {
    const otherPrompt = allPrompts[i]?.prompt || '';
    const normalizedOther = otherPrompt.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (normalizedSimilarity(normalizedCurrent, normalizedOther) > 0.85) {
      score -= 10;
      reasons.push('duplicate_like');
      break;
    }
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, reasons };
}

function scoreAllPrompts(
  prompts: PromptObject[],
  context: ScoringContext,
  suggestionType?: string
): PromptObject[] {
  const scored = prompts.map((p, idx) => {
    const promptWithType = { ...p, suggestion_type: suggestionType || p.suggestion_type };
    const { score, reasons } = scorePrompt(promptWithType, context, prompts, idx);
    return {
      ...p,
      confidence_score: score,
      confidence_reasons: reasons,
    };
  });

  // Sort by confidence_score descending (stable sort)
  scored.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));

  return scored;
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
    let suggestionType: string | null = null;
    
    try {
      const body = await req.json();
      brandId = body?.brandId || body?.domainId || null;
      suggestionType = body?.suggestionType || null;
      console.log('Score prompts request:', { brandId, suggestionType });
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

    // Get org data for context
    const { data: orgData } = await supabase
      .from('organizations')
      .select('products_services, business_city, business_state, localization_config, keywords')
      .eq('id', orgId)
      .single();

    // Build scoring context
    const products = (orgData?.products_services || '')
      .split(/[,;•\n]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 2);

    const context: ScoringContext = {
      offerings: {
        primary: products.slice(0, 5),
        secondary: products.slice(5, 10),
        excluded: [],
      },
      geo: {
        scope: orgData?.business_city ? 'local' : 'global',
        cities: orgData?.business_city ? [orgData.business_city] : [],
        states: orgData?.business_state ? [orgData.business_state] : [],
      },
      keywords: orgData?.keywords || [],
    };

    // Build query for prompt_suggestions
    let query = supabase
      .from('prompt_suggestions')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'ready');

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    if (suggestionType) {
      query = query.eq('suggestion_type', suggestionType);
    }

    const { data: suggestions, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch suggestions: ${fetchError.message}`);
    }

    if (!suggestions || suggestions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No suggestions to score',
        scored: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Scoring ${suggestions.length} suggestion records`);

    let totalScored = 0;

    for (const suggestion of suggestions) {
      const prompts = suggestion.prompts_json as PromptObject[];
      if (!Array.isArray(prompts) || prompts.length === 0) continue;

      const scoredPrompts = scoreAllPrompts(prompts, context, suggestion.suggestion_type);
      
      const { error: updateError } = await supabase
        .from('prompt_suggestions')
        .update({
          prompts_json: scoredPrompts,
          scored_at: new Date().toISOString(),
          scoring_version: 1,
        })
        .eq('id', suggestion.id);

      if (updateError) {
        console.error(`Failed to update suggestion ${suggestion.id}:`, updateError);
        continue;
      }

      totalScored += scoredPrompts.length;
    }

    console.log(`Scored ${totalScored} prompts across ${suggestions.length} suggestion records`);

    return new Response(JSON.stringify({
      success: true,
      scored: totalScored,
      records: suggestions.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in score-prompt-suggestions:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Export scoring function for use by other edge functions
export { scoreAllPrompts, scorePrompt, type ScoringContext, type PromptObject, type ReasonCode };
