import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getOrgIdSafe } from '@/lib/org-id';

export type BrandLlumosScoreRow = {
  score: number;
  composite: number;
  updatedAt: string | null;
};

/**
 * Fetch latest cached llumos scores for a set of brands.
 * Uses the persisted llumos_scores table to avoid N+1 edge-function calls.
 */
export function useBrandLlumosScores(brandIds: string[]) {
  return useQuery({
    queryKey: ['brand-llumos-scores', brandIds],
    enabled: brandIds.length > 0,
    queryFn: async () => {
      if (brandIds.length === 0) return {} as Record<string, BrandLlumosScoreRow>;

      const orgId = await getOrgIdSafe();

      const { data, error } = await supabase
        .from('llumos_scores')
        .select('brand_id, llumos_score, composite, created_at')
        .eq('org_id', orgId)
        .eq('scope', 'org')
        .in('brand_id', brandIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const result: Record<string, BrandLlumosScoreRow> = {};

      for (const row of (data as any[]) ?? []) {
        const brandId = row?.brand_id as string | null;
        if (!brandId) continue;
        if (result[brandId]) continue; // first row per brand is latest due to ordering

        result[brandId] = {
          score: row?.llumos_score ?? 0,
          composite: row?.composite ?? 0,
          updatedAt: row?.created_at ?? null,
        };
      }

      // Ensure all requested ids exist in result
      for (const id of brandIds) {
        if (!result[id]) result[id] = { score: 0, composite: 0, updatedAt: null };
      }

      return result;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
