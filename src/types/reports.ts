// Report preview data structure for the modal
export interface ReportPreviewData {
  // Executive Summary metrics
  overallScore: number;
  scoreTrend: number;
  brandPresenceRate: number;
  presenceTrend: number;
  totalPrompts: number;
  totalResponses: number;
  
  // Section-specific counts for preview badges
  competitorCount: number;
  providerCount: number;
  citationCount: number;
  recommendationCount: number;
  
  // Top items for preview display
  topCompetitors?: Array<{ name: string; appearances: number }>;
  topPrompts?: Array<{ text: string; score: number }>;
  topCitationDomains?: Array<{ domain: string; count: number }>;
}

// Report generation configuration
export interface ReportSectionConfig {
  executive_summary: boolean;
  visibility_overview: boolean;
  competitor_analysis: boolean;
  provider_performance: boolean;
  prompt_performance: boolean;
  citations_sources: boolean;
  recommendations: boolean;
}

// Enhanced report template with section toggles
export interface EnhancedReportTemplate {
  id: string;
  name: string;
  description?: string;
  sections: ReportSectionConfig;
  isDefault: boolean;
}

// Report generation request
export interface ReportGenerationRequest {
  orgId: string;
  brandId?: string;
  startDate: string;
  endDate: string;
  sections: ReportSectionConfig;
  templateId?: string;
}

// Report generation response
export interface ReportGenerationResponse {
  success: boolean;
  reportId?: string;
  pdfUrl?: string;
  error?: string;
}
