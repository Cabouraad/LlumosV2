import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Calendar, FileText, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportEmailPreference {
  id?: string;
  email: string;
  frequency: 'weekly' | 'monthly' | 'none';
  day_of_week: number;
  include_pdf: boolean;
  include_summary: boolean;
  is_active: boolean;
}

interface ReportEmailSettingsProps {
  orgId: string;
  brandId?: string | null;
}

export function ReportEmailSettings({ orgId, brandId }: ReportEmailSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ReportEmailPreference>({
    email: '',
    frequency: 'none',
    day_of_week: 1,
    include_pdf: true,
    include_summary: true,
    is_active: false,
  });

  useEffect(() => {
    loadPreferences();
  }, [orgId, brandId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);
      setUserEmail(user.email || '');
      
      // Fetch existing preferences
      let query = supabase
        .from('report_email_preferences')
        .select('*')
        .eq('org_id', orgId)
        .eq('user_id', user.id);
      
      if (brandId) {
        query = query.eq('brand_id', brandId);
      } else {
        query = query.is('brand_id', null);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setPreferences({
          id: data.id,
          email: data.email,
          frequency: data.frequency as 'weekly' | 'monthly' | 'none',
          day_of_week: data.day_of_week,
          include_pdf: data.include_pdf,
          include_summary: data.include_summary,
          is_active: data.is_active,
        });
      } else {
        // Set default email
        setPreferences(prev => ({ ...prev, email: user.email || '' }));
      }
    } catch (error) {
      console.error('Failed to load email preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!userId || !orgId) return;
    
    try {
      setSaving(true);
      
      const prefData = {
        org_id: orgId,
        user_id: userId,
        email: preferences.email || userEmail,
        frequency: preferences.frequency,
        day_of_week: preferences.day_of_week,
        include_pdf: preferences.include_pdf,
        include_summary: preferences.include_summary,
        is_active: preferences.frequency !== 'none',
        brand_id: brandId || null,
      };
      
      if (preferences.id) {
        // Update existing
        const { error } = await supabase
          .from('report_email_preferences')
          .update(prefData)
          .eq('id', preferences.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('report_email_preferences')
          .insert(prefData)
          .select()
          .single();
        
        if (error) throw error;
        setPreferences(prev => ({ ...prev, id: data.id }));
      }
      
      toast({
        title: 'Preferences saved',
        description: preferences.frequency === 'none' 
          ? 'Report emails have been disabled.' 
          : `You'll receive ${preferences.frequency} reports at ${preferences.email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to save preferences',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Report Email Settings
        </CardTitle>
        <CardDescription>
          Receive automated visibility reports directly to your inbox
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Address */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={preferences.email || userEmail}
            onChange={(e) => setPreferences(prev => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
          />
        </div>
        
        {/* Frequency */}
        <div className="space-y-2">
          <Label>Report Frequency</Label>
          <Select
            value={preferences.frequency}
            onValueChange={(value: 'weekly' | 'monthly' | 'none') => 
              setPreferences(prev => ({ ...prev, frequency: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <span>Disabled</span>
                </div>
              </SelectItem>
              <SelectItem value="weekly">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Weekly (Every Monday)</span>
                </div>
              </SelectItem>
              <SelectItem value="monthly">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Monthly (1st of month)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {preferences.frequency !== 'none' && (
          <>
            {/* Include PDF */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include PDF Report</Label>
                <p className="text-sm text-muted-foreground">
                  Attach the full PDF report to the email
                </p>
              </div>
              <Switch
                checked={preferences.include_pdf}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, include_pdf: checked }))
                }
              />
            </div>
            
            {/* Include Summary */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Summary Stats</Label>
                <p className="text-sm text-muted-foreground">
                  Show key metrics in the email body
                </p>
              </div>
              <Switch
                checked={preferences.include_summary}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, include_summary: checked }))
                }
              />
            </div>
          </>
        )}
        
        <Button onClick={savePreferences} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
