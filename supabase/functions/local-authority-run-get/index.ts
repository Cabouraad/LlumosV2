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

    // Load sample results (one per layer)
    const { data: results } = await supabase
      .from('local_authority_results')
      .select('*')
      .eq('run_id', run_id)
      .limit(20);

    // Group results by layer and get one sample each
    const samplesByLayer: Record<string, any> = {};
    if (results) {
      for (const result of results) {
        if (!samplesByLayer[result.layer]) {
          samplesByLayer[result.layer] = {
            layer: result.layer,
            prompt_text: result.prompt_text,
            model: result.model,
            snippet: result.raw_response?.slice(0, 300) + '...',
            citations: result.citations,
          };
        }
      }
    }

    // Calculate top competitors from results
    const competitorCounts: Record<string, number> = {};
    if (results) {
      for (const result of results) {
        const extracted = result.extracted as any;
        if (extracted?.competitor_mentions) {
          for (const comp of extracted.competitor_mentions) {
            competitorCounts[comp.name] = (competitorCounts[comp.name] || 0) + 1;
          }
        }
      }
    }

    const topCompetitors = Object.entries(competitorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        mention_count: count,
        mention_rate: results ? Math.round((count / results.length) * 100) : 0,
      }));

    // Generate highlights
    const highlights: any[] = [];
    
    if (scoreData) {
      const breakdown = scoreData.breakdown as any;
      
      if (breakdown.geo_rate > 0) {
        highlights.push({
          type: 'brand_present',
          text: `Your brand appears in ${breakdown.geo_rate}% of geo-targeted prompts`,
        });
      }
      
      if (breakdown.geo_top3_rate > 0) {
        highlights.push({
          type: 'top_position',
          text: `Ranked in top 3 for ${breakdown.geo_top3_rate}% of geo prompts`,
        });
      }
      
      if (topCompetitors.length > 0) {
        highlights.push({
          type: 'competitor_top',
          text: `Top competitor "${topCompetitors[0].name}" appears in ${topCompetitors[0].mention_rate}% of responses`,
        });
      }
      
      if (breakdown.sov_rate > 0) {
        highlights.push({
          type: 'share_of_voice',
          text: `Your share of voice is ${breakdown.sov_rate}% compared to competitors`,
        });
      }
    }

    // Determine confidence level
    let confidenceLevel: 'high' | 'medium' | 'low' = 'high';
    const confidenceReasons: string[] = [];
    
    if (run.error_count > 0) {
      confidenceLevel = run.error_count > 5 ? 'low' : 'medium';
      confidenceReasons.push(`${run.error_count} API errors during scan`);
    }
    
    if (results && results.length < 10) {
      confidenceLevel = 'low';
      confidenceReasons.push('Limited number of results collected');
    }
    
    if (run.quality_flags?.partial_results) {
      confidenceLevel = confidenceLevel === 'high' ? 'medium' : confidenceLevel;
      confidenceReasons.push('Some prompts returned partial or incomplete data');
    }

    if (confidenceReasons.length === 0) {
      confidenceReasons.push('Full scan completed successfully');
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
          breakdown: scoreData.breakdown,
        } : null,
        highlights,
        top_competitors: topCompetitors,
        sample_responses: Object.values(samplesByLayer),
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
