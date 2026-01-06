/**
 * Local AI Authority - Shared Utilities
 * Brand matching, extraction, and prompt building helpers
 */

// Brand matching utilities
export interface BrandMatchConfig {
  business_name: string;
  domain?: string;
  brand_synonyms?: string[];
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractDomainName(domain: string): string {
  return domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\.(com|net|org|io|co|biz|info|us|uk|ca|au).*$/, '')
    .toLowerCase();
}

export function matchesBrand(text: string, config: BrandMatchConfig): boolean {
  const normalizedText = normalizeName(text);
  
  // Check business name
  const normalizedBizName = normalizeName(config.business_name);
  if (normalizedText.includes(normalizedBizName)) return true;
  
  // Check domain-derived name
  if (config.domain) {
    const domainName = extractDomainName(config.domain);
    if (domainName.length > 2 && normalizedText.includes(domainName)) return true;
  }
  
  // Check synonyms
  if (config.brand_synonyms) {
    for (const synonym of config.brand_synonyms) {
      if (normalizeName(synonym) && normalizedText.includes(normalizeName(synonym))) {
        return true;
      }
    }
  }
  
  return false;
}

// Competitor extraction
export interface CompetitorMention {
  name: string;
  confidence: number;
}

export function extractCompetitors(
  text: string,
  brandConfig: BrandMatchConfig,
  knownCompetitors?: { name: string; domain?: string }[]
): CompetitorMention[] {
  const competitors: CompetitorMention[] = [];
  const seen = new Set<string>();
  
  // Check known competitors first
  if (knownCompetitors) {
    for (const comp of knownCompetitors) {
      const normalizedComp = normalizeName(comp.name);
      if (normalizedComp && text.toLowerCase().includes(normalizedComp)) {
        if (!seen.has(normalizedComp)) {
          seen.add(normalizedComp);
          competitors.push({ name: comp.name, confidence: 0.9 });
        }
      }
    }
  }
  
  // Extract potential business names from numbered lists
  const listPatterns = [
    /\d+\.\s*\*?\*?([A-Z][a-zA-Z0-9\s&'.-]+?)(?:\*?\*?)(?:\s*[-–—:]|\s*\(|$)/gm,
    /[-•]\s*\*?\*?([A-Z][a-zA-Z0-9\s&'.-]+?)(?:\*?\*?)(?:\s*[-–—:]|\s*\(|$)/gm,
  ];
  
  for (const pattern of listPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      const normalizedName = normalizeName(name);
      
      // Skip if it matches the brand or is too short/generic
      if (normalizedName.length < 3) continue;
      if (matchesBrand(name, brandConfig)) continue;
      if (seen.has(normalizedName)) continue;
      
      // Skip generic terms
      const genericTerms = ['best', 'top', 'local', 'nearby', 'recommended', 'popular'];
      if (genericTerms.some(t => normalizedName === t)) continue;
      
      seen.add(normalizedName);
      competitors.push({ name, confidence: 0.6 });
    }
  }
  
  return competitors.slice(0, 10); // Limit to 10 competitors per response
}

// Recommendation extraction
export interface ExtractedRecommendation {
  name: string;
  reason?: string;
  position?: number;
  is_brand: boolean;
  confidence: number;
}

export function extractRecommendations(
  text: string,
  brandConfig: BrandMatchConfig
): ExtractedRecommendation[] {
  const recommendations: ExtractedRecommendation[] = [];
  const seen = new Set<string>();
  
  // Pattern for numbered lists
  const numberedPattern = /(\d+)\.\s*\*?\*?([A-Z][a-zA-Z0-9\s&'.-]+?)(?:\*?\*?)(?:\s*[-–—:](.+?))?(?=\n\d+\.|\n\n|$)/gs;
  
  let match;
  while ((match = numberedPattern.exec(text)) !== null) {
    const position = parseInt(match[1]);
    const name = match[2].trim();
    const reason = match[3]?.trim();
    const normalizedName = normalizeName(name);
    
    if (normalizedName.length < 2 || seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    
    const isBrand = matchesBrand(name, brandConfig);
    recommendations.push({
      name,
      reason,
      position,
      is_brand: isBrand,
      confidence: 0.8,
    });
  }
  
  // If no numbered list found, try bullet points
  if (recommendations.length === 0) {
    const bulletPattern = /[-•]\s*\*?\*?([A-Z][a-zA-Z0-9\s&'.-]+?)(?:\*?\*?)(?:\s*[-–—:](.+?))?(?=\n[-•]|\n\n|$)/gs;
    let position = 1;
    
    while ((match = bulletPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const reason = match[2]?.trim();
      const normalizedName = normalizeName(name);
      
      if (normalizedName.length < 2 || seen.has(normalizedName)) continue;
      seen.add(normalizedName);
      
      const isBrand = matchesBrand(name, brandConfig);
      recommendations.push({
        name,
        reason,
        position: position++,
        is_brand: isBrand,
        confidence: 0.7,
      });
    }
  }
  
  return recommendations.slice(0, 15);
}

// Place/Location extraction
export interface ExtractedPlace {
  name: string;
  type: 'city' | 'state' | 'neighborhood' | 'landmark';
  confidence: number;
}

export function extractPlaces(
  text: string,
  expectedLocation: { city: string; state: string; neighborhoods?: string[] }
): ExtractedPlace[] {
  const places: ExtractedPlace[] = [];
  const normalizedText = text.toLowerCase();
  
  // Check for city
  const normalizedCity = expectedLocation.city.toLowerCase();
  if (normalizedText.includes(normalizedCity)) {
    places.push({ name: expectedLocation.city, type: 'city', confidence: 0.9 });
  }
  
  // Check for state
  const normalizedState = expectedLocation.state.toLowerCase();
  if (normalizedText.includes(normalizedState)) {
    places.push({ name: expectedLocation.state, type: 'state', confidence: 0.9 });
  }
  
  // Check for neighborhoods
  if (expectedLocation.neighborhoods) {
    for (const hood of expectedLocation.neighborhoods) {
      if (normalizedText.includes(hood.toLowerCase())) {
        places.push({ name: hood, type: 'neighborhood', confidence: 0.8 });
      }
    }
  }
  
  return places;
}

// Brand mention extraction
export interface BrandMention {
  snippet: string;
  confidence: number;
}

export function extractBrandMentions(
  text: string,
  brandConfig: BrandMatchConfig
): BrandMention[] {
  const mentions: BrandMention[] = [];
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (matchesBrand(sentence, brandConfig)) {
      mentions.push({
        snippet: sentence.trim().slice(0, 200),
        confidence: 0.8,
      });
    }
  }
  
  return mentions.slice(0, 10);
}

// Citation processing
export interface Citation {
  title: string;
  url: string;
  mentions_brand: boolean;
}

export function processCitations(
  citations: any[],
  brandConfig: BrandMatchConfig
): Citation[] {
  if (!citations || !Array.isArray(citations)) return [];
  
  return citations.map(c => {
    const url = c.url || c.link || '';
    const title = c.title || c.text || '';
    
    // Check if citation URL matches brand domain
    let mentionsBrand = false;
    if (brandConfig.domain && url) {
      const brandDomain = extractDomainName(brandConfig.domain);
      if (url.toLowerCase().includes(brandDomain)) {
        mentionsBrand = true;
      }
    }
    
    // Check if title mentions brand
    if (!mentionsBrand && matchesBrand(title, brandConfig)) {
      mentionsBrand = true;
    }
    
    return { title, url, mentions_brand: mentionsBrand };
  });
}

// Prompt template generation
export interface PromptTemplate {
  layer: 'geo_cluster' | 'implicit' | 'radius_neighborhood' | 'problem_intent';
  prompt_text: string;
  intent_tag?: string;
}

export function generatePromptTemplates(profile: {
  business_name: string;
  primary_location: { city: string; state: string };
  categories: string[];
  neighborhoods?: string[];
  service_radius_miles?: number;
}): PromptTemplate[] {
  const templates: PromptTemplate[] = [];
  const seen = new Set<string>();
  const { city, state } = profile.primary_location;
  
  for (const category of profile.categories) {
    // LAYER A: geo_cluster prompts
    const geoPrompts = [
      { text: `best ${category} in ${city} ${state}`, intent: 'best' },
      { text: `top rated ${category} in ${city}`, intent: 'top_rated' },
      { text: `who do locals recommend for ${category} in ${city}`, intent: 'local_reco' },
      { text: `most trusted ${category} near ${city} ${state}`, intent: 'trust' },
      { text: `${category} with best reviews in ${city}`, intent: 'reviews' },
    ];
    
    for (const p of geoPrompts) {
      if (!seen.has(p.text)) {
        seen.add(p.text);
        templates.push({ layer: 'geo_cluster', prompt_text: p.text, intent_tag: p.intent });
      }
    }
    
    // LAYER B: implicit prompts (NO location words)
    const implicitPrompts = [
      { text: `who is a reliable ${category}`, intent: 'reliable' },
      { text: `best ${category} for residential needs`, intent: 'residential' },
      { text: `${category} with excellent customer service`, intent: 'service' },
      { text: `experienced ${category} for complex projects`, intent: 'experience' },
      { text: `${category} that offers free estimates`, intent: 'pricing' },
    ];
    
    for (const p of implicitPrompts) {
      if (!seen.has(p.text)) {
        seen.add(p.text);
        templates.push({ layer: 'implicit', prompt_text: p.text, intent_tag: p.intent });
      }
    }
    
    // LAYER C: radius/neighborhood prompts
    if (profile.neighborhoods && profile.neighborhoods.length > 0) {
      for (const hood of profile.neighborhoods.slice(0, 3)) {
        const hoodPrompt = `best ${category} near ${hood}`;
        if (!seen.has(hoodPrompt)) {
          seen.add(hoodPrompt);
          templates.push({ layer: 'radius_neighborhood', prompt_text: hoodPrompt, intent_tag: 'neighborhood' });
        }
      }
    }
    
    if (profile.service_radius_miles) {
      const radiusPrompt = `${category} within ${profile.service_radius_miles} miles of ${city}`;
      if (!seen.has(radiusPrompt)) {
        seen.add(radiusPrompt);
        templates.push({ layer: 'radius_neighborhood', prompt_text: radiusPrompt, intent_tag: 'radius' });
      }
    }
    
    // LAYER D: problem-intent prompts
    const problemPrompts = [
      { text: `who should I call for emergency ${category} help`, intent: 'emergency' },
      { text: `affordable ${category} with great reviews`, intent: 'affordable' },
      { text: `${category} that can handle urgent requests`, intent: 'urgent' },
      { text: `best value ${category} for home projects`, intent: 'value' },
    ];
    
    for (const p of problemPrompts) {
      if (!seen.has(p.text)) {
        seen.add(p.text);
        templates.push({ layer: 'problem_intent', prompt_text: p.text, intent_tag: p.intent });
      }
    }
  }
  
  return templates;
}

// Score computation utilities
export interface ScoreInputs {
  geoPromptCount: number;
  geoWithBrand: number;
  geoTopThree: number;
  implicitPromptCount: number;
  implicitWithBrand: number;
  associationCount: number;
  associationWithLocation: number;
  brandMentions: number;
  competitorMentions: number;
}

export interface ComputedScores {
  score_total: number;
  score_geo: number;
  score_implicit: number;
  score_association: number;
  score_sov: number;
  breakdown: {
    geo_rate: number;
    geo_top3_rate: number;
    implicit_rate: number;
    association_rate: number;
    sov_rate: number;
    brand_mentions: number;
    competitor_mentions: number;
  };
}

export function computeScores(inputs: ScoreInputs): ComputedScores {
  // Geo Presence Score (0-25)
  const geoRate = inputs.geoPromptCount > 0 
    ? inputs.geoWithBrand / inputs.geoPromptCount 
    : 0;
  const geoTopRate = inputs.geoPromptCount > 0 
    ? inputs.geoTopThree / inputs.geoPromptCount 
    : 0;
  const score_geo = Math.round((geoRate * 15) + (geoTopRate * 10));
  
  // Implicit Local Recall Score (0-25)
  const implicitRate = inputs.implicitPromptCount > 0 
    ? inputs.implicitWithBrand / inputs.implicitPromptCount 
    : 0;
  const score_implicit = Math.round(implicitRate * 25);
  
  // Entity Association Score (0-25)
  const associationRate = inputs.associationCount > 0 
    ? inputs.associationWithLocation / inputs.associationCount 
    : 0;
  const score_association = Math.round(associationRate * 25);
  
  // Competitive Share of Voice Score (0-25)
  const totalMentions = inputs.brandMentions + inputs.competitorMentions + 1;
  const sovRate = inputs.brandMentions / totalMentions;
  const score_sov = Math.round(sovRate * 25);
  
  // Total score
  const score_total = Math.min(100, score_geo + score_implicit + score_association + score_sov);
  
  return {
    score_total,
    score_geo: Math.min(25, score_geo),
    score_implicit: Math.min(25, score_implicit),
    score_association: Math.min(25, score_association),
    score_sov: Math.min(25, score_sov),
    breakdown: {
      geo_rate: Math.round(geoRate * 100),
      geo_top3_rate: Math.round(geoTopRate * 100),
      implicit_rate: Math.round(implicitRate * 100),
      association_rate: Math.round(associationRate * 100),
      sov_rate: Math.round(sovRate * 100),
      brand_mentions: inputs.brandMentions,
      competitor_mentions: inputs.competitorMentions,
    },
  };
}

// Recommendation generation
export interface ActionRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
}

export function generateRecommendations(
  scores: ComputedScores,
  topCompetitors: string[]
): ActionRecommendation[] {
  const recommendations: ActionRecommendation[] = [];
  
  // Low geo score
  if (scores.score_geo < 15) {
    recommendations.push({
      priority: 'high',
      category: 'local_presence',
      title: 'Strengthen Local Presence',
      description: 'Add explicit "serving [city]" language to your About page, Contact page, and footer. Ensure your Google Business Profile is fully optimized.',
    });
  }
  
  // Low implicit score
  if (scores.score_implicit < 15) {
    recommendations.push({
      priority: 'high',
      category: 'authority',
      title: 'Build Category Authority',
      description: 'Create content that establishes expertise in your category without relying on location keywords. Focus on educational content, case studies, and thought leadership.',
    });
  }
  
  // Low association score
  if (scores.score_association < 15) {
    recommendations.push({
      priority: 'medium',
      category: 'citations',
      title: 'Increase Local Citations',
      description: 'Get listed on local directories, industry-specific directories, and ensure NAP (Name, Address, Phone) consistency across all listings.',
    });
  }
  
  // Low SOV score
  if (scores.score_sov < 15 && topCompetitors.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'competitive',
      title: 'Address Competitive Gap',
      description: `Top competitors (${topCompetitors.slice(0, 3).join(', ')}) are appearing more frequently. Analyze their content strategy and online presence to identify opportunities.`,
    });
  }
  
  // General improvements
  if (scores.score_total < 50) {
    recommendations.push({
      priority: 'medium',
      category: 'content',
      title: 'Create AI-Friendly Content',
      description: 'Ensure your website has clear, structured content with FAQ sections, service descriptions, and location-specific pages that AI can easily parse.',
    });
  }
  
  return recommendations;
}

// Cache key generation
export function generateCacheKey(
  profileId: string,
  models: string[],
  promptCount: number
): string {
  const today = new Date().toISOString().split('T')[0];
  const modelKey = models.sort().join(',');
  return `${profileId}:${modelKey}:${promptCount}:${today}`;
}
