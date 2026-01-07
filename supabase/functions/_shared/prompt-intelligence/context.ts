/**
 * Prompt Intelligence Context
 * 
 * A structured object that captures all relevant business signals
 * for generating high-quality, targeted prompt suggestions.
 */

export interface PromptIntelligenceContext {
  // Core Business Identity
  businessName: string;
  primaryDomain: string;
  industry: string;
  
  // Products & Services
  primaryProducts: string[];
  serviceCategories: string[];
  
  // Customer Profile
  idealCustomerProfile: {
    description: string;
    segments: string[];
    painPoints: string[];
  };
  
  // AI-Native Intent Categories
  aiIntentFocus: {
    discovery: boolean;      // Learning / awareness
    validation: boolean;     // Trust, reviews, proof
    comparison: boolean;     // Alternatives, vs, best
    recommendation: boolean; // What should I choose
    action: boolean;         // Buy, visit, contact
    localIntent: boolean;    // Near me, in [city]
  };
  
  // Brand Positioning
  brandStrength: {
    type: 'known' | 'challenger' | 'emerging';
    marketPosition: 'leader' | 'competitor' | 'niche';
  };
  
  // Geographic Targeting
  geographicScope: {
    type: 'local' | 'regional' | 'national' | 'global';
    primaryLocation?: {
      city?: string;
      state?: string;
      country?: string;
    };
    additionalLocations?: Array<{
      city?: string;
      state?: string;
    }>;
  };
  
  // Competitive Landscape
  competitors: {
    known: string[];
    inferred: string[];
  };
  
  // Conversion Goals
  conversionGoal: 'lead' | 'trial' | 'purchase' | 'demo' | 'store_visit' | 'consultation';
  
  // Keywords & Signals
  keywords: string[];
  
  // Inference Metadata
  inferenceNotes: string[];
}

/**
 * Infers industry from domain and business description
 */
function inferIndustry(domain: string, description?: string): string {
  const domainLower = domain.toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combined = `${domainLower} ${descLower}`;
  
  const industryPatterns: Record<string, string[]> = {
    'Software / SaaS': ['saas', 'software', 'platform', 'app', 'cloud', 'tech', 'ai', 'automation'],
    'E-commerce / Retail': ['shop', 'store', 'retail', 'ecommerce', 'buy', 'sell', 'marketplace'],
    'Healthcare': ['health', 'medical', 'clinic', 'hospital', 'wellness', 'care', 'therapy'],
    'Finance / Fintech': ['finance', 'bank', 'invest', 'insurance', 'fintech', 'pay', 'money'],
    'Real Estate': ['real estate', 'property', 'home', 'realty', 'housing', 'mortgage'],
    'Education': ['edu', 'learn', 'school', 'university', 'course', 'training', 'academy'],
    'Marketing / Agency': ['marketing', 'agency', 'creative', 'brand', 'advertising', 'media'],
    'Legal': ['law', 'legal', 'attorney', 'lawyer', 'firm'],
    'Manufacturing': ['manufacturing', 'industrial', 'factory', 'production'],
    'Hospitality': ['hotel', 'restaurant', 'travel', 'tourism', 'hospitality'],
    'Professional Services': ['consulting', 'services', 'solutions', 'advisory'],
  };
  
  for (const [industry, patterns] of Object.entries(industryPatterns)) {
    if (patterns.some(p => combined.includes(p))) {
      return industry;
    }
  }
  
  return 'General Business';
}

/**
 * Extracts products/services from description text
 */
