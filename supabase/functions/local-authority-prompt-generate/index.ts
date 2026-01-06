import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intent tags as specified
type IntentTag = 'best' | 'near_me' | 'trust' | 'price' | 'emergency' | 'specialty' | 'comparison' | 'hours';
type PromptLayer = 'geo_cluster' | 'implicit' | 'radius_neighborhood' | 'problem_intent' | 'semantic_local' | 'time_context' | 'competitor_gap';

interface PromptTemplate {
  layer: PromptLayer;
  prompt_text: string;
  intent_tag: IntentTag;
  priority?: number;
}

interface LocationIntelligence {
  neighborhoods: string[];
  landmarks: string[];
  colloquial_names: string[];
  semantic_variants: string[];
}

interface CategoryPattern {
  category_keywords: string[];
  pattern_type: string;
  prompt_template: string;
  intent_tag: string;
  priority: number;
}

interface ServiceArea {
  city: string;
  state: string;
  country?: string;
  priority?: 'primary' | 'secondary' | 'expansion';
}

// Category-specific specialty detection
function getCategorySpecialtyPrompts(
  category: string,
  city: string,
  state: string
): { prompt: string; intent: IntentTag }[] {
  const lowerCategory = category.toLowerCase();
  
  // Dental/orthodontic category
  if (['dentist', 'orthodontist', 'invisalign', 'dental'].some(k => lowerCategory.includes(k))) {
    return [{ prompt: `Best ${category} in ${city}, ${state} for Invisalign or cosmetic work?`, intent: 'specialty' }];
  }
  
  // Home services emergency category
  if (['plumber', 'hvac', 'electrician', 'heating', 'cooling', 'ac repair'].some(k => lowerCategory.includes(k))) {
    return [{ prompt: `Best ${category} in ${city}, ${state} for same-day service?`, intent: 'emergency' }];
  }
  
  // Food/hospitality category
  if (['restaurant', 'coffee', 'bar', 'cafe', 'bistro', 'dining'].some(k => lowerCategory.includes(k))) {
    return [{ prompt: `Where should I go for the best ${category} experience in ${city}, ${state}?`, intent: 'best' }];
  }
  
  // Generic specialty for other categories
  return [{ prompt: `Who is the best ${category} in ${city}, ${state} for my situation and why?`, intent: 'specialty' }];
}

// Generate semantic variant prompts using location intelligence
function generateSemanticVariantPrompts(
  category: string,
  city: string,
  state: string,
  locationIntel: LocationIntelligence | null,
  patterns: CategoryPattern[]
): PromptTemplate[] {
  const prompts: PromptTemplate[] = [];
  
  if (!locationIntel) return prompts;
  
  // Use semantic variants (downtown, west side, etc.)
  for (const variant of locationIntel.semantic_variants.slice(0, 3)) {
    // Find matching pattern for this category
    const matchingPattern = patterns.find(p => 
      p.pattern_type === 'semantic' && 
      p.category_keywords.some(k => category.toLowerCase().includes(k.toLowerCase()))
    );
    
    if (matchingPattern) {
      const promptText = matchingPattern.prompt_template
        .replace('{category}', category)
        .replace('{variant}', variant)
        .replace('{city}', city)
        .replace('{state}', state);
      
      prompts.push({
        layer: 'semantic_local',
        prompt_text: promptText,
        intent_tag: matchingPattern.intent_tag as IntentTag,
        priority: matchingPattern.priority,
      });
    } else {
      // Default semantic prompt
      prompts.push({
        layer: 'semantic_local',
        prompt_text: `Best ${category} in ${variant} ${city}?`,
        intent_tag: 'near_me',
        priority: 60,
      });
    }
  }
  
  // Use colloquial city names
  for (const colloquial of locationIntel.colloquial_names.slice(0, 2)) {
    prompts.push({
      layer: 'semantic_local',
      prompt_text: `Who are the best ${category} providers in ${colloquial}?`,
      intent_tag: 'best',
      priority: 55,
    });
  }
  
  // Use landmark-based prompts
  for (const landmark of locationIntel.landmarks.slice(0, 2)) {
    prompts.push({
      layer: 'semantic_local',
      prompt_text: `Recommend a ${category} near ${landmark} in ${city}.`,
      intent_tag: 'near_me',
      priority: 50,
    });
  }
  
  return prompts;
}

