import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { run_id } = await req.json();
    
    if (!run_id) {
      return new Response(
        JSON.stringify({ error: 'run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load run with profile
    const { data: run, error: runError } = await supabase
      .from('local_authority_runs')
      .select('*, local_profiles(*)')
      .eq('id', run_id)
      .eq('user_id', user.id)
      .single();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Run not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load scores
    const { data: scoreData } = await supabase
      .from('local_authority_scores')
      .select('*')
      .eq('run_id', run_id)
      .single();

    // Load sample results (get a variety across layers)
    const { data: results } = await supabase
      .from('local_authority_results')
      .select('*')
      .eq('run_id', run_id)
      .limit(50);

    // Get sample responses (one per layer, preferring different models)
    const samplesByLayer: Record<string, any> = {};
    const samplesArray: any[] = [];
    if (results) {
      for (const result of results) {
        const key = `${result.layer}-${result.model}`;
        if (!samplesByLayer[result.layer] || !samplesByLayer[key]) {
          samplesByLayer[result.layer] = true;
          samplesByLayer[key] = true;
          samplesArray.push({
            layer: result.layer,
            prompt_text: result.prompt_text,
            model: result.model,
            snippet: result.raw_response?.slice(0, 400) + (result.raw_response?.length > 400 ? '...' : ''),
            citations: result.citations,
          });
        }
      }
    }

    // Get breakdown data
    const breakdown = scoreData?.breakdown as any || {};
    
    // Top competitors from breakdown
    const topCompetitors = (breakdown.top_competitors || []).map((c: any) => ({
      name: c.name,
      mention_count: c.mentions,
      mention_rate: results && results.length > 0 
        ? Math.round((c.mentions / results.length) * 100) 
        : 0,
    }));

    // Generate highlights based on exact breakdown data
    const highlights: any[] = [];
    
    if (breakdown.geo_presence_rate !== undefined) {
      if (breakdown.geo_presence_rate > 0) {
        highlights.push({
          type: 'brand_present',
          text: `Your brand appears in ${breakdown.geo_presence_rate}% of geo-targeted prompts`,
          value: breakdown.geo_presence_rate,
        });
      } else {
        highlights.push({
          type: 'brand_absent',
          text: 'Your brand is not appearing in geo-targeted AI responses',
          value: 0,
        });
      }
    }
    
    if (breakdown.geo_top3_rate > 0) {
      highlights.push({
        type: 'top_position',
        text: `Ranked in top 3 for ${breakdown.geo_top3_rate}% of geo prompts`,
        value: breakdown.geo_top3_rate,
      });
    }
    
    if (breakdown.implicit_rate !== undefined) {
      highlights.push({
        type: 'implicit_recall',
        text: `AI recalls your brand in ${breakdown.implicit_rate}% of implicit (non-local) queries`,
        value: breakdown.implicit_rate,
      });
    }
    
    if (topCompetitors.length > 0) {
      highlights.push({
        type: 'competitor_top',
        text: `Top competitor "${topCompetitors[0].name}" appears in ${topCompetitors[0].mention_rate}% of responses`,
        value: topCompetitors[0].mention_rate,
      });
    }
    
    if (breakdown.sov_rate !== undefined) {
      highlights.push({
        type: 'share_of_voice',
        text: `Your share of voice is ${breakdown.sov_rate}% compared to competitors`,
        value: breakdown.sov_rate,
      });
    }
    
    if (breakdown.assoc_rate !== undefined && breakdown.assoc_rate > 0) {
      highlights.push({
        type: 'association',
        text: `AI associates your brand with your location in ${breakdown.assoc_rate}% of responses`,
        value: breakdown.assoc_rate,
      });
    }

    // Compute confidence level based on exact rules
    const qualityFlags = run.quality_flags as any || {};
    let confidenceLevel: 'high' | 'medium' | 'low' = 'high';
    const confidenceReasons: string[] = [];
    
    const coverage = (breakdown.coverage || 100) / 100;
    
    // Coverage checks
    if (coverage < 0.70) {
      confidenceLevel = 'low';
      confidenceReasons.push(`Only ${Math.round(coverage * 100)}% of prompts completed successfully (below 70% threshold)`);
    } else if (coverage < 0.85) {
      confidenceLevel = 'medium';
      confidenceReasons.push(`${Math.round(coverage * 100)}% prompt completion (below 85% threshold)`);
    }
    
    // Error count checks
    if (run.error_count >= 3) {
      if (confidenceLevel === 'high') confidenceLevel = 'medium';
      else if (confidenceLevel === 'medium') confidenceLevel = 'low';
      confidenceReasons.push(`${run.error_count} API errors occurred during scan`);
    }
    
    // List detection quality
    if (qualityFlags.list_detection_low > 0) {
      const totalTemplates = results?.length || 1;
      if (qualityFlags.list_detection_low > totalTemplates * 0.3) {
        if (confidenceLevel === 'high') confidenceLevel = 'medium';
        else if (confidenceLevel === 'medium') confidenceLevel = 'low';
        confidenceReasons.push('Low confidence in recommendation list extraction');
      }
    }
    
    if (confidenceReasons.length === 0) {
      confidenceReasons.push('Full scan completed successfully with high data quality');
    }

    // Score threshold labels for UI
    function getScoreLabel(score: number): 'Low' | 'Medium' | 'High' {
      if (score <= 8) return 'Low';
      if (score <= 17) return 'Medium';
      return 'High';
    }

    const profile = run.local_profiles;

    return new Response(
      JSON.stringify({
        profile: {
          id: profile.id,
          business_name: profile.business_name,
          domain: profile.domain,
          primary_location: profile.primary_location,
          categories: profile.categories,
        },
        run: {
          id: run.id,
          status: run.status,
          started_at: run.started_at,
          finished_at: run.finished_at,
          models_used: run.models_used,
          error_count: run.error_count,
        },
        score: scoreData ? {
          total: scoreData.score_total,
          geo: scoreData.score_geo,
          implicit: scoreData.score_implicit,
          association: scoreData.score_association,
          sov: scoreData.score_sov,
          labels: {
            geo: getScoreLabel(scoreData.score_geo),
            implicit: getScoreLabel(scoreData.score_implicit),
            association: getScoreLabel(scoreData.score_association),
            sov: getScoreLabel(scoreData.score_sov),
          },
          breakdown: scoreData.breakdown,
        } : null,
        highlights,
        top_competitors: topCompetitors,
        winning_intents: breakdown.winning_intents || [],
        losing_intents: breakdown.losing_intents || [],
        sample_responses: samplesArray.slice(0, 5),
        recommendations: scoreData?.recommendations || [],
        confidence: {
          level: confidenceLevel,
          reasons: confidenceReasons,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('local-authority-run-get error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
