
/**
 * Unified RPC-based data fetcher for optimal performance
 * Uses single database call instead of multiple queries
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from '../observability/logger';

export interface UnifiedDashboardResponse {
  success: boolean;
  error?: string;
  noOrg?: boolean; // Indicates user has no organization (not an error, needs onboarding)
  isTimeout?: boolean; // Indicates a temporary database timeout (not a critical error)
  prompts: any[];
  responses: any[];
  chartData: any[];
  presenceDaily?: Array<{
    date: string;
    total: number;
    present: number;
    competitorPresence: Record<string, number>;
  }>;
  providerDaily?: Array<{
    date: string;
    provider: string;
    total: number;
    present: number;
  }>;
  metrics: {
    avgScore: number;
    overallScore: number;
    trend: number;
    promptCount: number;
    activePrompts: number;
    inactivePrompts: number;
    totalRuns: number;
    recentRunsCount: number;
  };
  timestamp: string;
}

/**
 * Fetch all dashboard data in a single optimized RPC call
 */
export async function getUnifiedDashboardDataRPC(brandId?: string | null, preResolvedOrgId?: string | null): Promise<UnifiedDashboardResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('Fetching unified dashboard data via RPC', { 
      component: 'unified-rpc-fetcher',
      metadata: { brandId }
    });
    
    // Use pre-resolved org ID if available (from context), avoiding redundant auth calls
    let orgId: string | null = preResolvedOrgId || null;
    
    if (!orgId) {
      // Try to get org_id from localStorage cache first to avoid auth call
      const cachedOrgId = localStorage.getItem('sb_last_org_id');
      const cacheTimestamp = localStorage.getItem('sb_org_cache_timestamp');
      const isValidCache = cachedOrgId && 
        cachedOrgId !== 'undefined' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cachedOrgId) &&
        cacheTimestamp &&
        (Date.now() - parseInt(cacheTimestamp)) < 30 * 60 * 1000;
      
      orgId = isValidCache ? cachedOrgId : null;
    }
    
    // Only fetch from DB if no org ID available
    if (!orgId) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.warn('No authenticated user found', { component: 'unified-rpc-fetcher' });
        return {
          success: false,
          error: 'Not authenticated',
          prompts: [],
          responses: [],
          chartData: [],
          metrics: {
            avgScore: 0,
            overallScore: 0,
            trend: 0,
            promptCount: 0,
            activePrompts: 0,
            inactivePrompts: 0,
            totalRuns: 0,
            recentRunsCount: 0
          },
          timestamp: new Date().toISOString()
        };
      }
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (userError || !userData || !userData.org_id) {
        logger.info('User has no organization - needs onboarding', { 
          component: 'unified-rpc-fetcher',
          metadata: { 
            hasUserRecord: !!userData,
            hasOrgId: !!userData?.org_id,
            userError: userError?.message 
          }
        });
        
        return {
          success: false,
          noOrg: true,
          error: 'No organization found',
          prompts: [],
          responses: [],
          chartData: [],
          metrics: {
            avgScore: 0,
            overallScore: 0,
            trend: 0,
            promptCount: 0,
            activePrompts: 0,
            inactivePrompts: 0,
            totalRuns: 0,
            recentRunsCount: 0
          },
          timestamp: new Date().toISOString()
        };
      }
      
      orgId = userData.org_id;
      
      // Update cache for future calls
      localStorage.setItem('sb_last_org_id', orgId);
      localStorage.setItem('sb_org_cache_timestamp', Date.now().toString());
    }
    
    const { data, error } = await supabase.rpc('get_unified_dashboard_data', {
      p_org_id: orgId,
      p_brand_id: brandId || null
    });
    
    const fetchTime = Date.now() - startTime;
    
    if (error) {
      const isTimeout = error.message?.includes('statement timeout') || error.message?.includes('canceling statement');
      logger.error('RPC fetch failed', error, { 
        component: 'unified-rpc-fetcher',
        metadata: { fetchTimeMs: fetchTime, error: error.message, isTimeout }
      });
      
      // For timeouts, return a soft error that won't trigger scary toasts
      if (isTimeout) {
        return {
          success: false,
          error: 'temporarily_unavailable', // Special error code for timeouts
          isTimeout: true,
          prompts: [],
          responses: [],
          chartData: [],
          metrics: {
            avgScore: 0,
            overallScore: 0,
            trend: 0,
            promptCount: 0,
            activePrompts: 0,
            inactivePrompts: 0,
            totalRuns: 0,
            recentRunsCount: 0
          },
          timestamp: new Date().toISOString()
        };
      }
      
      throw new Error(`Database error: ${error.message}`);
    }

    // Validate that we received data
    if (!data) {
      logger.error('RPC returned null data', new Error('No data returned'), { 
        component: 'unified-rpc-fetcher',
        metadata: { fetchTimeMs: fetchTime }
      });
      throw new Error('No data returned from database');
    }

    const result = data as any;
    
    // Check if the RPC returned an error structure
    if (result && typeof result === 'object' && result.success === false) {
      const errorMsg = result.error || 'Unknown RPC error';
      logger.error('RPC returned error response', new Error(errorMsg), { 
        component: 'unified-rpc-fetcher',
        metadata: { fetchTimeMs: fetchTime, rpcError: errorMsg }
      });
      throw new Error(`Dashboard data error: ${errorMsg}`);
    }

    // Validate the structure of successful response
    if (!result || typeof result !== 'object') {
      logger.error('RPC returned invalid structure', new Error('Invalid response structure'), { 
        component: 'unified-rpc-fetcher',
        metadata: { fetchTimeMs: fetchTime, resultType: typeof result }
      });
      throw new Error('Invalid response structure from database');
    }

    // Ensure we have the expected properties
    const safeResult = {
      success: true,
      prompts: Array.isArray(result.prompts) ? result.prompts : [],
      responses: Array.isArray(result.responses) ? result.responses : [],
      chartData: Array.isArray(result.chartData) ? result.chartData : [],
      presenceDaily: Array.isArray(result.presenceDaily) ? result.presenceDaily : [],
      metrics: result.metrics && typeof result.metrics === 'object' 
        ? {
            avgScore: Number(result.metrics.avgScore) || 0,
            overallScore: Number(result.metrics.overallScore) || 0,
            trend: Number(result.metrics.trend) || 0,
            promptCount: Number(result.metrics.promptCount) || 0,
            activePrompts: Number(result.metrics.activePrompts) || 0,
            inactivePrompts: Number(result.metrics.inactivePrompts) || 0,
            totalRuns: Number(result.metrics.totalRuns) || 0,
            recentRunsCount: Number(result.metrics.recentRunsCount) || 0
          }
        : {
            avgScore: 0,
            overallScore: 0,
            trend: 0,
            promptCount: 0,
            activePrompts: 0,
            inactivePrompts: 0,
            totalRuns: 0,
            recentRunsCount: 0
          },
      timestamp: result.timestamp || new Date().toISOString()
    };

    logger.info('RPC fetch completed successfully', {
      component: 'unified-rpc-fetcher',
      metadata: {
        fetchTimeMs: fetchTime,
        promptCount: safeResult.prompts.length,
        responseCount: safeResult.responses.length,
        chartDataPoints: safeResult.chartData.length
      }
    });

    return safeResult;

  } catch (error) {
    const fetchTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    logger.error('Unified RPC fetch failed', error as Error, { 
      component: 'unified-rpc-fetcher',
      metadata: { fetchTimeMs: fetchTime, errorMessage }
    });
    
    // Return safe error structure
    return {
      success: false,
      error: errorMessage,
      prompts: [],
      responses: [],
      chartData: [],
      metrics: {
        avgScore: 0,
        overallScore: 0,
        trend: 0,
        promptCount: 0,
        activePrompts: 0,
        inactivePrompts: 0,
        totalRuns: 0,
        recentRunsCount: 0
      },
      timestamp: new Date().toISOString()
    };
  }
}

