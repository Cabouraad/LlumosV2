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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body for brandId
    let brandId: string | null = null;
    try {
      const body = await req.json();
      brandId = body?.brandId || null;
      console.log('Received request body:', JSON.stringify(body));
      console.log('Parsed brandId:', brandId);
    } catch (e) {
      console.log('No body provided or parsing failed:', e);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Authentication failed');
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User data error:', userError);
      throw new Error('Could not get user organization');
    }

    // Get brand-specific context if brandId is provided
    let brandContext: any = null;
    if (brandId) {
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id, name, domain, business_description, products_services, keywords, target_audience')
        .eq('id', brandId)
        .eq('org_id', userData.org_id)
        .single();
      
      if (!brandError && brand) {
        brandContext = brand;
        console.log(`Using brand context: ${brand.name} (${brand.id})`);
      }
    }

    // Get full organization data including competitors and localization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select(`
        name, domain, business_description, products_services, keywords, target_audience,
        competitors, enable_localized_prompts, localization_config,
        business_city, business_state, business_country, llms_txt
      `)
      .eq('id', userData.org_id)
      .single();

    if (orgError || !orgData) {
      console.error('Organization data error:', orgError);
      throw new Error('Could not get organization details');
    }

    // ===== BUILD PROMPT INTELLIGENCE CONTEXT =====
    const intelligenceContext = buildPromptIntelligenceContext({
      // Organization data
      orgName: orgData.name,
      orgDomain: orgData.domain,
      businessDescription: orgData.business_description,
      productsServices: orgData.products_services,
      targetAudience: orgData.target_audience,
      keywords: orgData.keywords,
      competitors: orgData.competitors,
      
      // Location data
      businessCity: orgData.business_city,
      businessState: orgData.business_state,
      businessCountry: orgData.business_country,
      localizationConfig: orgData.localization_config as any,
      
      // Brand overrides (if brand selected)
      brandName: brandContext?.name,
      brandDomain: brandContext?.domain,
      brandDescription: brandContext?.business_description,
      brandProducts: brandContext?.products_services,
      brandKeywords: brandContext?.keywords,
      brandAudience: brandContext?.target_audience,
      
      // Signals
      hasLlmsTxt: !!orgData.llms_txt,
    });
    
    console.log('=== PROMPT INTELLIGENCE CONTEXT ===');
    console.log('Business:', intelligenceContext.businessName);
    console.log('Industry:', intelligenceContext.industry);
    console.log('Brand Strength:', intelligenceContext.brandStrength.type);
    console.log('Geographic Scope:', intelligenceContext.geographicScope.type);
    console.log('Conversion Goal:', intelligenceContext.conversionGoal);
    console.log('AI Intent Focus:', JSON.stringify(intelligenceContext.aiIntentFocus));
    console.log('Inference Notes:', intelligenceContext.inferenceNotes);
    console.log('====================================');

    // Get existing prompts to avoid duplicates
    let promptsQuery = supabase
      .from('prompts')
      .select('text')
      .eq('org_id', userData.org_id);
    
    if (brandId) {
      promptsQuery = promptsQuery.eq('brand_id', brandId);
    }
    
    const { data: existingPrompts, error: promptsError } = await promptsQuery;
    if (promptsError) {
      console.error('Error fetching existing prompts:', promptsError);
    }
    const existingPromptTexts = existingPrompts?.map(p => p.text.toLowerCase()) || [];

    // Get existing suggestions to avoid duplicates
    let suggestionsQuery = supabase
      .from('suggested_prompts')
      .select('text')
      .eq('org_id', userData.org_id)
      .eq('accepted', false);
    
    if (brandId) {
      suggestionsQuery = suggestionsQuery.eq('brand_id', brandId);
    }
    
    const { data: existingSuggestions, error: suggestionsError } = await suggestionsQuery;
    if (suggestionsError) {
      console.error('Error fetching existing suggestions:', suggestionsError);
    }
    const existingSuggestionTexts = existingSuggestions?.map(s => s.text.toLowerCase()) || [];

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Format the intelligence context for the LLM
    const formattedContext = formatContextForPrompt(intelligenceContext);
    
    // Build location-specific instructions based on geographic scope
    let locationInstructions = '';
    const hasLocalPresence = intelligenceContext.geographicScope.type !== 'global' && orgData.enable_localized_prompts;
    
    // Determine if local intent is meaningful for this business type
    const localRelevantIndustries = ['restaurant', 'retail', 'healthcare', 'legal', 'real estate', 'home services', 
      'automotive', 'fitness', 'salon', 'spa', 'dental', 'medical', 'plumbing', 'hvac', 'roofing', 'landscaping',
      'cleaning', 'moving', 'storage', 'pet services', 'childcare', 'education', 'financial services'];
    const industryLower = intelligenceContext.industry.toLowerCase();
    const isLocalRelevant = localRelevantIndustries.some(i => industryLower.includes(i)) || 
                            intelligenceContext.geographicScope.type === 'local';
    
    if (hasLocalPresence && isLocalRelevant) {
      const loc = intelligenceContext.geographicScope.primaryLocation;
      const city = loc?.city || '';
      const state = loc?.state || '';
      const locationStr = [city, state].filter(Boolean).join(', ');
      
      let additionalLocs = '';
      if (intelligenceContext.geographicScope.additionalLocations?.length) {
        additionalLocs = intelligenceContext.geographicScope.additionalLocations
          .map(l => [l.city, l.state].filter(Boolean).join(', '))
          .join('; ');
      }
      
      locationInstructions = `
