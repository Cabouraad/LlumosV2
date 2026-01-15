import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChecklistItem {
  id: string;
  label: string;
  link: string;
  completed: boolean;
}

export function OnboardingChecklist() {
  const { orgData } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: 'domain', label: 'Verify your domain', link: '/settings', completed: false },
    { id: 'competitor', label: 'Add your top competitor', link: '/competitors', completed: false },
    { id: 'scan', label: 'Run your first AI visibility scan', link: '/prompts', completed: false },
    { id: 'score', label: 'Review your visibility score', link: '/dashboard', completed: false },
    { id: 'prompts', label: 'Add missing prompts', link: '/prompts', completed: false },
    { id: 'report', label: 'Download your AI visibility report', link: '/dashboard', completed: false },
  ]);

  const [allCompleted, setAllCompleted] = useState(false);

  useEffect(() => {
    checkCompletionStatus();
  }, [orgData]);

  const checkCompletionStatus = async () => {
    if (!orgData?.id) return;

    try {
      // Check domain verification (already in orgData, no query needed)
      const domainVerified = !!orgData.verified_at;
      
      // Check report downloaded from localStorage (no query needed)
      const reportDownloaded = localStorage.getItem(`report_downloaded_${orgData.id}`) === 'true';
      
      // Competitors already in orgData
      const hasCompetitors = orgData.competitors && orgData.competitors.length > 0;

      // Batch all remaining queries in parallel
      const [promptsResult, responsesResult, scoresResult] = await Promise.all([
        supabase
          .from('prompts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgData.id)
          .limit(1),
        supabase
          .from('prompt_provider_responses')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgData.id)
          .limit(1),
        supabase
          .from('llumos_scores')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgData.id)
          .limit(1),
      ]);

      const hasPrompts = (promptsResult.count ?? 0) > 0;
      const hasScan = (responsesResult.count ?? 0) > 0;
      const hasScore = (scoresResult.count ?? 0) > 0;

      setItems([
        { id: 'domain', label: 'Verify your domain', link: '/settings', completed: domainVerified },
        { id: 'competitor', label: 'Add your top competitor', link: '/competitors', completed: hasCompetitors },
        { id: 'scan', label: 'Run your first AI visibility scan', link: '/prompts', completed: hasScan },
        { id: 'score', label: 'Review your visibility score', link: '/dashboard', completed: hasScore },
        { id: 'prompts', label: 'Add missing prompts', link: '/prompts', completed: hasPrompts },
        { id: 'report', label: 'Download your AI visibility report', link: '/dashboard', completed: reportDownloaded },
      ]);

      const allDone = domainVerified && hasCompetitors && hasScan && hasScore && hasPrompts && reportDownloaded;
      setAllCompleted(allDone);
    } catch (error) {
      console.error('Error checking completion status:', error);
    }
  };

  if (allCompleted) return null; // Hide when all completed

  const completedCount = items.filter(item => item.completed).length;
  const progress = (completedCount / items.length) * 100;

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Complete Your AI Visibility Setup</CardTitle>
          <Badge variant="secondary" className="font-mono">
            {completedCount}/{items.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-3" />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.link}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
              {item.label}
            </span>
            {!item.completed && (
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
