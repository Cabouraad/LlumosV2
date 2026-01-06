/**
 * Local AI Authority Types
 * Schema types for the local authority scoring feature
 */

// Location structure for primary_location jsonb
export interface LocalProfileLocation {
  city: string;
  state: string;
  country: string;
  zip?: string;
  lat?: number;
  lng?: number;
}

// Competitor override structure
export interface CompetitorOverride {
  name: string;
  domain?: string;
}

// Local Profile - Business profile for local AI tracking
export interface LocalProfile {
  id: string;
  user_id: string;
  org_id?: string;
  business_name: string;
  domain?: string;
  primary_location: LocalProfileLocation;
  service_radius_miles: number;
  neighborhoods?: string[];
  categories: string[];
  brand_synonyms?: string[];
  competitor_overrides?: CompetitorOverride[];
  gbp_url?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// Prompt template layer types
export type PromptLayer = 'geo_cluster' | 'implicit' | 'radius_neighborhood' | 'problem_intent';

// Local Prompt Template
export interface LocalPromptTemplate {
  id: string;
  profile_id: string;
  layer: PromptLayer;
  prompt_text: string;
  intent_tag?: string;
  active: boolean;
  created_at: string;
}

// Run status types
export type AuthorityRunStatus = 'queued' | 'running' | 'complete' | 'failed';

// Quality flags structure
export interface QualityFlags {
  parsing_issues?: string[];
  missing_results?: string[];
  low_confidence_extractions?: number;
}

// Local Authority Run - Scan run tracking
export interface LocalAuthorityRun {
  id: string;
  profile_id: string;
  user_id: string;
  status: AuthorityRunStatus;
  models_used: string[];
  started_at?: string;
  finished_at?: string;
  error_count: number;
  quality_flags?: QualityFlags;
  cache_key?: string;
  created_at: string;
}

// Citation structure for AI responses
export interface Citation {
  title: string;
  url: string;
  mentions_brand: boolean;
}

// Extracted recommendation from AI response
export interface ExtractedRecommendation {
  name: string;
  reason?: string;
  address?: string;
  phone?: string;
  url?: string;
  is_brand: boolean;
  confidence?: number;
}

// Extracted place from AI response
export interface ExtractedPlace {
  name: string;
  type: string;
  confidence?: number;
}

// Brand mention in AI response
export interface BrandMention {
  snippet: string;
  confidence?: number;
}

// Competitor mention in AI response
export interface CompetitorMention {
  name: string;
  confidence?: number;
}

// Extracted data structure from AI responses
export interface ExtractedData {
  recommendations: ExtractedRecommendation[];
  places: ExtractedPlace[];
  brand_mentions: BrandMention[];
  competitor_mentions: CompetitorMention[];
}

// Local Authority Result - Individual prompt results
export interface LocalAuthorityResult {
  id: string;
  run_id: string;
  layer: PromptLayer;
  prompt_text: string;
  model: string;
  raw_response?: string;
  citations?: Citation[];
  extracted: ExtractedData;
  created_at: string;
}

// Score breakdown structure
export interface ScoreBreakdown {
  geo_mentions: number;
  geo_recommendations: number;
  implicit_mentions: number;
  implicit_recommendations: number;
  association_places: number;
  association_entities: number;
  sov_brand_share: number;
  sov_competitor_count: number;
  weights: {
    geo: number;
    implicit: number;
    association: number;
    sov: number;
  };
}

// Recommendation action item
export interface ActionRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact_score?: number;
}

// Local Authority Score - Aggregated scores per run
export interface LocalAuthorityScore {
  id: string;
  run_id: string;
  profile_id: string;
  score_total: number;
  score_geo: number;
  score_implicit: number;
  score_association: number;
  score_sov: number;
  breakdown: ScoreBreakdown;
  recommendations: ActionRecommendation[];
  created_at: string;
}

// Input types for creating/updating

export interface CreateLocalProfileInput {
  business_name: string;
  domain?: string;
  primary_location: LocalProfileLocation;
  service_radius_miles?: number;
  neighborhoods?: string[];
  categories: string[];
  brand_synonyms?: string[];
  competitor_overrides?: CompetitorOverride[];
  gbp_url?: string;
  phone?: string;
  address?: string;
  org_id?: string;
}

export interface UpdateLocalProfileInput extends Partial<CreateLocalProfileInput> {
  id: string;
}

export interface CreatePromptTemplateInput {
  profile_id: string;
  layer: PromptLayer;
  prompt_text: string;
  intent_tag?: string;
  active?: boolean;
}