## GEO-MODIFIED PROMPTS (Local Business)

Local presence detected: ${locationStr}${additionalLocs ? ` | Additional: ${additionalLocs}` : ''}
Geographic scope: ${intelligenceContext.geographicScope.type}

Generate 3-4 geo-modified prompts (NOT more). Only include local prompts because this business serves a local/regional market.

**Natural geo-modified patterns to use:**
- "Best [service] in ${city}" → "who's the best ${intelligenceContext.industry.toLowerCase()} in ${city}?"
- "Top rated in [city]" → "looking for a highly rated ${intelligenceContext.industry.toLowerCase()} in ${city} - any recommendations?"
- "[Service] near me" → "I need a ${intelligenceContext.industry.toLowerCase()} near me that's actually good"
- "Which [type] in [city]" → "which ${intelligenceContext.industry.toLowerCase()} should I choose in ${city}?"
- "[City] [service] recommendations" → "can anyone recommend a good ${intelligenceContext.industry.toLowerCase()} in the ${city} area?"

**Geo-modified prompt examples (conversational, NOT keyword-stuffed):**
- ❌ BAD: "best dentist Austin TX top rated affordable 2024"
- ✅ GOOD: "I just moved to Austin and need a dentist who's good with anxious patients - any recs?"

- ❌ BAD: "top rated plumber near me emergency services"  
- ✅ GOOD: "my water heater just died - who's a reliable plumber in the ${city} area that won't rip me off?"

- ❌ BAD: "best restaurant ${city} fine dining romantic"
- ✅ GOOD: "planning a special anniversary dinner in ${city} - where should we go that's actually worth it?"

**Distribution:**
- 1 TOFU local prompt (awareness: "what should I know about [service] in [city]")
- 1-2 MOFU local prompts (consideration: "best [service] in [city]", "top rated [service] near me")
- 1 BOFU local prompt (decision: "which [service] should I choose in [city]")`;
    } else if (hasLocalPresence && !isLocalRelevant) {
      // Business has location but local intent isn't primary (e.g., SaaS with an office)
      locationInstructions = `
## LOCATION CONTEXT (Limited Local Relevance)

Business location: ${[intelligenceContext.geographicScope.primaryLocation?.city, intelligenceContext.geographicScope.primaryLocation?.state].filter(Boolean).join(', ')}

This appears to be a ${intelligenceContext.industry} business where local intent is NOT primary.
Generate at most 1 location-specific prompt, only if it makes sense (e.g., "in-person demo in [city]").
Focus primarily on industry/category prompts without geographic modifiers.`;
    } else {
      locationInstructions = `
## NO LOCAL PROMPTS

Localization is disabled or not applicable. Generate only industry/category-focused prompts without geographic specificity.
Do NOT include "near me", city names, or location modifiers.`;
    }

    // Build the enhanced system prompt using AI-native intent categories and funnel stages
    const systemPrompt = `You are an expert at generating REAL AI search prompts - exactly how humans naturally speak to ChatGPT, Claude, or Perplexity.

