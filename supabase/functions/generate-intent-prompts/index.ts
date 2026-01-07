import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { 
  buildPromptIntelligenceContext, 
  formatContextForPrompt,
  type PromptIntelligenceContext 
} from '../_shared/prompt-intelligence/context.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= STRICT INTENT TAXONOMY =============
const INTENT_TYPES = ['discovery', 'validation', 'comparison', 'recommendation', 'action', 'local_intent'] as const;
type IntentType = typeof INTENT_TYPES[number];

const FUNNEL_STAGES = ['TOFU', 'MOFU', 'BOFU'] as const;
type FunnelStage = typeof FUNNEL_STAGES[number];

// Intent to Funnel mapping rules
const INTENT_FUNNEL_MAP: Record<IntentType, FunnelStage> = {
  discovery: 'TOFU',
  validation: 'MOFU',
  comparison: 'MOFU',
  recommendation: 'MOFU', // Can be BOFU too
  action: 'BOFU',
  local_intent: 'BOFU', // Default BOFU, can be MOFU
};

// ============= OUTPUT SCHEMA =============
interface GeneratedPrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string; // <= 140 chars
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
}

interface GenerationParams {
  countPerIntent?: number;
  language?: string;
}

// ============= HELPER FUNCTIONS =============

/**
 * Compute SHA256 hash for caching
 */
async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Canonical JSON for deterministic hashing
 */
function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

/**
 * Validate a single prompt object
 */
