// Centralized report types to prevent type drift across the codebase - V2 Executive-Grade

// Import VisibilityMetrics from collect.ts to ensure type consistency
export type VisibilityMetrics = {
  avgVisibilityScore: number;
  overallScore: number;
  scoreTrend: number;
  totalRuns: number;
  brandPresentRate: number;
  avgCompetitors: number;
  deltaVsPriorWeek?: {
    avgVisibilityScore: number;
    totalRuns: number;
    brandPresentRate: number;
  };
  trendProjection: {
    brandPresenceNext4Weeks: number;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  // Backward compatibility aliases (will be set at runtime)
  brandPresenceRate?: number;        // alias for brandPresentRate
  presenceTrend?: number;           // alias for deltaVsPriorWeek?.brandPresentRate
  totalPrompts?: number;            // alias for prompts.totalActive
};

// V2 Competitor with trend tracking
export interface CompetitorData {
  name: string;
  appearances: number;
  sharePercent: number;
  deltaVsPriorWeek?: number;
  isNew: boolean;
  trend?: 'rising' | 'declining' | 'stable' | 'new';
  category?: string;
  promptOverlap?: number; // How many prompts does this competitor appear in that we also appear in
}

// V2 Prompt with opportunity scoring
export interface PromptData {
  id: string;
  text: string;
  avgScore: number;
  totalRuns: number;
  brandPresentRate: number;
  category: string;
  topCompetitors?: string[];
  suggestedContentAngle?: string;
  opportunityType?: 'high_opportunity' | 'defensive' | 'winning' | 'standard';
  searchVolume?: number;
}

// V2 Citation source with brand presence tracking
export interface CitationSource {
  domain: string;
  mentions: number;
  avgAuthority: number;
  brandMentioned?: boolean;
  categoryType?: 'owned' | 'competitor' | 'neutral';
}

export interface WeeklyReportData {
  header: {
    orgId: string;
    orgName: string;
    orgDomain?: string;
    brandLogo?: string;
    subscriptionTier?: string;
    periodStart: string;
    periodEnd: string;
    generatedAt: string;
    reportVersion?: string;
  };
  kpis: VisibilityMetrics;
  historicalTrend: {
    weeklyScores: Array<{
      weekStart: string;
      avgScore: number;
      brandPresentRate: number;
      totalRuns: number;
    }>;
  };
  // V2: Enhanced executive summary
  executiveSummary?: {
    whatChanged: string;
    whyItMatters: string;
    whatToDoNext: string[];
    netVisibilityMovement: number;
    presenceDelta: number;
    keyMetricHighlight: string;
  };
  prompts: {
    totalActive: number;
    categories: {
      crm: PromptData[];
      competitorTools: PromptData[];
      aiFeatures: PromptData[];
      other: PromptData[];
    };
    topPerformers: PromptData[];
    zeroPresence: Array<{
      id: string;
      text: string;
      totalRuns: number;
      category: string;
    }>;
    // V2: Enhanced prompt insights
    highOpportunity?: PromptData[]; // High volume, low presence
    defensive?: PromptData[]; // High competitor presence but brand present
  };
  competitors: {
    totalDetected: number;
    newThisWeek: CompetitorData[];
    topCompetitors: CompetitorData[];
    avgCompetitorsPerResponse: number;
    byProvider: Array<{
      provider: string;
      totalMentions: number;
      uniqueCompetitors: number;
      avgScore: number;
    }>;
    // V2: Enhanced competitive intel
    primaryThreat?: CompetitorData; // Most overlap with brand prompts
    emergingCompetitor?: CompetitorData; // New this week with fast growth
    byCategory?: Record<string, CompetitorData[]>;
  };
  recommendations: {
    totalCount: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    highlights: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
    }>;
    fallbackMessage?: string;
  };
  volume: {
    totalResponsesAnalyzed: number;
    providersUsed: Array<{
      provider: string;
      responseCount: number;
      avgScore: number;
      brandMentions: number;
    }>;
    dailyBreakdown: Array<{
      date: string;
      responses: number;
      avgScore: number;
    }>;
  };
  insights: {
    highlights: string[];
    keyFindings: string[];
    recommendations: string[];
  };
  // V2: Strategic recommendations with references
  strategicRecommendations?: Array<{
    type: 'content' | 'seo' | 'competitive';
    title: string;
    description: string;
    relatedPrompt?: string;
    relatedCompetitor?: string;
    relatedCitation?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  // Phase 1 Enhancements: Citation Analytics
  citations?: {
    totalCitations: number;
    validatedCount: number;
    validationRate: number;
    topSources: CitationSource[];
    byProvider: Array<{
      provider: string;
      citationCount: number;
      validationRate: number;
    }>;
    // V2: Brand presence in citations
    brandPresentInSources?: number;
    brandAbsentFromTopSources?: string[];
    sourceInsight?: string;
  };
  // V2: Methodology and trust signals
  methodology?: {
    dataCollectionMethod: string;
    providersIncluded: string[];
    promptCount: number;
    responseCount: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    disclaimer: string;
  };
  // For internal tracking
  totalResponses?: number;
}
