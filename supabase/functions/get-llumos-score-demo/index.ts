import { corsHeaders } from '../_shared/cors.ts';

interface AnalysisResult {
  score: number;
  composite: number;
  tier: string;
  analysis: string;
  strengths: string[];
  improvements: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let domain: string;
    
    // Handle both GET and POST requests for better mobile compatibility
    if (req.method === 'GET') {
      const url = new URL(req.url);
      domain = url.searchParams.get('domain') || '';
    } else {
      const body = await req.json();
      domain = body.domain || '';
    }

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean domain (remove protocol, www, trailing slashes)
    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/.*$/, '')
      .replace(/\/$/, '');

    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return new Response(
        JSON.stringify({ error: 'Invalid domain format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Analyzing domain:', cleanDomain);

    // Fetch website content with improved error handling
    let websiteContent = '';
    let fetchError: string | null = null;
    let metaData = {
      title: '',
      description: '',
      hasSSL: false,
      responseTime: 0
    };
    
    try {
      const startTime = Date.now();
      const url = `https://${cleanDomain}`;
      
      // Use a more generous timeout for mobile users (15 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LlumosBot/1.0; +https://llumos.app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      
      clearTimeout(timeoutId);
      metaData.responseTime = Date.now() - startTime;
      metaData.hasSSL = url.startsWith('https');
      
      if (response.ok) {
        const html = await response.text();
        
        // Extract meta title
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        metaData.title = titleMatch ? titleMatch[1].trim() : '';
        
        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        metaData.description = descMatch ? descMatch[1].trim() : '';
        
        // Extract main content more intelligently
        let contentHtml = html;
        
        // Remove script, style, nav, footer, header tags first
        contentHtml = contentHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
          .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
          .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');
        
        // Try to find main content area
        const mainMatch = contentHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                         contentHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                         contentHtml.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
        
        const contentToAnalyze = mainMatch ? mainMatch[1] : contentHtml;
        
        // Extract clean text
        websiteContent = contentToAnalyze
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 10000); // Limit to 10000 chars for better analysis
        
        console.log(`Fetched ${websiteContent.length} chars from ${cleanDomain} in ${metaData.responseTime}ms`);
      } else {
        fetchError = `HTTP ${response.status}: ${response.statusText}`;
        console.log(`Failed to fetch ${cleanDomain}: ${fetchError}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('aborted')) {
        fetchError = 'Request timeout - website took too long to respond';
      } else {
        fetchError = errorMessage;
      }
      console.error('Error fetching website:', fetchError);
    }

    // If we couldn't fetch content, use AI with just domain info
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const contentAvailable = websiteContent.length > 100;
    
    const analysisPrompt = contentAvailable 
      ? `Analyze this website's AI search visibility potential. Domain: ${cleanDomain}

WEBSITE METADATA:
- Title: ${metaData.title || 'Not found'}
- Description: ${metaData.description || 'Not found'}
- SSL: ${metaData.hasSSL ? 'Yes' : 'No'}
- Response Time: ${metaData.responseTime}ms

WEBSITE CONTENT:
${websiteContent}

SCORING CRITERIA (total 100 points, scale to 0-850 final score):
1. Content Quality & Depth (25 pts): Is content comprehensive, well-structured, and provides value?
2. Brand Clarity & Messaging (20 pts): Is the brand identity clear? Is the value proposition obvious?
3. SEO Elements & Structure (20 pts): Title tags, meta descriptions, heading hierarchy, clean URLs
4. Authority Signals (15 pts): Trust indicators, credentials, testimonials, industry expertise
5. Topic Relevance & Expertise (20 pts): Demonstrates expertise in their domain? Topical authority?

Return ONLY valid JSON (no markdown code blocks):
{
  "score": <400-850>,
  "composite": <0-100>,
  "tier": "<Excellent|Very Good|Good|Fair|Needs Improvement>",
  "analysis": "<3-4 sentences: Start with visibility assessment, explain key factors, mention specific observations, contextualize the tier>",
  "strengths": ["<20-word strength with specific detail>", "<20-word different strength>", "<20-word third strength>"],
  "improvements": ["<20-word actionable recommendation with 'why'>", "<20-word different recommendation>", "<20-word third recommendation>"]
}`
      : `Estimate AI search visibility for domain: ${cleanDomain}

IMPORTANT: Website content could not be fully fetched. Error: ${fetchError}
${metaData.title ? `Title found: ${metaData.title}` : ''}
${metaData.description ? `Description found: ${metaData.description}` : ''}

Provide a CONSERVATIVE estimate (450-600 range) based on:
- Domain name professionalism and memorability
- Whether domain appears to be a legitimate business
- Any metadata that was captured
- General accessibility issues

Return ONLY valid JSON (no markdown code blocks):
{
  "score": <450-600>,
  "composite": <30-50>,
  "tier": "Fair",
  "analysis": "We could not fully analyze ${cleanDomain} due to: ${fetchError}. This preliminary score is based on domain characteristics and limited accessible data. For an accurate visibility assessment, please ensure your website is publicly accessible and try again.",
  "strengths": ["Domain is registered and configured"],
  "improvements": ["Ensure website is publicly accessible for full analysis", "Check if website blocks automated requests"]
}`;

    console.log('Calling Lovable AI for analysis...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI search visibility analyst. Analyze websites for their potential to appear in AI-generated responses (ChatGPT, Perplexity, Gemini). Be accurate and data-driven. Always return valid JSON only, never markdown.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent scoring
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'High demand right now. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log('AI Response:', aiContent);

    // Parse AI response (remove markdown code blocks if present)
    let analysisResult: AnalysisResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysisResult = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (typeof analysisResult.score !== 'number' || 
          typeof analysisResult.composite !== 'number' ||
          !analysisResult.tier ||
          !analysisResult.analysis) {
        throw new Error('Missing required fields in response');
      }
      
      // Clamp score to valid range
      analysisResult.score = Math.max(400, Math.min(850, analysisResult.score));
      analysisResult.composite = Math.max(0, Math.min(100, analysisResult.composite));
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Content:', aiContent);
      // Provide fallback response
      analysisResult = {
        score: 500,
        composite: 45,
        tier: 'Fair',
        analysis: `Analysis of ${cleanDomain} completed with limited data. The preliminary assessment suggests moderate AI visibility potential. For more accurate results, please ensure your website content is fully accessible.`,
        strengths: ['Domain is active'],
        improvements: ['Enable full content analysis for accurate scoring']
      };
    }

    const response = {
      score: analysisResult.score,
      composite: analysisResult.composite,
      tier: analysisResult.tier,
      domain: cleanDomain,
      isDemo: false,
      message: analysisResult.analysis,
      insights: {
        strengths: analysisResult.strengths || [],
        improvements: analysisResult.improvements || []
      },
      metadata: {
        contentFetched: contentAvailable,
        responseTime: metaData.responseTime,
        hasSSL: metaData.hasSSL
      }
    };

    console.log('Analysis complete:', { domain: cleanDomain, score: response.score, tier: response.tier });

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-llumos-score-demo:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: 'Unable to analyze this domain. Please check the URL and try again.',
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
