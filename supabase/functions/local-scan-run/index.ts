import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

type AIModel = 'openai' | 'gemini' | 'perplexity';

interface Prompt {
  id: string;
  prompt_index: number;
  prompt_text: string;
}

interface Scan {
  id: string;
  business_name: string;
  business_website: string | null;
  city: string;
  category: string;
}

interface RunResult {
  prompt_id: string;
  model: AIModel;
  response_text: string | null;
  extracted_business_mentioned: boolean;
  extracted_recommended: boolean;
  extracted_position: number | null;
  base_points: number;
  position_bonus: number;
  total_points: number;
  competitor_names: string[];
  error: string | null;
}

// Keywords that indicate recommendation
const RECOMMENDATION_KEYWORDS = [
  'recommend', 'recommended', 'top', 'best', 'trusted', 
  'highly rated', 'good choice', 'great option', 'excellent',
  'popular', 'leading', 'premier', 'outstanding'
];

// Extract domain from website URL
function extractDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    let url = website.trim().toLowerCase();
    if (!url.startsWith('http')) url = 'https://' + url;
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
  }
}

// Check if business is mentioned in response
function checkMentioned(response: string, businessName: string, domain: string | null): boolean {
  const lower = response.toLowerCase();
  const nameLower = businessName.toLowerCase();
  
  // Check for business name
  if (lower.includes(nameLower)) return true;
  
  // Check for domain
  if (domain && lower.includes(domain)) return true;
  
  // Check for partial name matches (at least 2 consecutive words)
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
  if (nameWords.length >= 2) {
    for (let i = 0; i < nameWords.length - 1; i++) {
      const partial = nameWords.slice(i, i + 2).join(' ');
      if (lower.includes(partial)) return true;
    }
  }
  
  return false;
}

// Check if business is recommended
function checkRecommended(response: string, isMentioned: boolean): boolean {
  if (!isMentioned) return false;
  const lower = response.toLowerCase();
  return RECOMMENDATION_KEYWORDS.some(kw => lower.includes(kw));
}

// Extract position from numbered or bulleted list
function extractPosition(response: string, businessName: string, domain: string | null): number | null {
  const lines = response.split('\n');
  const nameLower = businessName.toLowerCase();
  const domainLower = domain?.toLowerCase();
  
  // Pattern for numbered lists: "1.", "2.", "1)", "2)", etc.
  const numberedPattern = /^[\s]*(\d+)[.)\]:\-]\s*/;
  // Pattern for bullet lists: "•", "-", "*", etc.
  const bulletPattern = /^[\s]*[•\-\*→►▸]\s*/;
  
  let currentPosition = 0;
  let inList = false;
  
  for (const line of lines) {
    const numberedMatch = line.match(numberedPattern);
    const isBullet = bulletPattern.test(line);
    
    if (numberedMatch) {
      currentPosition = parseInt(numberedMatch[1], 10);
      inList = true;
    } else if (isBullet && inList) {
      currentPosition++;
    } else if (isBullet && !inList) {
      inList = true;
      currentPosition = 1;
    } else if (line.trim() === '') {
      // Empty line might end list
      continue;
    }
    
    if (inList && currentPosition > 0) {
      const lineLower = line.toLowerCase();
      if (lineLower.includes(nameLower) || (domainLower && lineLower.includes(domainLower))) {
        return currentPosition;
      }
    }
  }
  
  return null;
}

