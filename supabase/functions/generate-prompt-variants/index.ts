import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_MODELS = ['chatgpt', 'gemini', 'perplexity'] as const;
type TargetModel = typeof TARGET_MODELS[number];

// Selection criteria for variant generation
const ELIGIBLE_FUNNEL_STAGES = ['MOFU', 'BOFU'];
const ELIGIBLE_INTENT_TYPES = ['comparison', 'recommendation', 'action', 'local_intent'];
const ELIGIBLE_SUGGESTION_TYPES = ['competitive', 'local_geo', 'core_intent'];
const MAX_BASE_PROMPTS = 10;
const MIN_PROMPT_LENGTH = 35;
const MAX_PROMPT_LENGTH = 110;

interface PromptSuggestion {
  id: string;
  org_id: string;
  prompts_json: {
    prompt: string;
    intent_type: string;
    funnel_stage: string;
    target_offering?: string;
    seed_topic?: string;
  }[];
  suggestion_type: string;
  generation_params?: {
    contextId?: string;
    offerings?: { primary?: string[] };
  };
}

interface EligiblePrompt {
  suggestionId: string;
  promptIndex: number;
  prompt: string;
  intent_type: string;
  funnel_stage: string;
  suggestion_type: string;
  target_offering?: string;
  priority: number;
}

interface VariantResult {
  base_prompt_id: string;
  chatgpt: string;
  gemini: string;
  perplexity: string;
}

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function calculatePriority(prompt: EligiblePrompt, primaryOfferings: string[]): number {
  let priority = 0;
  
  // BOFU > MOFU
  if (prompt.funnel_stage === 'BOFU') priority += 100;
  else if (prompt.funnel_stage === 'MOFU') priority += 50;
  
  // competitive > local_geo > core_intent
  if (prompt.suggestion_type === 'competitive') priority += 30;
  else if (prompt.suggestion_type === 'local_geo') priority += 20;
  else if (prompt.suggestion_type === 'core_intent') priority += 10;
  
  // Prefer prompts with target_offering in primary offerings
  if (prompt.target_offering && primaryOfferings.includes(prompt.target_offering)) {
    priority += 15;
  }
  
  // Prefer shorter prompts (35-110 chars)
  const len = prompt.prompt.length;
  if (len >= MIN_PROMPT_LENGTH && len <= MAX_PROMPT_LENGTH) {
    priority += 25;
  }
  
  return priority;
}

function selectEligiblePrompts(
  suggestions: PromptSuggestion[],
  existingVariantIds: Set<string>,
  primaryOfferings: string[]
): EligiblePrompt[] {
  const candidates: EligiblePrompt[] = [];
  
  for (const suggestion of suggestions) {
    if (!suggestion.prompts_json || !Array.isArray(suggestion.prompts_json)) continue;
    
    for (let i = 0; i < suggestion.prompts_json.length; i++) {
      const p = suggestion.prompts_json[i];
      const basePromptId = `${suggestion.id}:${i}`;
      
      // Skip if already has variants
      if (existingVariantIds.has(basePromptId)) continue;
      
      // Check eligibility criteria
      if (!ELIGIBLE_FUNNEL_STAGES.includes(p.funnel_stage)) continue;
      if (!ELIGIBLE_INTENT_TYPES.includes(p.intent_type)) continue;
      if (p.prompt.length < 6 || p.prompt.length > 180) continue;
      
      // Check suggestion type OR target_offering in primary
      const isEligibleType = ELIGIBLE_SUGGESTION_TYPES.includes(suggestion.suggestion_type);
      const isPrimaryOffering = p.target_offering && primaryOfferings.includes(p.target_offering);
      
      if (!isEligibleType && !isPrimaryOffering) continue;
      
      const candidate: EligiblePrompt = {
        suggestionId: suggestion.id,
        promptIndex: i,
        prompt: p.prompt,
        intent_type: p.intent_type,
        funnel_stage: p.funnel_stage,
        suggestion_type: suggestion.suggestion_type,
        target_offering: p.target_offering,
        priority: 0,
      };
      
      candidate.priority = calculatePriority(candidate, primaryOfferings);
      candidates.push(candidate);
    }
  }
  
  // Sort by priority descending, take top MAX_BASE_PROMPTS
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates.slice(0, MAX_BASE_PROMPTS);
}

