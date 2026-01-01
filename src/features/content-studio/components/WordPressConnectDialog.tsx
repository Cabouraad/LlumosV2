import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Globe, User, Key, ExternalLink } from 'lucide-react';

interface WordPressConnectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function WordPressConnectDialog({ open, onClose }: WordPressConnectDialogProps) {
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile?.org_id) throw new Error('Organization not found');

      // Test the connection first
      const testUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?per_page=1`;
      const credentials = btoa(`${username}:${appPassword}`);
      
      const testResponse = await fetch(testUrl, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });

      if (!testResponse.ok) {
        throw new Error('Failed to connect. Check your site URL, username, and application password.');
      }

      // Encrypt the password using Edge Function
      const { data: encryptResult, error: encryptError } = await supabase.functions.invoke('cms-encrypt', {
        body: { password: appPassword },
      });

      if (encryptError || !encryptResult?.encrypted) {
        throw new Error('Failed to secure password. Please try again.');
      }

      // Save connection with encrypted password
      const { error } = await supabase
        .from('cms_connections')
        .insert({
          org_id: userProfile.org_id,
          platform: 'wordpress',
          site_url: siteUrl.replace(/\/$/, ''),
          username,
          app_password_encrypted: encryptResult.encrypted,
          is_active: true,
          last_connected_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('WordPress connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['cms-connections'] });
      onClose();
      setSiteUrl('');
      setUsername('');
      setAppPassword('');
    },
    onError: (error: Error) => {
      toast.error('Connection failed', { description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Connect WordPress Site
          </DialogTitle>
          <DialogDescription>
            Connect your WordPress site to publish content directly from Content Studio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="site-url">Site URL</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="site-url"
                placeholder="https://yoursite.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-password">Application Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="app-password"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Generate one in WordPress &rarr; Users &rarr; Profile &rarr; Application Passwords
              <a
                href="https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center"
              >
                Learn more <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => connectMutation.mutate()}
            disabled={!siteUrl || !username || !appPassword || connectMutation.isPending}
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
