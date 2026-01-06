/**
 * Local Authority Results Dashboard
 * Displays scores, highlights, competitors, and recommendations
 */

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy, MapPin, Eye, Building2, Users,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  RefreshCw, Clock, ExternalLink, Sparkles, Target, FileText
} from 'lucide-react';
import type { LocalAuthorityScore, ActionRecommendation, LocalAuthorityRun, LocalProfile } from '@/types/local-authority';

interface LocalAuthorityResultsProps {
  profile: LocalProfile | null;
  run: LocalAuthorityRun | null;
  score: LocalAuthorityScore | null;
  highlights: Array<{ type: string; text: string }>;
  top_competitors: Array<{ name: string; mention_rate: number }>;
  sample_responses: Array<{ layer: string; prompt_text: string; model: string; snippet: string; citations?: any[] }>;
  confidence: { level: 'high' | 'medium' | 'low'; reasons: string[] };
  cached: boolean;
  onRerun: (force?: boolean) => void;
  isRerunning: boolean;
}

const scoreLabels: Record<string, { label: string; icon: React.ElementType }> = {
  geo: { label: 'Geo Presence', icon: MapPin },
  implicit: { label: 'Implicit Recall', icon: Eye },
  association: { label: 'Entity Association', icon: Building2 },
  sov: { label: 'Share of Voice', icon: Users },
};

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'Strong';
  if (score >= 40) return 'Moderate';
  return 'Weak';
}

function getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'bg-green-100 text-green-700 border-green-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low': return 'bg-red-100 text-red-700 border-red-200';
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function LocalAuthorityResults({
  profile,
  run,
  score,
  highlights,
  top_competitors,
  sample_responses,
  confidence,
  cached,
  onRerun,
  isRerunning,
}: LocalAuthorityResultsProps) {
  if (!score) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No score data available</p>
      </div>
    );
  }

  const recommendations = (score.recommendations || []) as ActionRecommendation[];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header with Total Score */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Total Score Card */}
        <Card className="flex-shrink-0 w-full md:w-auto">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className={`text-5xl font-bold ${getScoreColor(score.score_total)}`}>
                  {score.score_total}
                </div>
                <div className="text-sm text-muted-foreground text-center">/100</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Local AI Authority</span>
                </div>
                <Badge className={`mt-1 ${getScoreColor(score.score_total)}`}>
                  {getScoreLabel(score.score_total)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sub-scores */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(scoreLabels).map(([key, { label, icon: Icon }]) => {
            const value = score[`score_${key}` as keyof LocalAuthorityScore] as number;
            return (
              <Card key={key}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${getScoreColor(value * 4)}`}>
                      {value}
                    </span>
                    <span className="text-xs text-muted-foreground">/25</span>
                  </div>
                  <Progress value={(value / 25) * 100} className="h-1 mt-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cached indicator & Rerun */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {cached && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              Cached Results
            </Badge>
          )}
          <Badge variant="outline" className={getConfidenceColor(confidence.level)}>
            {confidence.level.charAt(0).toUpperCase() + confidence.level.slice(1)} Confidence
          </Badge>
        </div>
        <div className="flex gap-2">
          {cached && (
            <Button variant="outline" size="sm" onClick={() => onRerun(true)} disabled={isRerunning}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isRerunning ? 'animate-spin' : ''}`} />
              Force Re-run
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onRerun(false)} disabled={isRerunning}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isRerunning ? 'animate-spin' : ''}`} />
            Re-run Scan
          </Button>
        </div>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="highlights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="highlights">Highlights</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="samples">Samples</TabsTrigger>
          <TabsTrigger value="actions">Action Plan</TabsTrigger>
        </TabsList>

        {/* Highlights Tab */}
        <TabsContent value="highlights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                What AI is saying about your business
              </CardTitle>
            </CardHeader>
            <CardContent>
              {highlights.length > 0 ? (
                <div className="space-y-3">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      {h.type === 'brand_present' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : h.type === 'competitor_top' ? (
                        <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      )}
                      <span>{h.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No highlights available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competitors Tab */}
        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top Competitors in AI Responses
              </CardTitle>
              <CardDescription>
                Businesses mentioned most frequently alongside your search queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {top_competitors.length > 0 ? (
                <div className="space-y-3">
                  {top_competitors.map((comp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </span>
                        <span className="font-medium">{comp.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={comp.mention_rate * 100} className="w-20 h-2" />
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {Math.round(comp.mention_rate * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No competitor data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sample Responses Tab */}
        <TabsContent value="samples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Sample AI Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sample_responses.length > 0 ? (
                <div className="space-y-4">
                  {sample_responses.slice(0, 5).map((sample, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{sample.layer}</Badge>
                        <Badge variant="secondary">{sample.model}</Badge>
                      </div>
                      <p className="text-sm font-medium mb-2">"{sample.prompt_text}"</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {sample.snippet}
                      </p>
                      {sample.citations && sample.citations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sample.citations.slice(0, 3).map((cit: any, j: number) => (
                            <a
                              key={j}
                              href={cit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              {cit.title || 'Citation'}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No sample responses available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Plan Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Recommended Actions
              </CardTitle>
              <CardDescription>
                Steps to improve your Local AI Authority Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                            >
                              {rec.priority} priority
                            </Badge>
                            <Badge variant="outline">{rec.category}</Badge>
                          </div>
                          <h4 className="font-medium">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {rec.description}
                          </p>
                        </div>
                        {rec.impact_score && (
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-muted-foreground">Impact</div>
                            <div className="font-semibold text-primary">+{rec.impact_score}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recommendations available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