function buildVariantPrompt(prompts: EligiblePrompt[]): string {
  const promptList = prompts.map((p, i) => ({
    id: `${p.suggestionId}:${p.promptIndex}`,
    prompt: p.prompt,
    intent_type: p.intent_type,
    funnel_stage: p.funnel_stage,
  }));
  
  return `You rewrite prompts for different LLM styles. Output ONLY valid JSON. No markdown.

Given these base prompts (with intent + funnel context), generate one phrasing variant per model:
- chatgpt
- gemini
- perplexity

## BASE PROMPTS

${JSON.stringify(promptList, null, 2)}

## PHRASING RULES BY MODEL

**chatgpt:**
- Conversational and casual
- First or second person
- Clear but informal ("Hey, can you..." / "I'm looking for...")

**gemini:**
- Factual and neutral
- Concise, information-seeking
- Direct questions ("What are..." / "Which is...")

**perplexity:**
- Research-oriented
- May imply sources, comparisons, or evidence
- Slightly longer acceptable ("I need a comprehensive comparison...")

## CRITICAL CONSTRAINTS

1. Meaning must stay IDENTICAL - only phrasing/tone changes
2. Do NOT introduce new intent or topics
3. Do NOT change geographic meaning if present
4. Do NOT add competitor names not in original
5. Variant length: 6-180 characters each
6. Variants must differ from base prompt
7. Variants must differ from each other

## OUTPUT FORMAT

Return ONLY this JSON:
{
  "variants": [
    {
      "base_prompt_id": "uuid:index",
      "chatgpt": "variant text",
      "gemini": "variant text",
      "perplexity": "variant text"
    }
  ]
}`;
}

async function generateWithLLM(prompts: EligiblePrompt[]): Promise<VariantResult[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) throw new Error('OpenAI API key not configured');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON-only response generator. Output ONLY valid JSON, no explanations or markdown.' },
        { role: 'user', content: buildVariantPrompt(prompts) }
      ],
      temperature: 0.6,
      max_tokens: 3000,
    }),
  });
  
  if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Clean and parse JSON
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();
  
  const parsed = JSON.parse(cleaned);
  return parsed.variants || [];
}

