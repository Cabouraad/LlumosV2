import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TYPES =============
type IntentType = 'discovery' | 'validation' | 'comparison' | 'recommendation' | 'action' | 'local_intent';
type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';
type SeedTopic = 'alternatives' | 'vs' | 'reviews' | 'pricing' | 'switching';

interface GeneratedPrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string;
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
  competitor_name?: string;
}

interface CompetitorParams {
  perCompetitor?: number;
  maxCompetitors?: number;
}

interface ContextJson {
  businessName: string;
  primaryDomain: string;
  industry: string;
  primaryProducts: string[];
  brandStrength: { type: 'known' | 'challenger' | 'emerging' | 'unknown' };
  competitors: { known: string[]; inferred: string[] };
  offerings?: { primary: string[]; secondary: string[] };
}

// ============= PROHIBITED WORDS =============
const PROHIBITED_WORDS = ['scam', 'fraud', 'illegal', 'ripoff', 'rip-off', 'rip off'];

// ============= HELPERS =============
async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

function containsProhibited(text: string): boolean {
  const lower = text.toLowerCase();
  return PROHIBITED_WORDS.some(word => lower.includes(word));
}

function determineFunnelStage(prompt: string): FunnelStage {
  const bofulKeywords = ['pricing', 'price', 'buy', 'book', 'near me', 'quote', 'cost', 'switch from', 'switching'];
  const lower = prompt.toLowerCase();
  if (bofulKeywords.some(kw => lower.includes(kw))) return 'BOFU';
  return 'MOFU';
}

