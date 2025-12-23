import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { format } from 'date-fns';

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

  useEffect(() => {
    async function fetchAdminData() {
      if (!user) {
        setLoading(false);
        return;
      }

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
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchAdminData();
    }
  }, [user, authLoading]);

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      </div>
    </div>
  );
}