function validateVariants(
  variants: VariantResult[],
  basePrompts: Map<string, string>
): { valid: VariantResult[]; errors: string[] } {
  const valid: VariantResult[] = [];
  const errors: string[] = [];
  
  for (const v of variants) {
    const baseText = basePrompts.get(v.base_prompt_id);
    if (!baseText) {
      errors.push(`Unknown base_prompt_id: ${v.base_prompt_id}`);
      continue;
    }
    
    // Check all 3 models present
    if (!v.chatgpt || !v.gemini || !v.perplexity) {
      errors.push(`Missing model variant for ${v.base_prompt_id}`);
      continue;
    }
    
    // Check length constraints
    const allValid = [v.chatgpt, v.gemini, v.perplexity].every(
      text => text.length >= 6 && text.length <= 180
    );
    if (!allValid) {
      errors.push(`Invalid length for variant of ${v.base_prompt_id}`);
      continue;
    }
    
    // Check variants differ from base
    const baseLower = baseText.toLowerCase().trim();
    const allDifferent = [v.chatgpt, v.gemini, v.perplexity].every(
      text => text.toLowerCase().trim() !== baseLower
    );
    if (!allDifferent) {
      errors.push(`Variant identical to base for ${v.base_prompt_id}`);
      continue;
    }
    
    // Check variants differ from each other
    const variantSet = new Set([
      v.chatgpt.toLowerCase().trim(),
      v.gemini.toLowerCase().trim(),
      v.perplexity.toLowerCase().trim(),
    ]);
    if (variantSet.size !== 3) {
      errors.push(`Duplicate variants for ${v.base_prompt_id}`);
      continue;
    }
    
    valid.push(v);
  }
  
  return { valid, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get user's org
    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();
    
    if (!userData?.org_id) {
      return new Response(JSON.stringify({ error: 'No organization found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const orgId = userData.org_id;
    const body = await req.json().catch(() => ({}));
    const brandId = body.brandId;
    
    console.log(`[generate-prompt-variants] Starting for org ${orgId}, brand ${brandId || 'none'}`);
    
    // Fetch organization and brand data for primary offerings
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, domain, products_services, keywords')
      .eq('id', orgId)
      .single();
    
    let primaryOfferings: string[] = [];
    if (brandId) {
      const { data: brandData } = await supabase
        .from('brands')
        .select('products_services, keywords')
        .eq('id', brandId)
        .single();
      
      if (brandData?.products_services) {
        primaryOfferings = brandData.products_services.split(/[,;•\n]/).map(s => s.trim()).filter(Boolean).slice(0, 5);
      }
    }
    if (primaryOfferings.length === 0 && orgData?.products_services) {
      primaryOfferings = orgData.products_services.split(/[,;•\n]/).map(s => s.trim()).filter(Boolean).slice(0, 5);
    }
    
    // Fetch existing prompt_suggestions
    let suggestionQuery = supabase
      .from('prompt_suggestions')
      .select('id, org_id, prompts_json, suggestion_type, generation_params')
      .eq('org_id', orgId)
      .eq('status', 'ready')
      .in('suggestion_type', ELIGIBLE_SUGGESTION_TYPES);
    
    if (brandId) {
      suggestionQuery = suggestionQuery.eq('brand_id', brandId);
    }
    
    const { data: suggestions, error: suggestionError } = await suggestionQuery;
    
    if (suggestionError) {
      console.error('[generate-prompt-variants] Error fetching suggestions:', suggestionError);
      throw new Error('Failed to fetch prompt suggestions');
    }
    
    if (!suggestions || suggestions.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No eligible prompt suggestions found',
        variantsCreated: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[generate-prompt-variants] Found ${suggestions.length} suggestion records`);
    
    // Fetch existing variants to avoid duplicates
    const suggestionIds = suggestions.map(s => s.id);
    const { data: existingVariants } = await supabase
      .from('prompt_variants')
      .select('base_prompt_id')
      .eq('org_id', orgId);
    
    const existingVariantIds = new Set<string>();
    if (existingVariants) {
      for (const v of existingVariants) {
        existingVariantIds.add(v.base_prompt_id);
      }
    }
    
    // Select eligible prompts
    const eligiblePrompts = selectEligiblePrompts(
      suggestions as PromptSuggestion[],
      existingVariantIds,
      primaryOfferings
    );
    
    if (eligiblePrompts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All eligible prompts already have variants',
        variantsCreated: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[generate-prompt-variants] Selected ${eligiblePrompts.length} prompts for variant generation`);
    
    // Build base prompt map
    const basePromptMap = new Map<string, string>();
    for (const p of eligiblePrompts) {
      basePromptMap.set(`${p.suggestionId}:${p.promptIndex}`, p.prompt);
    }
    
    // Generate variants with LLM
    let variants = await generateWithLLM(eligiblePrompts);
    console.log(`[generate-prompt-variants] LLM returned ${variants.length} variant sets`);
    
    // Validate
    let { valid: validVariants, errors } = validateVariants(variants, basePromptMap);
    
    // Repair pass if needed
    if (validVariants.length < eligiblePrompts.length && errors.length > 0) {
      console.log(`[generate-prompt-variants] Attempting repair for ${errors.length} errors`);
      
      // Find prompts needing repair
      const validIds = new Set(validVariants.map(v => v.base_prompt_id));
      const needsRepair = eligiblePrompts.filter(
        p => !validIds.has(`${p.suggestionId}:${p.promptIndex}`)
      );
      
      if (needsRepair.length > 0) {
        try {
          const repairVariants = await generateWithLLM(needsRepair);
          const { valid: repairedValid } = validateVariants(repairVariants, basePromptMap);
          validVariants = [...validVariants, ...repairedValid];
        } catch (repairError) {
          console.error('[generate-prompt-variants] Repair failed:', repairError);
        }
      }
    }
    
    if (validVariants.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No valid variants generated',
        errors,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Insert variants into database
    const variantInserts: {
      org_id: string;
      base_prompt_id: string;
      model: TargetModel;
      variant_text: string;
      variant_hash: string;
    }[] = [];
    
    for (const v of validVariants) {
      for (const model of TARGET_MODELS) {
        const variantText = v[model];
        const hash = await computeHash(`${v.base_prompt_id}:${model}:${variantText}`);
        
        variantInserts.push({
          org_id: orgId,
          base_prompt_id: v.base_prompt_id,
          model,
          variant_text: variantText,
          variant_hash: hash,
        });
      }
    }
    
    const { error: insertError } = await supabase
      .from('prompt_variants')
      .upsert(variantInserts, { 
        onConflict: 'base_prompt_id,model',
        ignoreDuplicates: false,
      });
    
    if (insertError) {
      console.error('[generate-prompt-variants] Insert error:', insertError);
      throw new Error('Failed to store variants');
    }
    
    console.log(`[generate-prompt-variants] Stored ${variantInserts.length} variants for ${validVariants.length} base prompts`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      variantsCreated: validVariants.length,
      totalVariantRecords: variantInserts.length,
      eligiblePrompts: eligiblePrompts.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[generate-prompt-variants] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
