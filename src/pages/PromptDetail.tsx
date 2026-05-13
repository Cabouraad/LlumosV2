import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ProviderResponseCard } from '@/components/ProviderResponseCard';

import { PromptCitationsTable } from '@/components/citations/PromptCitationsTable';
import { PromptCompetitorsTab } from '@/components/prompts/PromptCompetitorsTab';
import { ScoreBreakdownTooltip } from '@/components/prompts/ScoreBreakdownTooltip';
import { OptimizePromptDialog } from '@/components/prompts/OptimizePromptDialog';
import { getAllowedProviders } from '@/lib/providers/tier-policy';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';
import { useBrand } from '@/contexts/BrandContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  TrendingUp, 
  Target, 
  Users,
  BarChart3,
  Globe,
  Sparkles
} from 'lucide-react';

const PROVIDERS = ['openai', 'gemini', 'perplexity', 'google_ai_overview', 'claude'] as const;

const normalizeProvider = (provider: string | null | undefined) => {
  if (!provider) return null;
  const normalized = provider.toLowerCase().trim();
  const providerMap: Record<string, string> = {
    perplexity_ai: 'perplexity',
    'perplexity ai': 'perplexity',
    google: 'google_ai_overview',
    google_aio: 'google_ai_overview',
    'google aio': 'google_ai_overview',
    googleaio: 'google_ai_overview',
  };
  return providerMap[normalized] || normalized;
};

const getProviderResponses = (providers: any): any[] => {
  const allResponses = providers?._allResponses;
  if (allResponses) {
    return Object.values(allResponses).flat().filter(Boolean) as any[];
  }

  return Object.entries(providers || {})
    .filter(([key]) => key !== '_allResponses')
    .flatMap(([, value]: any) => Array.isArray(value) ? value : (value ? [value] : []));
};

const getCompetitorName = (competitor: any) => {
  if (typeof competitor === 'string') return competitor;
  return competitor?.name || competitor?.brand || competitor?.company || null;
};

