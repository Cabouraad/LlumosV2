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

    // Build the enhanced system prompt using AI-native intent categories
    const systemPrompt = `You are an expert at generating REAL AI search prompts - exactly how humans naturally speak to ChatGPT, Claude, or Perplexity.

${formattedContext}
${locationInstructions}

## AI-NATIVE INTENT CATEGORIES

Classify each prompt into ONE of these categories based on real AI search behavior:

1. **DISCOVERY** (Learning / Awareness)
   - User is exploring, learning, or becoming aware of solutions
   - Examples: "I'm trying to understand...", "What should I know about...", "Help me learn about..."

2. **VALIDATION** (Trust / Reviews / Proof)
   - User wants social proof, reviews, case studies, or credibility signals
   - Examples: "Is [solution] actually good?", "What do people say about...", "Has anyone used..."

3. **COMPARISON** (Alternatives / vs / Best)
   - User is actively comparing options or looking for alternatives
   - Examples: "What's better, X or Y?", "Give me alternatives to...", "How does X compare to..."

4. **RECOMMENDATION** (What should I choose)
   - User wants a specific recommendation tailored to their situation
   - Examples: "What would you recommend for...", "Which [product] is best if I...", "Help me pick..."

5. **ACTION** (Buy / Visit / Contact)
   - User is ready to take action and needs the final push
   - Examples: "Where can I get...", "How do I sign up for...", "What's the best way to start with..."

6. **LOCAL_INTENT** (Near me / In [city])
   - User wants geographically relevant results
   - Examples: "...in [city]", "...near me", "...in my area"

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

- ❌ BAD: "enterprise SaaS solution reviews ratings"
- ✅ GOOD: "has anyone actually used [competitor] for a team of 50+? is it worth the price?"

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

Generate 15 prompts with this intent distribution:
- 3 DISCOVERY prompts (learning/awareness)
- 2 VALIDATION prompts (trust/proof seeking)
- 4 COMPARISON prompts (alternatives/vs)
- 3 RECOMMENDATION prompts (what should I choose)
- 2 ACTION prompts (ready to move forward)
${intelligenceContext.geographicScope.type !== 'global' ? '- 1 LOCAL_INTENT prompt (location-specific)' : ''}

Return ONLY a JSON array:
[
  {
    "text": "I've been using Notion but it's getting messy with 20 people - what do teams actually switch to?",
    "intent": "comparison",
    "source": "brand_visibility",
    "reasoning": "Comparison intent from Notion user - targets teams outgrowing basic tools",
    "volume_tier": "medium",
    "estimated_volume": 2500
  }
]

Intent must be one of: discovery, validation, comparison, recommendation, action, local_intent
Source must be one of: brand_visibility, competitor_analysis, market_research`;

    const userPrompt = `Generate 15 natural, conversational AI search prompts for this business context.

Key targeting:
- Primary segment: ${intelligenceContext.idealCustomerProfile.segments[0] || 'business professionals'}
- Key pain points: ${intelligenceContext.idealCustomerProfile.painPoints.slice(0, 3).join(', ')}
- Conversion goal: ${intelligenceContext.conversionGoal}
${intelligenceContext.competitors.known.length > 0 ? `- Reference competitors: ${intelligenceContext.competitors.known.slice(0, 3).join(', ')}` : ''}
${intelligenceContext.geographicScope.type !== 'global' ? `- Include 1 location-specific prompt for: ${[intelligenceContext.geographicScope.primaryLocation?.city, intelligenceContext.geographicScope.primaryLocation?.state].filter(Boolean).join(', ')}` : ''}

Write each prompt EXACTLY as a real person would type or speak it to ChatGPT. Be casual, use first person, include context about their situation.`;

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
