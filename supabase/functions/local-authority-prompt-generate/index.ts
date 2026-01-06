import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromptTemplate {
  layer: 'geo_cluster' | 'implicit' | 'radius_neighborhood' | 'problem_intent';
  prompt_text: string;
  intent_tag?: string;
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
  
  for (const category of profile.categories) {
    // LAYER A: geo_cluster prompts
    const geoPrompts = [
      { text: `best ${category} in ${city} ${state}`, intent: 'best' },
      { text: `top rated ${category} in ${city}`, intent: 'top_rated' },
      { text: `who do locals recommend for ${category} in ${city}`, intent: 'local_reco' },
      { text: `most trusted ${category} near ${city} ${state}`, intent: 'trust' },
      { text: `${category} with best reviews in ${city}`, intent: 'reviews' },
      { text: `highly recommended ${category} in ${city} area`, intent: 'recommended' },
      { text: `local ${category} experts in ${city}`, intent: 'expert' },
    ];
    
    for (const p of geoPrompts) {
      const key = p.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        templates.push({ layer: 'geo_cluster', prompt_text: p.text, intent_tag: p.intent });
      }
    }
    
    // LAYER B: implicit prompts (NO location words)
    const implicitPrompts = [
      { text: `who is a reliable ${category}`, intent: 'reliable' },
      { text: `best ${category} for residential needs`, intent: 'residential' },
      { text: `${category} with excellent customer service`, intent: 'service' },
      { text: `experienced ${category} for complex projects`, intent: 'experience' },
      { text: `${category} that offers free estimates`, intent: 'pricing' },
      { text: `professional ${category} with good reputation`, intent: 'reputation' },
      { text: `${category} known for quality work`, intent: 'quality' },
    ];
    
    for (const p of implicitPrompts) {
      const key = p.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        templates.push({ layer: 'implicit', prompt_text: p.text, intent_tag: p.intent });
      }
    }
    
    // LAYER C: radius/neighborhood prompts
    if (profile.neighborhoods && profile.neighborhoods.length > 0) {
      for (const hood of profile.neighborhoods.slice(0, 4)) {
        const hoodPrompts = [
          { text: `best ${category} near ${hood}`, intent: 'neighborhood' },
          { text: `top ${category} serving ${hood} area`, intent: 'neighborhood_service' },
        ];
        for (const p of hoodPrompts) {
          const key = p.text.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            templates.push({ layer: 'radius_neighborhood', prompt_text: p.text, intent_tag: p.intent });
          }
        }
      }
    }
    
    if (profile.service_radius_miles) {
      const radiusPrompts = [
        { text: `${category} within ${profile.service_radius_miles} miles of ${city}`, intent: 'radius' },
        { text: `${category} that serves the greater ${city} area`, intent: 'greater_area' },
      ];
      for (const p of radiusPrompts) {
        const key = p.text.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          templates.push({ layer: 'radius_neighborhood', prompt_text: p.text, intent_tag: p.intent });
        }
      }
    }
    
    // LAYER D: problem-intent prompts
    const problemPrompts = [
      { text: `who should I call for emergency ${category} help`, intent: 'emergency' },
      { text: `affordable ${category} with great reviews`, intent: 'affordable' },
      { text: `${category} that can handle urgent requests`, intent: 'urgent' },
      { text: `best value ${category} for home projects`, intent: 'value' },
      { text: `${category} with same day service`, intent: 'same_day' },
      { text: `${category} open on weekends`, intent: 'weekend' },
    ];
    
    for (const p of problemPrompts) {
      const key = p.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        templates.push({ layer: 'problem_intent', prompt_text: p.text, intent_tag: p.intent });
      }
    }
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

    // Generate prompt templates
    const templates = generatePromptTemplates({
      business_name: profile.business_name,
      primary_location: profile.primary_location,
      categories: profile.categories,
      neighborhoods: profile.neighborhoods,
      service_radius_miles: profile.service_radius_miles,
    });

    console.log(`Generated ${templates.length} prompt templates for profile ${profile_id}`);

    // Delete existing templates for this profile
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
