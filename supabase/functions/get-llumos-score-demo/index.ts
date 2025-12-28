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

    // Fetch website content with improved error handling and multiple strategies
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    let websiteContent = '';
    let fetchError: string | null = null;
    let contentSource: 'direct' | 'firecrawl' | 'none' = 'none';

    let metaData = {
      title: '',
      description: '',
      hasSSL: false,
      responseTime: 0,
      headings: [] as string[],
      links: 0,
      images: 0,
      wordCount: 0,
      hasStructuredData: false,
      ogTags: {} as Record<string, string>,
    };

    const normalizeText = (text: string, limit = 15000) =>
      text
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, limit);

    const computeWordCount = (text: string) =>
      text.split(/\s+/).filter((w) => w.length > 2).length;

    // User agents to try - some sites block bots but allow browsers
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    ];

    // 1) Try direct fetch first (fastest)
    for (const userAgent of userAgents) {
      try {
        const startTime = Date.now();
        const url = `https://${cleanDomain}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s

        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
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
          metaData.title = titleMatch ? titleMatch[1].trim().slice(0, 200) : '';

          // Extract meta description
          const descMatch =
            html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
          metaData.description = descMatch ? descMatch[1].trim().slice(0, 500) : '';

          // Extract OG tags for better context
          const ogMatches = html.matchAll(/<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["']/gi);
          for (const match of ogMatches) {
            metaData.ogTags[match[1]] = match[2].slice(0, 200);
          }

          // Extract headings for content structure analysis
          metaData.headings = [];
          const h1Matches = html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/gi);
          const h2Matches = html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/gi);
          for (const match of h1Matches) {
            if (match[1].trim()) metaData.headings.push(`H1: ${match[1].trim().slice(0, 100)}`);
          }
          for (const match of h2Matches) {
            if (match[1].trim() && metaData.headings.length < 10) {
              metaData.headings.push(`H2: ${match[1].trim().slice(0, 100)}`);
            }
          }

          // Count links and images
          metaData.links = (html.match(/<a\s/gi) || []).length;
          metaData.images = (html.match(/<img\s/gi) || []).length;

          // Check for structured data
          metaData.hasStructuredData = html.includes('application/ld+json') || html.includes('itemtype="http://schema.org');

          // Extract main content more intelligently
          let contentHtml = html;

          // Remove script, style, nav, footer, header tags
          contentHtml = contentHtml
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
            .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '');

          // Try to find main content area
          const mainMatch =
            contentHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
            contentHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
            contentHtml.match(/<div[^>]*class=["'][^"']*(?:content|main|body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

          const contentToAnalyze = mainMatch ? mainMatch[1] : contentHtml;

          // Extract clean text
          websiteContent = normalizeText(
            contentToAnalyze
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
          );

          metaData.wordCount = computeWordCount(websiteContent);

          console.log(
            `Fetched ${websiteContent.length} chars, ${metaData.wordCount} words from ${cleanDomain} in ${metaData.responseTime}ms with UA: ${userAgent.slice(0, 30)}...`
          );
          fetchError = null;
          contentSource = 'direct';
          break; // Success, exit loop
        } else {
          fetchError = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`Failed to fetch ${cleanDomain} with UA ${userAgent.slice(0, 20)}...: ${fetchError}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('aborted')) {
          fetchError = 'Request timeout - website took too long to respond';
        } else {
          fetchError = errorMessage;
        }
        console.log(`Error fetching with UA ${userAgent.slice(0, 20)}...: ${fetchError}`);
      }
    }

    // 2) If blocked/timeout, fall back to Firecrawl (more reliable against bot protection)
    if ((websiteContent.length < 300 || fetchError) && FIRECRAWL_API_KEY) {
      try {
        const startTime = Date.now();
        const url = `https://${cleanDomain}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        console.log(`[Firecrawl] Scraping ${url}...`);

        const fcResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            url,
            formats: ['markdown', 'html'],
            onlyMainContent: true,
          }),
        });

        clearTimeout(timeoutId);

        const fcJson = await fcResp.json().catch(() => ({}));
        if (!fcResp.ok) {
          const err = (fcJson as any)?.error || `Firecrawl error (HTTP ${fcResp.status})`;
          throw new Error(err);
        }

        const fcData = (fcJson as any)?.data ?? fcJson;
        const markdown = (fcData?.markdown as string | undefined) || '';
        const html = (fcData?.html as string | undefined) || '';
        const fcMeta = (fcData?.metadata as Record<string, any> | undefined) || {};

        const rawText = markdown
          ? markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
          : html.replace(/<[^>]+>/g, ' ');

        const normalized = normalizeText(rawText);

        if (normalized.length > 300) {
          websiteContent = normalized;
          metaData.responseTime = Date.now() - startTime;
          metaData.title = (fcMeta.title || metaData.title || '').toString().slice(0, 200);
          metaData.description = (fcMeta.description || metaData.description || '').toString().slice(0, 500);
          metaData.wordCount = computeWordCount(websiteContent);

          // Basic link/image counts from markdown (best-effort)
          metaData.links = markdown ? (markdown.match(/\]\((https?:\/\/[^)]+)\)/g) || []).length : metaData.links;
          metaData.images = markdown ? (markdown.match(/!\[[^\]]*\]\(([^)]+)\)/g) || []).length : metaData.images;

          // Headings from markdown
          metaData.headings = [];
          if (markdown) {
            const headingLines = markdown
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => /^#{1,2}\s+/.test(l))
              .slice(0, 10);
            for (const h of headingLines) {
              const level = h.startsWith('##') ? 'H2' : 'H1';
              metaData.headings.push(`${level}: ${h.replace(/^#{1,2}\s+/, '').slice(0, 100)}`);
            }
          }

          fetchError = null;
          contentSource = 'firecrawl';
          console.log(`[Firecrawl] Success: ${websiteContent.length} chars, ${metaData.wordCount} words`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown Firecrawl error';
        console.log(`[Firecrawl] Failed: ${msg}`);
        // Keep prior fetchError (direct fetch) if it exists; otherwise store Firecrawl error.
        fetchError = fetchError || msg;
      }
    }

    if (fetchError) {
      console.log(`All fetch attempts failed for ${cleanDomain}: ${fetchError}`);
      contentSource = 'none';
    }

    // If we couldn't fetch content, use AI with just domain info
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const contentAvailable = websiteContent.length > 100;

    // Build comprehensive metadata summary
    const metadataSummary = `
DOMAIN: ${cleanDomain}
CONTENT SOURCE: ${contentSource}
METADATA:
- Title: ${metaData.title || 'Not found'}
- Description: ${metaData.description || 'Not found'}
- SSL: ${metaData.hasSSL ? 'Yes' : 'No'}
- Response Time: ${metaData.responseTime}ms
- Word Count: ${metaData.wordCount}
- Links: ${metaData.links}
- Images: ${metaData.images}
- Structured Data: ${metaData.hasStructuredData ? 'Yes' : 'No'}
${metaData.ogTags['title'] ? `- OG Title: ${metaData.ogTags['title']}` : ''}
${metaData.ogTags['description'] ? `- OG Description: ${metaData.ogTags['description']}` : ''}
${metaData.ogTags['type'] ? `- OG Type: ${metaData.ogTags['type']}` : ''}

HEADINGS:
${metaData.headings.length > 0 ? metaData.headings.join('\n') : 'No headings found'}`;

    const analysisPrompt = contentAvailable 
      ? `Analyze this website's AI search visibility potential for appearing in AI-generated responses.

${metadataSummary}

WEBSITE CONTENT (first ${metaData.wordCount} words):
${websiteContent}

SCORING CRITERIA (total 100 points, scale to 0-850 final score):
1. Content Quality & Depth (25 pts): Is content comprehensive, well-structured, informative, and unique? Does it demonstrate E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)?
2. Brand Clarity & Messaging (20 pts): Is the brand identity clear? Is the value proposition obvious? Is messaging consistent?
3. SEO Elements & Structure (20 pts): Title tags, meta descriptions, heading hierarchy (H1, H2s), structured data, clean URLs
4. Authority Signals (15 pts): Trust indicators, credentials, testimonials, industry expertise, backlink-worthy content
5. Topic Relevance & Expertise (20 pts): Demonstrates expertise in their domain? Topical authority? Depth of coverage?

ANALYSIS GUIDELINES:
- Be specific about what you found (mention actual page content, headings, topics)
- Reference specific elements from the metadata and content
- Provide actionable, specific recommendations based on what's missing
- Score fairly - most sites score between 500-700

Return ONLY valid JSON (no markdown code blocks):
{
  "score": <400-850>,
  "composite": <0-100>,
  "tier": "<Excellent|Very Good|Good|Fair|Needs Improvement>",
  "analysis": "<3-4 sentences: Specific visibility assessment mentioning actual content found, explain key factors affecting their score, note specific strengths or gaps observed>",
  "strengths": ["<specific strength with detail from the actual content>", "<another specific strength>", "<third strength if applicable>"],
  "improvements": ["<specific actionable recommendation based on what's missing>", "<another specific recommendation>", "<third recommendation if applicable>"]
}`
      : `Estimate AI search visibility for domain: ${cleanDomain}

IMPORTANT: Website content could not be fully fetched after multiple attempts.
Error: ${fetchError}

${metaData.title ? `Title found: ${metaData.title}` : 'No title could be retrieved.'}
${metaData.description ? `Description found: ${metaData.description}` : 'No description could be retrieved.'}
${Object.keys(metaData.ogTags).length > 0 ? `OG Tags found: ${JSON.stringify(metaData.ogTags)}` : ''}

Based on the domain name "${cleanDomain}", provide analysis considering:
- Domain professionalism and brandability
- Industry the domain appears to target
- Whether domain suggests a legitimate business
- Common reasons for fetch failures (bot blocking, slow servers, security measures)

Provide a CONSERVATIVE score (450-600 range) since we cannot verify content.

Return ONLY valid JSON (no markdown code blocks):
{
  "score": <450-600>,
  "composite": <30-50>,
  "tier": "Fair",
  "analysis": "We could not fully analyze ${cleanDomain} due to: ${fetchError}. This preliminary score is based on domain characteristics and limited accessible data. For an accurate visibility assessment, please ensure your website is publicly accessible and try again.",
  "strengths": ["<strength based on domain name characteristics>", "<another observation if applicable>"],
  "improvements": ["<recommendation about accessibility>", "<recommendation about content visibility>", "<another recommendation>"]
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
