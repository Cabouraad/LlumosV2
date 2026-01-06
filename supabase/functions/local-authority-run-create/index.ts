import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Eligible tiers for Local AI Authority
const ELIGIBLE_TIERS = ['growth', 'pro', 'agency'];

function generateCacheKey(profileId: string, models: string[], promptCount: number): string {
  const today = new Date().toISOString().split('T')[0];
  const modelKey = models.sort().join(',');
  return `${profileId}:${modelKey}:${promptCount}:${today}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription tier
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('subscription_tier, subscribed, payment_collected')
      .eq('user_id', user.id)
      .single();

    if (!subscriber || !subscriber.subscribed || !subscriber.payment_collected) {
      return new Response(
        JSON.stringify({ 
          error: 'subscription_required',
          message: 'An active subscription is required to use Local AI Authority.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tier = subscriber.subscription_tier?.toLowerCase();
    if (!tier || !ELIGIBLE_TIERS.includes(tier)) {
      return new Response(
        JSON.stringify({ 
          error: 'plan_upgrade_required',
          message: `Local AI Authority requires a Growth plan or higher. Your current plan is ${subscriber.subscription_tier || 'free'}.`,
          current_tier: subscriber.subscription_tier,
          required_tier: 'growth',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { profile_id, models_requested, force } = await req.json();
    
    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify profile ownership
    const { data: profile, error: profileError } = await supabase
      .from('local_profiles')
      .select('id, user_id')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active prompt templates count
    const { count: promptCount } = await supabase
      .from('local_prompt_templates')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile_id)
      .eq('active', true);

    if (!promptCount || promptCount === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'no_prompts',
          message: 'No prompt templates found. Generate prompts first.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default models based on tier
    const defaultModels = tier === 'agency' 
      ? ['openai', 'perplexity', 'gemini']
      : tier === 'pro'
        ? ['openai', 'perplexity', 'gemini']
        : ['openai', 'perplexity'];
    
    const models = models_requested && Array.isArray(models_requested) && models_requested.length > 0
      ? models_requested
      : defaultModels;

    // Generate cache key
    const cacheKey = generateCacheKey(profile_id, models, promptCount);

    // Check for cached run (within last 24 hours)
    if (!force) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: cachedRun } = await supabase
        .from('local_authority_runs')
        .select('id, status, finished_at')
        .eq('cache_key', cacheKey)
        .eq('status', 'complete')
        .gte('finished_at', twentyFourHoursAgo)
        .order('finished_at', { ascending: false })
        .limit(1)
        .single();

      if (cachedRun) {
        console.log(`Returning cached run: ${cachedRun.id}`);
        return new Response(
          JSON.stringify({ 
            run_id: cachedRun.id,
            cached: true,
            message: 'Using cached results from previous scan',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create new run
    const { data: newRun, error: runError } = await supabase
      .from('local_authority_runs')
      .insert({
        profile_id,
        user_id: user.id,
        status: 'queued',
        models_used: models,
        cache_key: cacheKey,
      })
      .select('id')
      .single();

    if (runError) {
      console.error('Run create error:', runError);
      throw new Error('Failed to create scan run');
    }

    console.log(`Created new run: ${newRun.id} for profile ${profile_id}`);

    return new Response(
      JSON.stringify({ 
        run_id: newRun.id,
        cached: false,
        models,
        prompt_count: promptCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('local-authority-run-create error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
