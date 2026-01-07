import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= PROMPT INTELLIGENCE CONTEXT (INLINED) =============

interface PromptIntelligenceContext {
  businessName: string;
  primaryDomain: string;
  industry: string;
  primaryProducts: string[];
  serviceCategories: string[];
  idealCustomerProfile: {
    description: string;
    segments: string[];
    painPoints: string[];
  };
  aiIntentFocus: {
    discovery: boolean;
    validation: boolean;
    comparison: boolean;
    recommendation: boolean;
    action: boolean;
    localIntent: boolean;
  };
  brandStrength: {
    type: 'known' | 'challenger' | 'emerging';
    marketPosition: 'leader' | 'competitor' | 'niche';
  };
  geographicScope: {
    type: 'local' | 'regional' | 'national' | 'global';
    primaryLocation?: { city?: string; state?: string; country?: string };
    additionalLocations?: Array<{ city?: string; state?: string }>;
  };
  competitors: { known: string[]; inferred: string[] };
  conversionGoal: 'lead' | 'trial' | 'purchase' | 'demo' | 'store_visit' | 'consultation';
  keywords: string[];
  inferenceNotes: string[];
}

interface BuildContextInput {
  orgName: string;
  orgDomain: string;
  businessDescription?: string;
  productsServices?: string;
  targetAudience?: string;
  keywords?: string[];
  competitors?: string[];
  businessCity?: string;
  businessState?: string;
  businessCountry?: string;
  localizationConfig?: { additional_locations?: Array<{ city?: string; state?: string }> };
  brandName?: string;
  brandDomain?: string;
  brandDescription?: string;
  brandProducts?: string;
  brandKeywords?: string[];
  brandAudience?: string;
  hasLlmsTxt?: boolean;
}

function inferIndustry(domain: string, description?: string): string {
  const combined = `${domain.toLowerCase()} ${(description || '').toLowerCase()}`;
  const patterns: Record<string, string[]> = {
    'Software / SaaS': ['saas', 'software', 'platform', 'app', 'cloud', 'tech', 'ai', 'automation'],
    'E-commerce / Retail': ['shop', 'store', 'retail', 'ecommerce', 'buy', 'sell', 'marketplace'],
    'Healthcare': ['health', 'medical', 'clinic', 'hospital', 'wellness', 'care', 'therapy'],
    'Finance / Fintech': ['finance', 'bank', 'invest', 'insurance', 'fintech', 'pay', 'money'],
    'Real Estate': ['real estate', 'property', 'home', 'realty', 'housing', 'mortgage'],
    'Education': ['edu', 'learn', 'school', 'university', 'course', 'training', 'academy'],
    'Marketing / Agency': ['marketing', 'agency', 'creative', 'brand', 'advertising', 'media'],
    'Legal': ['law', 'legal', 'attorney', 'lawyer', 'firm'],
    'Manufacturing': ['manufacturing', 'industrial', 'factory', 'production'],
    'Hospitality': ['hotel', 'restaurant', 'travel', 'tourism', 'hospitality'],
    'Professional Services': ['consulting', 'services', 'solutions', 'advisory'],
  };
  for (const [industry, kws] of Object.entries(patterns)) {
    if (kws.some(p => combined.includes(p))) return industry;
  }
  return 'General Business';
}

function extractProducts(productsText?: string, description?: string): string[] {
  const text = productsText || description || '';
  if (!text) return [];
  const items = text.split(/[,;•\n]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 100).slice(0, 10);
  return items.length > 0 ? items : [text.slice(0, 100)];
}

function inferICP(targetAudience?: string, industry?: string) {
  const segments: string[] = [];
  const painPoints: string[] = [];
  const text = (targetAudience || '').toLowerCase();
  
  if (text.includes('small business') || text.includes('smb')) segments.push('Small Business');
  if (text.includes('enterprise') || text.includes('large')) segments.push('Enterprise');
  if (text.includes('startup')) segments.push('Startups');
  if (text.includes('b2b')) segments.push('B2B Companies');
  if (text.includes('b2c') || text.includes('consumer')) segments.push('Consumers');
  if (text.includes('agency') || text.includes('agencies')) segments.push('Agencies');
  
  const industryPains: Record<string, string[]> = {
    'Software / SaaS': ['efficiency', 'automation', 'integration', 'scaling'],
    'E-commerce / Retail': ['conversion', 'customer acquisition', 'inventory', 'competition'],
    'Healthcare': ['patient care', 'compliance', 'scheduling', 'records management'],
    'Finance / Fintech': ['security', 'compliance', 'customer trust', 'fraud prevention'],
    'Marketing / Agency': ['ROI measurement', 'client retention', 'campaign performance'],
    'Professional Services': ['lead generation', 'client management', 'billable hours'],
  };
  if (industry && industryPains[industry]) painPoints.push(...industryPains[industry]);
  
  return {
    description: targetAudience || 'Business decision makers seeking solutions',
    segments: segments.length > 0 ? segments : ['Business Professionals'],
    painPoints: painPoints.length > 0 ? painPoints : ['efficiency', 'cost reduction', 'growth'],
  };
}

