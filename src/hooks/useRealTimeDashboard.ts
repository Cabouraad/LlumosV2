
/**
 * Real-time dashboard hook with optimized fetching and auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardFetcher, UnifiedDashboardResponse } from '@/lib/data/unified-rpc-fetcher';
import { useToast } from '@/hooks/use-toast';
import { AdaptivePoller } from '@/lib/polling/adaptive-poller';
import { useBrand } from '@/contexts/BrandContext';

const debug = (...args: any[]) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export interface UseRealTimeDashboardOptions {
  autoRefreshInterval?: number; // milliseconds (used as max interval)
  enableAutoRefresh?: boolean;
  onError?: (error: Error) => void;
  enableAdaptivePolling?: boolean;
}

export interface UseRealTimeDashboardResult {
  data: UnifiedDashboardResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useRealTimeDashboard(
  options: UseRealTimeDashboardOptions = {}
): UseRealTimeDashboardResult {
  const {
    autoRefreshInterval = 30000, // 30 seconds default for more responsive UI
    enableAutoRefresh = true,
    enableAdaptivePolling = true,
    onError
  } = options;

  const [data, setData] = useState<UnifiedDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();
  const { selectedBrand } = useBrand();

  // Update fetcher with current brand ID whenever it changes
  useEffect(() => {
    dashboardFetcher.setBrandId(selectedBrand?.id || null);
  }, [selectedBrand?.id]);

  // Refs to prevent excessive fetching
  const fetchInProgressRef = useRef(false);
  const lastVisibilityFetchRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const adaptivePollerRef = useRef<AdaptivePoller | null>(null);
  const pollerUnsubscribeRef = useRef<(() => void) | null>(null);

  // Refs to store toast function to avoid re-creating fetchData callback
  const toastRef = useRef(toast);
  toastRef.current = toast;
  
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Fetch data function - use refs to avoid dependency changes
  // showLoading parameter controls whether to show loading state (false for background refreshes)
  const fetchData = useCallback(async (forceRefresh: boolean = false, showLoading: boolean = true) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      debug('[Dashboard] Fetch already in progress, skipping');
      return;
    }

    fetchInProgressRef.current = true;
    debug('[Dashboard] Starting fetch:', { forceRefresh, showLoading });

    try {
      // Only show loading state for manual refreshes, not background updates
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const result = await dashboardFetcher.getData(forceRefresh);

      // Handle "no org" case specially - this is not an error, user needs onboarding
      if (result.noOrg) {
        debug('[Dashboard] User has no organization - needs onboarding');
        setLoading(false);
        setData(null);
        // Don't set error or show toast - let routing logic handle redirect
        return;
      }

      // Handle timeout errors silently - the fetcher returns cached data when available
      if (result.isTimeout && !result.success) {
        debug('[Dashboard] Database timeout - using cached data or ignoring');
        // Don't show error toast for timeouts, they're temporary
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      setData(result);
      setLastUpdated(new Date());
      debug('[Dashboard] Fetch successful');

    } catch (err) {
      const error = err as Error;
      console.error('[Dashboard] Fetch error:', error);
      setError(error);

      if (onErrorRef.current) {
        onErrorRef.current(error);
      } else if (showLoading) {
        // Only show error toast for manual refreshes
        toastRef.current({
          title: 'Dashboard Error',
          description: error.message || 'Failed to load dashboard data. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  }, []); // Empty deps - uses refs to avoid recreating

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Initial data fetch and refetch when brand changes
  useEffect(() => {
    fetchData(false);
  }, [fetchData, selectedBrand?.id]);

  // Auto-refresh interval with adaptive polling
  useEffect(() => {
    if (!enableAutoRefresh) {
      debug('[Dashboard] Auto-refresh disabled');
      return;
    }

    if (enableAdaptivePolling) {
      // Use adaptive poller with longer intervals
      debug('[Dashboard] Setting up adaptive polling');
      adaptivePollerRef.current = new AdaptivePoller({
        minInterval: 120000, // 2 minutes minimum
        maxInterval: Math.max(autoRefreshInterval, 300000), // 5 minutes max
        backoffMultiplier: 1.5,
        activityThreshold: 300000, // 5 minutes
        changeDetection: true
      });

      pollerUnsubscribeRef.current = adaptivePollerRef.current.subscribe(async () => {
        if (!fetchInProgressRef.current) {
          debug('[Dashboard] Adaptive poll triggered (silent)');
          return fetchData(false, false); // Silent background refresh
        }
        debug('[Dashboard] Adaptive poll skipped, already loading');
        return Promise.resolve();
      });

    } else {
      // Use traditional interval polling with longer interval
      const pollInterval = Math.max(autoRefreshInterval, 120000); // At least 2 minutes
      debug('[Dashboard] Setting up traditional polling:', pollInterval);
      intervalRef.current = setInterval(() => {
        if (!fetchInProgressRef.current) {
          debug('[Dashboard] Traditional poll triggered (silent)');
          fetchData(false, false); // Silent background refresh
        } else {
          debug('[Dashboard] Traditional poll skipped, already loading');
        }
      }, pollInterval);
    }

    return () => {
      // Cleanup adaptive poller
      if (pollerUnsubscribeRef.current) {
        pollerUnsubscribeRef.current();
        pollerUnsubscribeRef.current = null;
      }
      if (adaptivePollerRef.current) {
        adaptivePollerRef.current.pause();
        adaptivePollerRef.current = null;
      }

      // Cleanup traditional interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      debug('[Dashboard] Auto-refresh cleared');
    };
  }, [enableAutoRefresh, enableAdaptivePolling, autoRefreshInterval, fetchData]);

  // Subscribe to real-time updates (removed to prevent double updates)

  // Handle visibility change with throttling (disabled when adaptive polling is enabled)
  useEffect(() => {
    if (enableAdaptivePolling) {
      debug('[Dashboard] Visibility refresh disabled - using adaptive poller');
      return;
    }

    const handleVisibilityChange = () => {
      // Only refresh when tab becomes visible, not when hidden
      if (document.visibilityState === 'visible' && !fetchInProgressRef.current) {
        const now = Date.now();
        // Increased throttle to 2 minutes to prevent excessive refetching
        if (now - lastVisibilityFetchRef.current > 120000) {
          debug('[Dashboard] Tab visible, refreshing (silent)');
          lastVisibilityFetchRef.current = now;
          fetchData(false, false); // Silent background refresh
        } else {
          debug('[Dashboard] Tab visible but throttled');
        }
      } else if (document.visibilityState === 'hidden') {
        debug('[Dashboard] Tab hidden, pausing activity');
        // Tab is hidden - polling continues but we log it for monitoring
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, enableAdaptivePolling]);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated
  };
}

/**
 * Hook for real-time prompt data with optimized updates
 */
export function useRealTimePrompts() {
  const { data, loading, error, refresh, lastUpdated } = useRealTimeDashboard({
    autoRefreshInterval: 60000, // 1 minute for prompt data
    enableAutoRefresh: true
  });

  // Transform data for prompt components
  const prompts = data?.prompts || [];
  const responses = data?.responses || [];
  
  return {
    prompts,
    responses,
    loading,
    error,
    refresh,
    lastUpdated
  };
}
