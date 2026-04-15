import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, useOrgId, useUser } from '@/contexts/UnifiedAuthProvider';

interface Brand {
  id: string;
  org_id: string;
  name: string;
  domain: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface BrandContextType {
  selectedBrand: Brand | null;
  setSelectedBrand: (brand: Brand | null) => void;
  clearSelectedBrand: () => void;
  isValidated: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const SELECTED_BRAND_KEY = 'llumos_selected_brand';

function getInitialStoredBrand(): Brand | null {
  try {
    const stored = localStorage.getItem(SELECTED_BRAND_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<Brand> | null;
    if (!parsed?.id || !parsed.org_id || !parsed.name || !parsed.domain) {
      localStorage.removeItem(SELECTED_BRAND_KEY);
      return null;
    }

    const cachedOrgId = localStorage.getItem('sb_last_org_id');
    if (cachedOrgId && parsed.org_id !== cachedOrgId) {
      return null;
    }

    return parsed as Brand;
  } catch {
    localStorage.removeItem(SELECTED_BRAND_KEY);
    return null;
  }
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const { ready: userReady } = useUser();
  const orgId = useOrgId();
  const [selectedBrand, setSelectedBrandState] = useState<Brand | null>(() => getInitialStoredBrand());
  const [isValidated, setIsValidated] = useState(() => !!getInitialStoredBrand());

  // Validate and load selected brand from localStorage, or auto-create/select primary brand
  useEffect(() => {
    let isCancelled = false;

    const initializeBrand = async () => {
      const stored = localStorage.getItem(SELECTED_BRAND_KEY);

      if (!ready) {
        return;
      }

      if (!user) {
        localStorage.removeItem(SELECTED_BRAND_KEY);
        setSelectedBrandState(null);
        setIsValidated(true);
        return;
      }

      if (!userReady) {
        return;
      }

      if (!orgId) {
        console.log('[BrandContext] User has no org_id, skipping brand initialization');
        localStorage.removeItem(SELECTED_BRAND_KEY);
        setSelectedBrandState(null);
        setIsValidated(true);
        return;
      }

      // If we have a stored brand, validate it
      if (stored) {
        try {
          const storedBrand = JSON.parse(stored) as Brand;
          
          // Validate the stored brand belongs to the current user's org
          if (storedBrand.org_id === orgId) {
            if (!isCancelled) {
              setSelectedBrandState(prev => prev?.id === storedBrand.id ? prev : storedBrand);
              setIsValidated(true);
            }

            // Verify brand still exists in database
            const { data: brandExists } = await supabase
              .from('brands')
              .select('*')
              .eq('id', storedBrand.id)
              .eq('org_id', orgId)
              .single();

            if (brandExists) {
              console.log('[BrandContext] Using validated stored brand:', brandExists.name);
              if (!isCancelled) {
                setSelectedBrandState(brandExists as Brand);
                setIsValidated(true);
              }
              return;
            }

            localStorage.removeItem(SELECTED_BRAND_KEY);
            if (!isCancelled) {
              setSelectedBrandState(null);
            }
          }
          // Brand invalid, clear it
          localStorage.removeItem(SELECTED_BRAND_KEY);
        } catch (e) {
          console.error('[BrandContext] Failed to validate stored brand:', e);
          localStorage.removeItem(SELECTED_BRAND_KEY);
        }
      }

      if (!selectedBrand) {
        setIsValidated(false);
      }

      // Try to find existing brands for this org
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .eq('org_id', orgId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (brandsError) {
        console.error('[BrandContext] Error fetching brands:', brandsError);
        if (!isCancelled) {
          setIsValidated(true);
        }
        return;
      }

      if (brands && brands.length > 0) {
        // Use existing brand
        const primaryBrand = brands.find(b => b.is_primary) || brands[0];
        console.log('[BrandContext] Using existing brand:', primaryBrand.name);
        if (!isCancelled) {
          setSelectedBrandState(primaryBrand as Brand);
        }
        localStorage.setItem(SELECTED_BRAND_KEY, JSON.stringify(primaryBrand));
        if (!isCancelled) {
          setIsValidated(true);
        }
        return;
      }

      // NO BRANDS EXIST - Auto-create brand from organization data
      console.log('[BrandContext] No brands found, creating from organization...');
      
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('name, domain, keywords, business_description, products_services, target_audience')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        console.error('[BrandContext] Error fetching org for brand creation:', orgError);
        if (!isCancelled) {
          setIsValidated(true);
        }
        return;
      }

      // Clean domain - remove any suffixes like "-uuid" patterns and protocols
      let cleanDomain = org.domain || '';
      cleanDomain = cleanDomain.replace(/^https?:\/\//, ''); // Remove protocol
      cleanDomain = cleanDomain.replace(/\/$/, ''); // Remove trailing slash
      // Remove UUID-like suffixes (e.g., "-3771e21b")
      cleanDomain = cleanDomain.replace(/-[a-f0-9]{8}(-[a-f0-9]{4})?(-[a-f0-9]{4})?(-[a-f0-9]{4})?(-[a-f0-9]{12})?$/i, '');
      // Remove any remaining query params or paths
      cleanDomain = cleanDomain.split('/')[0];

      // Create a new primary brand from the organization
      const { data: newBrand, error: createError } = await supabase
        .from('brands')
        .insert({
          org_id: orgId,
          name: org.name,
          domain: cleanDomain,
          is_primary: true,
          // Copy business context from org to brand
          keywords: org.keywords || [],
          business_description: org.business_description || null,
          products_services: org.products_services || null,
          target_audience: org.target_audience || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('[BrandContext] Error creating brand:', createError);
        if (!isCancelled) {
          setIsValidated(true);
        }
        return;
      }

      console.log('[BrandContext] Successfully created brand:', newBrand.name);
      if (!isCancelled) {
        setSelectedBrandState(newBrand as Brand);
      }
      localStorage.setItem(SELECTED_BRAND_KEY, JSON.stringify(newBrand));
      if (!isCancelled) {
        setIsValidated(true);
      }
    };

    initializeBrand();

    return () => {
      isCancelled = true;
    };
  }, [orgId, ready, selectedBrand, user, userReady]);

  const setSelectedBrand = (brand: Brand | null) => {
    setSelectedBrandState(brand);
    if (brand) {
      localStorage.setItem(SELECTED_BRAND_KEY, JSON.stringify(brand));
    } else {
      localStorage.removeItem(SELECTED_BRAND_KEY);
    }
  };

  const clearSelectedBrand = () => {
    setSelectedBrandState(null);
    localStorage.removeItem(SELECTED_BRAND_KEY);
  };

  return (
    <BrandContext.Provider value={{ selectedBrand, setSelectedBrand, clearSelectedBrand, isValidated }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider');
  }
  return context;
}
