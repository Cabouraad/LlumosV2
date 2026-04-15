import { useQuery } from '@tanstack/react-query';
import { fetchCompetitorsV2, CompetitorFilters, CompetitorSummaryRow } from './api';
import { useOrgId } from '@/contexts/UnifiedAuthProvider';

/**
 * React Query hook for fetching competitor data with caching
 * Automatically injects org ID from context to avoid redundant auth lookups
 */
export function useCompetitors(
  filters: CompetitorFilters & { enabled?: boolean } = {}
) {
  const orgId = useOrgId();
  const { enabled = true, ...queryFilters } = filters;
  
  // Inject org ID from context and ensure 30-day default
  const filtersWithDefaults = {
    days: 30,
    ...queryFilters,
    orgId: queryFilters.orgId || orgId,
  };
  
  return useQuery<CompetitorSummaryRow[]>({
    queryKey: ['competitors_v2', filtersWithDefaults],
    queryFn: () => fetchCompetitorsV2(filtersWithDefaults),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    enabled: enabled && !!filtersWithDefaults.orgId, // Don't fetch until org ID is available
  });
}
