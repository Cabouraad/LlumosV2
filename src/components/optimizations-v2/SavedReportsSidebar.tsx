import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ExternalLink, Sparkles } from 'lucide-react';
import { listRecentVisibilityReports } from '@/features/visibility-reports/api';
import { formatDistanceToNow } from 'date-fns';

export function SavedReportsSidebar() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['visibility-reports', 'recent'],
    queryFn: () => listRecentVisibilityReports(10),
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-cyan-500" />
          AI Visibility Reports
        </CardTitle>
        <CardDescription>Your most recent saved reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : !reports || reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved reports yet. Reports generated for your brand will appear here.
          </p>
        ) : (
          reports.map((r, idx) => {
            const isLatest = idx === 0;
            return (
              <div
                key={r.id}
                className={`rounded-lg border p-3 transition ${
                  isLatest ? 'border-primary/60 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{r.brand_name || r.domain}</p>
                      {isLatest && (
                        <Badge className="gap-1" variant="default">
                          <Sparkles className="h-3 w-3" /> Latest
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.domain}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      {' • '}
                      Score {r.overall_score} • {r.prompts_run} prompts
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold leading-none">{r.overall_score}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      / 100
                    </div>
                  </div>
                </div>
                {r.pdf_url ? (
                  <Button
                    asChild
                    size="sm"
                    variant={isLatest ? 'default' : 'outline'}
                    className="w-full mt-3 gap-2"
                  >
                    <a href={r.pdf_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open PDF
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3">PDF not available</p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
