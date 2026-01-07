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
    if (intelligenceContext.geographicScope.type !== 'global' && orgData.enable_localized_prompts) {
      const loc = intelligenceContext.geographicScope.primaryLocation;
      const locationStr = [loc?.city, loc?.state].filter(Boolean).join(', ');
      
      let additionalLocs = '';
      if (intelligenceContext.geographicScope.additionalLocations?.length) {
        additionalLocs = intelligenceContext.geographicScope.additionalLocations
          .map(l => [l.city, l.state].filter(Boolean).join(', '))
          .join('; ');
      }
      
      locationInstructions = `
LOCALIZATION ENABLED (${intelligenceContext.geographicScope.type} scope):
- Primary location: ${locationStr}${additionalLocs ? `\n- Additional markets: ${additionalLocs}` : ''}
- Include location-specific prompts for ~40% of suggestions
- Mix "in [city]", "[city] area", "near [location]" patterns naturally`;
    } else {
      locationInstructions = `
LOCALIZATION DISABLED: Generate only industry/category-focused prompts without geographic specificity.`;
    }

    // Build the enhanced system prompt using the intelligence context
    const systemPrompt = `You are an expert prompt strategist for AI visibility optimization. Your task is to generate high-quality search prompts that real users would type into AI assistants (ChatGPT, Claude, Perplexity) when looking for solutions.

${formattedContext}
${locationInstructions}

## PROMPT GENERATION STRATEGY

Based on the Prompt Intelligence Context above, generate prompts that:

### 1. BUYER INTENT DISTRIBUTION
${intelligenceContext.buyerIntentTypes.informational ? '- 30% INFORMATIONAL: "How does...", "What is the best way to...", "Guide to..."' : ''}
${intelligenceContext.buyerIntentTypes.comparative ? '- 35% COMPARATIVE: "X vs Y", "Best alternatives to...", "Top 10...", "Compare..."' : ''}
${intelligenceContext.buyerIntentTypes.transactional ? '- 25% TRANSACTIONAL: "Best [product] for...", "Top rated...", "Which [product] should I..."' : ''}
- 10% DISCOVERY: Category/industry exploration queries

### 2. BRAND POSITIONING STRATEGY (${intelligenceContext.brandStrength.type})
${intelligenceContext.brandStrength.type === 'known' 
  ? '- Include prompts where the brand would naturally be mentioned as a leader\n- Focus on differentiation and premium positioning' 
  : intelligenceContext.brandStrength.type === 'challenger'
    ? '- Focus on comparison queries against larger competitors\n- Include "alternatives to [competitor]" patterns\n- Emphasize unique value propositions'
    : '- Focus on category/niche discovery queries\n- Include problem-focused prompts where brand can emerge as a solution\n- Target underserved segments'}

### 3. CONVERSION GOAL ALIGNMENT (${intelligenceContext.conversionGoal})
${intelligenceContext.conversionGoal === 'lead' ? '- Emphasize research/evaluation stage queries' : ''}
${intelligenceContext.conversionGoal === 'trial' ? '- Include "try", "free", "test" oriented queries' : ''}
${intelligenceContext.conversionGoal === 'purchase' ? '- Include pricing, buying, "best for" queries' : ''}
${intelligenceContext.conversionGoal === 'demo' ? '- Focus on enterprise evaluation queries' : ''}
${intelligenceContext.conversionGoal === 'store_visit' ? '- Include local discovery and "near me" queries' : ''}

### 4. ICP TARGETING
Target audience segments: ${intelligenceContext.idealCustomerProfile.segments.join(', ')}
Address pain points: ${intelligenceContext.idealCustomerProfile.painPoints.join(', ')}

### CRITICAL RULES
- NEVER include the business name "${intelligenceContext.businessName}" or domain in prompts
- Make prompts sound natural and conversational
- Each prompt should be unique and serve a distinct search intent
${intelligenceContext.competitors.known.length > 0 ? `- You may reference these competitors in comparison prompts: ${intelligenceContext.competitors.known.join(', ')}` : '- Focus on category-level comparisons since no specific competitors were provided'}

Your task is to create realistic search queries that potential customers might use when looking for solutions in this business space. These should sound like genuine questions people ask AI assistants.

CRITICAL: NEVER include the company name "${contextName}" or domain "${contextDomain}" in any of the generated prompts. Focus on the industry, problems, and solutions without mentioning the specific company.
${locationInstructions}

Business Context (for understanding the industry, not for including in prompts):
- Industry/Description: ${businessDescription || 'Not specified'}
- Products/Services: ${productsServices || 'Not specified'}
- Keywords: ${keywords?.join(', ') || 'Not specified'}
- Target Audience: ${targetAudience || 'Not specified'}${locationContext}

Generate 15 diverse, natural search prompts that potential customers might use when looking for solutions in this industry. Each prompt should:

1. Sound like a real question someone would ask an AI assistant
2. Be relevant to the business context and industry
3. Help monitor brand visibility or competitor analysis
4. Be conversational and natural (not keyword-stuffed)
5. Cover different aspects: comparison, recommendations, best practices, selection criteria
6. NEVER mention the company name, brand name, or domain

Categorize each prompt as one of:
- "brand_visibility" (for prompts where their brand should appear)
- "competitor_analysis" (for competitor comparison queries)  
- "market_research" (for industry/solution discovery)

For each prompt, estimate the monthly search volume using this scale:
- "high" (10000+): Very common questions asked frequently across the industry
- "medium" (1000-10000): Moderately popular queries with good search intent
- "low" (100-1000): More specific/niche queries but still valuable
- "very_low" (<100): Highly specific or emerging queries

Also provide a numeric estimate (your best guess of monthly searches).

Generate 15 prompts with this distribution:
- 5 informational/educational prompts
- 5 comparative/evaluation prompts  
- 3 transactional/solution-seeking prompts
- 2 discovery/exploration prompts

Return ONLY a JSON array with this exact format:
[
  {
    "text": "What are the best project management tools for remote teams?",
    "intent": "comparative",
    "source": "brand_visibility",
    "reasoning": "Targets remote work segment with comparative intent - high purchase potential",
    "volume_tier": "high",
    "estimated_volume": 15000
  }
]

Categorize each prompt source as:
- "brand_visibility" - prompts where this brand should appear
- "competitor_analysis" - competitor comparison queries
- "market_research" - industry/solution discovery`;

    const userPrompt = `Generate 15 high-quality search prompts based on the Prompt Intelligence Context provided. 

Focus on:
1. The ${intelligenceContext.idealCustomerProfile.segments[0] || 'target'} segment
2. Addressing: ${intelligenceContext.idealCustomerProfile.painPoints.slice(0, 3).join(', ')}
3. The ${intelligenceContext.conversionGoal} conversion goal
${intelligenceContext.competitors.known.length > 0 ? `4. Competitive positioning against: ${intelligenceContext.competitors.known.slice(0, 3).join(', ')}` : ''}

Make each prompt sound like a real question someone would ask ChatGPT or Claude.`;

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
        max_tokens: 2500,
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

    // Filter out duplicates and validate format
    const newSuggestions = suggestions
      .filter(suggestion => {
        const isValid = suggestion.text && suggestion.source && typeof suggestion.text === 'string';
        const isDuplicate = existingPromptTexts.includes(suggestion.text.toLowerCase()) || 
                           existingSuggestionTexts.includes(suggestion.text.toLowerCase());
        return isValid && !isDuplicate;
      })
      .slice(0, 10);

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

    // Insert suggestions into database with brand_id, AI-estimated search_volume, and intelligence context
    const insertData = newSuggestions.map((suggestion: any) => ({
      org_id: userData.org_id,
      brand_id: brandId || null,
      text: suggestion.text.trim(),
      source: mapSourceToDatabase(suggestion.source),
      search_volume: suggestion.estimated_volume || null,
      metadata: {
        reasoning: suggestion.reasoning,
        intent: suggestion.intent || null,
        generated_for_brand: brandContext?.name || null,
        volume_tier: suggestion.volume_tier || null,
        volume_source: 'ai_estimated',
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