export default function PromptDetail() {
  const { promptId } = useParams<{ promptId: string }>();
  const navigate = useNavigate();
  const { orgData, ready, user } = useAuth();
  const { currentTier } = useSubscriptionGate();
  const { selectedBrand, isValidated: isBrandValidated } = useBrand();
  const brandId = selectedBrand?.id && selectedBrand.id !== 'null' ? selectedBrand.id : null;
  const orgId = orgData?.organizations?.id || orgData?.org_id || null;
  
  const [prompt, setPrompt] = useState<any>(null);
  const [promptDetails, setPromptDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Default to 30-day rolling history
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ 
    from: thirtyDaysAgo, 
    to: new Date() 
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);

  useEffect(() => {
    if (!ready || !isBrandValidated) return;
    if (!user || !promptId || !orgId || !brandId) {
      setLoading(false);
      return;
    }

    const fetchPromptData = async () => {
      try {
        setLoading(true);
        const endOfDay = dateRange.to ? new Date(dateRange.to) : new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const [promptResult, responsesResult] = await Promise.all([
          supabase
            .from('prompts')
            .select('*')
            .eq('id', promptId)
            .eq('org_id', orgId)
            .eq('brand_id', brandId)
            .maybeSingle(),
          supabase
            .from('prompt_provider_responses')
            .select('id, prompt_id, provider, model, status, run_at, raw_ai_response, error, metadata, score, org_brand_present, org_brand_prominence, competitors_count, competitors_json, brands_json, citations_json, token_in, token_out')
            .eq('prompt_id', promptId)
            .eq('org_id', orgId)
            .eq('brand_id', brandId)
            .in('status', ['success', 'completed'])
            .gte('run_at', (dateRange.from || thirtyDaysAgo).toISOString())
            .lte('run_at', endOfDay.toISOString())
            .order('run_at', { ascending: false })
            .limit(1000)
        ]);

        if (promptResult.error) throw promptResult.error;
        if (responsesResult.error) throw responsesResult.error;

        const finalPrompt = promptResult.data;
        const responses = (responsesResult.data || [])
          .map((response: any) => ({ ...response, provider: normalizeProvider(response.provider) || response.provider }))
          .filter((response: any) => response.provider);

        setPrompt(finalPrompt || null);

        if (!finalPrompt) {
          setPromptDetails(null);
          return;
        }

        const allResponsesByProvider = PROVIDERS.reduce((acc, provider) => {
          acc[provider] = responses.filter((response: any) => response.provider === provider);
          return acc;
        }, {} as Record<string, any[]>);

        const providerData = PROVIDERS.reduce((acc, provider) => {
          acc[provider] = allResponsesByProvider[provider][0] || null;
          return acc;
        }, {} as Record<string, any | null>);

        (providerData as any)._allResponses = allResponsesByProvider;

        const scores = responses
          .map((response: any) => Number(response.score))
          .filter((score: number) => Number.isFinite(score));

        setPromptDetails({
          promptId: finalPrompt.id,
          promptText: finalPrompt.text,
          active: finalPrompt.active,
          providers: providerData,
          overallScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
          lastRunAt: responses[0]?.run_at || null,
          sevenDayStats: {
            totalRuns: responses.length,
            avgScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
            brandPresenceRate: responses.length > 0
              ? (responses.filter((response: any) => response.org_brand_present).length / responses.length) * 100
              : 0,
          },
          competitors: [],
          dateRange: { from: dateRange.from || thirtyDaysAgo, to: dateRange.to || new Date() }
        });
      } catch (error) {
        console.error('Error fetching prompt details:', error);
        setPromptDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPromptData();
  }, [promptId, ready, user, orgId, isBrandValidated, dateRange.from, dateRange.to, brandId]);

  // Calculate metrics
  const metrics = (() => {
    if (!promptDetails?.providers) {
      return { avgScore: 0, totalRuns: 0, brandVisible: 0, totalCompetitors: 0 };
    }

    const providers = Object.values(promptDetails.providers);
    let totalScore = 0;
    let validScores = 0;
    let totalRuns = 0;
    let brandVisibleCount = 0;
    let competitorSet = new Set<string>();

    providers.forEach((providerVal: any) => {
      const responses = Array.isArray(providerVal) ? providerVal : (providerVal ? [providerVal] : []);
      
      responses.forEach((response: any) => {
        if (response?.status === 'completed' || response?.status === 'success') {
          totalRuns++;
          if (typeof response.score === 'number') {
            totalScore += response.score;
            validScores++;
          }
          if (response.org_brand_present) {
            brandVisibleCount++;
          }
          if (response.competitors_json) {
            const competitors = Array.isArray(response.competitors_json) 
              ? response.competitors_json 
              : [];
            competitors.forEach((comp: any) => {
              competitorSet.add(comp?.name || comp);
            });
          }
        }
      });
    });

    return {
      avgScore: validScores > 0 ? (totalScore / validScores) * 10 : 0,
      totalRuns,
      brandVisible: brandVisibleCount,
      totalCompetitors: competitorSet.size
    };
  })();

  const displayProviders = getAllowedProviders(currentTier as any);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!prompt) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Prompt not found</h2>
            <Button onClick={() => navigate('/prompts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Prompts
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/prompts')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Prompts
            </Button>
            <h1 className="text-2xl font-bold mb-2">{prompt.text}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {format(new Date(prompt.created_at), 'MMM d, yyyy')}
              </div>
              <span>•</span>
              <span>Showing 30-day rolling history</span>
              <Badge variant={prompt.active ? 'default' : 'secondary'}>
                {prompt.active ? 'Active' : 'Paused'}
              </Badge>
              {prompt.cluster_tag && (
                <Badge variant="outline">{prompt.cluster_tag}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setOptimizeDialogOpen(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Optimize
            </Button>
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onRangeChange={(from, to) => setDateRange({ from, to })}
            />
          </div>
        </div>

        {/* Optimize Dialog */}
        <OptimizePromptDialog
          promptId={promptId!}
          promptText={prompt.text}
          open={optimizeDialogOpen}
          onOpenChange={setOptimizeDialogOpen}
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Avg Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreBreakdownTooltip 
                providers={promptDetails?.providers || {}}
                avgScore={metrics.avgScore / 10}
              >
                <div className="text-3xl font-bold cursor-help">
                  {metrics.avgScore.toFixed(1)}
                </div>
              </ScoreBreakdownTooltip>
              <p className="text-xs text-muted-foreground mt-1">
                Out of 10
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Total Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalRuns}</div>
              <p className="text-xs text-muted-foreground mt-1">
                AI responses tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-success" />
                Brand Visible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {metrics.brandVisible}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mentions detected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-warning" />
                Competitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {metrics.totalCompetitors}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Unique brands seen
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="responses">AI Responses</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="citations">Citations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Provider Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Provider Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {displayProviders.map((provider) => {
                  const providerData = promptDetails?.providers?.[provider];
                  const responses = Array.isArray(providerData) ? providerData : (providerData ? [providerData] : []);
                  const latest = responses.find((r: any) => r?.status === 'completed' || r?.status === 'success');
                  
                  return (
                    <div key={provider} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">{provider}</div>
                        {latest && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              Score: {((latest.score || 0) * 10).toFixed(1)}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={latest.org_brand_present 
                                ? "text-xs bg-success/10 text-success border-success/20" 
                                : "text-xs bg-destructive/10 text-destructive border-destructive/20"
                              }
                            >
                              {latest.org_brand_present ? "Brand Present" : "Not Present"}
                            </Badge>
                          </>
                        )}
                      </div>
                      {latest && (
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(latest.run_at), 'MMM d, h:mm a')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="responses" className="space-y-4 mt-6">
            {displayProviders.map((provider) => {
              const providerData = promptDetails?.providers?.[provider];
              // Check if we have _allResponses from date filtering
              const allProviderResponses = (promptDetails?.providers as any)?._allResponses?.[provider];
              const responseData = allProviderResponses || (Array.isArray(providerData) ? providerData : (providerData ? [providerData] : null));
              
              return (
                <ProviderResponseCard
                  key={provider}
                  provider={provider}
                  response={responseData}
                  promptText={prompt.text}
                />
              );
            })}
          </TabsContent>

          <TabsContent value="competitors" className="mt-6">
            <PromptCompetitorsTab 
              promptDetails={promptDetails?.providers ? 
                Object.values(promptDetails.providers).flat().filter((r: any) => r?.status === 'completed' || r?.status === 'success') 
                : null
              }
              isLoading={loading}
            />
          </TabsContent>

          <TabsContent value="citations" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Cited Sources (Last 30 Days)</CardTitle>
                  <Badge variant="secondary">
                    {format(dateRange.from || thirtyDaysAgo, 'MMM d')} - {format(dateRange.to || new Date(), 'MMM d, yyyy')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <PromptCitationsTable promptId={promptId!} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
