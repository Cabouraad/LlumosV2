import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, CheckCircle, XCircle, Building2, Trash2, RefreshCw, FileText } from 'lucide-react';
import { format, differenceInMilliseconds, startOfTomorrow } from 'date-fns';
import { toast } from 'sonner';
import { FormSubmissionsTab } from '@/components/admin/FormSubmissionsTab';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AdminAccount {
  org_id: string;
  org_name: string;
  org_domain: string;
  subscription_tier: string;
  is_subscribed: boolean;
  stripe_customer_id: string | null;
  prompts_count: number;
  created_at: string;
  last_login_at: string | null;
  owner_email: string | null;
}

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminData = useCallback(async (showToast = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (showToast) setRefreshing(true);

    try {
      const { data, error } = await supabase.rpc('get_super_admin_dashboard');
      
      if (error) {
        if (error.message.includes('Access denied')) {
          setError('Access denied: You are not authorized to view this page.');
        } else {
          setError(error.message);
        }
        return;
      }

      setAccounts(data || []);
      if (showToast) toast.success('Data refreshed');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);
  const handleDeleteAccounts = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-accounts');
      
      if (error) {
        toast.error('Failed to delete accounts: ' + error.message);
        return;
      }

      toast.success(data.message || 'Accounts deleted successfully');
      // Refresh the data
      window.location.reload();
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!authLoading) {
      fetchAdminData();
    }
  }, [authLoading, fetchAdminData]);

  // Daily auto-refresh at midnight
  useEffect(() => {
    const scheduleNextRefresh = () => {
      const msUntilMidnight = differenceInMilliseconds(startOfTomorrow(), new Date());
      return setTimeout(() => {
        fetchAdminData();
        // Schedule the next refresh for the following day
        scheduleNextRefresh();
      }, msUntilMidnight);
    };

    const timeoutId = scheduleNextRefresh();
    return () => clearTimeout(timeoutId);
  }, [fetchAdminData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You must be signed in to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalAccounts = accounts.length;
  const activeSubscriptions = accounts.filter(a => a.is_subscribed).length;
  const totalPrompts = accounts.reduce((sum, a) => sum + (a.prompts_count || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">System-wide account management</p>
          </div>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="submissions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Form Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-6">
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchAdminData(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Accounts</CardDescription>
                  <CardTitle className="text-3xl">{totalAccounts}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Subscriptions</CardDescription>
                  <CardTitle className="text-3xl">{activeSubscriptions}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Prompts</CardDescription>
                  <CardTitle className="text-3xl">{totalPrompts.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions. Protected accounts: abouraa.chri@gmail.com, emaediongeyo5@gmail.com, eliza.templet@gmail.com, amir@test.com, 409450051@qq.com
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete All Non-Protected Accounts
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete ALL accounts except the protected ones. This action cannot be undone.
                        All organization data, prompts, and related records will be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccounts} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, delete all accounts
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Accounts Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  All Accounts
                </CardTitle>
                <CardDescription>
                  Complete list of organizations in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Owner Email</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead className="text-right">Prompts</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.org_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{account.org_name}</div>
                              <div className="text-sm text-muted-foreground">{account.org_domain}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{account.owner_email || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={account.subscription_tier === 'pro' ? 'default' : 'secondary'}>
                              {account.subscription_tier}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {account.is_subscribed ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <XCircle className="h-4 w-4" />
                                <span className="text-sm">Inactive</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{account.prompts_count}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(account.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {account.last_login_at 
                              ? format(new Date(account.last_login_at), 'MMM d, yyyy')
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <FormSubmissionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
