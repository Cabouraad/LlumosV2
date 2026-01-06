import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intent tags as specified
type IntentTag = 'best' | 'near_me' | 'trust' | 'price' | 'emergency' | 'specialty' | 'comparison' | 'hours';

interface PromptTemplate {
  layer: 'geo_cluster' | 'implicit' | 'radius_neighborhood' | 'problem_intent';
  prompt_text: string;
  intent_tag: IntentTag;
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

function generatePromptTemplates(profile: {
  business_name: string;
  primary_location: { city: string; state: string };
  categories: string[];
  neighborhoods?: string[];
  service_radius_miles?: number;
}): PromptTemplate[] {
  const templates: PromptTemplate[] = [];
  const seen = new Set<string>();
  const { city, state } = profile.primary_location;
  const hasNeighborhoods = profile.neighborhoods && profile.neighborhoods.length > 0;
  const radius = profile.service_radius_miles || 15;
  
  const addTemplate = (layer: PromptTemplate['layer'], prompt: string, intent: IntentTag): boolean => {
    const key = prompt.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    templates.push({ layer, prompt_text: prompt, intent_tag: intent });
    return true;
  };
  
  for (const category of profile.categories) {
    // ============================================
    // LAYER A: geo_cluster (5 per category)
    // ============================================
    
    // intent_tag="best" (3 prompts)
    addTemplate('geo_cluster', `Who are the best ${category} providers in ${city}, ${state}?`, 'best');
    addTemplate('geo_cluster', `Recommend the top-rated ${category} in ${city}, ${state}.`, 'best');
    addTemplate('geo_cluster', `What are the most trusted ${category} businesses in ${city}, ${state}?`, 'best');
    
    // intent_tag="comparison" (1 prompt)
    addTemplate('geo_cluster', `Compare the top ${category} options in ${city}, ${state} and recommend 3.`, 'comparison');
    
    // intent_tag="hours" (1 prompt)
    addTemplate('geo_cluster', `Which ${category} in ${city}, ${state} is known for great service and easy scheduling?`, 'hours');
    
    // ============================================
    // LAYER B: implicit (3 per category) - NO location words
    // ============================================
    
    // intent_tag="trust"
    addTemplate('implicit', `Who is a reliable ${category} I can trust?`, 'trust');
    
    // intent_tag="best"
    addTemplate('implicit', `Recommend a top-rated ${category} and explain why.`, 'best');
    
    // intent_tag="price"
    addTemplate('implicit', `Who is an affordable ${category} with consistently good reviews?`, 'price');
    
    // ============================================
    // LAYER C: radius_neighborhood (up to 5 per category)
    // ============================================
    
    if (hasNeighborhoods) {
      // Use neighborhood prompts (up to 3 neighborhoods)
      const neighborhoods = profile.neighborhoods!.slice(0, 3);
      for (const neighborhood of neighborhoods) {
        addTemplate('radius_neighborhood', `Recommend a ${category} near ${neighborhood}.`, 'near_me');
        addTemplate('radius_neighborhood', `Best ${category} near ${neighborhood} with strong reviews.`, 'near_me');
        addTemplate('radius_neighborhood', `Most trusted ${category} near ${neighborhood}.`, 'near_me');
      }
    } else {
      // Use city-radius prompts
      addTemplate('radius_neighborhood', `Recommend a ${category} within ${radius} miles of ${city}, ${state}.`, 'near_me');
      addTemplate('radius_neighborhood', `Best ${category} within ${radius} miles of downtown ${city}, ${state}.`, 'near_me');
      addTemplate('radius_neighborhood', `Most trusted ${category} near me in ${city}, ${state}.`, 'near_me');
    }
    
    // Add 2 more optional radius/neighborhood prompts
    addTemplate('radius_neighborhood', `If I live near ${city}, ${state}, which ${category} should I choose and why?`, 'comparison');
    addTemplate('radius_neighborhood', `Which ${category} is easiest to book quickly near ${city}, ${state}?`, 'hours');
    
    // ============================================
    // LAYER D: problem_intent (3-5 per category)
    // ============================================
    
    // Standard problem prompts (3)
    // intent_tag="emergency"
    addTemplate('problem_intent', `Who should I call for urgent ${category} help in ${city}, ${state}?`, 'emergency');
    
    // intent_tag="trust"
    addTemplate('problem_intent', `Which ${category} is known for honest pricing and good communication in ${city}, ${state}?`, 'trust');
    
    // intent_tag="price"
    addTemplate('problem_intent', `Recommend a ${category} in ${city}, ${state} that's good value for the money.`, 'price');
    
    // Category-aware specialty prompts (up to 2)
    const specialtyPrompts = getCategorySpecialtyPrompts(category, city, state);
    for (const sp of specialtyPrompts) {
      addTemplate('problem_intent', sp.prompt, sp.intent);
    }
  }
  
  // Cap total prompts to 60, prioritizing by category order and highest-intent templates
  if (templates.length > 60) {
    // Priority order: problem_intent > geo_cluster > implicit > radius_neighborhood
    const priorityOrder: Record<string, number> = {
      'problem_intent': 1,
      'geo_cluster': 2,
      'implicit': 3,
      'radius_neighborhood': 4,
    };
    
    templates.sort((a, b) => priorityOrder[a.layer] - priorityOrder[b.layer]);
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

    // Generate prompt templates with exact specification
    const templates = generatePromptTemplates({
      business_name: profile.business_name,
      primary_location: profile.primary_location,
      categories: profile.categories,
      neighborhoods: profile.neighborhoods,
      service_radius_miles: profile.service_radius_miles,
    });

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

    // Count by layer
    const counts = {
      geo_cluster: templates.filter(t => t.layer === 'geo_cluster').length,
      implicit: templates.filter(t => t.layer === 'implicit').length,
      radius_neighborhood: templates.filter(t => t.layer === 'radius_neighborhood').length,
      problem_intent: templates.filter(t => t.layer === 'problem_intent').length,
      total: templates.length,
    };

    return new Response(
      JSON.stringify({ 
        profile_id,
        counts,
        message: `Generated ${counts.total} prompt templates`,
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
