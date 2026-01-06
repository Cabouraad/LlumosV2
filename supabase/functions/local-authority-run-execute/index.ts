import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// BRAND MATCHING UTILITIES
// ============================================

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function extractDomainName(domain: string): string {
  return domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\.(com|net|org|io|co|biz|info|us|uk|ca|au).*$/, '').toLowerCase();
}

interface BrandConfig {
  business_name: string;
  domain?: string;
  brand_synonyms?: string[];
}

function matchesBrand(text: string, config: BrandConfig): boolean {
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

// ============================================
// EXTRACTION UTILITIES
// ============================================

interface ExtractedRecommendation {
  name: string;
  reason?: string;
  position?: number;
  is_brand: boolean;
  confidence: number;
}

function extractRecommendations(text: string, brandConfig: BrandConfig): ExtractedRecommendation[] {
  const recommendations: ExtractedRecommendation[] = [];
  const seen = new Set<string>();
  
  // Numbered list pattern
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
  
  // Bullet pattern fallback
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

interface CompetitorMention {
  name: string;
  confidence: number;
}

function extractCompetitors(text: string, brandConfig: BrandConfig, knownCompetitors?: any[]): CompetitorMention[] {
  const competitors: CompetitorMention[] = [];
  const seen = new Set<string>();
  
  // Check known competitors first
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
  
  // Extract from lists
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

interface ExtractedPlace {
  name: string;
  type: string;
  confidence: number;
}

function extractPlaces(text: string, location: { city: string; state: string; neighborhoods?: string[] }): ExtractedPlace[] {
  const places: ExtractedPlace[] = [];
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

interface BrandMention {
  snippet: string;
  confidence: number;
}

function extractBrandMentions(text: string, brandConfig: BrandConfig): BrandMention[] {
  const mentions: BrandMention[] = [];
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (matchesBrand(sentence, brandConfig)) {
      mentions.push({ snippet: sentence.trim().slice(0, 200), confidence: 0.8 });
    }
  }
  return mentions.slice(0, 10);
}

// Check for strong association language
function hasStrongAssociationLanguage(text: string, city: string, state: string): boolean {
  const normalizedText = text.toLowerCase();
  const cityLower = city.toLowerCase();
  const stateLower = state.toLowerCase();
  
  const patterns = [
    `based in ${cityLower}`,
    `serving ${cityLower}`,
    `located in ${cityLower}`,
    `${cityLower} area`,
    `${cityLower}, ${stateLower}`,
    `serves ${cityLower}`,
    `headquartered in ${cityLower}`,
  ];
  
  return patterns.some(p => normalizedText.includes(p));
}

// ============================================
// AI MODEL CALLING
// ============================================

async function callAIModel(model: string, prompt: string): Promise<{ response: string; citations?: any[] }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const modelMap: Record<string, string> = {
    'openai': 'openai/gpt-5-mini',
    'gemini': 'google/gemini-2.5-flash',
    'perplexity': 'google/gemini-2.5-flash',
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

// ============================================
// SCORING COMPUTATION (EXACT WEIGHTS)
// ============================================

interface ScoreInputs {
  // Geo prompts (geo_cluster + radius_neighborhood)
  geoPromptCount: number;
  geoWithBrand: number;
  geoTopThree: number;
  
  // Implicit prompts only
  implicitPromptCount: number;
  implicitWithBrand: number;
  implicitWithCompetitorNotBrand: number;
  
  // Association (all prompts)
  totalPromptCount: number;
  coOccurrenceCount: number;
  strongAssocCount: number;
  
  // SOV
  brandMentionPrompts: number;
  competitorMentionPrompts: number;
  brandTop3RateOverall: number;
  brandNeverInGeoCluster: boolean;
  
  // Coverage
  successfulCalls: number;
  totalCalls: number;
}

interface IntentStats {
  intent_tag: string;
  total: number;
  brand_hits: number;
  competitor_hits: number;
  brand_hit_rate: number;
  competitor_hit_rate: number;
}

interface ComputedScores {
  score_total: number;
  score_geo: number;
  score_implicit: number;
  score_association: number;
  score_sov: number;
  breakdown: {
    geo_presence_rate: number;
    geo_top3_rate: number;
    implicit_rate: number;
    implicit_competitor_penalty: number;
    assoc_rate: number;
    strong_assoc_rate: number;
    sov_rate: number;
    brand_mentions: number;
    competitor_mentions: number;
    coverage: number;
    top_competitors: { name: string; mentions: number }[];
    winning_intents: IntentStats[];
    losing_intents: IntentStats[];
  };
}

function computeScores(inputs: ScoreInputs, competitorCounts: Record<string, number>, intentStats: IntentStats[]): ComputedScores {
  const coverage = inputs.totalCalls > 0 ? inputs.successfulCalls / inputs.totalCalls : 0;
  
  // ============================================
  // (1) GEO PRESENCE SCORE (0-25)
  // geo_score_raw = 25 * (0.70 * geo_presence_rate + 0.30 * geo_top3_rate)
  // ============================================
  const geoPresenceRate = inputs.geoPromptCount > 0 ? inputs.geoWithBrand / inputs.geoPromptCount : 0;
  const geoTop3Rate = inputs.geoPromptCount > 0 ? inputs.geoTopThree / inputs.geoPromptCount : 0;
  const geoScoreRaw = 25 * (0.70 * geoPresenceRate + 0.30 * geoTop3Rate);
  const score_geo = Math.min(25, Math.max(0, Math.round(geoScoreRaw)));
  
  // ============================================
  // (2) IMPLICIT RECALL SCORE (0-25)
  // implicit_score_raw = 25 * (implicit_rate - 0.50 * implicit_competitor_penalty)
  // ============================================
  const implicitRate = inputs.implicitPromptCount > 0 ? inputs.implicitWithBrand / inputs.implicitPromptCount : 0;
  const implicitCompetitorPenalty = inputs.implicitPromptCount > 0 
    ? inputs.implicitWithCompetitorNotBrand / inputs.implicitPromptCount 
    : 0;
  const implicitScoreRaw = 25 * (implicitRate - 0.50 * implicitCompetitorPenalty);
  const score_implicit = Math.min(25, Math.max(0, Math.round(implicitScoreRaw)));
  
  // ============================================
  // (3) ENTITY ASSOCIATION SCORE (0-25)
  // assoc_score_raw = 25 * (0.80 * assoc_rate + 0.20 * strong_assoc_bonus_rate)
  // ============================================
  const assocRate = inputs.totalPromptCount > 0 ? inputs.coOccurrenceCount / inputs.totalPromptCount : 0;
  const strongAssocRate = inputs.totalPromptCount > 0 ? inputs.strongAssocCount / inputs.totalPromptCount : 0;
  const assocScoreRaw = 25 * (0.80 * assocRate + 0.20 * strongAssocRate);
  const score_association = Math.min(25, Math.max(0, Math.round(assocScoreRaw)));
  
  // ============================================
  // (4) COMPETITIVE SHARE OF VOICE (0-25)
  // sov = brand_mentions / (brand_mentions + competitor_mentions + 1)
  // sov_score_raw = round(25 * sov)
  // Dominance bonus: +2 if brandTop3RateOverall >= 0.50, -3 if brand never in geo_cluster
  // ============================================
  const sov = inputs.brandMentionPrompts / (inputs.brandMentionPrompts + inputs.competitorMentionPrompts + 1);
  let sovScoreRaw = Math.round(25 * sov);
  
  // Dominance bonus/penalty
  if (inputs.brandTop3RateOverall >= 0.50) {
    sovScoreRaw += 2;
  }
  if (inputs.brandNeverInGeoCluster) {
    sovScoreRaw -= 3;
  }
  const score_sov = Math.min(25, Math.max(0, sovScoreRaw));
  
  // ============================================
  // TOTAL SCORE with coverage cap
  // ============================================
  let score_total = score_geo + score_implicit + score_association + score_sov;
  
  if (coverage < 0.5) {
    score_total = Math.min(score_total, 50);
  } else if (coverage < 0.7) {
    score_total = Math.min(score_total, 70);
  }
  
  // Top competitors
  const topCompetitors = Object.entries(competitorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, mentions]) => ({ name, mentions }));
  
  // Winning/losing intents
  const winningIntents = intentStats
    .filter(s => s.brand_hit_rate > s.competitor_hit_rate)
    .sort((a, b) => b.brand_hit_rate - a.brand_hit_rate);
  const losingIntents = intentStats
    .filter(s => s.competitor_hit_rate > s.brand_hit_rate)
    .sort((a, b) => b.competitor_hit_rate - a.competitor_hit_rate);
  
  return {
    score_total,
    score_geo,
    score_implicit,
    score_association,
    score_sov,
    breakdown: {
      geo_presence_rate: Math.round(geoPresenceRate * 100),
      geo_top3_rate: Math.round(geoTop3Rate * 100),
      implicit_rate: Math.round(implicitRate * 100),
      implicit_competitor_penalty: Math.round(implicitCompetitorPenalty * 100),
      assoc_rate: Math.round(assocRate * 100),
      strong_assoc_rate: Math.round(strongAssocRate * 100),
      sov_rate: Math.round(sov * 100),
      brand_mentions: inputs.brandMentionPrompts,
      competitor_mentions: inputs.competitorMentionPrompts,
      coverage: Math.round(coverage * 100),
      top_competitors: topCompetitors,
      winning_intents: winningIntents,
      losing_intents: losingIntents,
    },
  };
}

// ============================================
// ACTION PLAN GENERATION (6-10 actions)
// ============================================

interface ActionRecommendation {
  bucket: string;
  title: string;
  why: string;
  how: string;
  difficulty: 'easy' | 'med' | 'hard';
  impact: 'low' | 'med' | 'high';
}

function generateRecommendations(scores: ComputedScores, profile: any): ActionRecommendation[] {
  const recommendations: ActionRecommendation[] = [];
  const city = profile?.primary_location?.city || 'your city';
  const state = profile?.primary_location?.state || 'your state';
  
  // If score_association <= 12: entity-place coupling actions
  if (scores.score_association <= 12) {
    recommendations.push({
      bucket: 'on_site',
      title: `Add "Serving ${city}" Language`,
      why: 'AI models need explicit location signals to associate your brand with your service area.',
      how: `Add "Serving ${city}, ${state}" language to your homepage hero, About page, Contact page, and footer.`,
      difficulty: 'easy',
      impact: 'high',
    });
    recommendations.push({
      bucket: 'on_site',
      title: 'Implement Local Schema Markup',
      why: 'Structured data helps AI understand your business location and service area.',
      how: 'Add LocalBusiness schema with your NAP (Name, Address, Phone) and embed a Google Map on your contact page.',
      difficulty: 'med',
      impact: 'med',
    });
    recommendations.push({
      bucket: 'citations',
      title: 'Ensure NAP Consistency',
      why: 'Inconsistent business information across directories confuses AI models.',
      how: 'Audit your listings on Google, Yelp, BBB, and industry directories for consistent Name, Address, Phone.',
      difficulty: 'med',
      impact: 'high',
    });
  }
  
  // If score_implicit <= 12: authority narrative actions
  if (scores.score_implicit <= 12) {
    recommendations.push({
      bucket: 'content',
      title: 'Create Category Authority Content',
      why: 'AI recommends brands it perceives as category experts, even without location keywords.',
      how: 'Publish educational articles, how-to guides, and case studies that demonstrate expertise in your category.',
      difficulty: 'med',
      impact: 'high',
    });
    recommendations.push({
      bucket: 'content',
      title: 'Build FAQ Pages',
      why: 'Comprehensive FAQs signal expertise and help AI understand your service offerings.',
      how: 'Create an FAQ page answering common customer questions about your category and services.',
      difficulty: 'easy',
      impact: 'med',
    });
  }
  
  // If score_sov <= 12: competitor gap analysis
  if (scores.score_sov <= 12 && scores.breakdown.top_competitors.length > 0) {
    const topComps = scores.breakdown.top_competitors.slice(0, 3).map(c => c.name).join(', ');
    recommendations.push({
      bucket: 'competitive',
      title: 'Analyze Top Competitors',
      why: `Competitors (${topComps}) are appearing more frequently in AI recommendations.`,
      how: 'Research their online presence, content strategy, and reviews. Identify what makes them stand out.',
      difficulty: 'med',
      impact: 'high',
    });
    
    if (scores.breakdown.losing_intents.length > 0) {
      const losingIntent = scores.breakdown.losing_intents[0].intent_tag;
      recommendations.push({
        bucket: 'content',
        title: `Target "${losingIntent}" Queries`,
        why: `Competitors are winning in "${losingIntent}" intent queries.`,
        how: `Create content specifically addressing "${losingIntent}" queries with your brand as the answer.`,
        difficulty: 'med',
        impact: 'med',
      });
    }
  }
  
  // If score_geo <= 12: local landing page actions
  if (scores.score_geo <= 12) {
    recommendations.push({
      bucket: 'on_site',
      title: 'Create Location-Specific Landing Pages',
      why: 'Dedicated pages for your service areas help AI associate your brand with those locations.',
      how: 'Create pages like "[Service] in [City]" with unique, valuable content (not just keyword stuffing).',
      difficulty: 'med',
      impact: 'high',
    });
    recommendations.push({
      bucket: 'citations',
      title: 'Strengthen Local Directory Presence',
      why: 'Citations from local directories reinforce your geographic relevance.',
      how: 'Claim and optimize profiles on local business directories, chambers of commerce, and industry associations.',
      difficulty: 'easy',
      impact: 'med',
    });
  }
  
  // General improvements if total is low
  if (scores.score_total < 50 && recommendations.length < 6) {
    recommendations.push({
      bucket: 'on_site',
      title: 'Optimize Google Business Profile',
      why: 'GBP is a primary source for local business information used by AI models.',
      how: 'Complete all GBP fields, add photos, respond to reviews, and post regular updates.',
      difficulty: 'easy',
      impact: 'high',
    });
  }
  
  // Return 6-10 actions
  return recommendations.slice(0, 10);
}

// ============================================
// CONFIDENCE METER
// ============================================

interface ConfidenceResult {
  level: 'high' | 'medium' | 'low';
  reasons: string[];
}

function computeConfidence(
  coverage: number,
  errorCount: number,
  listDetectionLowCount: number,
  totalPrompts: number
): ConfidenceResult {
  let level: 'high' | 'medium' | 'low' = 'high';
  const reasons: string[] = [];
  
  // Coverage checks
  if (coverage < 0.70) {
    level = 'low';
    reasons.push(`Only ${Math.round(coverage * 100)}% of prompts completed successfully (below 70% threshold)`);
  } else if (coverage < 0.85) {
    level = 'medium';
    reasons.push(`${Math.round(coverage * 100)}% prompt completion (below 85% threshold)`);
  }
  
  // Error count checks
  if (errorCount >= 3) {
    if (level === 'high') level = 'medium';
    else if (level === 'medium') level = 'low';
    reasons.push(`${errorCount} API errors occurred during scan`);
  }
  
  // List detection quality
  if (listDetectionLowCount > totalPrompts * 0.3) {
    if (level === 'high') level = 'medium';
    else if (level === 'medium') level = 'low';
    reasons.push('Low confidence in recommendation list extraction');
  }
  
  if (reasons.length === 0) {
    reasons.push('Full scan completed successfully with high data quality');
  }
  
  return { level, reasons };
}

// ============================================
// MAIN HANDLER
// ============================================

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
    const brandConfig: BrandConfig = {
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
    let listDetectionLowCount = 0;
    const competitorCounts: Record<string, number> = {};
    const intentStatsMap: Record<string, { total: number; brand_hits: number; competitor_hits: number }> = {};
    
    // Scoring accumulators
    let geoPromptCount = 0, geoWithBrand = 0, geoTopThree = 0;
    let implicitPromptCount = 0, implicitWithBrand = 0, implicitWithCompetitorNotBrand = 0;
    let totalPromptCount = 0, coOccurrenceCount = 0, strongAssocCount = 0;
    let brandMentionPrompts = 0, competitorMentionPrompts = 0;
    let totalBrandTop3 = 0, totalPromptForTop3 = 0;
    let brandInGeoCluster = false;
    
    const totalCalls = templates.length * models.length;
    let successfulCalls = 0;

    console.log(`Executing run ${run_id}: ${templates.length} templates x ${models.length} models`);

    // Process each template with each model
    for (const template of templates) {
      const isGeoPrompt = template.layer === 'geo_cluster' || template.layer === 'radius_neighborhood';
      const isImplicitPrompt = template.layer === 'implicit';
      const intentTag = template.intent_tag || 'unknown';
      
      // Initialize intent stats
      if (!intentStatsMap[intentTag]) {
        intentStatsMap[intentTag] = { total: 0, brand_hits: 0, competitor_hits: 0 };
      }
      
      for (const model of models) {
        try {
          const { response, citations } = await callAIModel(model, template.prompt_text);
          successfulCalls++;
          
          // Extract structured data
          const recommendations = extractRecommendations(response, brandConfig);
          const competitors = extractCompetitors(response, brandConfig, profile.competitor_overrides);
          const places = extractPlaces(response, profile.primary_location);
          const brandMentions = extractBrandMentions(response, brandConfig);
          
          // Check extraction quality
          if (recommendations.length === 0 && response.length > 100) {
            listDetectionLowCount++;
          }
          
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

          // Update scoring accumulators
          const hasBrandReco = recommendations.some(r => r.is_brand);
          const brandInTopThree = recommendations.filter(r => r.position && r.position <= 3).some(r => r.is_brand);
          const hasLocationMatch = places.length > 0;
          const hasBrandMention = brandMentions.length > 0;
          const hasCompetitors = competitors.length > 0;
          const hasStrongAssoc = hasBrandMention && hasStrongAssociationLanguage(response, profile.primary_location.city, profile.primary_location.state);

          totalPromptCount++;
          totalPromptForTop3++;
          if (brandInTopThree) totalBrandTop3++;
          
          // Intent stats
          intentStatsMap[intentTag].total++;
          if (hasBrandReco || hasBrandMention) {
            intentStatsMap[intentTag].brand_hits++;
          }
          if (hasCompetitors) {
            intentStatsMap[intentTag].competitor_hits++;
          }

          // Geo scoring
          if (isGeoPrompt) {
            geoPromptCount++;
            if (hasBrandReco || hasBrandMention) {
              geoWithBrand++;
              if (template.layer === 'geo_cluster') brandInGeoCluster = true;
            }
            if (brandInTopThree) geoTopThree++;
          }
          
          // Implicit scoring
          if (isImplicitPrompt) {
            implicitPromptCount++;
            if (hasBrandReco || hasBrandMention) implicitWithBrand++;
            if (hasCompetitors && !hasBrandReco && !hasBrandMention) {
              implicitWithCompetitorNotBrand++;
            }
          }
          
          // Association scoring
          if ((hasBrandMention || hasBrandReco) && hasLocationMatch) {
            coOccurrenceCount++;
          }
          if (hasStrongAssoc) {
            strongAssocCount++;
          }
          
          // SOV scoring
          if (hasBrandReco || hasBrandMention) brandMentionPrompts++;
          if (hasCompetitors) competitorMentionPrompts++;
          
          // Competitor tracking
          for (const comp of competitors) {
            competitorCounts[comp.name] = (competitorCounts[comp.name] || 0) + 1;
          }

        } catch (err) {
          console.error(`Error processing ${template.layer}/${model}:`, err);
          errorCount++;
        }
      }
    }

    // Build intent stats array
    const intentStats: IntentStats[] = Object.entries(intentStatsMap).map(([tag, stats]) => ({
      intent_tag: tag,
      total: stats.total,
      brand_hits: stats.brand_hits,
      competitor_hits: stats.competitor_hits,
      brand_hit_rate: stats.total > 0 ? Math.round((stats.brand_hits / stats.total) * 100) : 0,
      competitor_hit_rate: stats.total > 0 ? Math.round((stats.competitor_hits / stats.total) * 100) : 0,
    }));

    // Compute final scores
    const brandTop3RateOverall = totalPromptForTop3 > 0 ? totalBrandTop3 / totalPromptForTop3 : 0;
    const scores = computeScores({
      geoPromptCount,
      geoWithBrand,
      geoTopThree,
      implicitPromptCount,
      implicitWithBrand,
      implicitWithCompetitorNotBrand,
      totalPromptCount,
      coOccurrenceCount,
      strongAssocCount,
      brandMentionPrompts,
      competitorMentionPrompts,
      brandTop3RateOverall,
      brandNeverInGeoCluster: !brandInGeoCluster && geoPromptCount > 0,
      successfulCalls,
      totalCalls,
    }, competitorCounts, intentStats);

    // Generate recommendations
    const actionRecs = generateRecommendations(scores, profile);

    // Compute confidence
    const coverage = totalCalls > 0 ? successfulCalls / totalCalls : 0;
    const confidence = computeConfidence(coverage, errorCount, listDetectionLowCount, templates.length);

    // Store scores
    await supabase
      .from('local_authority_scores')
      .insert({
        run_id,
        profile_id: profile.id,
        score_total: scores.score_total,
        score_geo: scores.score_geo,
        score_implicit: scores.score_implicit,
        score_association: scores.score_association,
        score_sov: scores.score_sov,
        breakdown: scores.breakdown,
        recommendations: actionRecs,
      });

    // Update run status
    const qualityFlags = {
      error_count: errorCount,
      list_detection_low: listDetectionLowCount,
      coverage: Math.round(coverage * 100),
      partial_results: errorCount > 0,
    };
    
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
        confidence,
        recommendations: actionRecs,
        results_count: successfulCalls,
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
