import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  firstName: string;
  email: string;
  domain: string;
  score: number;
}

interface ProviderResult {
  provider: string;
  prompt: string;
  response: string;
  brandMentioned: boolean;
  competitors: string[];
  score: number;
}

/**
 * Generate 5 industry-relevant prompts based on domain analysis
 */
async function generateIndustryPrompts(domain: string, businessContext: string): Promise<string[]> {
  if (!OPENAI_API_KEY) {
    console.log('[AutoReport] No OpenAI key, using default prompts');
    return getDefaultPrompts(domain);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at generating AI search prompts. Generate exactly 5 prompts that a potential customer might ask an AI assistant when looking for products/services in this industry. The prompts should be natural, conversational, and representative of real search queries.`
          },
          {
            role: 'user',
            content: `Generate 5 AI search prompts for a business with domain "${domain}". 
            
Business context: ${businessContext || 'General business'}

Return ONLY a JSON array of 5 prompt strings, no other text:
["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5"]`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    // Parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const prompts = JSON.parse(jsonMatch[0]);
      if (Array.isArray(prompts) && prompts.length >= 5) {
        return prompts.slice(0, 5);
      }
    }
    
    return getDefaultPrompts(domain);
  } catch (error) {
    console.error('[AutoReport] Error generating prompts:', error);
    return getDefaultPrompts(domain);
  }
}

function getDefaultPrompts(domain: string): string[] {
  const brandName = domain.replace(/\.(com|io|net|org|co)$/i, '').replace(/[.-]/g, ' ');
  return [
    `What is ${brandName} and what do they offer?`,
    `Best alternatives to ${brandName}`,
    `${brandName} reviews and reputation`,
    `Is ${brandName} worth it for small businesses?`,
    `Compare ${brandName} to competitors`
  ];
}

/**
 * Query ChatGPT (OpenAI)
 */
async function queryChatGPT(prompt: string, brandName: string): Promise<ProviderResult> {
  const result: ProviderResult = {
    provider: 'ChatGPT',
    prompt,
    response: '',
    brandMentioned: false,
    competitors: [],
    score: 0
  };

  if (!OPENAI_API_KEY) {
    result.response = 'Provider not configured';
    return result;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    result.response = data.choices[0]?.message?.content || '';
    
    // Check if brand is mentioned
    result.brandMentioned = result.response.toLowerCase().includes(brandName.toLowerCase());
    
    // Extract competitors (simplified)
    result.competitors = extractCompetitors(result.response, brandName);
    
    // Calculate score
    result.score = calculateProviderScore(result);
    
  } catch (error) {
    console.error('[AutoReport] ChatGPT error:', error);
    result.response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

/**
 * Query Perplexity
 */
async function queryPerplexity(prompt: string, brandName: string): Promise<ProviderResult> {
  const result: ProviderResult = {
    provider: 'Perplexity',
    prompt,
    response: '',
    brandMentioned: false,
    competitors: [],
    score: 0
  };

  if (!PERPLEXITY_API_KEY) {
    result.response = 'Provider not configured';
    return result;
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'user', content: prompt }
        ],
        return_citations: true
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity error: ${response.status}`);
    }

    const data = await response.json();
    result.response = data.choices[0]?.message?.content || '';
    
    // Check if brand is mentioned
    result.brandMentioned = result.response.toLowerCase().includes(brandName.toLowerCase());
    
    // Extract competitors
    result.competitors = extractCompetitors(result.response, brandName);
    
    // Calculate score
    result.score = calculateProviderScore(result);
    
  } catch (error) {
    console.error('[AutoReport] Perplexity error:', error);
    result.response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

/**
 * Query Google AI Overview via SerpAPI
 */
async function queryGoogleAIO(prompt: string, brandName: string): Promise<ProviderResult> {
  const result: ProviderResult = {
    provider: 'Google AI',
    prompt,
    response: '',
    brandMentioned: false,
    competitors: [],
    score: 0
  };

  if (!SERPAPI_KEY) {
    result.response = 'Provider not configured';
    return result;
  }

  try {
    // Step 1: Google Search to get page_token
    const googleSearchUrl = new URL('https://serpapi.com/search.json');
    googleSearchUrl.searchParams.set('engine', 'google');
    googleSearchUrl.searchParams.set('q', prompt);
    googleSearchUrl.searchParams.set('api_key', SERPAPI_KEY);
    googleSearchUrl.searchParams.set('gl', 'us');
    googleSearchUrl.searchParams.set('hl', 'en');

    const searchResponse = await fetch(googleSearchUrl.toString());

    if (!searchResponse.ok) {
      throw new Error(`SerpAPI search error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const pageToken = searchData.ai_overview?.page_token;

    if (!pageToken) {
      result.response = 'No AI Overview available for this query';
      return result;
    }

    // Step 2: Get AI Overview content
    const aioUrl = new URL('https://serpapi.com/search.json');
    aioUrl.searchParams.set('engine', 'google_ai_overview');
    aioUrl.searchParams.set('page_token', pageToken);
    aioUrl.searchParams.set('api_key', SERPAPI_KEY);

    const aioResponse = await fetch(aioUrl.toString());

    if (!aioResponse.ok) {
      throw new Error(`SerpAPI AIO error: ${aioResponse.status}`);
    }

    const aioData = await aioResponse.json();
    const aiOverview = aioData.ai_overview || aioData;

    // Extract summary
    if (aiOverview.text_blocks && Array.isArray(aiOverview.text_blocks)) {
      result.response = aiOverview.text_blocks
        .map((block: any) => block.snippet || block.text || '')
        .filter(Boolean)
        .join(' ')
        .trim();
    } else if (aiOverview.snippet || aiOverview.text) {
      result.response = aiOverview.snippet || aiOverview.text || '';
    }

    // Check if brand is mentioned
    result.brandMentioned = result.response.toLowerCase().includes(brandName.toLowerCase());
    
    // Extract competitors
    result.competitors = extractCompetitors(result.response, brandName);
    
    // Calculate score
    result.score = calculateProviderScore(result);
    
  } catch (error) {
    console.error('[AutoReport] Google AIO error:', error);
    result.response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

/**
 * Extract competitor names from response text
 */
function extractCompetitors(text: string, brandName: string): string[] {
  const competitors: string[] = [];
  
  // Common patterns for brand mentions
  const brandPatterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    /\b([A-Z][A-Z]+)\b/g
  ];

  const excludeTerms = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'how',
    'openai', 'chatgpt', 'google', 'perplexity', 'ai', 'microsoft',
    brandName.toLowerCase()
  ]);

  for (const pattern of brandPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const normalized = match.trim();
        if (normalized.length > 2 && 
            !excludeTerms.has(normalized.toLowerCase()) &&
            !competitors.includes(normalized)) {
          competitors.push(normalized);
        }
      }
    }
  }

  return competitors.slice(0, 5);
}

/**
 * Calculate visibility score for a provider result
 */
function calculateProviderScore(result: ProviderResult): number {
  let score = 0;
  
  if (result.brandMentioned) {
    score += 50; // Base score for being mentioned
    
    // Bonus for early mention
    const firstMentionIndex = result.response.toLowerCase().indexOf(result.prompt.toLowerCase().split(' ')[0]);
    if (firstMentionIndex >= 0 && firstMentionIndex < 200) {
      score += 25;
    }
    
    // Bonus for positive context (simplified)
    const positiveTerms = ['best', 'top', 'leading', 'recommend', 'excellent', 'great'];
    for (const term of positiveTerms) {
      if (result.response.toLowerCase().includes(term)) {
        score += 5;
      }
    }
  }

  return Math.min(score, 100);
}

/**
 * Apply blur effect to text by replacing with asterisks
 */
function blurText(text: string): string {
  return text.replace(/[a-zA-Z0-9]/g, '•');
}

/**
 * Generate PDF report with blurred competitor sections
 */
async function generatePDF(
  firstName: string,
  domain: string,
  overallScore: number,
  results: ProviderResult[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  
  // Page 1: Cover
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  // Header
  page.drawText('AI VISIBILITY REPORT', {
    x: margin,
    y: pageHeight - 80,
    size: 28,
    font: helveticaBold,
    color: rgb(0.16, 0.19, 0.26)
  });
  
  page.drawText(`Prepared for ${firstName}`, {
    x: margin,
    y: pageHeight - 115,
    size: 14,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  });
  
  page.drawText(`Domain: ${domain}`, {
    x: margin,
    y: pageHeight - 135,
    size: 12,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  });
  
  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
    x: margin,
    y: pageHeight - 155,
    size: 12,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  });
  
  // Overall Score Section
  page.drawText('OVERALL VISIBILITY SCORE', {
    x: margin,
    y: pageHeight - 220,
    size: 16,
    font: helveticaBold,
    color: rgb(0.16, 0.19, 0.26)
  });
  
  // Score circle representation
  const scoreColor = overallScore >= 70 ? rgb(0.2, 0.7, 0.3) : 
                     overallScore >= 40 ? rgb(0.9, 0.6, 0.1) : 
                     rgb(0.8, 0.2, 0.2);
  
  page.drawText(`${overallScore}`, {
    x: margin + 20,
    y: pageHeight - 280,
    size: 48,
    font: helveticaBold,
    color: scoreColor
  });
  
  page.drawText('/ 100', {
    x: margin + 90,
    y: pageHeight - 280,
    size: 18,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  // Score interpretation
  const scoreLabel = overallScore >= 70 ? 'Strong AI Visibility' :
                     overallScore >= 40 ? 'Moderate AI Visibility' :
                     'Low AI Visibility';
  
  page.drawText(scoreLabel, {
    x: margin,
    y: pageHeight - 310,
    size: 14,
    font: helveticaBold,
    color: scoreColor
  });
  
  // Provider Summary
  let yPos = pageHeight - 370;
  
  page.drawText('VISIBILITY BY PLATFORM', {
    x: margin,
    y: yPos,
    size: 16,
    font: helveticaBold,
    color: rgb(0.16, 0.19, 0.26)
  });
  
  yPos -= 30;
  
  // Group results by provider
  const providerScores: Record<string, { total: number; count: number; mentioned: number }> = {};
  
  for (const result of results) {
    if (!providerScores[result.provider]) {
      providerScores[result.provider] = { total: 0, count: 0, mentioned: 0 };
    }
    providerScores[result.provider].total += result.score;
    providerScores[result.provider].count++;
    if (result.brandMentioned) {
      providerScores[result.provider].mentioned++;
    }
  }
  
  for (const [provider, data] of Object.entries(providerScores)) {
    const avgScore = Math.round(data.total / data.count);
    const mentionRate = `${data.mentioned}/${data.count} prompts`;
    
    page.drawText(`${provider}:`, {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2)
    });
    
    page.drawText(`Score: ${avgScore}/100`, {
      x: margin + 100,
      y: yPos,
      size: 12,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    page.drawText(`Brand mentioned: ${mentionRate}`, {
      x: margin + 220,
      y: yPos,
      size: 12,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    yPos -= 25;
  }
  
  // Page 2+: Detailed Results
  yPos = pageHeight - 80;
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  page.drawText('DETAILED PROMPT ANALYSIS', {
    x: margin,
    y: yPos,
    size: 18,
    font: helveticaBold,
    color: rgb(0.16, 0.19, 0.26)
  });
  
  yPos -= 40;
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    
    // Check if we need a new page
    if (yPos < 150) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPos = pageHeight - 80;
    }
    
    // Prompt header
    page.drawText(`Prompt ${i + 1}: ${result.provider}`, {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold,
      color: rgb(0.16, 0.19, 0.26)
    });
    
    yPos -= 18;
    
    // The prompt text
    const promptLines = wrapText(result.prompt, 80);
    for (const line of promptLines) {
      page.drawText(`"${line}"`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3)
      });
      yPos -= 14;
    }
    
    yPos -= 5;
    
    // Brand mentioned status (using ASCII-safe characters for PDF compatibility)
    const mentionStatus = result.brandMentioned ? '[YES] Brand Mentioned' : '[NO] Brand Not Mentioned';
    const mentionColor = result.brandMentioned ? rgb(0.2, 0.7, 0.3) : rgb(0.8, 0.2, 0.2);
    
    page.drawText(mentionStatus, {
      x: margin,
      y: yPos,
      size: 10,
      font: helveticaBold,
      color: mentionColor
    });
    
    page.drawText(`Score: ${result.score}/100`, {
      x: margin + 150,
      y: yPos,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    yPos -= 18;
    
    // Competitors (BLURRED)
    if (result.competitors.length > 0) {
      page.drawText('Competitors mentioned:', {
        x: margin,
        y: yPos,
        size: 10,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      yPos -= 14;
      
      // Show blurred competitor names
      const blurredCompetitors = result.competitors.map(c => blurText(c)).join(', ');
      page.drawText(blurredCompetitors, {
        x: margin + 10,
        y: yPos,
        size: 10,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6)
      });
      
      yPos -= 14;
    }
    
    yPos -= 20;
  }
  
  // Final page: CTA
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  page.drawText('UNLOCK YOUR FULL REPORT', {
    x: margin,
    y: pageHeight - 100,
    size: 22,
    font: helveticaBold,
    color: rgb(0.16, 0.19, 0.26)
  });
  
  page.drawText('This preview report shows your basic AI visibility metrics.', {
    x: margin,
    y: pageHeight - 140,
    size: 12,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3)
  });
  
  page.drawText('Get the full Llumos platform to:', {
    x: margin,
    y: pageHeight - 180,
    size: 12,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2)
  });
  
  const benefits = [
    '• See unblurred competitor analysis',
    '• Track visibility changes over time',
    '• Get AI-powered recommendations',
    '• Monitor citations and sources',
    '• Receive weekly visibility reports'
  ];
  
  let benefitY = pageHeight - 210;
  for (const benefit of benefits) {
    page.drawText(benefit, {
      x: margin + 20,
      y: benefitY,
      size: 11,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3)
    });
    benefitY -= 22;
  }
  
  page.drawText('Book a demo: https://llumos.app', {
    x: margin,
    y: benefitY - 30,
    size: 14,
    font: helveticaBold,
    color: rgb(0.4, 0.2, 0.8)
  });
  
  // Footer
  page.drawText('© Llumos.app - AI Visibility Intelligence', {
    x: margin,
    y: 50,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  return await pdfDoc.save();
}

/**
 * Wrap text to fit within character limit
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxChars) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text.substring(0, maxChars)];
}

/**
 * Send email with PDF attachment
 */
async function sendReportEmail(
  email: string,
  firstName: string,
  domain: string,
  score: number,
  pdfBytes: Uint8Array
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('[AutoReport] No Resend API key configured');
    return false;
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    
    // Convert PDF to base64
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
    
    const { data, error: emailError } = await resend.emails.send({
      from: "Llumos Reports <reports@llumos.app>",
      to: [email],
      subject: `Your AI Visibility Report for ${domain}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1f2e;">Hi ${firstName}!</h1>
          
          <p style="font-size: 16px; color: #374151;">
            Your AI Visibility Report for <strong>${domain}</strong> is ready.
          </p>
          
          <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Llumos Score</p>
            <p style="margin: 10px 0; font-size: 48px; font-weight: bold; color: ${score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'};">
              ${score}
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">out of 100</p>
          </div>
          
          <p style="font-size: 16px; color: #374151;">
            We've attached a detailed PDF report showing how your brand appears across ChatGPT, Perplexity, and Google AI Overviews.
          </p>
          
          <p style="font-size: 16px; color: #374151;">
            <strong>Want to improve your AI visibility?</strong> Book a demo to see how Llumos can help you track, monitor, and optimize your brand's presence in AI search results.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://llumos.app/demo" style="background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Book a Demo
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © Llumos.app - AI Visibility Intelligence
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `AI-Visibility-Report-${domain.replace(/\./g, '-')}.pdf`,
          content: pdfBase64
        }
      ]
    });

    if (emailError) {
      console.error('[AutoReport] Resend API error:', JSON.stringify(emailError));
      return false;
    }

    console.log(`[AutoReport] Email sent successfully to ${email}, ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('[AutoReport] Error sending email:', error);
    return false;
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, email, domain, score }: ReportRequest = await req.json();

    console.log(`[AutoReport] Starting report generation for ${domain}`);

    // Extract brand name from domain
    const brandName = domain.replace(/\.(com|io|net|org|co|app)$/i, '').replace(/[.-]/g, ' ');

    // Step 1: Generate industry-relevant prompts
    console.log('[AutoReport] Generating prompts...');
    const prompts = await generateIndustryPrompts(domain, '');

    console.log('[AutoReport] Generated prompts:', prompts);

    // Step 2: Query all providers for each prompt
    console.log('[AutoReport] Querying providers...');
    const allResults: ProviderResult[] = [];

    for (const prompt of prompts) {
      // Query all providers in parallel for this prompt
      const [chatgptResult, perplexityResult, googleResult] = await Promise.all([
        queryChatGPT(prompt, brandName),
        queryPerplexity(prompt, brandName),
        queryGoogleAIO(prompt, brandName)
      ]);

      allResults.push(chatgptResult, perplexityResult, googleResult);
    }

    // Step 3: Calculate overall score
    const validResults = allResults.filter(r => !r.response.startsWith('Error') && !r.response.startsWith('Provider not'));
    const overallScore = validResults.length > 0 
      ? Math.round(validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length)
      : score; // Fall back to original score if no valid results

    console.log(`[AutoReport] Overall score: ${overallScore} from ${validResults.length} valid results`);

    // Step 4: Generate PDF
    console.log('[AutoReport] Generating PDF...');
    const pdfBytes = await generatePDF(firstName, domain, overallScore, allResults);

    console.log(`[AutoReport] PDF generated: ${pdfBytes.length} bytes`);

    // Step 5: Send email
    console.log('[AutoReport] Sending email...');
    const emailSent = await sendReportEmail(email, firstName, domain, overallScore, pdfBytes);

    // Step 6: Update database record
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    await supabase
      .from('visibility_report_requests')
      .update({
        status: emailSent ? 'sent' : 'error',
        metadata: {
          firstName,
          reportGeneratedAt: new Date().toISOString(),
          calculatedScore: overallScore,
          promptsRun: prompts.length,
          providersQueried: 3,
          emailSent
        }
      })
      .eq('email', email)
      .eq('domain', domain)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`[AutoReport] Report generation complete for ${domain}`);

    return new Response(
      JSON.stringify({
        success: true,
        score: overallScore,
        emailSent,
        promptsRun: prompts.length,
        resultsCount: allResults.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[AutoReport] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