function determineGeographicScope(city?: string, state?: string, country?: string, additionalLocations?: Array<{ city?: string; state?: string }>) {
  const hasLocation = !!(city || state);
  if (!hasLocation) return { type: 'global' as const };
  
  let scopeType: 'local' | 'regional' | 'national' | 'global' = 'local';
  if (additionalLocations && additionalLocations.length > 0) {
    const uniqueStates = new Set([state, ...additionalLocations.map(l => l.state)].filter(Boolean));
    if (uniqueStates.size > 3) scopeType = 'national';
    else if (uniqueStates.size > 1) scopeType = 'regional';
  }
  return { type: scopeType, primaryLocation: { city, state, country }, additionalLocations: additionalLocations?.filter(l => l.city || l.state) };
}

function inferBrandStrength(domain: string, competitors?: string[]) {
  const known = ['microsoft', 'google', 'amazon', 'apple', 'salesforce', 'hubspot', 'adobe', 'oracle'];
  if (known.some(b => domain.toLowerCase().includes(b))) return { type: 'known' as const, marketPosition: 'leader' as const };
  if (competitors && competitors.length > 2) return { type: 'challenger' as const, marketPosition: 'competitor' as const };
  return { type: 'emerging' as const, marketPosition: 'niche' as const };
}

function inferConversionGoal(industry: string, productsServices?: string): PromptIntelligenceContext['conversionGoal'] {
  const text = (productsServices || '').toLowerCase();
  if (text.includes('trial') || text.includes('freemium')) return 'trial';
  if (text.includes('ecommerce') || text.includes('shop') || text.includes('buy')) return 'purchase';
  if (text.includes('demo') || text.includes('enterprise')) return 'demo';
  if (text.includes('local') || text.includes('store') || text.includes('visit')) return 'store_visit';
  if (text.includes('consult')) return 'consultation';
  const goals: Record<string, PromptIntelligenceContext['conversionGoal']> = { 'Software / SaaS': 'trial', 'E-commerce / Retail': 'purchase', 'Professional Services': 'consultation', 'Real Estate': 'lead' };
  return goals[industry] || 'lead';
}

function buildPromptIntelligenceContext(input: BuildContextInput): PromptIntelligenceContext {
  const inferenceNotes: string[] = [];
  const name = input.brandName || input.orgName;
  const domain = input.brandDomain || input.orgDomain;
  const description = input.brandDescription || input.businessDescription;
  const products = input.brandProducts || input.productsServices;
  const keywords = input.brandKeywords || input.keywords || [];
  const audience = input.brandAudience || input.targetAudience;
  const competitors = input.competitors || [];
  
  const industry = inferIndustry(domain, description);
  if (!description) inferenceNotes.push(`Industry inferred from domain: ${industry}`);
  
  const primaryProducts = extractProducts(products, description);
  if (!products && primaryProducts.length > 0) inferenceNotes.push('Products inferred from business description');
  
  const geographicScope = determineGeographicScope(input.businessCity, input.businessState, input.businessCountry, input.localizationConfig?.additional_locations);
  if (!input.businessCity && !input.businessState) inferenceNotes.push('Geographic scope defaulted to global');
  
  const conversionGoal = inferConversionGoal(industry, products);
  inferenceNotes.push(`Conversion goal inferred: ${conversionGoal}`);
  
  const icp = inferICP(audience, industry);
  if (!audience) inferenceNotes.push('ICP inferred from industry patterns');
  
  const hasLocation = !!(input.businessCity || input.businessState);
  const aiIntentFocus = { discovery: true, validation: true, comparison: true, recommendation: true, action: true, localIntent: hasLocation };
  
  const brandStrength = inferBrandStrength(domain, competitors);
  inferenceNotes.push(`Brand strength inferred: ${brandStrength.type}`);
  
  return {
    businessName: name,
    primaryDomain: domain,
    industry,
    primaryProducts,
    serviceCategories: primaryProducts.slice(0, 5),
    idealCustomerProfile: icp,
    aiIntentFocus,
    brandStrength,
    geographicScope,
    competitors: { known: competitors, inferred: [] },
    conversionGoal,
    keywords,
    inferenceNotes,
  };
}

