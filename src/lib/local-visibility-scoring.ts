/**
 * Local AI Visibility Scoring System
 * Deterministic scoring for local business AI visibility
 */

export interface BusinessInput {
  businessName: string;
  websiteUrl: string;
  city: string;
  category: string;
}

export interface PromptResult {
  prompt: string;
  model: 'ChatGPT' | 'Gemini' | 'Perplexity';
  mentioned: boolean;
  recommended: boolean;
  position: number | null; // 1-based position in list, null if not in list
  competitorsMentioned: string[];
  score: number;
}

export interface ScanResults {
  businessName: string;
  city: string;
  category: string;
  rawScore: number;
  maxPossibleScore: number;
  normalizedScore: number; // 0-100
  statusLabel: 'Not Mentioned' | 'Mentioned Occasionally' | 'Frequently Recommended';
  promptResults: PromptResult[];
  topCompetitors: { name: string; mentions: number }[];
  googleMapsEstimate: number; // Simulated Google Maps visibility for comparison
}

const AI_MODELS: Array<'ChatGPT' | 'Gemini' | 'Perplexity'> = ['ChatGPT', 'Gemini', 'Perplexity'];

// Generate 6 prompts based on category and city
export function generatePrompts(category: string, city: string): string[] {
  return [
    `Best ${category} near me in ${city}`,
    `Who is the most trusted ${category} in ${city}?`,
    `Which ${category} should I call in ${city}?`,
    `Top-rated ${category} in ${city}`,
    `Recommended ${category} in ${city}`,
    `Local ${category} businesses in ${city}`,
  ];
}

// Deterministic hash function for consistent results
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate deterministic "random" number between 0 and 1 based on seed
function seededRandom(seed: string): number {
  const hash = hashString(seed);
  return (hash % 1000) / 1000;
}

// Get competitor businesses for a category (deterministic based on category + city)
function getCompetitorPool(category: string, city: string): string[] {
  const categoryCompetitors: Record<string, string[]> = {
    'Plumber': ['Quick Fix Plumbing', 'City Plumbers Pro', 'Emergency Pipe Masters', 'Reliable Plumbing Co', 'Local Drain Experts'],
    'HVAC': ['Cool Air Solutions', 'Climate Control Pro', 'AC Masters', 'Heating & Cooling Experts', 'Comfort Zone HVAC'],
    'Electrician': ['Spark Electric Co', 'Power Pro Electricians', 'Safe Wiring Services', 'Lightning Fast Electric', 'Certified Electric'],
    'Landscaper': ['Green Thumb Landscaping', 'Perfect Lawns Inc', 'Outdoor Living Designs', 'Nature\'s Touch Gardens', 'Premier Lawn Care'],
    'Dentist': ['Bright Smile Dental', 'Family Dental Care', 'Gentle Touch Dentistry', 'Modern Dental Group', 'Premier Dental Clinic'],
    'Doctor': ['City Medical Center', 'Family Health Clinic', 'Wellness Medical Group', 'Premier Healthcare', 'Community Health Partners'],
    'Lawyer': ['Smith & Associates Law', 'Justice Legal Group', 'Trusted Law Firm', 'City Legal Services', 'Expert Attorneys LLC'],
    'Real Estate Agent': ['Premier Realty Group', 'Home Finders Realty', 'Local Property Experts', 'Dream Home Agents', 'City Real Estate'],
    'Restaurant': ['The Local Kitchen', 'City Bistro', 'Neighborhood Grill', 'Fresh Eats Cafe', 'Downtown Dining'],
    'Auto Repair': ['Quick Fix Auto', 'Reliable Mechanics', 'City Auto Care', 'Expert Car Service', 'Precision Auto Repair'],
  };
  
  const defaultCompetitors = [
    `${city} ${category} Pros`,
    `Premier ${category} Services`,
    `Trusted ${category} Co`,
    `Local ${category} Experts`,
    `${city} ${category} Masters`,
  ];
  
  return categoryCompetitors[category] || defaultCompetitors;
}

// Calculate mention score based on rules
function calculateMentionScore(mentioned: boolean, recommended: boolean, position: number | null): number {
  let score = 0;
  
  // Base mention scoring
  if (!mentioned) {
    score = 0;
  } else if (mentioned && !recommended) {
    score = 1;
  } else if (recommended) {
    score = 2;
  }
  
  // Position bonus (if in ordered list)
  if (position !== null) {
    if (position === 1) {
      score += 1;
    } else if (position === 2 || position === 3) {
      score += 0.5;
    }
  }
  
  return Math.min(score, 3); // Max 3 per prompt per model
}

