import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceArea {
  city: string;
  state: string;
  country?: string;
  zip_codes?: string[];
  priority: 'primary' | 'secondary' | 'expansion';
}

interface ProfileInput {
  business_name: string;
  domain: string;
  primary_location: {
    city: string;
    state: string;
    country: string;
    zip?: string;
    lat?: number;
    lng?: number;
  };
  service_radius_miles?: number;
  neighborhoods?: string[];
  categories: string[];
  brand_synonyms?: string[];
  competitor_overrides?: { name: string; domain?: string }[];
  gbp_url?: string;
  phone?: string;
  address?: string;
  org_id?: string;
  // New enhanced fields
  service_areas?: ServiceArea[];
  location_priority?: 'primary' | 'secondary' | 'expansion';
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

    // Parse input
    const input: ProfileInput = await req.json();
    
    // Validate required fields
    const errors: string[] = [];
    if (!input.business_name?.trim()) errors.push('business_name is required');
    if (!input.domain?.trim()) errors.push('domain is required');
    if (!input.primary_location?.city?.trim()) errors.push('primary_location.city is required');
    if (!input.primary_location?.state?.trim()) errors.push('primary_location.state is required');
    if (!input.categories || input.categories.length === 0) errors.push('At least one category is required');
    
    // Validate service areas if provided
    if (input.service_areas) {
      for (let i = 0; i < input.service_areas.length; i++) {
        const area = input.service_areas[i];
        if (!area.city?.trim()) errors.push(`service_areas[${i}].city is required`);
        if (!area.state?.trim()) errors.push(`service_areas[${i}].state is required`);
        if (!['primary', 'secondary', 'expansion'].includes(area.priority)) {
          errors.push(`service_areas[${i}].priority must be primary, secondary, or expansion`);
        }
      }
    }
    
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize domain
    const normalizedDomain = input.domain
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/$/, '');

    // Check for existing profile with same user_id + domain
    const { data: existingProfile } = await supabase
      .from('local_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain', normalizedDomain)
      .single();

    // Fetch location intelligence for auto-suggestions
    const { data: locationIntel } = await supabase
      .from('location_intelligence')
      .select('neighborhoods, semantic_variants')
      .eq('city', input.primary_location.city)
      .eq('state', input.primary_location.state)
      .single();

    const profileData = {
      user_id: user.id,
      org_id: input.org_id || null,
      business_name: input.business_name.trim(),
      domain: normalizedDomain,
      primary_location: input.primary_location,
      service_radius_miles: input.service_radius_miles || 15,
      neighborhoods: input.neighborhoods || [],
      categories: input.categories,
      brand_synonyms: input.brand_synonyms || [],
      competitor_overrides: input.competitor_overrides || null,
      gbp_url: input.gbp_url || null,
      phone: input.phone || null,
      address: input.address || null,
      // Enhanced localization fields
      service_areas: input.service_areas || [],
      location_priority: input.location_priority || 'primary',
      auto_neighborhoods: locationIntel?.neighborhoods || [],
      location_variants: locationIntel?.semantic_variants || [],
      updated_at: new Date().toISOString(),
    };

    let profileId: string;

    if (existingProfile) {
      // Update existing profile
      const { data: updated, error: updateError } = await supabase
        .from('local_profiles')
        .update(profileData)
        .eq('id', existingProfile.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error('Failed to update profile');
      }
      
      profileId = updated.id;
      console.log(`Updated local profile: ${profileId}`);
    } else {
      // Create new profile
      const { data: created, error: createError } = await supabase
        .from('local_profiles')
        .insert(profileData)
        .select('id')
        .single();

      if (createError) {
        console.error('Profile create error:', createError);
        throw new Error('Failed to create profile');
      }
      
      profileId = created.id;
      console.log(`Created local profile: ${profileId}`);
    }

    return new Response(
      JSON.stringify({ 
        profile_id: profileId,
        updated: !!existingProfile,
        has_location_intelligence: !!locationIntel,
        auto_neighborhoods: locationIntel?.neighborhoods || [],
        location_variants: locationIntel?.semantic_variants || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('local-authority-profile-upsert error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