function formatContextForPrompt(ctx: PromptIntelligenceContext): string {
  const sections = [
    `## Business Identity\n- Business Name: ${ctx.businessName}\n- Domain: ${ctx.primaryDomain}\n- Industry: ${ctx.industry}`,
    `## Products & Services\n- Primary: ${ctx.primaryProducts.slice(0, 5).join(', ') || 'Not specified'}`,
    `## Ideal Customer Profile\n- Description: ${ctx.idealCustomerProfile.description}\n- Segments: ${ctx.idealCustomerProfile.segments.join(', ')}\n- Pain Points: ${ctx.idealCustomerProfile.painPoints.join(', ')}`,
    `## Brand Positioning\n- Brand Type: ${ctx.brandStrength.type}\n- Market Position: ${ctx.brandStrength.marketPosition}`,
    `## Geographic Scope\n- Scope: ${ctx.geographicScope.type}${ctx.geographicScope.primaryLocation ? `\n- Location: ${[ctx.geographicScope.primaryLocation.city, ctx.geographicScope.primaryLocation.state].filter(Boolean).join(', ')}` : ''}`,
    `## Conversion Goal\n- Primary Goal: ${ctx.conversionGoal.replace('_', ' ')}`,
  ];
  if (ctx.competitors.known.length > 0) sections.push(`## Competitors\n${ctx.competitors.known.join(', ')}`);
  if (ctx.keywords.length > 0) sections.push(`## Keywords\n${ctx.keywords.slice(0, 15).join(', ')}`);
  return sections.join('\n\n');
}

// ============= STRICT INTENT TAXONOMY =============
const INTENT_TYPES = ['discovery', 'validation', 'comparison', 'recommendation', 'action', 'local_intent'] as const;
type IntentType = typeof INTENT_TYPES[number];

const FUNNEL_STAGES = ['TOFU', 'MOFU', 'BOFU'] as const;
type FunnelStage = typeof FUNNEL_STAGES[number];

interface GeneratedPrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string;
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
}

interface GenerationParams {
  countPerIntent?: number;
  language?: string;
}

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

function validatePrompt(p: unknown, offerings: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const prompt = p as Record<string, unknown>;
  if (!prompt || typeof prompt !== 'object') return { valid: false, errors: ['Not an object'] };
  if (typeof prompt.prompt !== 'string' || prompt.prompt.length < 6) errors.push('Prompt too short');
  if (typeof prompt.prompt === 'string' && prompt.prompt.length > 140) errors.push('Prompt too long');
  if (!INTENT_TYPES.includes(prompt.intent_type as IntentType)) errors.push(`Invalid intent_type: ${prompt.intent_type}`);
  if (typeof prompt.why_relevant !== 'string' || prompt.why_relevant.length > 140) errors.push('why_relevant missing or too long');
  if (typeof prompt.target_offering !== 'string') errors.push('target_offering missing');
  if (!FUNNEL_STAGES.includes(prompt.funnel_stage as FunnelStage)) errors.push(`Invalid funnel_stage: ${prompt.funnel_stage}`);
  if (typeof prompt.needs_geo_variant !== 'boolean') errors.push('needs_geo_variant must be boolean');
  if (typeof prompt.seed_topic !== 'string') errors.push('seed_topic missing');
  return { valid: errors.length === 0, errors };
}

function validateAllPrompts(prompts: unknown[], expectedCount: number, offerings: string[]): { valid: boolean; errors: string[]; validated: GeneratedPrompt[] } {
  const errors: string[] = [];
  const validated: GeneratedPrompt[] = [];
  const intentCounts: Record<string, number> = {};
  const seenPrompts = new Set<string>();
  
  if (!Array.isArray(prompts)) return { valid: false, errors: ['Response is not an array'], validated: [] };
  if (prompts.length !== expectedCount) errors.push(`Expected ${expectedCount} prompts, got ${prompts.length}`);
  
  for (const p of prompts) {
    const { valid, errors: promptErrors } = validatePrompt(p, offerings);
    if (!valid) { errors.push(`Invalid prompt: ${promptErrors.join(', ')}`); continue; }
    const typedPrompt = p as GeneratedPrompt;
    const normalizedText = typedPrompt.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenPrompts.has(normalizedText)) { errors.push(`Duplicate prompt`); continue; }
    seenPrompts.add(normalizedText);
    intentCounts[typedPrompt.intent_type] = (intentCounts[typedPrompt.intent_type] || 0) + 1;
    validated.push(typedPrompt);
  }
  
  for (const intent of INTENT_TYPES) {
    if (!intentCounts[intent] || intentCounts[intent] < 1) errors.push(`Missing prompts for intent: ${intent}`);
  }
  return { valid: errors.length === 0, errors, validated };
}