${formattedContext}
${locationInstructions}

## FUNNEL STAGE CLASSIFICATION

Every prompt MUST be classified into one of three funnel stages:

### TOFU (Top of Funnel) - Awareness & Education
Users are just becoming aware of a problem or exploring solutions.
Patterns: "What is...", "How does...", "Why would I...", "I'm trying to understand...", "Can you explain..."
Examples:
- "What even is a CRM and do I actually need one for my 5-person team?"
- "How does project management software actually help with deadlines?"
- "Why would I pay for email marketing when I can just use Gmail?"

### MOFU (Middle of Funnel) - Consideration & Evaluation  
Users are actively comparing options and evaluating solutions.
Patterns: "Is [brand] good", "Best option for...", "Alternatives to...", "[X] vs [Y]", "What do people think of..."
Examples:
- "Is Slack actually worth it or is Teams good enough?"
- "What are the best options for a small business CRM under $50/month?"
- "I've been using Trello but need something more powerful - alternatives?"

### BOFU (Bottom of Funnel) - Decision & Action
Users are ready to make a decision and take action.
Patterns: "Should I choose...", "Where can I buy...", "Who offers...", "How do I get started with...", "What's the pricing for..."
Examples:
- "Should I go with HubSpot or Salesforce for a 20-person sales team?"
- "Where can I get a free trial of Notion for my team?"
- "Who offers the best onboarding support for accounting software?"

## AI-NATIVE INTENT CATEGORIES

Classify each prompt into ONE of these categories based on real AI search behavior:

1. **DISCOVERY** (Learning / Awareness) → Usually TOFU
   - User is exploring, learning, or becoming aware of solutions

2. **VALIDATION** (Trust / Reviews / Proof) → Usually MOFU
   - User wants social proof, reviews, case studies, or credibility signals

3. **COMPARISON** (Alternatives / vs / Best) → Usually MOFU
   - User is actively comparing options or looking for alternatives

4. **RECOMMENDATION** (What should I choose) → Can be MOFU or BOFU
   - User wants a specific recommendation tailored to their situation

5. **ACTION** (Buy / Visit / Contact) → Usually BOFU
   - User is ready to take action and needs the final push

6. **LOCAL_INTENT** (Near me / In [city]) → Can be any funnel stage
   - User wants geographically relevant results

## PROMPT GENERATION RULES

### ✅ DO:
- Write EXACTLY how a human would speak or type to ChatGPT
- Use incomplete sentences, casual phrasing, and natural speech patterns
- Include context and personal situation details
- Use first person ("I need...", "I'm looking for...", "Can you help me...")
- Add qualifiers like "honestly", "actually", "I think"
- Express uncertainty or emotion where natural

### ❌ DON'T:
- Use SEO-style keyword phrases ("best top rated affordable")
- Stuff multiple keywords together unnaturally
- Write perfect grammatically formal questions
- Use marketing buzzwords
- Include the business name "${intelligenceContext.businessName}" or domain

### NATURAL PROMPT EXAMPLES:
- ❌ BAD: "best CRM software small business affordable 2024"
- ✅ GOOD: "I run a small marketing agency and I'm drowning in spreadsheets - what CRM would actually help without breaking the bank?"

- ❌ BAD: "top project management tools comparison features pricing"  
- ✅ GOOD: "my team keeps missing deadlines because we use like 5 different apps to track projects, what should we switch to?"

## BRAND POSITIONING: ${intelligenceContext.brandStrength.type.toUpperCase()}
${intelligenceContext.brandStrength.type === 'known' 
  ? 'Generate prompts where a market leader would naturally be mentioned or recommended.'
  : intelligenceContext.brandStrength.type === 'challenger'
    ? 'Focus on "alternatives to [competitor]" and comparison prompts where challenger brands get discovered.'
    : 'Focus on problem/pain-point prompts where emerging solutions get recommended as hidden gems.'}