// Generate time-context prompts
function generateTimeContextPrompts(
  category: string,
  city: string,
  state: string,
  patterns: CategoryPattern[]
): PromptTemplate[] {
  const prompts: PromptTemplate[] = [];
  
  // Find matching time_context patterns
  const matchingPatterns = patterns.filter(p => 
    p.pattern_type === 'time_context' && 
    p.category_keywords.some(k => category.toLowerCase().includes(k.toLowerCase()))
  );
  
  for (const pattern of matchingPatterns.slice(0, 2)) {
    const promptText = pattern.prompt_template
      .replace('{category}', category)
      .replace('{city}', city)
      .replace('{state}', state);
    
    prompts.push({
      layer: 'time_context',
      prompt_text: promptText,
      intent_tag: pattern.intent_tag as IntentTag,
      priority: pattern.priority,
    });
  }
  
  // Default time prompts if no patterns matched
  if (prompts.length === 0) {
    prompts.push({
      layer: 'time_context',
      prompt_text: `Which ${category} in ${city}, ${state} is open on weekends?`,
      intent_tag: 'hours',
      priority: 50,
    });
    prompts.push({
      layer: 'time_context',
      prompt_text: `Which ${category} in ${city}, ${state} has the quickest response time?`,
      intent_tag: 'emergency',
      priority: 60,
    });
  }
  
  return prompts;
}

// Generate competitor gap targeting prompts
function generateCompetitorGapPrompts(
  category: string,
  city: string,
  state: string,
  competitorOverrides: { name: string; domain?: string }[] | null
): PromptTemplate[] {
  const prompts: PromptTemplate[] = [];
  
  // Generic comparison prompts that can reveal competitor gaps
  prompts.push({
    layer: 'competitor_gap',
    prompt_text: `What makes one ${category} better than others in ${city}, ${state}?`,
    intent_tag: 'comparison',
    priority: 75,
  });
  
  prompts.push({
    layer: 'competitor_gap',
    prompt_text: `What do customers complain about most with ${category} providers in ${city}?`,
    intent_tag: 'trust',
    priority: 70,
  });
  
  // If we have known competitors, create specific comparison prompts
  if (competitorOverrides && competitorOverrides.length > 0) {
    const topCompetitor = competitorOverrides[0].name;
    prompts.push({
      layer: 'competitor_gap',
      prompt_text: `Are there better alternatives to ${topCompetitor} for ${category} in ${city}?`,
      intent_tag: 'comparison',
      priority: 80,
    });
  }
  
  return prompts;
}

