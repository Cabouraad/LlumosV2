import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssistRequest {
  context: string;
  sectionHeading: string;
  suggestions: string[];
  existingContent: string;
  toneGuidelines: string[];
  keyEntities: string[];
  // Inline editing mode
  mode?: 'section' | 'inline';
  action?: 'rewrite' | 'expand' | 'shorten' | 'improve' | 'simplify';
  text?: string;
}

const INLINE_PROMPTS: Record<string, string> = {
  rewrite: 'Rewrite this text with different wording while keeping the same meaning and tone. Keep the same length.',
  expand: 'Expand this text with more detail, examples, or explanations. Double the length while maintaining quality.',
  shorten: 'Shorten this text to about half the length while keeping the key points. Be concise.',
  improve: 'Improve this text by making it clearer, more engaging, and more professional. Fix any issues.',
  simplify: 'Simplify this text using simpler words and shorter sentences. Make it easier to understand.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AssistRequest = await req.json();

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle inline editing mode
    if (body.mode === 'inline' && body.action && body.text) {
      const inlinePrompt = INLINE_PROMPTS[body.action];
      if (!inlinePrompt) {
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const systemPrompt = `You are a precise text editor. Follow instructions exactly. Only return the edited text, nothing else.
${body.toneGuidelines?.length ? `\nTone: ${body.toneGuidelines.join(', ')}` : ''}`;

      const userPrompt = `${inlinePrompt}

Text to edit:
"${body.text}"

Return only the edited text, no explanations or quotes.`;

      console.log(`Inline AI action: ${body.action}`);

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 500,
        }),
      });

      if (!aiResponse.ok) {
        console.error('AI API error:', aiResponse.status);
        return new Response(
          JSON.stringify({ error: 'Failed to process text' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aiData = await aiResponse.json();
      const generatedContent = aiData.choices?.[0]?.message?.content?.trim() || '';

      return new Response(
        JSON.stringify({ generatedContent }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original section assist mode
    const { context, sectionHeading, suggestions, existingContent, toneGuidelines, keyEntities } = body;

    if (!sectionHeading) {
      return new Response(
        JSON.stringify({ error: 'Section heading is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert content writer helping create SEO-optimized content that will improve brand visibility in AI search results (ChatGPT, Perplexity, Gemini).

Write content that is:
- Clear, informative, and authoritative
- Naturally incorporates key entities and terms that AI models recognize
- Structured for easy parsing by AI systems
- Valuable to human readers

Tone guidelines to follow:
${toneGuidelines.map(g => `- ${g}`).join('\n')}

Key entities to naturally incorporate:
${keyEntities.join(', ')}`;

    const userPrompt = `Write content for the section "${sectionHeading}" about the topic: "${context}"

Points to cover:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${existingContent ? `Existing content to expand upon:\n${existingContent}\n\nPlease continue or improve this content.` : 'Write 2-3 informative paragraphs covering these points.'}

Write in a professional yet accessible tone. Focus on providing value and naturally incorporating the key entities.`;

    console.log('Calling AI for content assistance...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || '';

    console.log('AI content generated successfully');

    return new Response(
      JSON.stringify({ generatedContent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Content assist error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
