import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, TrendingUp, Award, FileText, Video, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OwnedCitationsProps {
  days: number;
  brandId?: string | null;
}

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

export function OwnedCitations({ days, brandId }: OwnedCitationsProps) {
  const { data: allCitations, isLoading } = useQuery({
    queryKey: ['citation-performance-owned', days, brandId],
    queryFn: async () => {
      const params: { p_days: number; p_limit: number; p_brand_id?: string } = {
        p_days: days,
        p_limit: 200,
      };
      
      if (brandId) {
        params.p_brand_id = brandId;
      }
      
      const { data, error } = await supabase.rpc('get_citation_performance_insights', params as any);

      if (error) throw error;
      return (data as OwnedCitation[]).filter(c => c.is_own_domain);
    },
  });

  const getContentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!allCitations || allCitations.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No owned citations yet</AlertTitle>
        <AlertDescription>
          AI models haven't cited your content in the selected time period. Create high-quality, authoritative content to increase your citation rate.
        </AlertDescription>
      </Alert>
    );
  }

  const totalCitations = allCitations.reduce((sum, c) => sum + c.total_mentions, 0);
  const avgVisibility = allCitations.length > 0
    ? allCitations.reduce((sum, c) => sum + Number(c.avg_brand_visibility_score), 0) / allCitations.length
    : 0;
  const avgBrandPresence = allCitations.length > 0
    ? allCitations.reduce((sum, c) => sum + Number(c.brand_present_rate), 0) / allCitations.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Your Pages Cited
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of unique pages from your domain being cited by AI models</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allCitations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">unique URLs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Citations
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total number of times your content has been cited across all AI responses</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCitations}</div>
            <p className="text-xs text-muted-foreground mt-1">in last {days} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Avg Visibility Score
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>How prominently your brand appears when your content is cited. Higher scores mean your brand gets mentioned earlier and more clearly.</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgVisibility.toFixed(1)}/10</div>
            <p className="text-xs text-muted-foreground mt-1">when cited</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Brand Mention Rate
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>Percentage of responses that mention your brand when your content is cited</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgBrandPresence.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">average</p>
          </CardContent>
        </Card>
      </div>

      {/* Your Content List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Your Cited Content
          </CardTitle>
          <CardDescription>
            Pages from your domain that AI models are citing - these are your content wins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allCitations.map((citation) => (
            <div
              key={citation.citation_url}
              className="border border-primary/20 bg-primary/5 rounded-lg p-4 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getContentIcon(citation.content_type)}
                    <h3 className="font-semibold truncate">
                      {citation.citation_title || citation.citation_domain}
                    </h3>
                    {citation.total_mentions >= 5 && (
                      <Badge variant="default" className="gap-1">
                        <TrendingUp className="h-3 w-3" /> Top Performer
                      </Badge>
                    )}
                  </div>
                  <a
                    href={citation.citation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary truncate block mb-3"
                  >
                    {citation.citation_url}
                  </a>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Citations</div>
                      <div className="font-semibold">{citation.total_mentions}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Visibility</div>
                      <div className="font-semibold">{Number(citation.avg_brand_visibility_score).toFixed(1)}/10</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Brand Mentions</div>
                      <div className="font-semibold">{Number(citation.brand_present_rate).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Prompts</div>
                      <div className="font-semibold">{citation.unique_prompts}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Last Cited</div>
                      <div className="font-semibold">
                        {citation.last_cited ? format(new Date(citation.last_cited), 'MMM d') : 'N/A'}
                      </div>
                    </div>
                  </div>
                  {citation.providers && citation.providers.length > 0 && (
                    <div className="flex gap-1 mt-3">
                      {citation.providers.map((provider) => (
                        <Badge key={provider} variant="secondary" className="text-xs">
                          {provider}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
