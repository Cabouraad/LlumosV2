import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  FileText,
  Eye,
  Settings2,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Target,
  Zap,
  Link2,
  Lightbulb,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import type { ReportPreviewData } from '@/types/reports';

interface ReportSection {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: ReportPreviewData | null;
  loading: boolean;
  onGenerate: (sections: Record<string, boolean>) => void;
  generating: boolean;
  brandName?: string;
  dateRange: { from: string; to: string };
}

export function ReportPreviewModal({
  open,
  onOpenChange,
  previewData,
  loading,
  onGenerate,
  generating,
  brandName,
  dateRange,
}: ReportPreviewModalProps) {
  const [sections, setSections] = useState<Record<string, boolean>>({
    executive_summary: true,
    visibility_overview: true,
    competitor_analysis: true,
    provider_performance: true,
    prompt_performance: true,
    citations_sources: true,
    recommendations: true,
  });

  const sectionConfig: ReportSection[] = [
    {
      id: 'executive_summary',
      label: 'Executive Summary',
      description: 'High-level KPIs and key insights',
      icon: <FileText className="h-4 w-4" />,
      enabled: sections.executive_summary,
    },
    {
      id: 'visibility_overview',
      label: 'Visibility Overview',
      description: 'Brand presence rates and score trends',
      icon: <TrendingUp className="h-4 w-4" />,
      enabled: sections.visibility_overview,
    },
    {
      id: 'competitor_analysis',
      label: 'Competitor Analysis',
      description: 'Top competitors and share of voice',
      icon: <Users className="h-4 w-4" />,
      enabled: sections.competitor_analysis,
    },
    {
      id: 'provider_performance',
      label: 'Provider Performance',
      description: 'Performance by AI platform (ChatGPT, Gemini, etc.)',
      icon: <BarChart3 className="h-4 w-4" />,
      enabled: sections.provider_performance,
    },
    {
      id: 'prompt_performance',
      label: 'Prompt Performance',
      description: 'Top and low-performing prompts',
      icon: <Target className="h-4 w-4" />,
      enabled: sections.prompt_performance,
    },
    {
      id: 'citations_sources',
      label: 'Citations & Sources',
      description: 'Citation domains and validation rates',
      icon: <Link2 className="h-4 w-4" />,
      enabled: sections.citations_sources,
    },
    {
      id: 'recommendations',
      label: 'Recommendations',
      description: 'Action items and optimization suggestions',
      icon: <Lightbulb className="h-4 w-4" />,
      enabled: sections.recommendations,
    },
  ];

  const toggleSection = (id: string) => {
    setSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const enabledCount = Object.values(sections).filter(Boolean).length;

  const hasData = previewData && (previewData.totalResponses > 0 || previewData.totalPrompts > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Visibility Report
            {brandName && (
              <Badge variant="secondary" className="ml-2">
                {brandName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Customize Sections ({enabledCount}/7)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <ScrollArea className="h-[60vh]">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-5 bg-muted rounded w-1/3" />
                      </CardHeader>
                      <CardContent>
                        <div className="h-20 bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !previewData ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      Unable to load preview data. Try selecting a different date range.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Report Header Preview */}
                  <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold">Weekly Visibility Report</h3>
                          <p className="text-muted-foreground mt-1">
                            {brandName || 'Your Brand'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {dateRange.from} → {dateRange.to}
                          </div>
                        </div>
                        <Badge variant={hasData ? 'default' : 'secondary'}>
                          {hasData ? 'Data Available' : 'Limited Data'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section Previews */}
                  {sections.executive_summary && (
                    <ReportSectionPreview
                      title="Executive Summary"
                      icon={<FileText className="h-4 w-4" />}
                      hasData={hasData}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                          label="Brand Score"
                          value={previewData.overallScore?.toFixed(1) || '0.0'}
                          trend={previewData.scoreTrend}
                        />
                        <MetricCard
                          label="Presence Rate"
                          value={`${previewData.brandPresenceRate?.toFixed(1) || '0.0'}%`}
                          trend={previewData.presenceTrend}
                        />
                        <MetricCard
                          label="Active Prompts"
                          value={previewData.totalPrompts?.toString() || '0'}
                        />
                        <MetricCard
                          label="AI Responses"
                          value={previewData.totalResponses?.toString() || '0'}
                        />
                      </div>
                    </ReportSectionPreview>
                  )}

                  {sections.visibility_overview && (
                    <ReportSectionPreview
                      title="Visibility Overview"
                      icon={<TrendingUp className="h-4 w-4" />}
                      hasData={(previewData.totalResponses || 0) > 0}
                    >
                      <p className="text-sm text-muted-foreground">
                        Weekly visibility trends and performance metrics across all AI platforms.
                      </p>
                    </ReportSectionPreview>
                  )}

                  {sections.competitor_analysis && (
                    <ReportSectionPreview
                      title="Competitor Analysis"
                      icon={<Users className="h-4 w-4" />}
                      hasData={(previewData.competitorCount || 0) > 0}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-primary">
                          {previewData.competitorCount || 0}
                        </div>
                        <span className="text-muted-foreground">competitors detected</span>
                      </div>
                    </ReportSectionPreview>
                  )}

                  {sections.provider_performance && (
                    <ReportSectionPreview
                      title="Provider Performance"
                      icon={<BarChart3 className="h-4 w-4" />}
                      hasData={(previewData.providerCount || 0) > 0}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-primary">
                          {previewData.providerCount || 0}
                        </div>
                        <span className="text-muted-foreground">AI platforms analyzed</span>
                      </div>
                    </ReportSectionPreview>
                  )}

                  {sections.prompt_performance && (
                    <ReportSectionPreview
                      title="Prompt Performance"
                      icon={<Target className="h-4 w-4" />}
                      hasData={(previewData.totalPrompts || 0) > 0}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-primary">
                          {previewData.totalPrompts || 0}
                        </div>
                        <span className="text-muted-foreground">prompts analyzed</span>
                      </div>
                    </ReportSectionPreview>
                  )}

                  {sections.citations_sources && (
                    <ReportSectionPreview
                      title="Citations & Sources"
                      icon={<Link2 className="h-4 w-4" />}
                      hasData={(previewData.citationCount || 0) > 0}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-primary">
                          {previewData.citationCount || 0}
                        </div>
                        <span className="text-muted-foreground">citations found</span>
                      </div>
                    </ReportSectionPreview>
                  )}

                  {sections.recommendations && (
                    <ReportSectionPreview
                      title="Recommendations"
                      icon={<Lightbulb className="h-4 w-4" />}
                      hasData={(previewData.recommendationCount || 0) > 0}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-primary">
                          {previewData.recommendationCount || 0}
                        </div>
                        <span className="text-muted-foreground">action items</span>
                      </div>
                    </ReportSectionPreview>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sections" className="mt-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-3 pr-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Toggle sections on or off to customize your report. Disabled sections will not appear in the final PDF.
                </p>
                {sectionConfig.map((section) => (
                  <Card
                    key={section.id}
                    className={`transition-all ${
                      section.enabled ? 'border-primary/50 bg-primary/5' : 'opacity-60'
                    }`}
                  >
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            section.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          {section.icon}
                        </div>
                        <div>
                          <Label htmlFor={section.id} className="font-medium cursor-pointer">
                            {section.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{section.description}</p>
                        </div>
                      </div>
                      <Switch
                        id={section.id}
                        checked={section.enabled}
                        onCheckedChange={() => toggleSection(section.id)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator />

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {enabledCount} section{enabledCount !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
              Cancel
            </Button>
            <Button
              onClick={() => onGenerate(sections)}
              disabled={generating || enabledCount === 0}
              className="min-w-[140px]"
            >
              {generating ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportSectionPreview({
  title,
  icon,
  children,
  hasData,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hasData: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
          {!hasData && (
            <Badge variant="outline" className="ml-auto text-xs">
              No data for this period
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground italic">
            This section will show placeholder content indicating no data is available for the selected period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: number;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">{value}</span>
        {trend !== undefined && (
          <Badge
            variant={trend >= 0 ? 'default' : 'destructive'}
            className="text-xs"
          >
            {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {trend >= 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </Badge>
        )}
      </div>
    </div>
  );
}