## CONVERSION GOAL: ${intelligenceContext.conversionGoal.toUpperCase()}
${intelligenceContext.conversionGoal === 'lead' ? 'Emphasize research-stage prompts where users are gathering information.' : ''}
${intelligenceContext.conversionGoal === 'trial' ? 'Include prompts about trying, testing, or getting started easily.' : ''}
${intelligenceContext.conversionGoal === 'purchase' ? 'Include prompts about buying decisions, pricing concerns, and value.' : ''}
${intelligenceContext.conversionGoal === 'demo' ? 'Focus on enterprise evaluation and seeing the product in action.' : ''}
${intelligenceContext.conversionGoal === 'store_visit' ? 'Include prompts about finding locations and visiting in person.' : ''}

## TARGET AUDIENCE
- Segments: ${intelligenceContext.idealCustomerProfile.segments.join(', ')}
- Pain points: ${intelligenceContext.idealCustomerProfile.painPoints.join(', ')}
${intelligenceContext.competitors.known.length > 0 ? `- Competitors to reference: ${intelligenceContext.competitors.known.join(', ')}` : ''}

${intelligenceContext.competitors.known.length > 0 ? `
## COMPETITIVE INTERCEPTION PROMPTS (MANDATORY)

Since competitors are known, you MUST include at least 4 competitive interception prompts. These target users actively researching or using competitors.

Write these EXACTLY how a real person would ask ChatGPT - casual, first-person, with context:

**Patterns to use (pick naturally based on competitor):**
- "[Competitor] vs alternatives" → "I'm using [Competitor] but honestly it's frustrating me - what else is out there?"
- "Best alternative to [Competitor]" → "what's a good alternative to [Competitor]? I need something that actually [pain point]"
- "Is [something] better than [Competitor]" → "has anyone switched from [Competitor] to something else? was it worth it?"
- "[Competitor] or [other option]" → "trying to decide between [Competitor] and something simpler - which would you recommend for [use case]?"

**Competitive Interception Examples:**
- ❌ BAD: "Salesforce vs HubSpot CRM comparison features pricing 2024"
- ✅ GOOD: "I've been on Salesforce for 2 years and it's honestly overkill for our 10-person team - what do people switch to?"

- ❌ BAD: "best alternative to Monday.com project management"
- ✅ GOOD: "Monday.com is driving me crazy with all the clicking - is there something more streamlined for a small dev team?"

- ❌ BAD: "is Asana better than Trello"
- ✅ GOOD: "we've outgrown Trello but Asana seems complicated - what would you actually recommend for a marketing team of 8?"

- ❌ BAD: "Slack vs Microsoft Teams comparison"
- ✅ GOOD: "my company is pushing us to Teams but I love Slack - is Teams actually that bad or am I being dramatic?"

**Known competitors to target: ${intelligenceContext.competitors.known.join(', ')}**

Distribute competitive prompts across funnel stages:
- 1-2 in MOFU (comparison/validation stage)
- 2-3 in BOFU (decision stage)
` : ''}

## REQUIRED FUNNEL DISTRIBUTION (MANDATORY)

You MUST generate exactly 18 prompts with this distribution:
- 6 TOFU prompts (awareness/education - "what is", "how does", "why would I")
- 6 MOFU prompts (consideration - "is X good", "best for", "alternatives to") 
- 6 BOFU prompts (decision - "should I choose", "where can I", "who offers")

Intent distribution within funnel stages:
- TOFU: primarily discovery intents
- MOFU: mix of validation, comparison, recommendation intents
- BOFU: primarily recommendation and action intents
${intelligenceContext.geographicScope.type !== 'global' ? '- Include 2-3 local_intent prompts spread across funnel stages' : ''}
${intelligenceContext.competitors.known.length > 0 ? '- Include at least 4 competitive interception prompts in MOFU/BOFU' : ''}

## LLM PLATFORM VARIANTS (High-Priority Prompts Only)

For prompts marked as "high" volume_tier, generate platform-optimized phrasing variants.
The SAME meaning, but naturally different phrasing for each AI platform's conversational style.

**Platform Styles:**

1. **ChatGPT-style** (conversational, personal, context-rich):
   - Uses first person, shares personal situation
   - Casual, incomplete sentences, filler words
   - Example: "I'm trying to figure out if I even need a CRM for my 8-person agency - we're just using spreadsheets now and it's getting messy"

