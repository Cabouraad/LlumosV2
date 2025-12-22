import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useBrand } from '@/contexts/BrandContext';
import { Check, X, Eye } from 'lucide-react';

interface BrandCandidate {
  id: string;
  candidate_name: string;
  detection_count: number;
  first_detected_at: string;
  last_detected_at: string;
  status: 'pending' | 'approved' | 'rejected';
  brand_id: string | null;
}

export function BrandCandidatesManager() {
  const [candidates, setCandidates] = useState<BrandCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { selectedBrand } = useBrand();

  const loadCandidates = async () => {
    try {
      // Pass brand_id for multi-brand filtering
      const { data, error } = await supabase
        .rpc('get_brand_candidates_for_org', {
          p_brand_id: selectedBrand?.id || null
        } as any);

      if (error) throw error;
      setCandidates((data || []).map((item: any) => ({
        ...item,
        status: item.status as 'pending' | 'approved' | 'rejected'
      })));
    } catch (error) {
      console.error('Error loading brand candidates:', error);
      // Silently fail since this is a new feature
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [selectedBrand?.id]); // Re-fetch when brand changes

  const handleApprove = async (candidateId: string, candidateName: string) => {
    try {
      // Pass brand_id for multi-brand isolation when adding to catalog
      const { error } = await supabase
        .rpc('approve_brand_candidate', {
          p_candidate_id: candidateId,
          p_candidate_name: candidateName,
          p_brand_id: selectedBrand?.id || null
        } as any);

      if (error) throw error;

      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast({
        title: 'Success',
        description: `${candidateName} approved as competitor${selectedBrand ? ` for ${selectedBrand.name}` : ''}`,
      });
    } catch (error) {
      console.error('Error approving candidate:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve candidate',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (candidateId: string, candidateName: string) => {
    try {
      const { error } = await supabase
        .rpc('reject_brand_candidate', {
          p_candidate_id: candidateId
        });

      if (error) throw error;

      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast({
        title: 'Success',
        description: `${candidateName} rejected`,
      });
    } catch (error) {
      console.error('Error rejecting candidate:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject candidate',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Brand Candidates for Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading candidates...</div>
        </CardContent>
      </Card>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Brand Candidates for Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No brand candidates pending review{selectedBrand ? ` for ${selectedBrand.name}` : ''}. New potential competitors will appear here when detected.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Brand Candidates for Review ({candidates.length})
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Review potential competitors detected in responses{selectedBrand ? ` for ${selectedBrand.name}` : ''}. Approved brands will be added to your competitor catalog.
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">{candidate.candidate_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Detected {candidate.detection_count} times
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {candidate.detection_count} mentions
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApprove(candidate.id, candidate.candidate_name)}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(candidate.id, candidate.candidate_name)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