function postProcessPrompts(prompts: GeneratedPrompt[], context: PromptIntelligenceContext): GeneratedPrompt[] {
  const processed: GeneratedPrompt[] = [];
  const seenNormalized = new Set<string>();
  for (const p of prompts) {
    const normalized = p.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenNormalized.has(normalized)) continue;
    seenNormalized.add(normalized);
    let prompt = p.prompt;
    if (context.brandStrength.type !== 'known' && !['validation', 'action'].includes(p.intent_type) && prompt.toLowerCase().includes(context.businessName.toLowerCase())) {
      prompt = prompt.replace(new RegExp(context.businessName, 'gi'), 'this tool');
    }
    processed.push({ ...p, prompt });
  }
  return processed;
}

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
2. **validation** - Trust/reviews/proof prompts (→ MOFU)
3. **comparison** - Alternatives/vs/best prompts (→ MOFU)
4. **recommendation** - Decision guidance prompts (→ MOFU or BOFU)
5. **action** - Buy/visit/contact prompts (→ BOFU)
6. **local_intent** - Near me/city prompts (→ BOFU)

## CRITICAL RULES

1. Write EXACTLY how a human speaks to ChatGPT - casual, first-person, with context.
2. NO SEO-style keyword phrases.
3. Each prompt must be unique (case-insensitive).
4. Prompt length: 6-140 characters.
5. why_relevant must be <= 140 chars, practical, user-facing.
6. target_offering: one of [${offerings.slice(0, 8).join(', ')}] or "general"
7. seed_topic: concise topic label (e.g., "pricing", "reviews", "best for beginners")
8. needs_geo_variant: true only if prompt can be localized and geo.scope is local/regional

${context.competitors.known.length > 0 ? `## COMPETITORS TO REFERENCE\n${context.competitors.known.join(', ')}\nInclude competitor names naturally in comparison and validation prompts.` : ''}

## OUTPUT FORMAT

Return ONLY this JSON structure:
{
  "prompts": [
    {
      "prompt": "string",
      "intent_type": "discovery|validation|comparison|recommendation|action|local_intent",
      "why_relevant": "string (<=140 chars)",
      "target_offering": "string",
      "funnel_stage": "TOFU|MOFU|BOFU",
      "needs_geo_variant": boolean,
      "seed_topic": "string"
    }
  ]
}

Generate exactly ${totalCount} prompts now.`;
}

async function generateWithLLM(context: PromptIntelligenceContext, params: GenerationParams): Promise<{ prompts: GeneratedPrompt[]; model: string }> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) throw new Error('OpenAI API key not configured');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON-only response generator. Output ONLY valid JSON, no explanations or markdown.' },
        { role: 'user', content: buildLLMPrompt(context, params) }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });
  
  if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const model = data.model || 'gpt-4o-mini';
  
  let parsed: { prompts: unknown[] };
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    parsed = JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error('Failed to parse LLM response:', content);
    throw new Error('Failed to parse LLM response as JSON');
  }
  
  if (!parsed.prompts || !Array.isArray(parsed.prompts)) throw new Error('LLM response missing prompts array');
  return { prompts: parsed.prompts as GeneratedPrompt[], model };
}

async function repairPrompts(context: PromptIntelligenceContext, params: GenerationParams, originalPrompts: GeneratedPrompt[], errors: string[]): Promise<{ prompts: GeneratedPrompt[]; model: string }> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) throw new Error('OpenAI API key not configured');
  
  const countPerIntent = params.countPerIntent || 5;
  const totalCount = countPerIntent * 6;
  
  const repairPrompt = `The previous generation had validation errors. Fix them:

ERRORS:
${errors.slice(0, 10).map(e => `- ${e}`).join('\n')}

Generate ${totalCount} VALID prompts. Ensure:
1. Exactly ${countPerIntent} prompts per intent type
2. All prompts unique
3. All fields present and valid