2. **Gemini-style** (factual, direct, slightly formal):
   - More structured questions
   - Clear and concise, less personal storytelling
   - Example: "What are the key benefits of using a CRM for a small marketing agency compared to spreadsheets?"

3. **Perplexity-style** (research-oriented, seeking sources/data):
   - Implies wanting citations, comparisons, or data
   - Often includes "according to", "what does research say", "compare"
   - Example: "Compare the top CRM options for agencies under 10 people - what do reviews and case studies say?"

**Rules:**
- ONLY generate variants for prompts with volume_tier: "high"
- Each variant must preserve the EXACT same search intent and meaning
- Variants should feel natural on each platform, not forced
- Include all 3 variants in the "platform_variants" field

Return ONLY a JSON array:
[
  {
    "text": "What even is marketing automation and do I need it for my small business?",
    "funnel_stage": "tofu",
    "intent": "discovery",
    "source": "brand_visibility",
    "reasoning": "Early awareness prompt - user doesn't know if they need the solution",
    "volume_tier": "high",
    "estimated_volume": 5000,
    "platform_variants": {
      "chatgpt": "I keep hearing about marketing automation but honestly I have no idea what it actually does - is it something my small business needs or is it just for big companies?",
      "gemini": "What is marketing automation and what are the key indicators that a small business would benefit from implementing it?",
      "perplexity": "What does research say about marketing automation ROI for small businesses? Looking for data on when it's worth the investment."
    }
  },
  {
    "text": "I've been using Notion but it's getting messy with 20 people - what do teams actually switch to?",
    "funnel_stage": "mofu",
    "intent": "comparison",
    "source": "competitor_analysis",
    "reasoning": "Comparison intent from Notion user - targets teams outgrowing basic tools",
    "volume_tier": "medium",
    "estimated_volume": 2500
  },
  {
    "text": "Should I go with Monday.com or Asana for a remote design team of 15?",
    "funnel_stage": "bofu",
    "intent": "recommendation",
    "source": "brand_visibility",
    "reasoning": "Decision-stage prompt - user is ready to choose between finalists",
    "volume_tier": "high",
    "estimated_volume": 4200,
    "platform_variants": {
      "chatgpt": "I'm stuck deciding between Monday.com and Asana for my remote design team of 15 - we need good visual project tracking but also easy collaboration. Which would you pick?",
      "gemini": "Compare Monday.com vs Asana for a 15-person remote design team. Which platform offers better visual project management and collaboration features?",
      "perplexity": "Monday.com vs Asana comparison for design teams: what do user reviews and industry analyses say about which is better for remote creative teams around 15 people?"
    }
  }
]

funnel_stage must be one of: tofu, mofu, bofu
Intent must be one of: discovery, validation, comparison, recommendation, action, local_intent
Source must be one of: brand_visibility, competitor_analysis, market_research`;

    const userPrompt = `Generate exactly 18 natural, conversational AI search prompts for this business context.

MANDATORY FUNNEL DISTRIBUTION:
- 6 TOFU prompts (awareness stage - "what is", "how does", "why would I")
- 6 MOFU prompts (consideration stage - "is X good", "best for", "alternatives")
- 6 BOFU prompts (decision stage - "should I choose", "where can I", "who offers")

Key targeting:
- Primary segment: ${intelligenceContext.idealCustomerProfile.segments[0] || 'business professionals'}
- Key pain points: ${intelligenceContext.idealCustomerProfile.painPoints.slice(0, 3).join(', ')}
- Conversion goal: ${intelligenceContext.conversionGoal}
${intelligenceContext.competitors.known.length > 0 ? `
COMPETITIVE INTERCEPTION REQUIRED:
- Include at least 4 prompts that directly reference these competitors: ${intelligenceContext.competitors.known.slice(0, 5).join(', ')}
- Use natural patterns like "I'm using [Competitor] but...", "what's better than [Competitor]", "anyone switched from [Competitor]?"
- Place 1-2 in MOFU, 2-3 in BOFU` : ''}
${intelligenceContext.geographicScope.type !== 'global' ? `- Include 2-3 location-specific prompts for: ${[intelligenceContext.geographicScope.primaryLocation?.city, intelligenceContext.geographicScope.primaryLocation?.state].filter(Boolean).join(', ')}` : ''}