const DASHBOARD_STORAGE_KEY = 'llumos_dashboard_cache';
const DASHBOARD_BRAND_KEY = 'llumos_dashboard_brand';

/**
 * Real-time data fetcher with caching, localStorage persistence,
 * and stale-while-revalidate for instant dashboard loads.
 */
export class RealTimeDashboardFetcher {
  private cache: UnifiedDashboardResponse | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 120000; // 2 minutes
  private refreshCallbacks: ((data: UnifiedDashboardResponse) => void)[] = [];
  private currentBrandId: string | null = null;
  private currentOrgId: string | null = null;

  constructor() {
    // Hydrate from localStorage on creation for instant first render
    this.hydrateFromStorage();
  }

  /**
   * Hydrate memory cache from localStorage (stale-while-revalidate)
   */
  private hydrateFromStorage(): void {
    try {
      const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      const storedBrand = localStorage.getItem(DASHBOARD_BRAND_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { data: UnifiedDashboardResponse; timestamp: number; brandId: string | null };
        // Only use if less than 10 minutes old
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < 600000) {
          this.cache = parsed.data;
          this.lastFetch = parsed.timestamp;
          this.currentBrandId = parsed.brandId ?? null;
          logger.info('Hydrated dashboard from localStorage', {
            component: 'unified-rpc-fetcher',
            metadata: { age: Date.now() - parsed.timestamp, prompts: parsed.data.prompts?.length || 0 }
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Persist current cache to localStorage
   */
  private persistToStorage(): void {
    if (!this.cache || !this.cache.success) return;
    try {
      const payload = JSON.stringify({
        data: this.cache,
        timestamp: this.lastFetch,
        brandId: this.currentBrandId
      });
      // Only persist if reasonably sized (< 500KB)
      if (payload.length < 500000) {
        localStorage.setItem(DASHBOARD_STORAGE_KEY, payload);
        localStorage.setItem(DASHBOARD_BRAND_KEY, this.currentBrandId || '');
      }
    } catch {
      // Ignore quota errors
    }
  }

  /**
   * Set the org ID from context to avoid redundant auth lookups
   */
  setOrgId(orgId: string | null): void {
    this.currentOrgId = orgId;
  }

  /**
   * Set the current brand ID for filtering
   */
  setBrandId(brandId: string | null): void {
    if (this.currentBrandId !== brandId) {
      this.currentBrandId = brandId;
      this.clearCache(); // Clear cache when brand changes
    }
  }

  /**
   * Get dashboard data with caching + stale-while-revalidate
   */
  async getData(forceRefresh: boolean = false): Promise<UnifiedDashboardResponse> {
    const now = Date.now();
    
    // Return cached data if recent and not forcing refresh
    if (!forceRefresh && this.cache && this.cache.success && (now - this.lastFetch) < this.CACHE_DURATION) {
      logger.info('Returning cached dashboard data', { 
        component: 'unified-rpc-fetcher',
        metadata: {
          cacheAge: now - this.lastFetch,
          prompts: this.cache.prompts?.length || 0
        }
      });
      return this.cache;
    }

    // Fetch fresh data with brand filtering
    const data = await getUnifiedDashboardDataRPC(this.currentBrandId, this.currentOrgId);
    
    // On timeout, return stale cached data if available (better than showing error)
    if (data.isTimeout && this.cache && this.cache.success) {
      logger.info('Returning stale cache on timeout', { 
        component: 'unified-rpc-fetcher',
        metadata: {
          cacheAge: now - this.lastFetch,
          prompts: this.cache.prompts?.length || 0
        }
      });
      return this.cache;
    }
    
    // Only update cache if successful
    if (data.success) {
      this.cache = data;
      this.lastFetch = now;
      this.persistToStorage();
    }

    // Notify subscribers only of successful data
    if (data.success) {
      this.refreshCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('Refresh callback failed', error as Error, { 
            component: 'unified-rpc-fetcher' 
          });
        }
      });
    }

    return data;
  }

  /**
   * Get stale cached data synchronously (for instant first render)
   */
  getCachedData(): UnifiedDashboardResponse | null {
    return this.cache;
  }

  /**
   * Subscribe to data refresh events
   */
  onRefresh(callback: (data: UnifiedDashboardResponse) => void): () => void {
    this.refreshCallbacks.push(callback);
    
    return () => {
      const index = this.refreshCallbacks.indexOf(callback);
      if (index > -1) {
        this.refreshCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Force refresh data
   */
  async refresh(): Promise<UnifiedDashboardResponse> {
    return this.getData(true);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    this.lastFetch = 0;
    try {
      localStorage.removeItem(DASHBOARD_STORAGE_KEY);
      localStorage.removeItem(DASHBOARD_BRAND_KEY);
    } catch {
      // Ignore
    }
  }
}

// Global instance for reuse
export const dashboardFetcher = new RealTimeDashboardFetcher();