// Simulate AI response for a specific prompt and model (deterministic)
function simulateAIResponse(
  businessName: string,
  prompt: string,
  model: string,
  competitorPool: string[]
): { mentioned: boolean; recommended: boolean; position: number | null; competitors: string[] } {
  // Create deterministic seed from all inputs
  const seed = `${businessName.toLowerCase()}-${prompt}-${model}`;
  const random = seededRandom(seed);
  
  // Determine if business is mentioned (varies by "quality signals" in name/domain)
  const hasLocalKeyword = businessName.toLowerCase().includes('local') || 
                          businessName.toLowerCase().includes('city') ||
                          businessName.toLowerCase().includes('pro');
  const mentionThreshold = hasLocalKeyword ? 0.4 : 0.25;
  const mentioned = random < mentionThreshold;
  
  // If mentioned, determine if recommended
  const recommendThreshold = hasLocalKeyword ? 0.6 : 0.4;
  const recommended = mentioned && seededRandom(seed + '-rec') < recommendThreshold;
  
  // Determine position (if in a list)
  let position: number | null = null;
  if (mentioned) {
    const posRandom = seededRandom(seed + '-pos');
    if (posRandom < 0.2) position = 1;
    else if (posRandom < 0.4) position = 2;
    else if (posRandom < 0.6) position = 3;
    else if (posRandom < 0.8) position = 4;
  }
  
  // Select competitors mentioned (2-4 competitors per response)
  const numCompetitors = 2 + Math.floor(seededRandom(seed + '-comp-count') * 3);
  const competitors: string[] = [];
  for (let i = 0; i < numCompetitors && i < competitorPool.length; i++) {
    const compSeed = seed + `-comp-${i}`;
    const compIndex = Math.floor(seededRandom(compSeed) * competitorPool.length);
    const competitor = competitorPool[compIndex];
    if (!competitors.includes(competitor)) {
      competitors.push(competitor);
    }
  }
  
  return { mentioned, recommended, position, competitors };
}

// Get status label based on normalized score
function getStatusLabel(score: number): 'Not Mentioned' | 'Mentioned Occasionally' | 'Frequently Recommended' {
  if (score < 30) return 'Not Mentioned';
  if (score < 70) return 'Mentioned Occasionally';
  return 'Frequently Recommended';
}

// Estimate Google Maps visibility (for comparison display)
function estimateGoogleMapsVisibility(businessName: string, city: string): number {
  const seed = `google-${businessName.toLowerCase()}-${city.toLowerCase()}`;
  const base = 40 + (seededRandom(seed) * 40); // 40-80 range
  return Math.round(base);
}

// Main scoring function
export function calculateLocalAIVisibilityScore(input: BusinessInput): ScanResults {
  const { businessName, city, category } = input;
  
  // Generate all prompts
  const prompts = generatePrompts(category, city);
  
  // Get competitor pool for this category
  const competitorPool = getCompetitorPool(category, city);
  
  // Track all results and competitor mentions
  const promptResults: PromptResult[] = [];
  const competitorMentions: Record<string, number> = {};
  let rawScore = 0;
  
  // Run each prompt across each model
  for (const prompt of prompts) {
    for (const model of AI_MODELS) {
      const response = simulateAIResponse(businessName, prompt, model, competitorPool);
      
      const score = calculateMentionScore(
        response.mentioned,
        response.recommended,
        response.position
      );
      
      rawScore += score;
      
      // Track competitor mentions
      for (const competitor of response.competitors) {
        competitorMentions[competitor] = (competitorMentions[competitor] || 0) + 1;
      }
      
      promptResults.push({
        prompt,
        model,
        mentioned: response.mentioned,
        recommended: response.recommended,
        position: response.position,
        competitorsMentioned: response.competitors,
        score,
      });
    }
  }
  
  // Calculate normalized score (0-100)
  const maxPossibleScore = 54; // 6 prompts × 3 models × 3 max score
  const normalizedScore = Math.round((rawScore / maxPossibleScore) * 100);
  
  // Rank competitors by mentions
  const topCompetitors = Object.entries(competitorMentions)
    .map(([name, mentions]) => ({ name, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);
  
  return {
    businessName,
    city,
    category,
    rawScore,
    maxPossibleScore,
    normalizedScore,
    statusLabel: getStatusLabel(normalizedScore),
    promptResults,
    topCompetitors,
    googleMapsEstimate: estimateGoogleMapsVisibility(businessName, city),
  };
}

// Get color based on score
export function getScoreColor(score: number): string {
  if (score < 30) return 'text-red-500';
  if (score < 70) return 'text-yellow-500';
  return 'text-green-500';
}

export function getScoreBgColor(score: number): string {
  if (score < 30) return 'bg-red-500/10';
  if (score < 70) return 'bg-yellow-500/10';
  return 'bg-green-500/10';
}