Write each prompt EXACTLY as a real person would type or speak it to ChatGPT. Be casual, use first person, include context about their situation.

IMPORTANT: Ensure EXACTLY 6 prompts for each funnel stage (tofu, mofu, bofu).${intelligenceContext.competitors.known.length > 0 ? ' At least 4 must be competitive interception prompts targeting known competitors.' : ''}`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 6000,
        temperature: 0.75,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const generatedContent = openAIData.choices[0].message.content;

    console.log('Generated content:', generatedContent);

    let suggestions;
    try {
      suggestions = JSON.parse(generatedContent);
    } catch (parseError: unknown) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', generatedContent);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(suggestions)) {
      console.error('OpenAI response is not an array:', suggestions);
      throw new Error('Invalid AI response format');
    }

    // Validate funnel stage distribution and filter duplicates
    const validFunnelStages = ['tofu', 'mofu', 'bofu'];
    const newSuggestions = suggestions
      .filter(suggestion => {
        const isValid = suggestion.text && suggestion.source && typeof suggestion.text === 'string';
        const hasFunnelStage = validFunnelStages.includes(suggestion.funnel_stage?.toLowerCase());
        const isDuplicate = existingPromptTexts.includes(suggestion.text.toLowerCase()) || 
                           existingSuggestionTexts.includes(suggestion.text.toLowerCase());
        return isValid && hasFunnelStage && !isDuplicate;
      })
      .map(s => ({ ...s, funnel_stage: s.funnel_stage?.toLowerCase() }))
      .slice(0, 18);

    if (newSuggestions.length === 0) {
      console.log('No new unique suggestions generated');
      return new Response(
        JSON.stringify({ 
          success: true, 
          suggestionsCreated: 0, 
          message: 'No new unique suggestions generated - you already have comprehensive coverage!' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map AI-generated sources to valid database values
    const mapSourceToDatabase = (aiSource: string): string => {
      const mapping: Record<string, string> = {
        'competitor_analysis': 'competitors',
        'brand_visibility': 'industry', 
        'market_research': 'trends'
      };
      return mapping[aiSource] || 'gap';
    };

    // Insert suggestions into database with brand_id, AI-estimated search_volume, funnel stage, platform variants, and intelligence context
    const insertData = newSuggestions.map((suggestion: any) => ({
      org_id: userData.org_id,
      brand_id: brandId || null,
      text: suggestion.text.trim(),
      source: mapSourceToDatabase(suggestion.source),
      search_volume: suggestion.estimated_volume || null,
      metadata: {
        reasoning: suggestion.reasoning,
        intent: suggestion.intent || null,
        funnel_stage: suggestion.funnel_stage || null,
        generated_for_brand: brandContext?.name || null,
        volume_tier: suggestion.volume_tier || null,
        volume_source: 'ai_estimated',
        // Platform-optimized variants for high-priority prompts
        platform_variants: suggestion.platform_variants || null,
        // Include intelligence context summary for traceability
        intelligence_context: {
          industry: intelligenceContext.industry,
          brand_strength: intelligenceContext.brandStrength.type,
          geographic_scope: intelligenceContext.geographicScope.type,
          conversion_goal: intelligenceContext.conversionGoal,
          icp_segments: intelligenceContext.idealCustomerProfile.segments.slice(0, 3),
        }
      }
    }));

    if (insertData.length === 0) {
      console.log('No valid suggestions to insert');
      return new Response(
        JSON.stringify({ 
          success: true, 
          suggestionsCreated: 0, 
          message: 'No new unique suggestions could be generated.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: insertError } = await supabase
      .from('suggested_prompts')
      .insert(insertData);

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save suggestions to database');
    }

    console.log(`Successfully created ${newSuggestions.length} new suggestions for brand: ${brandContext?.name || 'org-level'}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestionsCreated: insertData.length,
        brandId: brandId,
        suggestions: newSuggestions.map((s: any) => ({ 
          text: s.text, 
          source: s.source,
          estimated_volume: s.estimated_volume,
          volume_tier: s.volume_tier
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in suggest-prompts-now function:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
