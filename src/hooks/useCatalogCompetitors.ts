import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getOrgId } from '@/lib/auth';
import { useBrand } from '@/contexts/BrandContext';

interface CatalogCompetitor {
  id: string;
  name: string;
  is_org_brand: boolean;
  total_appearances: number;
  last_seen_at: string;
  brand_id: string | null;
}

export function useCatalogCompetitors() {
  const [competitors, setCompetitors] = useState<CatalogCompetitor[]>([]);
  const [loading, setLoading] = useState(true);
  const { ready, user } = useAuth();
  const { selectedBrand } = useBrand();

  useEffect(() => {
    // Wait for auth to be ready and user to be authenticated
    if (!ready) return;
    if (!user) {
      setCompetitors([]);
      setLoading(false);
      return;
    }
    fetchCatalogCompetitors();
  }, [ready, user, selectedBrand?.id]); // Re-fetch when brand changes

  const fetchCatalogCompetitors = async () => {
    try {
      setLoading(true);
      const orgId = await getOrgId();

      // Build query with brand filtering
      // When a brand is selected, show ONLY that brand's competitors (strict isolation)
      // Legacy null brand_id entries are NOT shown to maintain brand separation
      let query = supabase
        .from('brand_catalog')
        .select('id, name, is_org_brand, total_appearances, last_seen_at, brand_id')
        .eq('org_id', orgId)
        .eq('is_org_brand', false)
        .order('total_appearances', { ascending: false });

      // STRICT brand filtering - each brand sees only its own competitors
      if (selectedBrand?.id) {
        // When brand selected: ONLY show competitors with that exact brand_id
        // Do NOT include NULL brand_id records to maintain brand isolation
        query = query.eq('brand_id', selectedBrand.id);
      }
      // If no brand selected, show all competitors for the org (no additional filter)

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching catalog competitors:', error);
        return;
      }

      setCompetitors(data || []);
    } catch (error) {
      console.error('Error in fetchCatalogCompetitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCompetitorInCatalog = useCallback((competitorName: string): boolean => {
    return competitors.some(c => 
      c.name.toLowerCase().trim() === competitorName.toLowerCase().trim()
    );
  }, [competitors]);

  const filterCompetitorsByCatalog = useCallback((competitorList: string[]): string[] => {
    return competitorList.filter(competitor => isCompetitorInCatalog(competitor));
  }, [isCompetitorInCatalog]);

  return {
    competitors,
    loading,
    isCompetitorInCatalog,
    filterCompetitorsByCatalog,
    refetch: fetchCatalogCompetitors
  };
}