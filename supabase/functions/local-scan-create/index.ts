import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CreateScanRequest {
  business_name: string;
  business_website?: string;
  city: string;
  category: string;
  lead_email?: string;
}

// Generate the 6 standard prompts for local AI visibility
function generatePrompts(category: string, city: string): string[] {
  return [
    `Best ${category} near me in ${city}`,
    `Who is the most trusted ${category} in ${city}?`,
    `Which ${category} should I call in ${city}?`,
    `Top-rated ${category} in ${city}`,
    `Recommended ${category} in ${city}`,
    `Local ${category} businesses in ${city}`,
  ];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateScanRequest = await req.json();
    
    // Validate required fields
    if (!body.business_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'business_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.city?.trim()) {
      return new Response(
        JSON.stringify({ error: 'city is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.category?.trim()) {
      return new Response(
        JSON.stringify({ error: 'category is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for full access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user is authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    console.log(`[local-scan-create] Creating scan for business: ${body.business_name}, city: ${body.city}, category: ${body.category}`);
    console.log(`[local-scan-create] User authenticated: ${userId ? 'yes' : 'no (anonymous)'}`);

    // Create the scan record
    const { data: scan, error: scanError } = await supabase
      .from('local_ai_scans')
      .insert({
        user_id: userId,
        lead_email: userId ? null : body.lead_email || null,
        business_name: body.business_name.trim(),
        business_website: body.business_website?.trim() || null,
        city: body.city.trim(),
        category: body.category.trim(),
        status: 'created',
      })
      .select('id')
      .single();

    if (scanError) {
      console.error('[local-scan-create] Failed to create scan:', scanError);
      throw new Error(`Failed to create scan: ${scanError.message}`);
    }

    const scanId = scan.id;
    console.log(`[local-scan-create] Created scan with ID: ${scanId}`);

    // Generate and insert the 6 prompts
    const prompts = generatePrompts(body.category.trim(), body.city.trim());
    const promptRecords = prompts.map((promptText, index) => ({
      scan_id: scanId,
      prompt_index: index + 1,
      prompt_text: promptText,
    }));

    const { error: promptsError } = await supabase
      .from('local_ai_scan_prompts')
      .insert(promptRecords);

    if (promptsError) {
      console.error('[local-scan-create] Failed to create prompts:', promptsError);
      // Clean up the scan if prompts fail
      await supabase.from('local_ai_scans').delete().eq('id', scanId);
      throw new Error(`Failed to create prompts: ${promptsError.message}`);
    }

    console.log(`[local-scan-create] Created ${prompts.length} prompts for scan ${scanId}`);

    return new Response(
      JSON.stringify({
        success: true,
        scan_id: scanId,
        prompts_created: prompts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[local-scan-create] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