function normalizePrompt(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function validatePrompt(p: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const prompt = p as Record<string, unknown>;
  if (!prompt || typeof prompt !== 'object') return { valid: false, errors: ['Not an object'] };
  if (typeof prompt.prompt !== 'string' || prompt.prompt.length < 6) errors.push('Prompt too short');
  if (typeof prompt.prompt === 'string' && prompt.prompt.length > 160) errors.push('Prompt too long');
  if (typeof prompt.prompt === 'string' && containsProhibited(prompt.prompt)) errors.push('Contains prohibited words');
  const validIntents: IntentType[] = ['comparison', 'recommendation', 'validation', 'action'];
  if (!validIntents.includes(prompt.intent_type as IntentType)) errors.push(`Invalid intent_type: ${prompt.intent_type}`);
  if (typeof prompt.why_relevant !== 'string') errors.push('why_relevant missing');
  if (typeof prompt.target_offering !== 'string') errors.push('target_offering missing');
  if (!['TOFU', 'MOFU', 'BOFU'].includes(prompt.funnel_stage as string)) errors.push(`Invalid funnel_stage: ${prompt.funnel_stage}`);
  if (typeof prompt.seed_topic !== 'string') errors.push('seed_topic missing');
  return { valid: errors.length === 0, errors };
}

function validateAllPrompts(prompts: unknown[], competitorsUsed: string[]): { valid: boolean; errors: string[]; validated: GeneratedPrompt[] } {
  const errors: string[] = [];
  const validated: GeneratedPrompt[] = [];
  const seenPrompts = new Set<string>();
  const competitorCounts: Record<string, number> = {};
  
  if (!Array.isArray(prompts)) return { valid: false, errors: ['Response is not an array'], validated: [] };
  
  for (const c of competitorsUsed) competitorCounts[c.toLowerCase()] = 0;
  
  for (const p of prompts) {
    const { valid, errors: promptErrors } = validatePrompt(p);
    if (!valid) { errors.push(`Invalid prompt: ${promptErrors.join(', ')}`); continue; }
    
    const typedPrompt = p as GeneratedPrompt;
    const normalizedText = normalizePrompt(typedPrompt.prompt);
    
    if (seenPrompts.has(normalizedText)) { continue; } // Skip duplicates silently
    seenPrompts.add(normalizedText);
    
    // Check which competitor this prompt is about
    const promptLower = typedPrompt.prompt.toLowerCase();
    for (const c of competitorsUsed) {
      if (promptLower.includes(c.toLowerCase())) {
        competitorCounts[c.toLowerCase()]++;
        typedPrompt.competitor_name = c;
        break;
      }
    }
    
    validated.push(typedPrompt);
  }
  
  // Check minimum per competitor (4 prompts each)
  for (const c of competitorsUsed) {
    if (competitorCounts[c.toLowerCase()] < 4) {
      errors.push(`Competitor "${c}" has only ${competitorCounts[c.toLowerCase()]} prompts (need 4)`);
    }
  }
  
  return { valid: errors.length === 0, errors, validated };
}

function buildLLMPrompt(context: ContextJson, competitorsUsed: string[], params: CompetitorParams): string {
  const perCompetitor = params.perCompetitor || 4;
  const totalCount = perCompetitor * competitorsUsed.length;
  const useBrandName = context.brandStrength.type === 'known' || context.brandStrength.type === 'challenger';
  const brandRef = useBrandName ? context.businessName : `a [${context.industry}] solution`;
  const offerings = context.offerings?.primary || context.primaryProducts || [];
  
  return `You output ONLY valid JSON. No markdown.

## CONTEXT
- Business: ${context.businessName}
- Industry: ${context.industry}
- Brand Strength: ${context.brandStrength.type}
- Offerings: ${offerings.slice(0, 5).join(', ') || 'general services'}

## COMPETITORS TO TARGET
${competitorsUsed.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## YOUR TASK
Generate exactly ${perCompetitor} competitive interception prompts for EACH competitor (${totalCount} total).

For EACH competitor, you MUST include:
- 2 "vs" comparison prompts (e.g., "${competitorsUsed[0]} vs alternatives")
- 1 "alternative to" prompt (e.g., "best alternative to ${competitorsUsed[0]}")
- 1 "reviews/trust" prompt (e.g., "is ${competitorsUsed[0]} worth it")

## RULES
1. Write EXACTLY how a human asks ChatGPT - casual, conversational.
2. Include the competitor name VERBATIM in each prompt.
3. ${useBrandName ? `Use "${context.businessName}" in comparison prompts where natural.` : `Do NOT use brand name. Use category-level phrasing like "best ${context.industry} alternative".`}
4. intent_type must be: comparison, recommendation, validation, or action (rare)
5. funnel_stage: MOFU by default. Use BOFU if prompt includes pricing/buy/book/switch/near me.
6. seed_topic must be one of: alternatives, vs, reviews, pricing, switching
7. target_offering: one of [${offerings.slice(0, 5).join(', ')}, general]
8. DO NOT use defamatory language. No "scam", "fraud", "illegal", "ripoff".
9. Each prompt must be unique (case-insensitive).
10. Prompt length: 6-160 characters.

## OUTPUT FORMAT
Return ONLY this JSON:
{
  "prompts": [
    {
      "prompt": "string with competitor name included",
      "intent_type": "comparison|recommendation|validation|action",
      "why_relevant": "string (<=120 chars)",
      "target_offering": "string",
      "funnel_stage": "MOFU|BOFU",
      "needs_geo_variant": false,
      "seed_topic": "alternatives|vs|reviews|pricing|switching"
    }
  ]
}

Generate exactly ${totalCount} prompts now.`;
}

async function generateWithLLM(context: ContextJson, competitorsUsed: string[], params: CompetitorParams): Promise<{ prompts: GeneratedPrompt[]; model: string }> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) throw new Error('OpenAI API key not configured');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON-only response generator. Output ONLY valid JSON, no explanations or markdown.' },
        { role: 'user', content: buildLLMPrompt(context, competitorsUsed, params) }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });
  
  if (!response.ok) {
    const errText = await response.text();
    console.error('LLM API error:', errText);
    throw new Error(`LLM API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  let parsed: { prompts: GeneratedPrompt[] };
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse LLM response:', content);
    throw new Error('Failed to parse LLM response');
  }
  
  return { prompts: parsed.prompts || [], model: 'gpt-4o-mini' };
}

async function repairWithLLM(prompts: GeneratedPrompt[], errors: string[], context: ContextJson, competitorsUsed: string[]): Promise<GeneratedPrompt[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) throw new Error('OpenAI API key not configured');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON repair assistant. Fix the validation errors and return corrected JSON only.' },
        { role: 'user', content: `These prompts have validation errors:
${errors.join('\n')}

Original prompts: ${JSON.stringify(prompts)}

Competitors: ${competitorsUsed.join(', ')}

Fix the issues:
1. Ensure each competitor has at least 4 prompts (2 vs, 1 alternative, 1 review)
2. Remove any prohibited words (scam, fraud, illegal, ripoff)
3. Ensure all prompts are unique
4. Keep prompts 6-160 chars

Return ONLY the corrected JSON: { "prompts": [...] }` }
      ],
      temperature: 0.5,
      max_tokens: 3000,
    }),
  });
  
  if (!response.ok) throw new Error('Repair LLM failed');
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.prompts || prompts;
  } catch {
    return prompts;
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
    let params: CompetitorParams = { perCompetitor: 4, maxCompetitors: 5 };
    
    try {
      const body = await req.json();
      brandId = body?.brandId || body?.domainId || null;
      if (body?.params) params = { ...params, ...body.params };
      console.log('Competitor prompts request:', { brandId, params });
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

    // Get org and brand data
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, domain, business_description, products_services, target_audience, keywords, competitors, business_city, business_state, business_country')
      .eq('id', orgId)
      .single();
    
    if (!orgData) throw new Error('Organization not found');

    let brandData = null;
    if (brandId) {
      const { data } = await supabase
        .from('brands')
        .select('name, domain, business_description, products_services, target_audience, keywords')
        .eq('id', brandId)
        .eq('org_id', orgId)
        .single();
      brandData = data;
    }

    // Build context
    const businessName = brandData?.name || orgData.name;
    const domain = brandData?.domain || orgData.domain;
    const description = brandData?.business_description || orgData.business_description || '';
    const products = (brandData?.products_services || orgData.products_services || '').split(/[,;•\n]/).map((s: string) => s.trim()).filter((s: string) => s.length > 2);
    
    // Determine competitors
    let competitors = orgData.competitors || [];
    const hasValidCompetitors = competitors.length >= 1;
    
    // If no competitors, check if we can infer
    if (!hasValidCompetitors) {
      const industry = description.toLowerCase();
      const hasIndustry = industry.length > 10;
      const hasPrimaryOffering = products.length > 0;
      
      if (!hasIndustry || !hasPrimaryOffering) {
        console.log('Cannot generate competitor prompts: no competitors and cannot infer');
        return new Response(JSON.stringify({
          success: true,
          skipped: true,
          reason: 'no_competitors',
          message: 'Competitor prompts require at least one competitor or enough context to infer them.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const competitorsToUse = competitors.slice(0, params.maxCompetitors || 5);
    
    if (competitorsToUse.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'no_competitors',
        message: 'No competitors available for prompt generation.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build context object
    const contextJson: ContextJson = {
      businessName,
      primaryDomain: domain,
      industry: description.slice(0, 200) || 'General Business',
      primaryProducts: products.slice(0, 10),
      brandStrength: { type: competitors.length > 2 ? 'challenger' : 'emerging' },
      competitors: { known: competitors, inferred: [] },
      offerings: { primary: products.slice(0, 5), secondary: products.slice(5, 10) }
    };

    // Compute hash
    const generationParams = { 
      perCompetitor: params.perCompetitor, 
      maxCompetitors: params.maxCompetitors, 
      competitorsUsed: competitorsToUse 
    };
    const promptHash = await computeHash(
      canonicalJson(contextJson) + canonicalJson(generationParams) + ':competitive:v1'
    );

    // Check cache
    const { data: cachedRow } = await supabase
      .from('prompt_suggestions')
      .select('*')
      .eq('org_id', orgId)
      .eq('suggestion_type', 'competitive')
      .eq('prompt_hash', promptHash)
      .eq('status', 'ready')
      .maybeSingle();

    if (cachedRow) {
      console.log('Returning cached competitive prompts');
      return new Response(JSON.stringify({
        success: true,
        cached: true,
        data: cachedRow.prompts_json,
        suggestionId: cachedRow.id,
        competitorsUsed: competitorsToUse
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
        suggestion_type: 'competitive',
        prompt_hash: promptHash,
        generation_params: generationParams,
        status: 'building',
        prompts_json: [],
        version: 1
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      // Might be a race condition - try to fetch existing
      const { data: existingRow } = await supabase
        .from('prompt_suggestions')
        .select('*')
        .eq('org_id', orgId)
        .eq('suggestion_type', 'competitive')
        .eq('prompt_hash', promptHash)
        .maybeSingle();
      
      if (existingRow) {
        return new Response(JSON.stringify({
          success: true,
          cached: true,
          data: existingRow.prompts_json,
          suggestionId: existingRow.id,
          competitorsUsed: competitorsToUse
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Failed to create prompt suggestion record');
    }

    const suggestionId = insertedRow.id;

    // Generate with LLM
    console.log(`Generating competitive prompts for ${competitorsToUse.length} competitors...`);
    let result = await generateWithLLM(contextJson, competitorsToUse, params);
    
    // Validate
    let validation = validateAllPrompts(result.prompts, competitorsToUse);
    
    // One repair pass if needed
    if (!validation.valid && validation.validated.length > 0) {
      console.log('Running repair pass...');
      const repaired = await repairWithLLM(validation.validated, validation.errors, contextJson, competitorsToUse);
      validation = validateAllPrompts(repaired, competitorsToUse);
    }

    // Post-process: ensure funnel stages are correct
    const processedPrompts = validation.validated.map(p => ({
      ...p,
      funnel_stage: determineFunnelStage(p.prompt),
      needs_geo_variant: false
    }));

    // Update record
    const finalStatus = processedPrompts.length >= competitorsToUse.length * 2 ? 'ready' : 'partial';
    
    await supabase
      .from('prompt_suggestions')
      .update({
        status: finalStatus,
        prompts_json: processedPrompts,
        llm_model: result.model,
        error_message: validation.valid ? null : validation.errors.slice(0, 3).join('; ')
      })
      .eq('id', suggestionId);

    console.log(`Generated ${processedPrompts.length} competitive prompts, status: ${finalStatus}`);

    return new Response(JSON.stringify({
      success: true,
      data: processedPrompts,
      suggestionId,
      competitorsUsed: competitorsToUse,
      status: finalStatus,
      validationErrors: validation.valid ? null : validation.errors.slice(0, 5)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-competitor-prompts:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