function validatePrompt(p: unknown, offerings: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const prompt = p as Record<string, unknown>;
  
  if (!prompt || typeof prompt !== 'object') {
    return { valid: false, errors: ['Not an object'] };
  }
  
  // Check required fields
  if (typeof prompt.prompt !== 'string' || prompt.prompt.length < 6) {
    errors.push('Prompt too short (min 6 chars)');
  }
  if (typeof prompt.prompt === 'string' && prompt.prompt.length > 140) {
    errors.push('Prompt too long (max 140 chars)');
  }
  
  if (!INTENT_TYPES.includes(prompt.intent_type as IntentType)) {
    errors.push(`Invalid intent_type: ${prompt.intent_type}`);
  }
  
  if (typeof prompt.why_relevant !== 'string' || prompt.why_relevant.length > 140) {
    errors.push('why_relevant missing or too long');
  }
  
  if (typeof prompt.target_offering !== 'string') {
    errors.push('target_offering missing');
  }
  
  if (!FUNNEL_STAGES.includes(prompt.funnel_stage as FunnelStage)) {
    errors.push(`Invalid funnel_stage: ${prompt.funnel_stage}`);
  }
  
  if (typeof prompt.needs_geo_variant !== 'boolean') {
    errors.push('needs_geo_variant must be boolean');
  }
  
  if (typeof prompt.seed_topic !== 'string') {
    errors.push('seed_topic missing');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate all prompts and check distribution
 */
function validateAllPrompts(
  prompts: unknown[], 
  expectedCount: number, 
  offerings: string[]
): { valid: boolean; errors: string[]; validated: GeneratedPrompt[] } {
  const errors: string[] = [];
  const validated: GeneratedPrompt[] = [];
  const intentCounts: Record<string, number> = {};
  const seenPrompts = new Set<string>();
  
  if (!Array.isArray(prompts)) {
    return { valid: false, errors: ['Response is not an array'], validated: [] };
  }
  
  if (prompts.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} prompts, got ${prompts.length}`);
  }
  
  for (const p of prompts) {
    const { valid, errors: promptErrors } = validatePrompt(p, offerings);
    
    if (!valid) {
      errors.push(`Invalid prompt: ${promptErrors.join(', ')}`);
      continue;
    }
    
    const typedPrompt = p as GeneratedPrompt;
    
    // Check uniqueness
    const normalizedText = typedPrompt.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenPrompts.has(normalizedText)) {
      errors.push(`Duplicate prompt: ${typedPrompt.prompt.slice(0, 50)}...`);
      continue;
    }
    seenPrompts.add(normalizedText);
    
    // Count intents
    intentCounts[typedPrompt.intent_type] = (intentCounts[typedPrompt.intent_type] || 0) + 1;
    validated.push(typedPrompt);
  }
  
  // Check at least 1 prompt per intent type
  for (const intent of INTENT_TYPES) {
    if (!intentCounts[intent] || intentCounts[intent] < 1) {
      errors.push(`Missing prompts for intent: ${intent}`);
    }
  }
  
  return { valid: errors.length === 0, errors, validated };
}

/**
 * Post-process prompts for safety and quality
 */
function postProcessPrompts(
  prompts: GeneratedPrompt[], 
  context: PromptIntelligenceContext
): GeneratedPrompt[] {
  const processed: GeneratedPrompt[] = [];
  const seenNormalized = new Set<string>();
  
  for (const p of prompts) {
    // Normalize for dedup
    const normalized = p.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenNormalized.has(normalized)) continue;
    seenNormalized.add(normalized);
    
    // If brand is unknown/challenger, reduce brand-name usage (unless validation/action intent)
    let prompt = p.prompt;
    if (
      context.brandStrength.type !== 'known' &&
      !['validation', 'action'].includes(p.intent_type) &&
      prompt.toLowerCase().includes(context.businessName.toLowerCase())
    ) {
      // Replace brand name with generic phrasing
      const regex = new RegExp(context.businessName, 'gi');
      prompt = prompt.replace(regex, 'this tool');
    }
    
    processed.push({ ...p, prompt });
  }
  
  return processed;
}

/**
 * Build the LLM prompt for generating intent-driven prompts
 */
function buildLLMPrompt(context: PromptIntelligenceContext, params: GenerationParams): string {
  const countPerIntent = params.countPerIntent || 5;
  const totalCount = countPerIntent * 6;
  const formattedContext = formatContextForPrompt(context);
  
  const offerings = [...context.primaryProducts, ...context.serviceCategories, 'general'];
  
  return `You are a prompt generator for AI search. Output ONLY valid JSON. No markdown.

${formattedContext}

## YOUR TASK

Generate exactly ${countPerIntent} prompts for EACH of these 6 intent types (${totalCount} total):

1. **discovery** - Learning/awareness prompts (→ TOFU)
   Users exploring, learning, becoming aware of solutions.
   Examples: "What is...", "How does...", "Can you explain..."
   
2. **validation** - Trust/reviews/proof prompts (→ MOFU)
   Users seeking social proof, reviews, credibility.
   Examples: "Is [brand] good?", "What do people think of...", "Reviews of..."
   
3. **comparison** - Alternatives/vs/best prompts (→ MOFU)
   Users comparing options.
   Examples: "[X] vs [Y]", "Best option for...", "Alternatives to..."
   
4. **recommendation** - Decision guidance prompts (→ MOFU or BOFU)
   Users wanting personalized recommendations.
   Examples: "Which should I choose for...", "What would you recommend..."
   
5. **action** - Buy/visit/contact prompts (→ BOFU)
   Users ready to take action.
   Examples: "Where can I buy...", "How do I sign up for...", "Pricing for..."
   
6. **local_intent** - Near me/city prompts (→ BOFU)
   Users with geographic intent.
   Examples: "Best [service] near me", "Top [category] in [city]"
   ${context.geographicScope.type === 'global' ? 'Use "near me" phrasing and set needs_geo_variant=true since no specific location is available.' : ''}

## CRITICAL RULES

1. Write EXACTLY how a human speaks to ChatGPT - casual, first-person, with context.
2. NO SEO-style keyword phrases.
3. Each prompt must be unique (case-insensitive).
4. Prompt length: 6-140 characters.
5. why_relevant must be <= 140 chars, practical, user-facing.
6. target_offering: one of [${offerings.slice(0, 8).join(', ')}] or "general"
7. seed_topic: concise topic label (e.g., "pricing", "reviews", "best for beginners")
8. needs_geo_variant: true only if prompt can be localized and geo.scope is local/regional

${context.competitors.known.length > 0 ? `
## COMPETITORS TO REFERENCE
${context.competitors.known.join(', ')}
Include competitor names naturally in comparison and validation prompts.
` : ''}

## OUTPUT FORMAT

Return ONLY this JSON structure:
{
  "prompts": [
    {
      "prompt": "string (the actual prompt text)",
      "intent_type": "discovery|validation|comparison|recommendation|action|local_intent",
      "why_relevant": "string (<=140 chars, user-facing explanation)",
      "target_offering": "string (from offerings list or 'general')",
      "funnel_stage": "TOFU|MOFU|BOFU",
      "needs_geo_variant": boolean,
      "seed_topic": "string (concise topic label)"
    }
  ]
}

Generate exactly ${totalCount} prompts now.`;
}

/**
 * Call LLM to generate prompts
 */
async function generateWithLLM(
  context: PromptIntelligenceContext, 
  params: GenerationParams
): Promise<{ prompts: GeneratedPrompt[]; model: string }> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const systemPrompt = 'You are a JSON-only response generator. Output ONLY valid JSON, no explanations or markdown.';
  const userPrompt = buildLLMPrompt(context, params);
  
  console.log('Calling LLM for prompt generation...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('LLM API error:', error);
    throw new Error(`LLM API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const model = data.model || 'gpt-4o-mini';
  
  // Parse JSON from response
  let parsed: { prompts: unknown[] };
  try {
    // Try to extract JSON from potential markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    parsed = JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error('Failed to parse LLM response:', content);
    throw new Error('Failed to parse LLM response as JSON');
  }
  
  if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
    throw new Error('LLM response missing prompts array');
  }
  
  return { prompts: parsed.prompts as GeneratedPrompt[], model };
}

/**
 * Repair pass - re-prompt with validation errors
 */
async function repairPrompts(
  context: PromptIntelligenceContext,
  params: GenerationParams,
  originalPrompts: GeneratedPrompt[],
  errors: string[]
): Promise<{ prompts: GeneratedPrompt[]; model: string }> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const countPerIntent = params.countPerIntent || 5;
  const totalCount = countPerIntent * 6;
  
  const repairPrompt = `The previous generation had validation errors. Fix them:

ERRORS:
${errors.slice(0, 10).map(e => `- ${e}`).join('\n')}

ORIGINAL (PARTIAL):
${JSON.stringify(originalPrompts.slice(0, 5), null, 2)}

Generate ${totalCount} VALID prompts following the exact schema. Ensure:
1. Exactly ${countPerIntent} prompts per intent type
2. All prompts unique
3. All fields present and valid
4. why_relevant <= 140 chars
5. prompt 6-140 chars

Return ONLY valid JSON: { "prompts": [...] }`;

  console.log('Repair pass - calling LLM...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON-only response generator. Output ONLY valid JSON.' },
        { role: 'user', content: repairPrompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Repair pass failed');
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const model = data.model || 'gpt-4o-mini';
  
  let parsed: { prompts: unknown[] };
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    parsed = JSON.parse(jsonStr.trim());
  } catch (e) {
    throw new Error('Repair pass failed to produce valid JSON');
  }
  
  return { prompts: parsed.prompts as GeneratedPrompt[], model };
}

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request
    let brandId: string | null = null;
    let params: GenerationParams = { countPerIntent: 5, language: 'en-US' };
    
    try {
      const body = await req.json();
      brandId = body?.brandId || body?.domainId || null;
      if (body?.params) {
        params = { ...params, ...body.params };
      }
      console.log('Request:', { brandId, params });
    } catch (e) {
      console.log('No body or parse error');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user's org
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Could not get user organization');
    }

    const orgId = userData.org_id;
    console.log('Org ID:', orgId);

    // Get brand context if provided
    let brandContext: any = null;
    if (brandId) {
      const { data: brand } = await supabase
        .from('brands')
        .select('id, name, domain, business_description, products_services, keywords, target_audience')
        .eq('id', brandId)
        .eq('org_id', orgId)
        .single();
      
      if (brand) {
        brandContext = brand;
        console.log(`Using brand: ${brand.name}`);
      }
    }

    // Get organization data
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select(`
        name, domain, business_description, products_services, keywords, target_audience,
        competitors, enable_localized_prompts, localization_config,
        business_city, business_state, business_country
      `)
      .eq('id', orgId)
      .single();

    if (orgError || !orgData) {
      throw new Error('Could not get organization details');
    }

    // Build Prompt Intelligence Context
    const intelligenceContext = buildPromptIntelligenceContext({
      orgName: orgData.name,
      orgDomain: orgData.domain,
      businessDescription: orgData.business_description,
      productsServices: orgData.products_services,
      targetAudience: orgData.target_audience,
      keywords: orgData.keywords,
      competitors: orgData.competitors,
      businessCity: orgData.business_city,
      businessState: orgData.business_state,
      businessCountry: orgData.business_country,
      localizationConfig: orgData.localization_config as any,
      brandName: brandContext?.name,
      brandDomain: brandContext?.domain,
      brandDescription: brandContext?.business_description,
      brandProducts: brandContext?.products_services,
      brandKeywords: brandContext?.keywords,
      brandAudience: brandContext?.target_audience,
    });

    console.log('Context built:', intelligenceContext.businessName, intelligenceContext.industry);

    // Compute cache hash
    const contextJson = canonicalJson(intelligenceContext);
    const paramsJson = canonicalJson(params);
    const promptHash = await computeHash(`${contextJson}:${paramsJson}:v1`);
    
    console.log('Cache hash:', promptHash.slice(0, 16));

    // Check cache - use COALESCE for nullable brand_id matching
    const { data: cachedResult } = await supabase
      .from('prompt_suggestions')
      .select('*')
      .eq('org_id', orgId)
      .eq('version', 1)
      .eq('prompt_hash', promptHash)
      .eq('status', 'ready')
      .maybeSingle();

    // Also check with brand_id if provided
    if (!cachedResult && brandId) {
      const { data: brandCachedResult } = await supabase
        .from('prompt_suggestions')
        .select('*')
        .eq('org_id', orgId)
        .eq('brand_id', brandId)
        .eq('version', 1)
        .eq('prompt_hash', promptHash)
        .eq('status', 'ready')
        .maybeSingle();
      
      if (brandCachedResult) {
        console.log('Cache HIT (brand-specific)');
        return new Response(JSON.stringify({
          success: true,
          cached: true,
          data: brandCachedResult.prompts_json,
          context: intelligenceContext,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (cachedResult) {
      console.log('Cache HIT');
      return new Response(JSON.stringify({
        success: true,
        cached: true,
        data: cachedResult.prompts_json,
        context: intelligenceContext,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Cache MISS - generating new prompts');

    // Create building record
    const { data: buildingRecord, error: insertError } = await supabase
      .from('prompt_suggestions')
      .insert({
        org_id: orgId,
        brand_id: brandId,
        version: 1,
        status: 'building',
        prompt_hash: promptHash,
        generation_params: params,
        prompts_json: [],
      })
      .select()
      .single();

    if (insertError) {
      // Might be a race condition - try to fetch again
      console.log('Insert conflict, checking for existing:', insertError.message);
      const { data: existingResult } = await supabase
        .from('prompt_suggestions')
        .select('*')
        .eq('org_id', orgId)
        .eq('version', 1)
        .eq('prompt_hash', promptHash)
        .single();
      
      if (existingResult?.status === 'ready') {
        return new Response(JSON.stringify({
          success: true,
          cached: true,
          data: existingResult.prompts_json,
          context: intelligenceContext,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate prompts with LLM
    const countPerIntent = params.countPerIntent || 5;
    const expectedCount = countPerIntent * 6;
    const offerings = [...intelligenceContext.primaryProducts, ...intelligenceContext.serviceCategories];

    let result = await generateWithLLM(intelligenceContext, params);
    let validation = validateAllPrompts(result.prompts, expectedCount, offerings);

    // If invalid, try ONE repair pass
    if (!validation.valid) {
      console.log('Validation failed, attempting repair:', validation.errors.slice(0, 5));
      try {
        result = await repairPrompts(intelligenceContext, params, validation.validated, validation.errors);
        validation = validateAllPrompts(result.prompts, expectedCount, offerings);
      } catch (e) {
        console.error('Repair pass failed:', e);
      }
    }

    // If still invalid after repair, set error status
    if (!validation.valid) {
      console.error('Validation still failed after repair:', validation.errors);
      
      if (buildingRecord?.id) {
        await supabase
          .from('prompt_suggestions')
          .update({
            status: 'error',
            error_message: validation.errors.slice(0, 5).join('; '),
          })
          .eq('id', buildingRecord.id);
      }

      // Still return partial results
      return new Response(JSON.stringify({
        success: false,
        error: 'Validation failed',
        partialData: validation.validated,
        validationErrors: validation.errors,
        context: intelligenceContext,
      }), {
        status: 200, // Return 200 with partial data
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Post-process for quality
    const processedPrompts = postProcessPrompts(validation.validated, intelligenceContext);
    console.log(`Generated ${processedPrompts.length} valid prompts`);

    // Update record with success
    const recordId = buildingRecord?.id;
    if (recordId) {
      await supabase
        .from('prompt_suggestions')
        .update({
          status: 'ready',
          prompts_json: processedPrompts,
          llm_model: result.model,
        })
        .eq('id', recordId);
    } else {
      // Insert new if we didn't have a building record
      await supabase
        .from('prompt_suggestions')
        .upsert({
          org_id: orgId,
          brand_id: brandId,
          version: 1,
          status: 'ready',
          prompt_hash: promptHash,
          generation_params: params,
          prompts_json: processedPrompts,
          llm_model: result.model,
        });
    }

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      data: processedPrompts,
      context: intelligenceContext,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-intent-prompts:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
