import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompetitorChip } from '@/components/CompetitorChip';
import { Users, TrendingUp, Hash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CompetitorData {
  name: string;
  mentions: number;
  providers: string[];
  avgScore?: number;
}

interface PromptCompetitorsTabProps {
  promptDetails: any[] | null;
  isLoading?: boolean;
}

function PromptCompetitorsTabComponent({ promptDetails, isLoading }: PromptCompetitorsTabProps) {
  // Aggregate competitors from all provider responses
  const competitorData = useMemo(() => {
    if (!promptDetails || promptDetails.length === 0) return [];

    const competitorMap = new Map<string, CompetitorData>();

    promptDetails.forEach((response) => {
      const competitors = response.competitors_json || [];
      const provider = response.provider || 'unknown';
      const score = response.score || 0;

      competitors.forEach((competitor: any) => {
        const name = typeof competitor === 'string' ? competitor : competitor.name || competitor;
        if (!name || typeof name !== 'string') return;

        const normalizedName = name.trim();
        if (!normalizedName) return;

        const existing = competitorMap.get(normalizedName.toLowerCase());
        if (existing) {
          existing.mentions += 1;
          if (!existing.providers.includes(provider)) {
            existing.providers.push(provider);
          }
          existing.avgScore = ((existing.avgScore || 0) * (existing.mentions - 1) + score) / existing.mentions;
        } else {
          competitorMap.set(normalizedName.toLowerCase(), {
            name: normalizedName,
            mentions: 1,
            providers: [provider],
            avgScore: score,
          });
        }
      });
    });

    return Array.from(competitorMap.values())
      .sort((a, b) => b.mentions - a.mentions);
  }, [promptDetails]);

  const totalMentions = competitorData.reduce((sum, c) => sum + c.mentions, 0);
  const uniqueCompetitors = competitorData.length;
  const avgProvidersPerCompetitor = uniqueCompetitors > 0
    ? (competitorData.reduce((sum, c) => sum + c.providers.length, 0) / uniqueCompetitors).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (competitorData.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Competitors Detected</h3>
          <p className="text-muted-foreground">
            No competitor brands have been detected in the AI responses for this prompt yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">Unique Competitors</span>
            </div>
            <p className="text-3xl font-bold text-amber-500">{uniqueCompetitors}</p>
            <p className="text-xs text-muted-foreground mt-1">Brands detected</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Hash className="h-4 w-4" />
              <span className="text-sm">Total Mentions</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalMentions}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all responses</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Avg Providers</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{avgProvidersPerCompetitor}</p>
            <p className="text-xs text-muted-foreground mt-1">Per competitor</p>
          </CardContent>
        </Card>
      </div>

      {/* Competitor List */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Competitors by Frequency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {competitorData.map((competitor, index) => (
              <div
                key={competitor.name}
                className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/30 hover:border-border/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <CompetitorChip name={competitor.name} size="sm" />
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {competitor.mentions} mention{competitor.mentions !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((competitor.mentions / totalMentions) * 100).toFixed(1)}% share
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {competitor.providers.map((provider) => (
                      <Badge
                        key={provider}
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {provider}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const PromptCompetitorsTab = memo(PromptCompetitorsTabComponent);
