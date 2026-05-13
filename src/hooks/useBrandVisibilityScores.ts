import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getOrgIdSafe } from '@/lib/org-id';
import { useAuth, useOrgId } from '@/contexts/UnifiedAuthProvider';

interface BrandVisibilityScore {
  brandId: string;
  score: number;
  totalPrompts: number;
  brandPresenceRate: number;
  lastActivity: string | null;
  totalMentions: number;
}

interface BrandCardStatsRow {
  brand_id: string;
  prompt_count: number;
  brand_presence_rate: number;
  visibility_score: number;
  total_responses: number;
}

/**
 * Fetch visibility scores for multiple brands using efficient batched query
 */
export function useBrandVisibilityScores(brandIds: string[]) {
  const { ready, user } = useAuth();
  const ctxOrgId = useOrgId();
  return useQuery({
    queryKey: ['brand-visibility-scores', user?.id, ctxOrgId, brandIds],
    queryFn: async () => {
      if (brandIds.length === 0) return [];

      const orgId = ctxOrgId || (await getOrgIdSafe());

      // Confirm session is actually attached before firing the RPC.
      // Avoids the auth-ready race that returns 400 → cached zeros.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Auth session not ready');
      }

      const { data, error } = await supabase.rpc('get_brand_card_stats', {
        p_org_id: orgId,
        p_brand_ids: brandIds,
      });

      if (error) {
        // Throw so React Query retries instead of caching zeros for 60s.
        console.error('[useBrandVisibilityScores] RPC error:', error);
        throw error;
      }

      const statsMap = new Map<string, BrandCardStatsRow>();
      if (Array.isArray(data)) {
        (data as BrandCardStatsRow[]).forEach(row => statsMap.set(row.brand_id, row));
      }

      const scores: BrandVisibilityScore[] = brandIds.map(brandId => {
        const stats = statsMap.get(brandId);
        if (stats) {
          return {
            brandId,
            score: stats.visibility_score || 0,
            totalPrompts: stats.prompt_count || 0,
            brandPresenceRate: stats.brand_presence_rate || 0,
            totalMentions: stats.total_responses || 0,
            lastActivity: null,
          };
        }
        return {
          brandId,
          score: 0,
          totalPrompts: 0,
          brandPresenceRate: 0,
          totalMentions: 0,
          lastActivity: null,
        };
      });

      return scores;
    },
    enabled: brandIds.length > 0 && ready && !!user && !!ctxOrgId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
  });
}
