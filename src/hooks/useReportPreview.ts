import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReportPreviewData } from '@/types/reports';

interface UseReportPreviewOptions {
  orgId?: string;
  brandId?: string;
}

export function useReportPreview({ orgId, brandId }: UseReportPreviewOptions) {
  const [previewData, setPreviewData] = useState<ReportPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreviewData = useCallback(
    async (startDate: string, endDate: string) => {
      if (!orgId) {
        setError('Organization ID is required');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch prompt responses for the date range
        let responsesQuery = supabase
          .from('prompt_provider_responses')
          .select('id, score, org_brand_present, provider, competitors_count, citations_json')
          .eq('org_id', orgId)
          .eq('status', 'success')
          .gte('run_at', `${startDate}T00:00:00Z`)
          .lte('run_at', `${endDate}T23:59:59Z`);

        if (brandId) {
          responsesQuery = responsesQuery.eq('brand_id', brandId);
        }

        const { data: responses, error: responsesError } = await responsesQuery;

        if (responsesError) throw responsesError;

        // Fetch prompts count
        let promptsQuery = supabase
          .from('prompts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('active', true);

        if (brandId) {
          promptsQuery = promptsQuery.eq('brand_id', brandId);
        }

        const { count: promptCount, error: promptsError } = await promptsQuery;

        if (promptsError) throw promptsError;

        // Fetch recommendations count
        let recsQuery = supabase
          .from('recommendations')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'pending');

        if (brandId) {
          recsQuery = recsQuery.eq('brand_id', brandId);
        }

        const { count: recCount, error: recsError } = await recsQuery;

        if (recsError) throw recsError;

        // Calculate metrics from responses
        const responseList = responses || [];
        const totalResponses = responseList.length;
        const brandPresentCount = responseList.filter((r) => r.org_brand_present).length;
        const avgScore =
          totalResponses > 0
            ? responseList.reduce((sum, r) => sum + parseFloat(String(r.score ?? 0)), 0) / totalResponses
            : 0;

        // Count unique providers
        const providers = new Set(responseList.map((r) => r.provider));

        // Count competitors
        const competitorSet = new Set<string>();
        responseList.forEach((r) => {
          if (r.competitors_count) {
            // Approximate - actual count is stored
          }
        });

        // Fetch competitor catalog count
        let competitorsQuery = supabase
          .from('brand_catalog')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('is_org_brand', false);

        if (brandId) {
          competitorsQuery = competitorsQuery.eq('brand_id', brandId);
        }

        const { count: competitorCount } = await competitorsQuery;

        // Count citations
        let citationCount = 0;
        responseList.forEach((r) => {
          if (Array.isArray(r.citations_json)) {
            citationCount += r.citations_json.length;
          }
        });

        // Calculate trend (compare to previous period)
        const periodLength = new Date(endDate).getTime() - new Date(startDate).getTime();
        const prevStartDate = new Date(new Date(startDate).getTime() - periodLength);
        const prevEndDate = new Date(startDate);

        let prevResponsesQuery = supabase
          .from('prompt_provider_responses')
          .select('score, org_brand_present')
          .eq('org_id', orgId)
          .eq('status', 'success')
          .gte('run_at', prevStartDate.toISOString())
          .lt('run_at', prevEndDate.toISOString());

        if (brandId) {
          prevResponsesQuery = prevResponsesQuery.eq('brand_id', brandId);
        }

        const { data: prevResponses } = await prevResponsesQuery;

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

        setPreviewData({
          overallScore: avgScore,
          scoreTrend,
          brandPresenceRate,
          presenceTrend,
          totalPrompts: promptCount || 0,
          totalResponses,
          competitorCount: competitorCount || 0,
          providerCount: providers.size,
          citationCount,
          recommendationCount: recCount || 0,
        });
      } catch (err: any) {
        console.error('Error fetching report preview:', err);
        setError(err.message || 'Failed to load preview data');
        setPreviewData(null);
      } finally {
        setLoading(false);
      }
    },
    [orgId, brandId]
  );

  return {
    previewData,
    loading,
    error,
    fetchPreviewData,
  };
}
