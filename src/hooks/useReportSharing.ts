import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShareResponse {
  shareUrl: string;
  shareToken: string;
  expiresAt: string;
}

export function useReportSharing() {
  const [sharing, setSharing] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const createShareLink = async (reportId: string, expiresInDays = 7): Promise<ShareResponse | null> => {
    try {
      setSharing(reportId);

      const { data, error } = await supabase.functions.invoke('reports-share', {
        body: { reportId, action: 'create', expiresInDays }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create share link');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create share link');
      }

      toast.success('Share link created! Link copied to clipboard.');
      
      // Copy to clipboard
      if (data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
      }

      return {
        shareUrl: data.shareUrl,
        shareToken: data.shareToken,
        expiresAt: data.expiresAt
      };
    } catch (err) {
      console.error('Error creating share link:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create share link');
      return null;
    } finally {
      setSharing(null);
    }
  };

  const revokeShareLink = async (reportId: string): Promise<boolean> => {
    try {
      setRevoking(reportId);

      const { data, error } = await supabase.functions.invoke('reports-share', {
        body: { reportId, action: 'revoke' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to revoke share link');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to revoke share link');
      }

      toast.success('Share link revoked');
      return true;
    } catch (err) {
      console.error('Error revoking share link:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to revoke share link');
      return false;
    } finally {
      setRevoking(null);
    }
  };

  return {
    sharing,
    revoking,
    createShareLink,
    revokeShareLink,
    isSharing: (reportId: string) => sharing === reportId,
    isRevoking: (reportId: string) => revoking === reportId,
  };
}
