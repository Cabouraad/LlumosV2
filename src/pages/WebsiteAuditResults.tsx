import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Sparkles, FileText, MessageSquare, TrendingUp, ExternalLink } from 'lucide-react';
import { useAudit, useAuditChecks, useAuditPages } from '@/features/website-audit/hooks';
import { ScoreGauge } from '@/features/website-audit/components/ScoreGauge';
import { ModuleCard } from '@/features/website-audit/components/ModuleCard';
import { CheckRow } from '@/features/website-audit/components/CheckRow';
import { MODULE_LABELS, AuditCheck } from '@/features/website-audit/types';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { format } from 'date-fns';

export default function WebsiteAuditResults() {
  const { auditId } = useParams<{ auditId: string }>();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  
  const { data: audit, isLoading: auditLoading } = useAudit(auditId);
  const { data: checks = [], isLoading: checksLoading } = useAuditChecks(auditId);
  const { data: pages = [] } = useAuditPages(auditId);

  const isLoading = auditLoading || checksLoading;

  // Group checks by module
  const checksByModule = checks.reduce((acc, check) => {
    if (!acc[check.module]) acc[check.module] = [];
    acc[check.module].push(check);
    return acc;
  }, {} as Record<string, AuditCheck[]>);

  // Get top fixes (failed/warned, sorted by impact/effort)
  const getTopFixes = () => {
    const impactScore = { high: 3, medium: 2, low: 1 };
    const effortScore = { low: 3, medium: 2, high: 1 };
    
    return checks
      .filter(c => c.status !== 'pass' && c.fix)
      .sort((a, b) => {
        const aScore = (impactScore[a.impact || 'low']) * (effortScore[a.effort || 'high']);
        const bScore = (impactScore[b.impact || 'low']) * (effortScore[b.effort || 'high']);
        return bScore - aScore;
      })
      .slice(0, 7);
  };

  const topFixes = getTopFixes();

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="container py-8 max-w-6xl">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid md:grid-cols-[200px_1fr] gap-8">
            <Skeleton className="h-48 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  if (!audit) {
    return (
      <MarketingLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Audit Not Found</h1>
          <p className="text-muted-foreground mb-8">
            This audit may have expired or doesn't exist.
          </p>
          <Button asChild>
            <Link to="/audit">Run a New Audit</Link>
          </Button>
        </div>
      </MarketingLayout>
    );
  }

  const getScoreSummary = (score: number) => {
    if (score >= 80) return "Your website is well-optimized for search engines and AI.";
    if (score >= 60) return "Good foundation, but there's room for improvement.";
    if (score >= 40) return "Several issues need attention to improve visibility.";
    return "Significant work needed to improve your online presence.";
  };

  return (
    <MarketingLayout>
      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/audit">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{audit.domain}</h1>
            <p className="text-sm text-muted-foreground">
              Audited {format(new Date(audit.created_at), 'MMM d, yyyy')} • {pages.length} pages crawled
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Score and Summary */}
        <div className="grid md:grid-cols-[200px_1fr] gap-8 mb-8">
          <Card className="flex flex-col items-center justify-center p-6">
            <ScoreGauge score={audit.overall_score || 0} size="lg" />
            <p className="text-sm text-muted-foreground mt-2">Overall Score</p>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Summary</h2>
            <p className="text-muted-foreground mb-4">
              {getScoreSummary(audit.overall_score || 0)}
            </p>
            
            {/* Module scores grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(audit.module_scores || {}).map(([module, score]) => (
                <div 
                  key={module}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium">{MODULE_LABELS[module]}</span>
                  <span className={`font-bold ${
                    score >= 80 ? 'text-green-600' :
                    score >= 60 ? 'text-yellow-600' :
                    score >= 40 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {score}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* CTA Card */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Fix These Issues with Llumos
            </CardTitle>
            <CardDescription>
              Improve your AI visibility with our automated tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/signup">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate llms.txt
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/signup">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Create Brand Q&A
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/signup">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Track AI Visibility
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="top-fixes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="top-fixes">
              Top Fixes ({topFixes.length})
            </TabsTrigger>
            <TabsTrigger value="all-checks">
              All Checks ({checks.length})
            </TabsTrigger>
            <TabsTrigger value="evidence">
              Pages Crawled ({pages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="top-fixes" className="space-y-4">
            <p className="text-muted-foreground">
              These fixes are prioritized by impact (how much they'll help) and effort (how easy they are to implement).
            </p>
            {topFixes.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-lg font-medium text-green-600">🎉 No critical fixes needed!</p>
                <p className="text-muted-foreground">Your site is in great shape.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {topFixes.map((check) => (
                  <CheckRow key={check.id} check={check} showModule pages={pages} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-checks" className="space-y-6">
            {selectedModule ? (
              <div className="space-y-4">
                <Button variant="ghost" onClick={() => setSelectedModule(null)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Modules
                </Button>
                <h3 className="text-xl font-semibold">{MODULE_LABELS[selectedModule]}</h3>
                <div className="space-y-3">
                  {checksByModule[selectedModule]?.map((check) => (
                    <CheckRow key={check.id} check={check} pages={pages} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(audit.module_scores || {}).map(([module, score]) => (
                  <ModuleCard
                    key={module}
                    module={module}
                    score={score}
                    checks={checksByModule[module] || []}
                    onClick={() => setSelectedModule(module)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="evidence" className="space-y-4">
            <p className="text-muted-foreground">
              These are the pages we crawled to generate your audit.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">URL</th>
                    <th className="text-left p-3 text-sm font-medium">Title</th>
                    <th className="text-center p-3 text-sm font-medium">Status</th>
                    <th className="text-center p-3 text-sm font-medium">Words</th>
                    <th className="text-center p-3 text-sm font-medium">Schema</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr key={page.id} className="border-t">
                      <td className="p-3 text-sm">
                        <a 
                          href={page.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline truncate max-w-[200px]"
                        >
                          {new URL(page.url).pathname || '/'}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="p-3 text-sm truncate max-w-[200px]">
                        {page.title || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          page.status === 200 ? 'bg-green-100 text-green-700' :
                          page.status >= 400 ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {page.status}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm">
                        {page.word_count}
                      </td>
                      <td className="p-3 text-center">
                        {page.has_schema ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MarketingLayout>
  );
}
