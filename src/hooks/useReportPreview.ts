import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportPreviewData } from '@/types/reports';

interface UseReportPreviewOptions {
  orgId?: string;
  brandId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch report preview data with React Query caching
 * Cache key includes org, brand, and date range for proper isolation
 */
async function fetchReportPreviewData(
  orgId: string,
  brandId: string | undefined,
  startDate: string,
  endDate: string
): Promise<ReportPreviewData> {
  // Batch all independent queries in parallel
  const [responsesResult, promptCountResult, recCountResult, competitorCountResult] = await Promise.all([
    // Current period responses
    (async () => {
      let query = supabase
        .from('prompt_provider_responses')
        .select('score, org_brand_present, provider, competitors_count, citations_json')
        .eq('org_id', orgId)
        .eq('status', 'success')
        .gte('run_at', `${startDate}T00:00:00Z`)
        .lte('run_at', `${endDate}T23:59:59Z`);

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      return query;
    })(),
    
    // Prompts count
    (async () => {
      let query = supabase
        .from('prompts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('active', true);

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      return query;
    })(),
    
    // Recommendations count
    (async () => {
      let query = supabase
        .from('recommendations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'pending');

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      return query;
    })(),
    
    // Competitor count
    (async () => {
      let query = supabase
        .from('brand_catalog')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('is_org_brand', false);

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      return query;
    })(),
  ]);

  if (responsesResult.error) throw responsesResult.error;
  if (promptCountResult.error) throw promptCountResult.error;
  if (recCountResult.error) throw recCountResult.error;

  const responses = responsesResult.data || [];
  const totalResponses = responses.length;
  const brandPresentCount = responses.filter((r) => r.org_brand_present).length;
  const avgScore =
    totalResponses > 0
      ? responses.reduce((sum, r) => sum + parseFloat(String(r.score ?? 0)), 0) / totalResponses
      : 0;

  // Count unique providers
  const providers = new Set(responses.map((r) => r.provider));

  // Count citations
  let citationCount = 0;
  responses.forEach((r) => {
    if (Array.isArray(r.citations_json)) {
      citationCount += r.citations_json.length;
    }
  });

  // Calculate previous period for trend
  const periodLength = new Date(endDate).getTime() - new Date(startDate).getTime();
  const prevStartDate = new Date(new Date(startDate).getTime() - periodLength);
  const prevEndDate = new Date(startDate);

  let prevQuery = supabase
    .from('prompt_provider_responses')
    .select('score, org_brand_present')
    .eq('org_id', orgId)
    .eq('status', 'success')
    .gte('run_at', prevStartDate.toISOString())
    .lt('run_at', prevEndDate.toISOString());

  if (brandId) {
    prevQuery = prevQuery.eq('brand_id', brandId);
  }

  const { data: prevResponses } = await prevQuery;
  const prevList = prevResponses || [];
  const prevAvgScore =
    prevList.length > 0
      ? prevList.reduce((sum, r) => sum + parseFloat(String(r.score ?? 0)), 0) / prevList.length
      : 0;
  const prevBrandPresentRate =
    prevList.length > 0
      ? (prevList.filter((r) => r.org_brand_present).length / prevList.length) * 100
      : 0;

  const brandPresenceRate = totalResponses > 0 ? (brandPresentCount / totalResponses) * 100 : 0;
  const scoreTrend = prevAvgScore > 0 ? ((avgScore - prevAvgScore) / prevAvgScore) * 100 : 0;
  const presenceTrend =
    prevBrandPresentRate > 0
      ? ((brandPresenceRate - prevBrandPresentRate) / prevBrandPresentRate) * 100
      : 0;

  return {
    overallScore: avgScore,
    scoreTrend,
    brandPresenceRate,
    presenceTrend,
    totalPrompts: promptCountResult.count || 0,
    totalResponses,
    competitorCount: competitorCountResult.count || 0,
    providerCount: providers.size,
    citationCount,
    recommendationCount: recCountResult.count || 0,
  };
}

export function useReportPreview({ orgId, brandId, startDate, endDate }: UseReportPreviewOptions) {
  const {
    data: previewData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['report-preview', orgId, brandId, startDate, endDate],
    queryFn: () => fetchReportPreviewData(orgId!, brandId, startDate!, endDate!),
    enabled: Boolean(orgId && startDate && endDate),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  return {
    previewData: previewData ?? null,
    loading,
    error: error?.message ?? null,
    fetchPreviewData: (start: string, end: string) => refetch(),
  };
}