Return ONLY valid JSON: { "prompts": [...] }`;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
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
  
  if (!response.ok) throw new Error('Repair pass failed');
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const model = data.model || 'gpt-4o-mini';
  
  let parsed: { prompts: unknown[] };
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
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

    let brandId: string | null = null;
    let params: GenerationParams = { countPerIntent: 5, language: 'en-US' };
    
    try {
      const body = await req.json();
      brandId = body?.brandId || body?.domainId || null;
      if (body?.params) params = { ...params, ...body.params };
      console.log('Request:', { brandId, params });
    } catch (e) {
      console.log('No body or parse error');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Authentication failed');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) throw new Error('Could not get user organization');

    const orgId = userData.org_id;
    console.log('Org ID:', orgId);

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

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select(`name, domain, business_description, products_services, keywords, target_audience, competitors, enable_localized_prompts, localization_config, business_city, business_state, business_country`)
      .eq('id', orgId)
      .single();

    if (orgError || !orgData) throw new Error('Could not get organization details');

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

    const contextJson = canonicalJson(intelligenceContext);
    const paramsJson = canonicalJson(params);
    const promptHash = await computeHash(`${contextJson}:${paramsJson}:v1`);
    console.log('Cache hash:', promptHash.slice(0, 16));

    const { data: cachedResult } = await supabase
      .from('prompt_suggestions')
      .select('*')
      .eq('org_id', orgId)
      .eq('version', 1)
      .eq('prompt_hash', promptHash)
      .eq('status', 'ready')
      .maybeSingle();

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
        return new Response(JSON.stringify({ success: true, cached: true, data: brandCachedResult.prompts_json, context: intelligenceContext }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (cachedResult) {
      console.log('Cache HIT');
      return new Response(JSON.stringify({ success: true, cached: true, data: cachedResult.prompts_json, context: intelligenceContext }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Cache MISS - generating new prompts');

    const { data: buildingRecord, error: insertError } = await supabase
      .from('prompt_suggestions')
      .insert({ org_id: orgId, brand_id: brandId, version: 1, status: 'building', prompt_hash: promptHash, generation_params: params, prompts_json: [] })
      .select()
      .single();

    let recordId = buildingRecord?.id ?? null;

    if (insertError) {
      console.log('Insert conflict, checking for existing:', insertError.message);
      const { data: existingResult } = await supabase
        .from('prompt_suggestions')
        .select('*')
        .eq('org_id', orgId)
        .eq('version', 1)
        .eq('prompt_hash', promptHash)
        .maybeSingle();

      if (existingResult?.status === 'ready') {
        return new Response(JSON.stringify({ success: true, cached: true, data: existingResult.prompts_json, context: intelligenceContext }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      recordId = existingResult?.id ?? null;
    }

    // Run generation in the background to avoid request timeouts.
    const runJob = async () => {
      try {
        const countPerIntent = params.countPerIntent || 5;
        const expectedCount = countPerIntent * 6;
        const offerings = [...intelligenceContext.primaryProducts, ...intelligenceContext.serviceCategories];

        let result = await generateWithLLM(intelligenceContext, params);
        let validation = validateAllPrompts(result.prompts, expectedCount, offerings);

        if (!validation.valid) {
          console.log('Validation failed, attempting repair:', validation.errors.slice(0, 5));
          try {
            result = await repairPrompts(intelligenceContext, params, validation.validated, validation.errors);
            validation = validateAllPrompts(result.prompts, expectedCount, offerings);
          } catch (e) {
            console.error('Repair pass failed:', e);
          }
        }

        if (!validation.valid) {
          console.error('Validation still failed after repair:', validation.errors);
          if (recordId) {
            await supabase
              .from('prompt_suggestions')
              .update({ status: 'error', error_message: validation.errors.slice(0, 5).join('; ') })
              .eq('id', recordId);
          }
          return;
        }

        const processedPrompts = postProcessPrompts(validation.validated, intelligenceContext);
        console.log(`Generated ${processedPrompts.length} valid prompts`);

        if (recordId) {
          await supabase
            .from('prompt_suggestions')
            .update({ status: 'ready', prompts_json: processedPrompts, llm_model: result.model })
            .eq('id', recordId);
        } else {
          await supabase
            .from('prompt_suggestions')
            .upsert({ org_id: orgId, brand_id: brandId, version: 1, status: 'ready', prompt_hash: promptHash, generation_params: params, prompts_json: processedPrompts, llm_model: result.model });
        }
      } catch (e) {
        console.error('Background generation job failed:', e);
        if (recordId) {
          await supabase
            .from('prompt_suggestions')
            .update({ status: 'error', error_message: e instanceof Error ? e.message : 'Unknown error' })
            .eq('id', recordId);
        }
      }
    };

    const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
    if (typeof waitUntil === 'function') {
      waitUntil(runJob());
    } else {
      // Fallback (should be rare) - still don't block the response.
      runJob();
    }

    return new Response(
      JSON.stringify({ success: true, queued: true, status: 'building', record_id: recordId, context: intelligenceContext }),
      {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-intent-prompts:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
