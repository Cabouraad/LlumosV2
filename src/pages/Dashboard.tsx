import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { AdminDiagnosticPanel } from '@/components/AdminDiagnosticPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useBrand } from '@/contexts/BrandContext';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshButton } from '@/components/RefreshButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Lightbulb, FileText, Download } from 'lucide-react';
import { useRealTimeDashboard } from '@/hooks/useRealTimeDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { ProviderVisibilityChart } from '@/components/dashboard/ProviderVisibilityChart';
import { DataFreshnessIndicator } from '@/components/DataFreshnessIndicator';
import { useContentOptimizations } from '@/features/visibility-optimizer/hooks';
import { LlumosScoreWidget } from '@/components/llumos/LlumosScoreWidget';
import { MostCitedDomains } from '@/components/dashboard/MostCitedDomains';
import { BrandPresenceRate } from '@/components/dashboard/BrandPresenceRate';
import { TopCompetitorsComparison } from '@/components/dashboard/TopCompetitorsComparison';
import { AISourceIntelligence } from '@/components/dashboard/AISourceIntelligence';
import { ContentStudioCard } from '@/components/dashboard/ContentStudioCard';
import { useCompetitors } from '@/features/competitors/hooks';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function Dashboard() {
  const { user, orgData, checkSubscription } = useAuth();
  const { selectedBrand } = useBrand();
  const navigate = useNavigate();
  
  const { hasAccessToApp, limits, canAccessRecommendations, canAccessCompetitorAnalysis, currentTier } = useSubscriptionGate();
  const appAccess = hasAccessToApp();
  const recommendationsAccess = canAccessRecommendations();
  const competitorAccess = canAccessCompetitorAnalysis();
  const { data: optimizations = [] } = useContentOptimizations();
  const [latestReport, setLatestReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Use optimized competitor hook - filter by selected brand
  const { data: competitorData = [], isLoading: loadingCompetitors } = useCompetitors({
    days: 30,
    limit: 5, // Top 5 competitors only for dashboard chart
    offset: 0,
    brandId: selectedBrand?.id || null,
  });
  
  // Post-checkout: refresh subscription and clean URL
  useEffect(() => {
    const sub = searchParams.get('subscription');
    const portalReturn = searchParams.get('portal_return');
    if (sub === 'success' || portalReturn === 'true') {
      // Refresh subscription on return from Stripe
      try {
        checkSubscription?.();
      } catch (e) {
        console.error('checkSubscription error:', e);
      }
      toast({
        title: 'Subscription updated',
        description: 'Your access has been refreshed.',
      });
      // Clean the URL
      navigate('/dashboard', { replace: true });
    }
  }, [checkSubscription, navigate, searchParams, toast]);
  
  // Use real-time dashboard hook with optimized interval
  const { data: dashboardData, loading, error, refresh, lastUpdated } = useRealTimeDashboard({
    autoRefreshInterval: 180000, // 3 minutes (optimized for performance)
    enableAutoRefresh: true
  });
  
  // CRITICAL: Force redirect to onboarding if no org in multiple scenarios
  useEffect(() => {
    // 1. Check orgData structure first
    const hasOrg = Boolean(orgData?.organizations?.id || orgData?.org_id);
    if (user && !hasOrg) {
      if (import.meta.env.DEV) {
        console.log('[Dashboard] No org in orgData, redirecting to onboarding');
      }
      navigate('/onboarding', { replace: true });
      return;
    }

    // 2. Check if dashboard data indicates no org
    if (dashboardData && !dashboardData.success && dashboardData.noOrg) {
      if (import.meta.env.DEV) {
        console.log('[Dashboard] Dashboard data indicates no org, redirecting to onboarding');
      }
      navigate('/onboarding', { replace: true });
      return;
    }
  }, [user, orgData, dashboardData, navigate]);

  // Auto-trigger weekly report generation once
  useEffect(() => {
    const hasTriggeredReports = localStorage.getItem('weekly-reports-triggered');
    if (!hasTriggeredReports && user && orgData?.organizations?.id) {
      const triggerReports = async () => {
        try {
          if (import.meta.env.DEV) {
            console.log('[Dashboard] Auto-triggering weekly report generation...');
          }
          const { data, error } = await supabase.functions.invoke("generate-weekly-report", {
            body: {}
          });

          if (error) {
            console.error('[Dashboard] Error auto-triggering reports:', error);
          } else if (import.meta.env.DEV) {
            console.log('[Dashboard] Weekly reports triggered successfully:', data);
          }

          // Mark as triggered so we don't run again
          localStorage.setItem('weekly-reports-triggered', 'true');
        } catch (error) {
          console.error('[Dashboard] Failed to trigger reports:', error);
        }
      };

      // Trigger after a short delay to ensure everything is loaded
      const timeoutId = setTimeout(triggerReports, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [user, orgData, toast]);

  // Memoize chart data to prevent unnecessary re-renders
  const memoizedChartData = useMemo(() => {
    return dashboardData?.chartData || [];
  }, [dashboardData?.chartData]);

  // Compute brand presence stats from existing data
  const presenceStats = useMemo(() => {
    const responses = dashboardData?.responses as any[] | undefined;
    if (!responses || responses.length === 0) {
      return { rate: 0, sparklineData: [], totalCount: 0, presenceCount: 0, weekOverWeekChange: 0 };
    }

    const now = new Date();
    const sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgoMs = now.getTime() - 14 * 24 * 60 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Sparkline matches existing behavior: 7 buckets (6 days ago midnight -> today).
    const baseDay = new Date(now);
    baseDay.setHours(0, 0, 0, 0);
    baseDay.setDate(baseDay.getDate() - 6);
    const baseDayMs = baseDay.getTime();

    const dayTotals = new Array(7).fill(0);
    const dayPresence = new Array(7).fill(0);

    let recentTotal = 0;
    let recentPresence = 0;

    let prevTotal = 0;
    let prevPresence = 0;

    for (const response of responses) {
      if (!response) continue;
      const status = response.status;
      if (status !== 'success' && status !== 'completed') continue;

      const ts = Date.parse(response.run_at || response.created_at);
      if (!Number.isFinite(ts)) continue;

      if (ts >= sevenDaysAgoMs) {
        recentTotal++;
        if (response.org_brand_present === true) recentPresence++;

        // Only include in sparkline if within the 7-day midnight window (same as previous logic)
        if (ts >= baseDayMs) {
          const dayIndex = Math.floor((ts - baseDayMs) / DAY_MS);
          if (dayIndex >= 0 && dayIndex < 7) {
            dayTotals[dayIndex]++;
            if (response.org_brand_present === true) dayPresence[dayIndex]++;
          }
        }
      } else if (ts >= fourteenDaysAgoMs) {
        prevTotal++;
        if (response.org_brand_present === true) prevPresence++;
      }
    }

    const rate = recentTotal > 0 ? (recentPresence / recentTotal) * 100 : 0;
    const prevRate = prevTotal > 0 ? (prevPresence / prevTotal) * 100 : 0;
    const weekOverWeekChange = prevTotal > 0 ? rate - prevRate : 0;

    const sparklineData = dayTotals.map((total, idx) => {
      const value = total > 0 ? (dayPresence[idx] / total) * 100 : 0;
      return { value };
    });

    return {
      rate,
      sparklineData,
      totalCount: recentTotal,
      presenceCount: recentPresence,
      weekOverWeekChange,
    };
  }, [dashboardData?.responses]);

  // Compute competitor presence chart data
  const competitorChartData = useMemo(() => {
    const responses = dashboardData?.responses as any[] | undefined;
    if (!responses || competitorData.length === 0) {
      return [];
    }

    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date();

    // Same 7-day window as before: 6 days ago midnight -> today
    const baseDay = new Date(now);
    baseDay.setHours(0, 0, 0, 0);
    baseDay.setDate(baseDay.getDate() - 6);
    const baseDayMs = baseDay.getTime();
    const endMs = baseDayMs + 7 * DAY_MS;

    const competitorNames = competitorData.map((c) => (c?.competitor_name || '').toLowerCase().trim());
    const competitorIndex = new Map<string, number>();
    competitorNames.forEach((name, idx) => {
      if (name) competitorIndex.set(name, idx);
    });

    const totals = new Array(7).fill(0);
    const orgPresentCounts = new Array(7).fill(0);
    const competitorHitCounts: number[][] = Array.from({ length: 7 }, () => new Array(competitorData.length).fill(0));

    for (const response of responses) {
      if (!response) continue;
      const status = response.status;
      if (status !== 'success' && status !== 'completed') continue;

      const ts = Date.parse(response.run_at || response.created_at);
      if (!Number.isFinite(ts) || ts < baseDayMs || ts >= endMs) continue;

      const dayIndex = Math.floor((ts - baseDayMs) / DAY_MS);
      if (dayIndex < 0 || dayIndex >= 7) continue;

      totals[dayIndex]++;
      if (response.org_brand_present === true) orgPresentCounts[dayIndex]++;

      // competitor presence (count each response at most once per competitor)
      const raw = response.competitors_json;
      let arr: string[] = [];
      if (Array.isArray(raw)) arr = raw;
      else if (typeof raw === 'string') arr = [raw];
      else if (raw != null) arr = [String(raw)];

      if (arr.length > 0) {
        const seen = new Set<number>();
        for (const item of arr) {
          if (!item) continue;
          const idx = competitorIndex.get(String(item).toLowerCase().trim());
          if (idx !== undefined) seen.add(idx);
        }
        for (const idx of seen) {
          competitorHitCounts[dayIndex][idx]++;
        }
      }
    }

    const allDays: any[] = [];
    for (let i = 0; i < 7; i++) {
      const totalDayResponses = totals[i];
      const dayDate = new Date(baseDayMs + i * DAY_MS);

      const dayData: any = {
        date: dayDate.toISOString(),
        orgPresence: 0,
        hasData: totalDayResponses > 0,
      };

      if (totalDayResponses > 0) {
        dayData.orgPresence = Math.round((orgPresentCounts[i] / totalDayResponses) * 100);
      }

      for (let c = 0; c < competitorData.length; c++) {
        const rate = totalDayResponses > 0 ? Math.round((competitorHitCounts[i][c] / totalDayResponses) * 100) : 0;
        dayData[`competitor${c}`] = rate;
      }

      allDays.push(dayData);
    }

    // Filter to only days with data, then take the most recent 5
    const daysWithData = allDays.filter((day) => day.hasData);
    const result = daysWithData.slice(-5);

    // Clean up the hasData flag before returning
    return result.map(({ hasData, ...rest }: any) => rest);
  }, [dashboardData?.responses, competitorData]);

  useEffect(() => {
    if (orgData?.organizations?.id && isFeatureEnabled('FEATURE_WEEKLY_REPORT')) {
      loadLatestReport();
    }
  }, [orgData?.organizations?.id]);

  // Transform optimizations for Quick Wins display
  const quickWins = useMemo(() => {
    return optimizations
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 3)
      .map(opt => ({
        id: opt.id,
        title: opt.title,
        rationale: opt.description,
        metadata: {
          impact: opt.priority_score > 70 ? 'high' : opt.priority_score > 40 ? 'medium' : 'low'
        }
      }));
  }, [optimizations]);

  const loadLatestReport = async () => {
    try {
      setLoadingReport(true);
      const orgId = orgData?.organizations?.id;
      if (!orgId) return;

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('org_id', orgId)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setLatestReport(data);
    } catch (error) {
      console.error('Error loading latest report:', error);
      // Don't show toast error for report loading as it's secondary content
    } finally {
      setLoadingReport(false);
    }
  };

  const downloadLatestReport = async () => {
    if (!latestReport) return;
    
    try {
      setLoadingReport(true);
      
      const response = await supabase.functions.invoke('weekly-report', {
        method: 'GET',
        body: { week: latestReport.week_key }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate download URL');
      }

      const { download_url } = response.data;
      if (!download_url) {
        throw new Error('No download URL received');
      }

      // Immediately trigger download since signed URL has short TTL (5 minutes)
      const link = document.createElement('a');
      link.href = download_url;
      link.download = `weekly-report-${latestReport.week_key}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Download Started',
        description: `Weekly report for ${latestReport.week_key} is downloading.`,
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoadingReport(false);
    }
  };


  const formatWeekPeriod = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric'
    };
    
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  if (!appAccess.hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">AI visibility insights for your organization</p>
          </div>

          <div className="max-w-md mx-auto">
            <UpgradePrompt 
              feature="Dashboard"
              reason={appAccess.reason || ''}
              isTrialExpired={appAccess.isTrialExpired}
              daysRemainingInTrial={appAccess.daysRemainingInTrial}
              isFreeTier={limits.isFreeTier}
            />
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto p-6">
            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg"></div>
                ))}
              </div>
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto p-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Dashboard Error</h2>
              <p className="text-muted-foreground">Failed to load dashboard data. Please try refreshing.</p>
              <Button onClick={refresh}>Retry</Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <DashboardLayout>
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
                <DataFreshnessIndicator lastUpdated={lastUpdated} />
              </div>
              <p className="text-muted-foreground">AI visibility insights for your organization</p>
            </div>
            <RefreshButton 
              onRefresh={refresh}
              loading={loading}
              lastUpdated={lastUpdated}
              autoRefreshEnabled={true}
              showLastUpdated={true}
            />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Llumos Score Widget */}
            <LlumosScoreWidget />
            
            {/* Other Metrics */}
            <DashboardMetrics 
              metrics={dashboardData?.metrics || {}}
              presenceStats={presenceStats}
              promptLimit={limits.maxPrompts ?? undefined}
            />
          </div>

          {/* Visibility Trend Chart */}
          <DashboardChart 
            competitorChartData={competitorChartData}
            competitors={competitorData.map(c => ({ name: c.competitor_name }))}
            loadingCompetitors={loadingCompetitors}
          />

          {/* Visibility by AI Platform */}
          <ProviderVisibilityChart 
            responses={dashboardData?.responses || []}
            isLoading={loading}
          />

          {/* Brand Presence & Competitor Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrandPresenceRate 
              responses={dashboardData?.responses || []} 
              isLoading={loading}
            />
            <TopCompetitorsComparison 
              orgId={orgData?.organizations?.id}
              responses={dashboardData?.responses || []}
              isLoading={loading}
            />
          </div>

          {/* Quick Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Source Intelligence */}
            <AISourceIntelligence orgId={orgData?.organizations?.id} brandId={selectedBrand?.id} />

            {/* Recommendations Card - Show to all users */}
            <Card className="bg-card/80 backdrop-blur-sm border shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle>Quick Wins</CardTitle>
                </div>
                {recommendationsAccess.hasAccess && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/optimizations')}
                    className="hover-lift"
                  >
                    View All
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {!recommendationsAccess.hasAccess ? (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm font-medium mb-2">AI-Powered Optimization Recommendations</p>
                    <p className="text-xs text-muted-foreground mb-4">Get actionable insights to improve your LLM visibility</p>
                    <Button 
                      onClick={() => navigate('/pricing')}
                      size="sm"
                    >
                      Upgrade to Growth or Pro
                    </Button>
                  </div>
                ) : quickWins.length > 0 ? (
                  quickWins.map((rec) => (
                    <div key={rec.id} className="border-l-4 border-l-primary pl-4 py-2 rounded-r bg-primary/5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{rec.title}</h4>
                        {rec.metadata?.impact && (
                          <Badge variant={rec.metadata.impact === 'high' ? 'default' : 'secondary'}>
                            {rec.metadata.impact}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rec.rationale}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recommendations yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/optimizations')}
                      className="mt-2"
                    >
                      Generate Recommendations
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Most Cited Domains Card */}
            <MostCitedDomains orgId={orgData?.organizations?.id} brandId={selectedBrand?.id} />

            {/* Content Studio Card */}
            <ContentStudioCard brandId={selectedBrand?.id} />
          </div>

          {/* Admin Panel for Test Users */}
          {user?.email?.includes('@test.app') && (
            <AdminDiagnosticPanel />
          )}
        </div>
      </div>
    </Layout>
    </DashboardLayout>
  );
}