// Extract competitor names from response
function extractCompetitors(response: string, businessName: string, category: string): string[] {
  const competitors: string[] = [];
  const lines = response.split('\n');
  const nameLower = businessName.toLowerCase();
  
  // Pattern for business names in lists
  const listItemPattern = /^[\s]*(?:\d+[.)\]:\-]|[•\-\*→►▸])\s*\*?\*?([A-Z][A-Za-z0-9\s&']+?)(?:\*?\*?\s*[-–—:]|\s*-\s|\s+is\s|\s+offers|\s+provides|\s*$)/;
  
  for (const line of lines) {
    const match = line.match(listItemPattern);
    if (match) {
      const name = match[1].trim();
      // Filter out generic terms and the target business
      if (
        name.length > 2 && 
        name.length < 50 &&
        !name.toLowerCase().includes(nameLower) &&
        !name.toLowerCase().includes(category.toLowerCase()) &&
        !/^(the|a|an|this|that|these|those|here|there)$/i.test(name)
      ) {
        competitors.push(name);
      }
    }
  }
  
  // Return unique competitors, max 3
  return [...new Set(competitors)].slice(0, 3);
}

// Calculate scoring
function calculateScoring(mentioned: boolean, recommended: boolean, position: number | null): {
  base_points: number;
  position_bonus: number;
  total_points: number;
} {
  // Base points
  let base_points = 0;
  if (!mentioned) {
    base_points = 0;
  } else if (mentioned && !recommended) {
    base_points = 1;
  } else if (recommended) {
    base_points = 2;
  }
  
  // Position bonus
  let position_bonus = 0;
  if (position === 1) {
    position_bonus = 1;
  } else if (position === 2 || position === 3) {
    position_bonus = 0.5;
  }
  
  // Total points (max 3)
  const total_points = Math.min(3, base_points + position_bonus);
  
  return { base_points, position_bonus, total_points };
}

// Get status label from normalized score
function getStatusLabel(normalizedScore: number): string {
  if (normalizedScore < 30) return 'Not Mentioned';
  if (normalizedScore < 70) return 'Mentioned Occasionally';
  return 'Frequently Recommended';
}

// Call OpenAI API
async function callOpenAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that provides recommendations for local businesses. Always provide specific business names when available. Format your response with a numbered list of recommendations.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Call Gemini API
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ 
          text: `You are a helpful assistant that provides recommendations for local businesses. Always provide specific business names when available. Format your response with a numbered list of recommendations.\n\nUser question: ${prompt}` 
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Call Perplexity API
async function callPerplexity(prompt: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not configured');
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that provides recommendations for local businesses. Always provide specific business names when available. Format your response with a numbered list of recommendations.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Call AI model
async function callAIModel(model: AIModel, prompt: string): Promise<string> {
  switch (model) {
    case 'openai':
      return callOpenAI(prompt);
    case 'gemini':
      return callGemini(prompt);
    case 'perplexity':
      return callPerplexity(prompt);
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let scanId: string | null = null;

  try {
    const body = await req.json();
    scanId = body.scan_id;

    if (!scanId) {
      return new Response(
        JSON.stringify({ error: 'scan_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[local-scan-run] Starting scan: ${scanId}`);

    // Get scan details
    const { data: scan, error: scanError } = await supabase
      .from('local_ai_scans')
      .select('id, business_name, business_website, city, category, status')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      console.error('[local-scan-run] Scan not found:', scanError);
      return new Response(
        JSON.stringify({ error: 'Scan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (scan.status === 'running') {
      return new Response(
        JSON.stringify({ error: 'Scan is already running' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (scan.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Scan already completed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to running
    await supabase
      .from('local_ai_scans')
      .update({ status: 'running' })
      .eq('id', scanId);

    // Get prompts
    const { data: prompts, error: promptsError } = await supabase
      .from('local_ai_scan_prompts')
      .select('id, prompt_index, prompt_text')
      .eq('scan_id', scanId)
      .order('prompt_index');

    if (promptsError || !prompts?.length) {
      throw new Error('Failed to load prompts');
    }

    console.log(`[local-scan-run] Processing ${prompts.length} prompts for ${scan.business_name}`);

    const domain = extractDomain(scan.business_website);
    const models: AIModel[] = ['openai', 'gemini', 'perplexity'];
    const allRuns: RunResult[] = [];
    let failedCount = 0;
    const totalExpected = prompts.length * models.length;

    // Process each prompt with each model
    for (const prompt of prompts) {
      for (const model of models) {
        const runResult: RunResult = {
          prompt_id: prompt.id,
          model,
          response_text: null,
          extracted_business_mentioned: false,
          extracted_recommended: false,
          extracted_position: null,
          base_points: 0,
          position_bonus: 0,
          total_points: 0,
          competitor_names: [],
          error: null,
        };

        try {
          console.log(`[local-scan-run] Calling ${model} for prompt ${prompt.prompt_index}`);
          
          const responseText = await callAIModel(model, prompt.prompt_text);
          runResult.response_text = responseText;

          // Extract data from response
          const mentioned = checkMentioned(responseText, scan.business_name, domain);
          const recommended = checkRecommended(responseText, mentioned);
          const position = extractPosition(responseText, scan.business_name, domain);
          const competitors = extractCompetitors(responseText, scan.business_name, scan.category);

          runResult.extracted_business_mentioned = mentioned;
          runResult.extracted_recommended = recommended;
          runResult.extracted_position = position;
          runResult.competitor_names = competitors;

          // Calculate scoring
          const scoring = calculateScoring(mentioned, recommended, position);
          runResult.base_points = scoring.base_points;
          runResult.position_bonus = scoring.position_bonus;
          runResult.total_points = scoring.total_points;

          console.log(`[local-scan-run] ${model} prompt ${prompt.prompt_index}: mentioned=${mentioned}, recommended=${recommended}, position=${position}, score=${scoring.total_points}`);

        } catch (error) {
          console.error(`[local-scan-run] Error calling ${model}:`, error);
          runResult.error = error instanceof Error ? error.message : 'Unknown error';
          failedCount++;
        }

        allRuns.push(runResult);
      }
    }

    // Check if too many failures
    if (failedCount > totalExpected / 2) {
      await supabase
        .from('local_ai_scans')
        .update({ 
          status: 'failed',
          error: `Too many AI provider failures: ${failedCount}/${totalExpected}`
        })
        .eq('id', scanId);

      return new Response(
        JSON.stringify({ 
          error: 'Too many AI provider failures',
          failed_count: failedCount,
          total_expected: totalExpected 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert all run results
    const runRecords = allRuns.map(run => ({
      scan_id: scanId,
      prompt_id: run.prompt_id,
      model: run.model,
      response_text: run.response_text,
      extracted_business_mentioned: run.extracted_business_mentioned,
      extracted_recommended: run.extracted_recommended,
      extracted_position: run.extracted_position,
      base_points: run.base_points,
      position_bonus: run.position_bonus,
      total_points: run.total_points,
      competitor_names: run.competitor_names,
      error: run.error,
    }));

    const { error: insertRunsError } = await supabase
      .from('local_ai_scan_runs')
      .insert(runRecords);

    if (insertRunsError) {
      console.error('[local-scan-run] Failed to insert runs:', insertRunsError);
      throw new Error(`Failed to save run results: ${insertRunsError.message}`);
    }

    // Calculate aggregate scores
    const rawScore = allRuns.reduce((sum, run) => sum + run.total_points, 0);
    const maxRawScore = 54;
    const normalizedScore = Math.round((rawScore / maxRawScore) * 100);
    const label = getStatusLabel(normalizedScore);

    console.log(`[local-scan-run] Raw score: ${rawScore}/${maxRawScore}, Normalized: ${normalizedScore}, Label: ${label}`);

    // Aggregate competitors
    const competitorMap = new Map<string, { mentions: number; recommended: number; positions: number[] }>();
    
    for (const run of allRuns) {
      for (const compName of run.competitor_names) {
        const existing = competitorMap.get(compName) || { mentions: 0, recommended: 0, positions: [] };
        existing.mentions++;
        if (run.extracted_recommended) {
          existing.recommended++;
        }
        if (run.extracted_position) {
          existing.positions.push(run.extracted_position);
        }
        competitorMap.set(compName, existing);
      }
    }

    // Insert competitor records
    const competitorRecords = Array.from(competitorMap.entries()).map(([name, data]) => ({
      scan_id: scanId,
      competitor_name: name,
      mention_count: data.mentions,
      recommended_count: data.recommended,
      avg_position: data.positions.length > 0 
        ? data.positions.reduce((a, b) => a + b, 0) / data.positions.length 
        : null,
    }));

    if (competitorRecords.length > 0) {
      const { error: compError } = await supabase
        .from('local_ai_scan_competitors')
        .insert(competitorRecords);

      if (compError) {
        console.error('[local-scan-run] Failed to insert competitors:', compError);
        // Non-fatal, continue
      }
    }

    // Get top 3 competitors
    const topCompetitors = competitorRecords
      .sort((a, b) => b.mention_count - a.mention_count)
      .slice(0, 3)
      .map(c => ({
        name: c.competitor_name,
        mentions: c.mention_count,
        recommended_count: c.recommended_count,
      }));

    // Update final scan results
    const { error: updateError } = await supabase
      .from('local_ai_scans')
      .update({
        status: 'completed',
        raw_score: rawScore,
        normalized_score: normalizedScore,
        label,
        top_competitors: topCompetitors,
        error: null,
      })
      .eq('id', scanId);

    if (updateError) {
      console.error('[local-scan-run] Failed to update scan:', updateError);
      throw new Error(`Failed to update scan: ${updateError.message}`);
    }

    console.log(`[local-scan-run] Scan completed: ${scanId}`);

    return new Response(
      JSON.stringify({
        success: true,
        scan_id: scanId,
        business_name: scan.business_name,
        city: scan.city,
        category: scan.category,
        raw_score: rawScore,
        max_raw_score: maxRawScore,
        normalized_score: normalizedScore,
        label,
        top_competitors: topCompetitors,
        runs_completed: allRuns.length - failedCount,
        runs_failed: failedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[local-scan-run] Critical error:', error);
    
    // Update scan status to failed if we have a scan ID
    if (scanId) {
      await supabase
        .from('local_ai_scans')
        .update({ 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', scanId);
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
