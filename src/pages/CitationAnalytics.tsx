import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Link2, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Award, 
  Target,
  ArrowRight,
  Building2,
  FileText,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OwnedCitation {
  citation_url: string;
  citation_domain: string;
  citation_title: string;
  content_type: string;
  total_mentions: number;
  unique_prompts: number;
  avg_brand_visibility_score: number;
  brand_present_rate: number;
  is_own_domain: boolean;
  providers: string[];
  first_cited: string;
  last_cited: string;
}

interface CompetitorCitation {
  citation_url: string;
  citation_domain: string;
  citation_title: string;
  total_mentions: number;
  unique_prompts: number;
  providers: string[];
}

export default function CitationAnalytics() {
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const { selectedBrand } = useBrand();
  const brandId = selectedBrand?.id || null;
  const days = Number(timeRange);

  // Fetch all citation data
  const { data: citationData, isLoading, error: queryError } = useQuery({
    queryKey: ['citation-analytics-unified', days, brandId],
    queryFn: async () => {
      // Build params object - only include p_brand_id if it has a value
      const params: { p_days: number; p_limit: number; p_brand_id?: string } = {
        p_days: days,
        p_limit: 200,
      };
      
      if (brandId) {
        params.p_brand_id = brandId;
      }
      
      const { data, error } = await supabase.rpc('get_citation_performance_insights', params as any);

      if (error) throw error;
      
      const allCitations = data as OwnedCitation[];
      const ownedCitations = allCitations.filter(c => c.is_own_domain);
      const competitorCitations = allCitations.filter(c => !c.is_own_domain);
      
      // Calculate summary stats
      const totalOwnedCitations = ownedCitations.reduce((sum, c) => sum + c.total_mentions, 0);
      const totalCompetitorCitations = competitorCitations.reduce((sum, c) => sum + c.total_mentions, 0);
      const uniqueOwnedPages = ownedCitations.length;
      
      // Group competitor citations by domain for competitive view
      const competitorDomains = competitorCitations.reduce((acc, c) => {
        if (!acc[c.citation_domain]) {
          acc[c.citation_domain] = {
            domain: c.citation_domain,
            totalCitations: 0,
            pages: [],
          };
        }
        acc[c.citation_domain].totalCitations += c.total_mentions;
        acc[c.citation_domain].pages.push(c);
        return acc;
      }, {} as Record<string, { domain: string; totalCitations: number; pages: CompetitorCitation[] }>);
      
      const topCompetitorDomains = Object.values(competitorDomains)
        .sort((a, b) => b.totalCitations - a.totalCitations)
        .slice(0, 10);

      return {
        ownedCitations,
        competitorCitations,
        topCompetitorDomains,
        stats: {
          totalOwnedCitations,
          totalCompetitorCitations,
          uniqueOwnedPages,
          uniqueCompetitorPages: competitorCitations.length,
          citationShare: totalOwnedCitations + totalCompetitorCitations > 0 
            ? Math.round((totalOwnedCitations / (totalOwnedCitations + totalCompetitorCitations)) * 100)
            : 0,
        }
      };
    },
  });

  const getProviderBadge = (provider: string) => {
    const colors: Record<string, string> = {
      'openai': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      'anthropic': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'google': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'perplexity': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    };
    return colors[provider.toLowerCase()] || 'bg-muted text-muted-foreground';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  const { ownedCitations, topCompetitorDomains, stats } = citationData || {
    ownedCitations: [],
    topCompetitorDomains: [],
    stats: { totalOwnedCitations: 0, totalCompetitorCitations: 0, uniqueOwnedPages: 0, uniqueCompetitorPages: 0, citationShare: 0 }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Link2 className="h-8 w-8 text-primary" />
              Citation Intelligence
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              See which of your pages AI models are citing as sources. When AI cites your content, 
              it signals trust and authority in your expertise.
            </p>
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics - Simple & Clear */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Your Pages Cited
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{stats.uniqueOwnedPages}</div>
              <p className="text-sm text-muted-foreground mt-1">
                unique pages from your domain
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Times Cited
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalOwnedCitations}</div>
              <p className="text-sm text-muted-foreground mt-1">
                in the last {days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Citation Share
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Percentage of all citations that come from your domain vs competitor domains</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.citationShare}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                of citations are yours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="your-content" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="your-content" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Your Cited Pages
            </TabsTrigger>
            <TabsTrigger value="competitors" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Competitor Sources
            </TabsTrigger>
          </TabsList>

          {/* Your Cited Content Tab */}
          <TabsContent value="your-content" className="space-y-6">
            {ownedCitations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No citations found yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    AI models haven't cited your content in the last {days} days. 
                    Create authoritative, well-structured content to increase your chances of being cited.
                  </p>
                  <Button variant="outline">
                    View Content Recommendations
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Pages AI Models Are Citing From Your Domain
                  </CardTitle>
                  <CardDescription>
                    These pages are being referenced as trusted sources by AI. This is a strong signal of content authority.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ownedCitations.map((citation, idx) => (
                      <div 
                        key={citation.citation_url}
                        className="group border border-primary/20 bg-primary/5 rounded-lg p-4 hover:bg-primary/10 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Page Title & URL */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                #{idx + 1}
                              </span>
                              <h3 className="font-semibold truncate">
                                {citation.citation_title || 'Untitled Page'}
                              </h3>
                              {citation.total_mentions >= 5 && (
                                <Badge variant="secondary" className="shrink-0">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Top Performer
                                </Badge>
                              )}
                            </div>
                            
                            <a
                              href={citation.citation_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-3 truncate"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {citation.citation_url}
                            </a>

                            {/* Stats Row */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Cited </span>
                                <span className="font-semibold text-foreground">{citation.total_mentions} times</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">In </span>
                                <span className="font-semibold text-foreground">{citation.unique_prompts} prompts</span>
                              </div>
                              {citation.last_cited && (
                                <div>
                                  <span className="text-muted-foreground">Last cited </span>
                                  <span className="font-semibold text-foreground">
                                    {format(new Date(citation.last_cited), 'MMM d')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* AI Models */}
                            {citation.providers && citation.providers.length > 0 && (
                              <div className="flex gap-1.5 mt-3">
                                {citation.providers.map((provider) => (
                                  <Badge 
                                    key={provider} 
                                    variant="outline" 
                                    className={`text-xs ${getProviderBadge(provider)}`}
                                  >
                                    {provider}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Competitor Sources Tab */}
          <TabsContent value="competitors" className="space-y-6">
            {topCompetitorDomains.length === 0 ? (
              <Alert>
                <AlertTitle>No competitor citations found</AlertTitle>
                <AlertDescription>
                  No competitor content was cited in AI responses during this period.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <Target className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-700">Opportunity Analysis</AlertTitle>
                  <AlertDescription className="text-amber-600/80">
                    These are domains being cited instead of yours. Analyze their content 
                    to understand what makes it citation-worthy and how you can create better alternatives.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Competitor Domains Being Cited</CardTitle>
                    <CardDescription>
                      Domains that AI models are citing when answering questions in your space
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topCompetitorDomains.map((competitor, idx) => (
                        <div
                          key={competitor.domain}
                          className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                                  #{idx + 1}
                                </span>
                                <h3 className="font-semibold">{competitor.domain}</h3>
                                <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                                  {competitor.totalCitations} citations
                                </Badge>
                              </div>
                              
                              {/* Top cited pages from this competitor */}
                              <div className="mt-3 space-y-1.5">
                                <p className="text-xs text-muted-foreground font-medium">
                                  Most cited pages ({competitor.pages.length} total):
                                </p>
                                {competitor.pages.slice(0, 3).map((page) => (
                                  <a
                                    key={page.citation_url}
                                    href={page.citation_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate pl-2 border-l-2 border-muted"
                                  >
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{page.citation_title || page.citation_url}</span>
                                    <span className="text-muted-foreground shrink-0">({page.total_mentions}x)</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Understanding Section */}
        <Card className="border-muted bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Understanding Citation Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">What are citations?</strong> When AI models like ChatGPT, Claude, or Perplexity 
              answer questions, they often reference specific web pages as sources. These are citations.
            </p>
            <p>
              <strong className="text-foreground">Why do citations matter?</strong> Being cited by AI indicates your content is 
              trusted and authoritative. As more people use AI assistants, being a cited source drives visibility and traffic.
            </p>
            <p>
              <strong className="text-foreground">How to improve?</strong> Create comprehensive, well-structured content that 
              directly answers common questions in your industry. Use clear headings, include data, and keep content up-to-date.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