function generatePromptTemplates(
  profile: {
    business_name: string;
    primary_location: { city: string; state: string };
    categories: string[];
    neighborhoods?: string[];
    service_radius_miles?: number;
    service_areas?: ServiceArea[];
    auto_neighborhoods?: string[];
    competitor_overrides?: { name: string; domain?: string }[];
  },
  locationIntel: LocationIntelligence | null,
  patterns: CategoryPattern[]
): PromptTemplate[] {
  const templates: PromptTemplate[] = [];
  const seen = new Set<string>();
  const { city, state } = profile.primary_location;
  
  // Combine user neighborhoods with auto-suggested ones
  const allNeighborhoods = [
    ...(profile.neighborhoods || []),
    ...(profile.auto_neighborhoods || []),
    ...(locationIntel?.neighborhoods || []),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
  
  const hasNeighborhoods = allNeighborhoods.length > 0;
  const radius = profile.service_radius_miles || 15;
  
  const addTemplate = (layer: PromptLayer, prompt: string, intent: IntentTag, priority = 50): boolean => {
    const key = prompt.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    templates.push({ layer, prompt_text: prompt, intent_tag: intent, priority });
    return true;
  };
  
  // Generate prompts for each category
  for (const category of profile.categories) {
    // ============================================
    // LAYER A: geo_cluster (5 per category)
    // ============================================
    
    // intent_tag="best" (3 prompts)
    addTemplate('geo_cluster', `Who are the best ${category} providers in ${city}, ${state}?`, 'best', 90);
    addTemplate('geo_cluster', `Recommend the top-rated ${category} in ${city}, ${state}.`, 'best', 85);
    addTemplate('geo_cluster', `What are the most trusted ${category} businesses in ${city}, ${state}?`, 'best', 80);
    
    // intent_tag="comparison" (1 prompt)
    addTemplate('geo_cluster', `Compare the top ${category} options in ${city}, ${state} and recommend 3.`, 'comparison', 75);
    
    // intent_tag="hours" (1 prompt)
    addTemplate('geo_cluster', `Which ${category} in ${city}, ${state} is known for great service and easy scheduling?`, 'hours', 70);
    
    // ============================================
    // LAYER B: implicit (3 per category) - NO location words
    // ============================================
    
    addTemplate('implicit', `Who is a reliable ${category} I can trust?`, 'trust', 85);
    addTemplate('implicit', `Recommend a top-rated ${category} and explain why.`, 'best', 80);
    addTemplate('implicit', `Who is an affordable ${category} with consistently good reviews?`, 'price', 75);
    
    // ============================================
    // LAYER C: radius_neighborhood (up to 5 per category)
    // ============================================
    
    if (hasNeighborhoods) {
      // Use neighborhood prompts (up to 3 neighborhoods)
      for (const neighborhood of allNeighborhoods.slice(0, 3)) {
        addTemplate('radius_neighborhood', `Recommend a ${category} near ${neighborhood}.`, 'near_me', 75);
        addTemplate('radius_neighborhood', `Best ${category} near ${neighborhood} with strong reviews.`, 'near_me', 70);
        addTemplate('radius_neighborhood', `Most trusted ${category} near ${neighborhood}.`, 'near_me', 65);
      }
    } else {
      // Use city-radius prompts
      addTemplate('radius_neighborhood', `Recommend a ${category} within ${radius} miles of ${city}, ${state}.`, 'near_me', 75);
      addTemplate('radius_neighborhood', `Best ${category} within ${radius} miles of downtown ${city}, ${state}.`, 'near_me', 70);
      addTemplate('radius_neighborhood', `Most trusted ${category} near me in ${city}, ${state}.`, 'near_me', 65);
    }
    
    // Add 2 more optional radius/neighborhood prompts
    addTemplate('radius_neighborhood', `If I live near ${city}, ${state}, which ${category} should I choose and why?`, 'comparison', 60);
    addTemplate('radius_neighborhood', `Which ${category} is easiest to book quickly near ${city}, ${state}?`, 'hours', 55);
    
    // ============================================
    // LAYER D: problem_intent (3-5 per category)
    // ============================================
    
    addTemplate('problem_intent', `Who should I call for urgent ${category} help in ${city}, ${state}?`, 'emergency', 90);
    addTemplate('problem_intent', `Which ${category} is known for honest pricing and good communication in ${city}, ${state}?`, 'trust', 85);
    addTemplate('problem_intent', `Recommend a ${category} in ${city}, ${state} that's good value for the money.`, 'price', 80);
    
    // Category-aware specialty prompts
    const specialtyPrompts = getCategorySpecialtyPrompts(category, city, state);
    for (const sp of specialtyPrompts) {
      addTemplate('problem_intent', sp.prompt, sp.intent, 75);
    }
    
    // ============================================
    // LAYER E: semantic_local (NEW - using location intelligence)
    // ============================================
    
    const semanticPrompts = generateSemanticVariantPrompts(category, city, state, locationIntel, patterns);
    for (const sp of semanticPrompts) {
      addTemplate(sp.layer, sp.prompt_text, sp.intent_tag, sp.priority);
    }
    
    // ============================================
    // LAYER F: time_context (NEW - time-based queries)
    // ============================================
    
    const timePrompts = generateTimeContextPrompts(category, city, state, patterns);
    for (const tp of timePrompts) {
      addTemplate(tp.layer, tp.prompt_text, tp.intent_tag, tp.priority);
    }
    
    // ============================================
    // LAYER G: competitor_gap (NEW - competitive targeting)
    // ============================================
    
    const competitorPrompts = generateCompetitorGapPrompts(category, city, state, profile.competitor_overrides || null);
    for (const cp of competitorPrompts) {
      addTemplate(cp.layer, cp.prompt_text, cp.intent_tag, cp.priority);
    }
  }
  
  // ============================================
  // Generate prompts for secondary service areas (if any)
  // ============================================
  
  if (profile.service_areas && profile.service_areas.length > 0) {
    for (const area of profile.service_areas.slice(0, 3)) {
      const priority = area.priority === 'secondary' ? 60 : 40;
      
      for (const category of profile.categories.slice(0, 2)) {
        addTemplate('geo_cluster', `Who are the best ${category} providers in ${area.city}, ${area.state}?`, 'best', priority);
        addTemplate('geo_cluster', `Recommend a trusted ${category} in ${area.city}, ${area.state}.`, 'trust', priority - 10);
      }
    }
  }
  
  // Cap total prompts to 60, prioritizing by priority score then by category order
  if (templates.length > 60) {
    templates.sort((a, b) => (b.priority || 50) - (a.priority || 50));
    templates.splice(60);
  }
  
  return templates;
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

    const { profile_id } = await req.json();
    
    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load profile and verify ownership
    const { data: profile, error: profileError } = await supabase
      .from('local_profiles')
      .select('*')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load location intelligence for the city
    const { data: locationIntel } = await supabase
      .from('location_intelligence')
      .select('neighborhoods, landmarks, colloquial_names, semantic_variants')
      .eq('city', profile.primary_location.city)
      .eq('state', profile.primary_location.state)
      .single();

    // Load category patterns
    const { data: patterns } = await supabase
      .from('category_location_patterns')
      .select('*')
      .eq('active', true);

    // Generate prompt templates with enhanced localization
    const templates = generatePromptTemplates(
      {
        business_name: profile.business_name,
        primary_location: profile.primary_location,
        categories: profile.categories,
        neighborhoods: profile.neighborhoods,
        service_radius_miles: profile.service_radius_miles,
        service_areas: profile.service_areas,
        auto_neighborhoods: profile.auto_neighborhoods,
        competitor_overrides: profile.competitor_overrides,
      },
      locationIntel ? {
        neighborhoods: locationIntel.neighborhoods || [],
        landmarks: locationIntel.landmarks || [],
        colloquial_names: locationIntel.colloquial_names || [],
        semantic_variants: locationIntel.semantic_variants || [],
      } : null,
      patterns || []
    );

    console.log(`Generated ${templates.length} prompt templates for profile ${profile_id}`);

    // Delete existing templates for this profile (safe: only affects this profile)
    await supabase
      .from('local_prompt_templates')
      .delete()
      .eq('profile_id', profile_id);

    // Insert new templates
    const templateRows = templates.map(t => ({
      profile_id,
      layer: t.layer,
      prompt_text: t.prompt_text,
      intent_tag: t.intent_tag,
      active: true,
    }));

    const { error: insertError } = await supabase
      .from('local_prompt_templates')
      .insert(templateRows);

    if (insertError) {
      console.error('Template insert error:', insertError);
      throw new Error('Failed to save prompt templates');
    }

    // If we found location intelligence, update the profile with auto-neighborhoods
    if (locationIntel && locationIntel.neighborhoods?.length > 0) {
      await supabase
        .from('local_profiles')
        .update({ 
          auto_neighborhoods: locationIntel.neighborhoods,
          location_variants: locationIntel.semantic_variants || [],
        })
        .eq('id', profile_id);
    }

    // Count by layer
    const counts = {
      geo_cluster: templates.filter(t => t.layer === 'geo_cluster').length,
      implicit: templates.filter(t => t.layer === 'implicit').length,
      radius_neighborhood: templates.filter(t => t.layer === 'radius_neighborhood').length,
      problem_intent: templates.filter(t => t.layer === 'problem_intent').length,
      semantic_local: templates.filter(t => t.layer === 'semantic_local').length,
      time_context: templates.filter(t => t.layer === 'time_context').length,
      competitor_gap: templates.filter(t => t.layer === 'competitor_gap').length,
      total: templates.length,
    };

    return new Response(
      JSON.stringify({ 
        profile_id,
        counts,
        has_location_intelligence: !!locationIntel,
        auto_neighborhoods_count: locationIntel?.neighborhoods?.length || 0,
        message: `Generated ${counts.total} prompt templates with enhanced localization`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('local-authority-prompt-generate error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