function extractProducts(productsText?: string, description?: string): string[] {
  const text = productsText || description || '';
  if (!text) return [];
  
  // Split by common delimiters and clean up
  const items = text
    .split(/[,;•\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 100)
    .slice(0, 10);
  
  return items.length > 0 ? items : [text.slice(0, 100)];
}

/**
 * Infers ideal customer profile from target audience text
 */
function inferICP(targetAudience?: string, industry?: string): PromptIntelligenceContext['idealCustomerProfile'] {
  const segments: string[] = [];
  const painPoints: string[] = [];
  
  const text = (targetAudience || '').toLowerCase();
  
  // Detect segments
  if (text.includes('small business') || text.includes('smb')) segments.push('Small Business');
  if (text.includes('enterprise') || text.includes('large')) segments.push('Enterprise');
  if (text.includes('startup')) segments.push('Startups');
  if (text.includes('b2b')) segments.push('B2B Companies');
  if (text.includes('b2c') || text.includes('consumer')) segments.push('Consumers');
  if (text.includes('agency') || text.includes('agencies')) segments.push('Agencies');
  if (text.includes('freelanc')) segments.push('Freelancers');
  if (text.includes('developer') || text.includes('engineer')) segments.push('Technical Users');
  if (text.includes('marketer') || text.includes('marketing')) segments.push('Marketers');
  
  // Infer pain points based on industry
  const industryPains: Record<string, string[]> = {
    'Software / SaaS': ['efficiency', 'automation', 'integration', 'scaling'],
    'E-commerce / Retail': ['conversion', 'customer acquisition', 'inventory', 'competition'],
    'Healthcare': ['patient care', 'compliance', 'scheduling', 'records management'],
    'Finance / Fintech': ['security', 'compliance', 'customer trust', 'fraud prevention'],
    'Marketing / Agency': ['ROI measurement', 'client retention', 'campaign performance'],
    'Professional Services': ['lead generation', 'client management', 'billable hours'],
  };
  
  if (industry && industryPains[industry]) {
    painPoints.push(...industryPains[industry]);
  }
  
  return {
    description: targetAudience || 'Business decision makers seeking solutions',
    segments: segments.length > 0 ? segments : ['Business Professionals'],
    painPoints: painPoints.length > 0 ? painPoints : ['efficiency', 'cost reduction', 'growth'],
  };
}

/**
 * Determines AI-native intent focus based on business context
 */
function determineAIIntentFocus(
  industry: string, 
  conversionGoal: string,
  hasLocation: boolean
): PromptIntelligenceContext['aiIntentFocus'] {
  // Most businesses benefit from all intent types
  const base = {
    discovery: true,
    validation: true,
    comparison: true,
    recommendation: true,
    action: true,
    localIntent: hasLocation,
  };
  
  // Adjust based on conversion goal
  if (['lead', 'consultation'].includes(conversionGoal)) {
    // B2B focused - discovery and recommendation are key
    base.action = false; // Less direct action intent
  }
  
  if (['store_visit'].includes(conversionGoal)) {
    base.localIntent = true; // Always include local for physical businesses
  }
  
  return base;
}

/**
 * Infers brand strength from available signals
 */
function inferBrandStrength(
  domain: string, 
  competitors?: string[],
  hasLlmsTxt?: boolean
): PromptIntelligenceContext['brandStrength'] {
  // Simple heuristics - in production you'd use more signals
  const knownBrandIndicators = [
    'microsoft', 'google', 'amazon', 'apple', 'salesforce', 'hubspot',
    'adobe', 'oracle', 'sap', 'ibm', 'cisco', 'dell'
  ];
  
  const domainLower = domain.toLowerCase();
  const isKnown = knownBrandIndicators.some(b => domainLower.includes(b));
  
  if (isKnown) {
    return { type: 'known', marketPosition: 'leader' };
  }
  
  // If they have competitors listed, they're aware of the market = challenger
  if (competitors && competitors.length > 2) {
    return { type: 'challenger', marketPosition: 'competitor' };
  }
  
  return { type: 'emerging', marketPosition: 'niche' };
}

/**
 * Determines geographic scope from location data
 */
function determineGeographicScope(
  city?: string,
  state?: string,
  country?: string,
  additionalLocations?: Array<{ city?: string; state?: string }>
): PromptIntelligenceContext['geographicScope'] {
  const hasLocation = !!(city || state);
  const hasMultipleLocations = additionalLocations && additionalLocations.length > 0;
  
  if (!hasLocation) {
    return { type: 'global' };
  }
  
  // Determine scope based on spread
  let scopeType: 'local' | 'regional' | 'national' | 'global' = 'local';
  
  if (hasMultipleLocations) {
    const uniqueStates = new Set([state, ...additionalLocations.map(l => l.state)].filter(Boolean));
    if (uniqueStates.size > 3) {
      scopeType = 'national';
    } else if (uniqueStates.size > 1) {
      scopeType = 'regional';
    }
  }
  
  return {
    type: scopeType,
    primaryLocation: { city, state, country },
    additionalLocations: additionalLocations?.filter(l => l.city || l.state),
  };
}

/**
 * Infers conversion goal from business type
 */
function inferConversionGoal(
  industry: string,
  productsServices?: string
): PromptIntelligenceContext['conversionGoal'] {
  const text = (productsServices || '').toLowerCase();
  
  if (text.includes('trial') || text.includes('freemium')) return 'trial';
  if (text.includes('ecommerce') || text.includes('shop') || text.includes('buy')) return 'purchase';
  if (text.includes('demo') || text.includes('enterprise')) return 'demo';
  if (text.includes('local') || text.includes('store') || text.includes('visit')) return 'store_visit';
  if (text.includes('consult')) return 'consultation';
  
  // Default based on industry
  const industryGoals: Record<string, PromptIntelligenceContext['conversionGoal']> = {
    'Software / SaaS': 'trial',
    'E-commerce / Retail': 'purchase',
    'Professional Services': 'consultation',
    'Real Estate': 'lead',
  };
  
  return industryGoals[industry] || 'lead';
}

export interface BuildContextInput {
  // From organization
  orgName: string;
  orgDomain: string;
  businessDescription?: string;
  productsServices?: string;
  targetAudience?: string;
  keywords?: string[];
  competitors?: string[];
  
  // Location
  businessCity?: string;
  businessState?: string;
  businessCountry?: string;
  localizationConfig?: {
    additional_locations?: Array<{ city?: string; state?: string }>;
  };
  
  // Brand override
  brandName?: string;
  brandDomain?: string;
  brandDescription?: string;
  brandProducts?: string;
  brandKeywords?: string[];
  brandAudience?: string;
  
  // Signals
  hasLlmsTxt?: boolean;
}

/**
 * Builds a complete Prompt Intelligence Context from available inputs
 * Intelligently infers missing fields
 */
export function buildPromptIntelligenceContext(input: BuildContextInput): PromptIntelligenceContext {
  const inferenceNotes: string[] = [];
  
  // Use brand-level data if available, otherwise org-level
  const name = input.brandName || input.orgName;
  const domain = input.brandDomain || input.orgDomain;
  const description = input.brandDescription || input.businessDescription;
  const products = input.brandProducts || input.productsServices;
  const keywords = input.brandKeywords || input.keywords || [];
  const audience = input.brandAudience || input.targetAudience;
  const competitors = input.competitors || [];
  
  // Infer industry
  const industry = inferIndustry(domain, description);
  if (!description) {
    inferenceNotes.push(`Industry inferred from domain: ${industry}`);
  }
  
  // Extract products
  const primaryProducts = extractProducts(products, description);
  if (!products && primaryProducts.length > 0) {
    inferenceNotes.push('Products inferred from business description');
  }
  
  // Determine geographic scope
  const geographicScope = determineGeographicScope(
    input.businessCity,
    input.businessState,
    input.businessCountry,
    input.localizationConfig?.additional_locations
  );
  if (!input.businessCity && !input.businessState) {
    inferenceNotes.push('Geographic scope defaulted to global (no location provided)');
  }
  
  // Infer conversion goal
  const conversionGoal = inferConversionGoal(industry, products);
  inferenceNotes.push(`Conversion goal inferred: ${conversionGoal}`);
  
  // Infer ICP
  const icp = inferICP(audience, industry);
  if (!audience) {
    inferenceNotes.push('ICP inferred from industry patterns');
  }
  
  // Determine AI-native intent focus
  const hasLocation = !!(input.businessCity || input.businessState);
  const aiIntentFocus = determineAIIntentFocus(industry, conversionGoal, hasLocation);
  
  // Infer brand strength
  const brandStrength = inferBrandStrength(domain, competitors, input.hasLlmsTxt);
  inferenceNotes.push(`Brand strength inferred: ${brandStrength.type} (${brandStrength.marketPosition})`);
  
  // Infer competitors if not provided
  const inferredCompetitors: string[] = [];
  if (competitors.length === 0) {
    // Add generic industry competitors as placeholders
    inferenceNotes.push('No competitors provided - prompts will focus on category discovery');
  }
  
  return {
    businessName: name,
    primaryDomain: domain,
    industry,
    primaryProducts,
    serviceCategories: primaryProducts.slice(0, 5),
    idealCustomerProfile: icp,
    aiIntentFocus,
    brandStrength,
    geographicScope,
    competitors: {
      known: competitors,
      inferred: inferredCompetitors,
    },
    conversionGoal,
    keywords,
    inferenceNotes,
  };
}

/**
 * Formats the context into a prompt-friendly string for the LLM
 */
export function formatContextForPrompt(ctx: PromptIntelligenceContext): string {
  const sections: string[] = [];
  
  sections.push(`## Business Identity
- Business Name: ${ctx.businessName}
- Domain: ${ctx.primaryDomain}
- Industry: ${ctx.industry}`);

  sections.push(`## Products & Services
- Primary: ${ctx.primaryProducts.slice(0, 5).join(', ') || 'Not specified'}
- Categories: ${ctx.serviceCategories.join(', ') || 'General'}`);

  sections.push(`## Ideal Customer Profile
- Description: ${ctx.idealCustomerProfile.description}
- Segments: ${ctx.idealCustomerProfile.segments.join(', ')}
- Pain Points: ${ctx.idealCustomerProfile.painPoints.join(', ')}`);

  sections.push(`## AI-Native Intent Focus
- Discovery (learning/awareness): ${ctx.aiIntentFocus.discovery ? 'Yes' : 'No'}
- Validation (trust/proof): ${ctx.aiIntentFocus.validation ? 'Yes' : 'No'}
- Comparison (alternatives/vs): ${ctx.aiIntentFocus.comparison ? 'Yes' : 'No'}
- Recommendation (what to choose): ${ctx.aiIntentFocus.recommendation ? 'Yes' : 'No'}
- Action (buy/visit/contact): ${ctx.aiIntentFocus.action ? 'Yes' : 'No'}
- Local Intent (near me/in city): ${ctx.aiIntentFocus.localIntent ? 'Yes' : 'No'}`);

  sections.push(`## Brand Positioning
- Brand Type: ${ctx.brandStrength.type}
- Market Position: ${ctx.brandStrength.marketPosition}`);

  sections.push(`## Geographic Scope
- Scope: ${ctx.geographicScope.type}${
    ctx.geographicScope.primaryLocation 
      ? `\n- Primary Location: ${[ctx.geographicScope.primaryLocation.city, ctx.geographicScope.primaryLocation.state].filter(Boolean).join(', ')}` 
      : ''
  }${
    ctx.geographicScope.additionalLocations?.length 
      ? `\n- Additional Locations: ${ctx.geographicScope.additionalLocations.map(l => [l.city, l.state].filter(Boolean).join(', ')).join('; ')}` 
      : ''
  }`);

  if (ctx.competitors.known.length > 0) {
    sections.push(`## Competitive Landscape
- Known Competitors: ${ctx.competitors.known.join(', ')}`);
  }

  sections.push(`## Conversion Goal
- Primary Goal: ${ctx.conversionGoal.replace('_', ' ')}`);

  if (ctx.keywords.length > 0) {
    sections.push(`## Keywords
${ctx.keywords.slice(0, 15).join(', ')}`);
  }

  if (ctx.inferenceNotes.length > 0) {
    sections.push(`## Inference Notes
${ctx.inferenceNotes.map(n => `- ${n}`).join('\n')}`);
  }

  return sections.join('\n\n');
}
