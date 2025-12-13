import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Calendar, Building2, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';

interface SharedReportData {
  id: string;
  orgName: string;
  weekKey: string;
  periodStart: string;
  periodEnd: string;
  downloadUrl: string;
  expiresAt: string | null;
}

export default function SharedReport() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SharedReportData | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedReport();
    }
  }, [token]);

  const loadSharedReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('reports-share', {
        method: 'GET',
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // For GET requests, we need to call the function differently
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reports-share?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load report');
      }

      setReport(result.report);
    } catch (err) {
      console.error('Error loading shared report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (report?.downloadUrl) {
      window.open(report.downloadUrl, '_blank');
    }
  };

  const formatPeriod = (start: string, end: string) => {
    return `${format(new Date(start), 'MMM d, yyyy')} - ${format(new Date(end), 'MMM d, yyyy')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>Report Not Found | Llumos</title>
        </Helmet>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle>Report Unavailable</CardTitle>
                <CardDescription>{error}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              This report link may have expired or been revoked. Please contact the report owner for a new link.
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Llumos Homepage
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Weekly Report - {report.orgName} | Llumos</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">AI Visibility Report</h1>
                <p className="text-sm text-muted-foreground">Shared report from Llumos</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="ghost" size="sm">
                Powered by <span className="font-semibold ml-1">Llumos</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">Weekly Visibility Report</CardTitle>
                <CardDescription className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{report.orgName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatPeriod(report.periodStart, report.periodEnd)}</span>
                  </div>
                  {report.expiresAt && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        Link expires {format(new Date(report.expiresAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Download Section */}
              <div className="p-6 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium mb-1">Download Full Report</h3>
                    <p className="text-sm text-muted-foreground">
                      Get the complete PDF report with all visibility metrics and insights
                    </p>
                  </div>
                  <Button onClick={handleDownload} size="lg">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Info Section */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-card border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Report Period</div>
                  <div className="font-medium">{report.weekKey}</div>
                </div>
                <div className="p-4 bg-card border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Organization</div>
                  <div className="font-medium">{report.orgName}</div>
                </div>
                <div className="p-4 bg-card border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Report Type</div>
                  <div className="font-medium">Weekly AI Visibility</div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
                <h3 className="font-medium mb-2">Want your own AI Visibility Reports?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Track how often AI assistants like ChatGPT, Gemini, and Perplexity mention your brand
                  and get weekly insights delivered automatically.
                </p>
                <Link to="/">
                  <Button>
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            This report was generated by{' '}
            <Link to="/" className="text-primary hover:underline">
              Llumos
            </Link>{' '}
            - AI Visibility Intelligence Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
