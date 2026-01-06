import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brand matching utilities
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function extractDomainName(domain: string): string {
  return domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\.(com|net|org|io|co|biz|info|us|uk|ca|au).*$/, '').toLowerCase();
}

function matchesBrand(text: string, config: { business_name: string; domain?: string; brand_synonyms?: string[] }): boolean {
  const normalizedText = normalizeName(text);
  if (normalizedText.includes(normalizeName(config.business_name))) return true;
  if (config.domain) {
    const domainName = extractDomainName(config.domain);
    if (domainName.length > 2 && normalizedText.includes(domainName)) return true;
  }
  if (config.brand_synonyms) {
    for (const synonym of config.brand_synonyms) {
      if (synonym && normalizedText.includes(normalizeName(synonym))) return true;
    }
  }
  return false;
}

// Extract recommendations from AI response
function extractRecommendations(text: string, brandConfig: any): any[] {
  const recommendations: any[] = [];
  const seen = new Set<string>();
  
  const numberedPattern = /(\d+)\.\s*\*?\*?([A-Z][a-zA-Z0-9\s&'.-]+?)(?:\*?\*?)(?:\s*[-–—:](.+?))?(?=\n\d+\.|\n\n|$)/gs;
  let match;
  while ((match = numberedPattern.exec(text)) !== null) {
    const position = parseInt(match[1]);
    const name = match[2].trim();
    const reason = match[3]?.trim();
    const normalizedName = normalizeName(name);
    if (normalizedName.length < 2 || seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    recommendations.push({
      name, reason, position,
      is_brand: matchesBrand(name, brandConfig),
      confidence: 0.8,
    });
  }
  
  if (recommendations.length === 0) {
    const bulletPattern = /[-•]\s*\*?\*?([A-Z][a-zA-Z0-9\s&'.-]+?)(?:\*?\*?)(?:\s*[-–—:](.+?))?(?=\n[-•]|\n\n|$)/gs;
    let position = 1;
    while ((match = bulletPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const normalizedName = normalizeName(name);
      if (normalizedName.length < 2 || seen.has(normalizedName)) continue;
      seen.add(normalizedName);
      recommendations.push({
        name, position: position++,
        is_brand: matchesBrand(name, brandConfig),
        confidence: 0.7,
      });
    }
  }
  return recommendations.slice(0, 15);
}

// Extract competitors
function extractCompetitors(text: string, brandConfig: any, knownCompetitors?: any[]): any[] {
  const competitors: any[] = [];
  const seen = new Set<string>();
  
  if (knownCompetitors) {
    for (const comp of knownCompetitors) {
      if (comp.name && text.toLowerCase().includes(normalizeName(comp.name))) {
        if (!seen.has(normalizeName(comp.name))) {
          seen.add(normalizeName(comp.name));
          competitors.push({ name: comp.name, confidence: 0.9 });
        }
      }
    }
  }
  
  const listPatterns = [
    /\d+\.\s*\*?\*?([A-Z][a-zA-Z0-9\s&'.-]+?)(?:\*?\*?)(?:\s*[-–—:]|\s*\(|$)/gm,
  ];
  for (const pattern of listPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      const normalizedName = normalizeName(name);
      if (normalizedName.length < 3 || matchesBrand(name, brandConfig) || seen.has(normalizedName)) continue;
      seen.add(normalizedName);
      competitors.push({ name, confidence: 0.6 });
    }
  }
  return competitors.slice(0, 10);
}

// Extract places
function extractPlaces(text: string, location: { city: string; state: string; neighborhoods?: string[] }): any[] {
  const places: any[] = [];
  const normalizedText = text.toLowerCase();
  if (normalizedText.includes(location.city.toLowerCase())) {
    places.push({ name: location.city, type: 'city', confidence: 0.9 });
  }
  if (normalizedText.includes(location.state.toLowerCase())) {
    places.push({ name: location.state, type: 'state', confidence: 0.9 });
  }
  if (location.neighborhoods) {
    for (const hood of location.neighborhoods) {
      if (normalizedText.includes(hood.toLowerCase())) {
        places.push({ name: hood, type: 'neighborhood', confidence: 0.8 });
      }
    }
  }
  return places;
}

// Extract brand mentions
function extractBrandMentions(text: string, brandConfig: any): any[] {
  const mentions: any[] = [];
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (matchesBrand(sentence, brandConfig)) {
      mentions.push({ snippet: sentence.trim().slice(0, 200), confidence: 0.8 });
    }
  }
  return mentions.slice(0, 10);
}

// Call AI model
async function callAIModel(model: string, prompt: string): Promise<{ response: string; citations?: any[] }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const modelMap: Record<string, string> = {
    'openai': 'openai/gpt-5-mini',
    'gemini': 'google/gemini-2.5-flash',
    'perplexity': 'google/gemini-2.5-flash', // Use Gemini as fallback
  };

  const aiModel = modelMap[model] || 'google/gemini-2.5-flash';

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful local business recommendation assistant. When asked about local services, provide a numbered list of specific business recommendations with brief explanations. Include business names and reasons for recommendation.' 
        },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI API error (${response.status}):`, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  return { response: content, citations: [] };
}

// Compute scores
function computeScores(inputs: {
  geoPromptCount: number;
  geoWithBrand: number;
  geoTopThree: number;
  implicitPromptCount: number;
  implicitWithBrand: number;
  associationCount: number;
  associationWithLocation: number;
  brandMentions: number;
  competitorMentions: number;
}) {
  const geoRate = inputs.geoPromptCount > 0 ? inputs.geoWithBrand / inputs.geoPromptCount : 0;
  const geoTopRate = inputs.geoPromptCount > 0 ? inputs.geoTopThree / inputs.geoPromptCount : 0;
  const score_geo = Math.round((geoRate * 15) + (geoTopRate * 10));
  
  const implicitRate = inputs.implicitPromptCount > 0 ? inputs.implicitWithBrand / inputs.implicitPromptCount : 0;
  const score_implicit = Math.round(implicitRate * 25);
  
  const associationRate = inputs.associationCount > 0 ? inputs.associationWithLocation / inputs.associationCount : 0;
  const score_association = Math.round(associationRate * 25);
  
  const totalMentions = inputs.brandMentions + inputs.competitorMentions + 1;
  const sovRate = inputs.brandMentions / totalMentions;
  const score_sov = Math.round(sovRate * 25);
  
  return {
    score_total: Math.min(100, score_geo + score_implicit + score_association + score_sov),
    score_geo: Math.min(25, score_geo),
    score_implicit: Math.min(25, score_implicit),
    score_association: Math.min(25, score_association),
    score_sov: Math.min(25, score_sov),
    breakdown: {
      geo_rate: Math.round(geoRate * 100),
      geo_top3_rate: Math.round(geoTopRate * 100),
      implicit_rate: Math.round(implicitRate * 100),
      association_rate: Math.round(associationRate * 100),
      sov_rate: Math.round(sovRate * 100),
      brand_mentions: inputs.brandMentions,
      competitor_mentions: inputs.competitorMentions,
    },
  };
}

// Generate recommendations
function generateRecommendations(scores: any, topCompetitors: string[]): any[] {
  const recommendations: any[] = [];
  
  if (scores.score_geo < 15) {
    recommendations.push({
      priority: 'high', category: 'local_presence',
      title: 'Strengthen Local Presence',
      description: 'Add explicit "serving [city]" language to your About page, Contact page, and footer. Ensure your Google Business Profile is fully optimized.',
    });
  }
  
  if (scores.score_implicit < 15) {
    recommendations.push({
      priority: 'high', category: 'authority',
      title: 'Build Category Authority',
      description: 'Create content that establishes expertise in your category without relying on location keywords. Focus on educational content and case studies.',
    });
  }
  
  if (scores.score_association < 15) {
    recommendations.push({
      priority: 'medium', category: 'citations',
      title: 'Increase Local Citations',
      description: 'Get listed on local directories and ensure NAP consistency across all listings.',
    });
  }
  
  if (scores.score_sov < 15 && topCompetitors.length > 0) {
    recommendations.push({
      priority: 'high', category: 'competitive',
      title: 'Address Competitive Gap',
      description: `Top competitors (${topCompetitors.slice(0, 3).join(', ')}) are appearing more frequently. Analyze their content strategy.`,
    });
  }
  
  return recommendations;
}

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

    // Load run and verify ownership
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

    if (run.status === 'complete') {
      return new Response(
        JSON.stringify({ error: 'Run already completed', run_id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set status to running
    await supabase
      .from('local_authority_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', run_id);

    const profile = run.local_profiles;
    const brandConfig = {
      business_name: profile.business_name,
      domain: profile.domain,
      brand_synonyms: profile.brand_synonyms,
    };

    // Load prompt templates
    const { data: templates } = await supabase
      .from('local_prompt_templates')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('active', true);

    if (!templates || templates.length === 0) {
      await supabase
        .from('local_authority_runs')
        .update({ status: 'failed', error_count: 1, quality_flags: { error: 'No prompt templates' } })
        .eq('id', run_id);
      
      return new Response(
        JSON.stringify({ error: 'No prompt templates found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const models = run.models_used || ['openai', 'gemini'];
    let errorCount = 0;
    const allResults: any[] = [];
    
    // Scoring accumulators
    let geoPromptCount = 0, geoWithBrand = 0, geoTopThree = 0;
    let implicitPromptCount = 0, implicitWithBrand = 0;
    let associationCount = 0, associationWithLocation = 0;
    let totalBrandMentions = 0, totalCompetitorMentions = 0;
    const competitorCounts: Record<string, number> = {};

    console.log(`Executing run ${run_id}: ${templates.length} templates x ${models.length} models`);

    // Process each template with each model
    for (const template of templates) {
      for (const model of models) {
        try {
          const { response, citations } = await callAIModel(model, template.prompt_text);
          
          // Extract structured data
          const recommendations = extractRecommendations(response, brandConfig);
          const competitors = extractCompetitors(response, brandConfig, profile.competitor_overrides);
          const places = extractPlaces(response, profile.primary_location);
          const brandMentions = extractBrandMentions(response, brandConfig);
          
          const extracted = {
            recommendations,
            places,
            brand_mentions: brandMentions,
            competitor_mentions: competitors,
          };

          // Store result
          const { error: insertError } = await supabase
            .from('local_authority_results')
            .insert({
              run_id,
              layer: template.layer,
              prompt_text: template.prompt_text,
              model,
              raw_response: response,
              citations,
              extracted,
            });

          if (insertError) {
            console.error('Result insert error:', insertError);
            errorCount++;
            continue;
          }

          allResults.push({ template, model, recommendations, competitors, places, brandMentions });

          // Update scoring accumulators
          const hasBrandReco = recommendations.some(r => r.is_brand);
          const brandInTopThree = recommendations.filter(r => r.position && r.position <= 3).some(r => r.is_brand);
          const hasLocationMatch = places.length > 0;

          if (template.layer === 'geo_cluster') {
            geoPromptCount++;
            if (hasBrandReco) geoWithBrand++;
            if (brandInTopThree) geoTopThree++;
          } else if (template.layer === 'implicit') {
            implicitPromptCount++;
            if (hasBrandReco || brandMentions.length > 0) implicitWithBrand++;
          }

          associationCount++;
          if (brandMentions.length > 0 && hasLocationMatch) associationWithLocation++;

          totalBrandMentions += brandMentions.length + (hasBrandReco ? 1 : 0);
          
          for (const comp of competitors) {
            totalCompetitorMentions++;
            competitorCounts[comp.name] = (competitorCounts[comp.name] || 0) + 1;
          }

        } catch (err) {
          console.error(`Error processing ${template.layer}/${model}:`, err);
          errorCount++;
        }
      }
    }

    // Compute final scores
    const scores = computeScores({
      geoPromptCount,
      geoWithBrand,
      geoTopThree,
      implicitPromptCount,
      implicitWithBrand,
      associationCount,
      associationWithLocation,
      brandMentions: totalBrandMentions,
      competitorMentions: totalCompetitorMentions,
    });

    // Get top competitors
    const topCompetitors = Object.entries(competitorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Generate recommendations
    const actionRecs = generateRecommendations(scores, topCompetitors);

    // Store scores
    await supabase
      .from('local_authority_scores')
      .insert({
        run_id,
        profile_id: profile.id,
        ...scores,
        recommendations: actionRecs,
      });

    // Update run status
    const qualityFlags = errorCount > 0 ? { error_count: errorCount, partial_results: true } : null;
    
    await supabase
      .from('local_authority_runs')
      .update({
        status: 'complete',
        finished_at: new Date().toISOString(),
        error_count: errorCount,
        quality_flags: qualityFlags,
      })
      .eq('id', run_id);

    console.log(`Run ${run_id} completed. Score: ${scores.score_total}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        run_id,
        status: 'complete',
        scores,
        top_competitors: topCompetitors,
        recommendations: actionRecs,
        results_count: allResults.length,
        error_count: errorCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('local-authority-run-execute error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
