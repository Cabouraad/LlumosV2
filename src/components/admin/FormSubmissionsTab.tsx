import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, FileText, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FormSubmission {
  id: string;
  domain: string;
  email: string;
  score: number | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  report_sent_at: string | null;
  metadata: {
    emailSent?: boolean;
    reportUrl?: string;
    error?: string;
    processedAt?: string;
    firstName?: string;
  } | null;
}

export function FormSubmissionsTab() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubmissions = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from('visibility_report_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSubmissions((data || []) as FormSubmission[]);
      if (showToast) toast.success('Data refreshed');
    } catch (err) {
      console.error('Error fetching submissions:', err);
      toast.error('Failed to fetch form submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const getStatusBadge = (submission: FormSubmission) => {
    const metadata = submission.metadata;
    
    if (submission.status === 'sent' && metadata?.emailSent) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      );
    }
    
    if (metadata?.error) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    
    if (submission.status === 'pending') {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        {submission.status}
      </Badge>
    );
  };

  const totalSubmissions = submissions.length;
  const sentCount = submissions.filter(s => s.status === 'sent' && s.metadata?.emailSent).length;
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const failedCount = submissions.filter(s => s.metadata?.error).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Submissions</CardDescription>
            <CardTitle className="text-3xl">{totalSubmissions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reports Sent</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{sentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-destructive">{failedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Form Submissions
            </CardTitle>
            <CardDescription>
              Visibility report requests from the landing page
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchSubmissions(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const metadata = submission.metadata;
                  return (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{submission.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{submission.domain}</TableCell>
                      <TableCell>
                        {submission.score !== null ? (
                          <Badge variant="outline">{submission.score}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(submission.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {metadata?.processedAt 
                          ? format(new Date(metadata.processedAt), 'MMM d, yyyy HH:mm')
                          : submission.processed_at
                            ? format(new Date(submission.processed_at), 'MMM d, yyyy HH:mm')
                            : '-'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
                {submissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No form submissions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
