import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TYPES =============
type IntentType = 'discovery' | 'validation' | 'comparison' | 'recommendation' | 'action' | 'local_intent';
type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

interface GeneratedPrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string;
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
  geo_target?: string;
}

interface GeoParams {
  perCity?: number;
}

// Hard cap on total local prompts
const MAX_LOCAL_PROMPTS = 30;

// Prohibited words
const PROHIBITED_WORDS = ['scam', 'fraud', 'illegal', 'ripoff', 'fake', 'con'];

// ============= HELPER FUNCTIONS =============

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function canonicalJson(obj: unknown): string {
  if (obj === null || obj === undefined) return '';
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

function validatePrompt(p: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const prompt = p as Record<string, unknown>;
  
  if (!prompt || typeof prompt !== 'object') return { valid: false, errors: ['Not an object'] };
  if (typeof prompt.prompt !== 'string' || prompt.prompt.length < 6) errors.push('Prompt too short');
  if (typeof prompt.prompt === 'string' && prompt.prompt.length > 140) errors.push('Prompt too long');
  
  const validIntents: IntentType[] = ['local_intent', 'action', 'validation'];
  if (!validIntents.includes(prompt.intent_type as IntentType)) {
    errors.push(`Invalid intent_type for local: ${prompt.intent_type}`);
  }
  
  if (typeof prompt.why_relevant !== 'string' || prompt.why_relevant.length > 140) {
    errors.push('why_relevant missing or too long');
  }
  if (typeof prompt.target_offering !== 'string') errors.push('target_offering missing');
  
  const validFunnels: FunnelStage[] = ['MOFU', 'BOFU'];
  if (!validFunnels.includes(prompt.funnel_stage as FunnelStage)) {
    errors.push(`Invalid funnel_stage for local: ${prompt.funnel_stage}`);
  }
  
  if (typeof prompt.needs_geo_variant !== 'boolean') errors.push('needs_geo_variant must be boolean');
  if (typeof prompt.seed_topic !== 'string') errors.push('seed_topic missing');
  
  // Check for prohibited words
  const promptText = (prompt.prompt as string || '').toLowerCase();
  for (const word of PROHIBITED_WORDS) {
    if (promptText.includes(word)) {
      errors.push(`Contains prohibited word: ${word}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function validateAllPrompts(prompts: unknown[], geoTargets: string[]): { valid: boolean; errors: string[]; validated: GeneratedPrompt[] } {
  const errors: string[] = [];
  const validated: GeneratedPrompt[] = [];
  const seenPrompts = new Set<string>();
  let hasLocalIntent = false;
  
  if (!Array.isArray(prompts)) return { valid: false, errors: ['Response is not an array'], validated: [] };
  if (prompts.length > MAX_LOCAL_PROMPTS) errors.push(`Exceeds max local prompts (${MAX_LOCAL_PROMPTS})`);
  
  for (const p of prompts) {
    const { valid, errors: promptErrors } = validatePrompt(p);
    if (!valid) { 
      errors.push(`Invalid prompt: ${promptErrors.join(', ')}`); 
      continue; 
    }
    
    const typedPrompt = p as GeneratedPrompt;
    const normalizedText = typedPrompt.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (seenPrompts.has(normalizedText)) { 
      continue; // Skip duplicates silently
    }
    seenPrompts.add(normalizedText);
    
    if (typedPrompt.intent_type === 'local_intent') {
      hasLocalIntent = true;
    }
    
    // Check for hallucinated cities/states
    const geoLower = geoTargets.map(g => g.toLowerCase());
    const hasValidGeo = geoLower.some(g => normalizedText.includes(g)) || 
                        normalizedText.includes('near me') ||
                        normalizedText.includes('nearby') ||
                        normalizedText.includes('in my area');
    
    if (!hasValidGeo && !typedPrompt.needs_geo_variant) {
      // If no valid geo reference and not marked as needing variant, skip
      errors.push(`Prompt may have hallucinated location: ${typedPrompt.prompt.slice(0, 50)}...`);
      continue;
    }
    
    validated.push(typedPrompt);
  }
  
  if (!hasLocalIntent && validated.length > 0) {
    errors.push('At least 1 local_intent prompt required');
  }
  
  return { valid: errors.length === 0, errors, validated };
}

function buildLLMPrompt(
  context: {
    businessName: string;
    industry: string;
    primaryProducts: string[];
    geoScope: string;
    primaryLocation?: { city?: string; state?: string };
  },
  geoTargets: string[],
  perCity: number
): string {
  const totalCount = Math.min(geoTargets.length * perCity, MAX_LOCAL_PROMPTS);
  const offerings = [...context.primaryProducts.slice(0, 5), 'general'];
  
  return `You are a prompt generator for local AI search. Output ONLY valid JSON. No markdown.

## Business Context
- Business Name: ${context.businessName}
- Industry: ${context.industry}
- Primary Products/Services: ${context.primaryProducts.slice(0, 5).join(', ') || 'Not specified'}
- Geographic Scope: ${context.geoScope}
${context.primaryLocation?.city ? `- Primary City: ${context.primaryLocation.city}` : ''}
${context.primaryLocation?.state ? `- Primary State: ${context.primaryLocation.state}` : ''}

## Geographic Targets
${geoTargets.join(', ')}

## YOUR TASK

Generate exactly ${totalCount} local AI search prompts that people would ask ChatGPT when looking for local services/businesses.

## ALLOWED INTENT TYPES (use only these)
- local_intent (PRIMARY - use for most prompts)
- action (sparingly - for "book", "call", "visit" prompts)
- validation (sparingly - for local reviews/trust prompts)

## FUNNEL STAGES
- BOFU (default for local prompts)
- MOFU (only for validation-style local prompts)

## CRITICAL RULES

1. Sound like real people asking ChatGPT for LOCAL recommendations
   - "Who's the best ${context.industry.toLowerCase()} in [city]?"
   - "Where should I go for [service] near me?"
   - "Is there a good [business type] open now in [city]?"

2. Use ONLY these geographic references:
   ${geoTargets.map(g => `- "${g}"`).join('\n   ')}
   - "near me" (use sparingly, marked with needs_geo_variant: true)

3. Do NOT duplicate prompts (case-insensitive)
4. Do NOT generate both "near me" AND city versions of the same phrasing
5. Prompt length: 6-140 characters
6. Do NOT use SEO-style keyword phrases
7. Do NOT include the business name unless it's a validation/action prompt

## SEED TOPICS TO INCLUDE
- "near me" - generic location queries
- "best in city" - quality-focused local queries  
- "local reviews" - trust/validation local queries
- "open now" - availability queries
- "book local" - action/booking queries

## OUTPUT FORMAT

Return ONLY this JSON structure:
{
  "prompts": [
    {
      "prompt": "string",
      "intent_type": "local_intent|action|validation",
      "why_relevant": "string (<=140 chars)",
      "target_offering": "${offerings.join('|')}",
      "funnel_stage": "BOFU|MOFU",
      "needs_geo_variant": boolean,
      "seed_topic": "near me|best in city|local reviews|open now|book local",
      "geo_target": "string (which geo target this prompt uses)"
    }
  ]
}

Generate exactly ${totalCount} prompts now.`;
}

async function generateWithLLM(
  context: {
    businessName: string;
    industry: string;
    primaryProducts: string[];
    geoScope: string;
    primaryLocation?: { city?: string; state?: string };
  },
  geoTargets: string[],
  perCity: number
): Promise<{ prompts: GeneratedPrompt[]; model: string }> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${lovableApiKey}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a JSON-only response generator. Output ONLY valid JSON, no explanations or markdown.' },
        { role: 'user', content: buildLLMPrompt(context, geoTargets, perCity) }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLM API error:', response.status, errorText);
    throw new Error(`LLM API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Parse JSON from content
  let parsed: { prompts?: unknown[] };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('JSON parse error:', e, 'Content:', content.slice(0, 500));
    throw new Error('Failed to parse LLM response as JSON');
  }
  
  if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
    throw new Error('Invalid response structure');
  }
  
  return { 
    prompts: parsed.prompts as GeneratedPrompt[], 
    model: 'google/gemini-2.5-flash' 
  };
}

async function repairWithLLM(
  context: {
    businessName: string;
    industry: string;
    primaryProducts: string[];
    geoScope: string;
    primaryLocation?: { city?: string; state?: string };
  },
  geoTargets: string[],
  validationErrors: string[],
  originalPrompts: GeneratedPrompt[]
): Promise<GeneratedPrompt[]> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');
  
  const repairPrompt = `You previously generated local prompts with these errors:
${validationErrors.slice(0, 10).join('\n')}

Original prompts:
${JSON.stringify(originalPrompts.slice(0, 8), null, 2)}

Fix these issues and return corrected prompts. Use ONLY these geo targets: ${geoTargets.join(', ')}

Rules:
- intent_type must be: local_intent, action, or validation
- funnel_stage must be: BOFU or MOFU
- No prohibited words (scam, fraud, illegal, ripoff)
- Prompts must be 6-140 characters
- At least 1 local_intent prompt required

Return ONLY valid JSON: { "prompts": [...] }`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${lovableApiKey}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a JSON-only response generator. Output ONLY valid JSON.' },
        { role: 'user', content: repairPrompt }
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });
  
  if (!response.ok) throw new Error('Repair LLM call failed');
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed.prompts) ? parsed.prompts : [];
  } catch {
    return [];
  }
}

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    let brandId: string | null = null;
    let params: GeoParams = { perCity: 8 };
    
    try {
      const body = await req.json();
      brandId = body?.brandId || body?.domainId || null;
      if (body?.params) params = { ...params, ...body.params };
      console.log('Local geo prompts request:', { brandId, params });
    } catch (e) {
      console.log('No body or parse error');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Authentication failed');

    // Get user's org
    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();
    if (!userData) throw new Error('Could not get user organization');

    const orgId = userData.org_id;
    const perCity = params.perCity || 3;

    // Get org data for context
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, domain, business_description, products_services, business_city, business_state, business_country, localization_config')
      .eq('id', orgId)
      .single();
    
    if (!orgData) throw new Error('Organization not found');

    // Determine geographic scope
    const hasLocation = !!(orgData.business_city || orgData.business_state);
    const additionalLocations = (orgData.localization_config as any)?.additional_locations || [];
    
    let geoScope: 'local' | 'regional' | 'national' | 'global' = 'global';
    if (hasLocation) {
      geoScope = 'local';
      if (additionalLocations.length > 0) {
        const uniqueStates = new Set([
          orgData.business_state, 
          ...additionalLocations.map((l: any) => l.state)
        ].filter(Boolean));
        if (uniqueStates.size > 3) geoScope = 'national';
        else if (uniqueStates.size > 1) geoScope = 'regional';
      }
    }

    // Check if local/regional - skip if not
    if (geoScope !== 'local' && geoScope !== 'regional') {
      console.log('Not a local/regional business, skipping local prompts');
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'not_local_business',
        geo_scope: geoScope,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build geo targets
    const geoTargets: string[] = [];
    const cities: string[] = [];
    const states: string[] = [];
    
    if (orgData.business_city) cities.push(orgData.business_city);
    if (orgData.business_state) states.push(orgData.business_state);
    
    for (const loc of additionalLocations.slice(0, 5)) {
      if (loc.city && !cities.includes(loc.city)) cities.push(loc.city);
      if (loc.state && !states.includes(loc.state)) states.push(loc.state);
    }
    
    // Prioritize cities, then states, then "near me"
    if (cities.length > 0) {
      geoTargets.push(...cities.slice(0, 5));
    } else if (states.length > 0) {
      geoTargets.push(...states.slice(0, 3));
    }
    
    if (geoTargets.length === 0) {
      geoTargets.push('near me');
    }

    // Build context for prompt generation
    const context = {
      businessName: orgData.name,
      industry: inferIndustry(orgData.domain, orgData.business_description),
      primaryProducts: extractProducts(orgData.products_services, orgData.business_description),
      geoScope,
      primaryLocation: { city: orgData.business_city, state: orgData.business_state },
    };

    // Build generation params for hash
    const generationParams = {
      perCity,
      geoTargets,
      scope: geoScope,
    };

    // Compute prompt hash for caching
    const geoData = {
      cities,
      states,
      scope: geoScope,
      primaryLocation: context.primaryLocation,
    };
    const promptHash = await computeHash(
      canonicalJson(geoData) + canonicalJson(generationParams) + ':local:v1'
    );

    console.log('Prompt hash:', promptHash);

    // Check for cached result
    const { data: cachedRow } = await supabase
      .from('prompt_suggestions')
      .select('*')
      .eq('org_id', orgId)
      .eq('suggestion_type', 'local_geo')
      .eq('prompt_hash', promptHash)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedRow) {
      console.log('Returning cached local geo prompts');
      return new Response(JSON.stringify({
        success: true,
        data: cachedRow.prompts_json,
        cached: true,
        geo_targets: geoTargets,
        geo_scope: geoScope,
        version: cachedRow.version,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert building status
    const { data: insertedRow, error: insertError } = await supabase
      .from('prompt_suggestions')
      .insert({
        org_id: orgId,
        brand_id: brandId,
        suggestion_type: 'local_geo',
        prompt_hash: promptHash,
        prompts_json: [],
        generation_params: generationParams,
        status: 'building',
        version: 1,
      })
      .select()
      .single();

    if (insertError) {
      // Might be a race condition - try to fetch existing
      const { data: existingRow } = await supabase
        .from('prompt_suggestions')
        .select('*')
        .eq('org_id', orgId)
        .eq('suggestion_type', 'local_geo')
        .eq('prompt_hash', promptHash)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (existingRow?.status === 'ready') {
        return new Response(JSON.stringify({
          success: true,
          data: existingRow.prompts_json,
          cached: true,
          geo_targets: geoTargets,
          geo_scope: geoScope,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const rowId = insertedRow?.id;

    // Generate prompts with LLM
    console.log('Generating local geo prompts with LLM...');
    let llmResult: { prompts: GeneratedPrompt[]; model: string };
    
    try {
      llmResult = await generateWithLLM(context, geoTargets, perCity);
    } catch (e) {
      console.error('LLM generation failed:', e);
      if (rowId) {
        await supabase
          .from('prompt_suggestions')
          .update({ status: 'error', error_message: e instanceof Error ? e.message : 'LLM generation failed' })
          .eq('id', rowId);
      }
      throw e;
    }

    console.log(`Generated ${llmResult.prompts.length} raw prompts`);

    // Validate prompts
    let validation = validateAllPrompts(llmResult.prompts, geoTargets);
    
    // If validation fails, try repair once
    if (!validation.valid && validation.validated.length < 3) {
      console.log('Validation failed, attempting repair...');
      console.log('Validation errors:', validation.errors.slice(0, 5));
      
      const repairedPrompts = await repairWithLLM(
        context,
        geoTargets,
        validation.errors,
        llmResult.prompts
      );
      
      if (repairedPrompts.length > 0) {
        validation = validateAllPrompts(repairedPrompts, geoTargets);
        console.log(`Repair produced ${validation.validated.length} valid prompts`);
      }
    }

    // Enforce max limit
    const finalPrompts = validation.validated.slice(0, MAX_LOCAL_PROMPTS);
    const finalStatus = finalPrompts.length >= 3 ? 'ready' : 'partial';

    // Update database
    if (rowId) {
      await supabase
        .from('prompt_suggestions')
        .update({
          prompts_json: finalPrompts,
          status: finalStatus,
          llm_model: llmResult.model,
          error_message: validation.valid ? null : validation.errors.slice(0, 3).join('; '),
        })
        .eq('id', rowId);
    }

    return new Response(JSON.stringify({
      success: true,
      data: finalPrompts,
      cached: false,
      geo_targets: geoTargets,
      geo_scope: geoScope,
      status: finalStatus,
      validation_errors: validation.valid ? [] : validation.errors.slice(0, 5),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-local-geo-prompts:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============= HELPER FUNCTIONS (inlined from context builder) =============

function inferIndustry(domain: string, description?: string | null): string {
  const combined = `${domain.toLowerCase()} ${(description || '').toLowerCase()}`;
  const patterns: Record<string, string[]> = {
    'Software / SaaS': ['saas', 'software', 'platform', 'app', 'cloud', 'tech', 'ai'],
    'E-commerce / Retail': ['shop', 'store', 'retail', 'ecommerce', 'buy', 'sell'],
    'Healthcare': ['health', 'medical', 'clinic', 'hospital', 'wellness', 'care'],
    'Finance / Fintech': ['finance', 'bank', 'invest', 'insurance', 'fintech'],
    'Real Estate': ['real estate', 'property', 'home', 'realty', 'housing'],
    'Professional Services': ['consulting', 'services', 'solutions', 'advisory'],
    'Hospitality': ['hotel', 'restaurant', 'travel', 'tourism'],
    'Legal': ['law', 'legal', 'attorney', 'lawyer'],
  };
  for (const [industry, kws] of Object.entries(patterns)) {
    if (kws.some(p => combined.includes(p))) return industry;
  }
  return 'Local Services';
}

function extractProducts(productsText?: string | null, description?: string | null): string[] {
  const text = productsText || description || '';
  if (!text) return [];
  return text.split(/[,;•\n]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 100).slice(0, 5);
}
