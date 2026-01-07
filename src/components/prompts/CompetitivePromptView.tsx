/**
 * Competitive Prompts View Component
 * 
 * Displays competitor interception prompts grouped by competitor name.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Swords,
  ArrowRight,
  Scale, 
  ThumbsUp,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Star,
  UserX
} from 'lucide-react';

// ============= TYPES =============
type IntentType = 'discovery' | 'validation' | 'comparison' | 'recommendation' | 'action' | 'local_intent';
type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';
type SeedTopic = 'alternatives' | 'vs' | 'reviews' | 'pricing' | 'switching';

interface CompetitivePrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string;
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
  competitor_name?: string;
}

// ============= SEED TOPIC CONFIG =============
const SEED_TOPIC_CONFIG: Record<SeedTopic, { label: string; icon: React.ElementType; color: string }> = {
  vs: { label: 'Vs', icon: Scale, color: 'bg-purple-100 text-purple-700' },
  alternatives: { label: 'Alternatives', icon: Sparkles, color: 'bg-blue-100 text-blue-700' },
  reviews: { label: 'Reviews', icon: ThumbsUp, color: 'bg-green-100 text-green-700' },
  pricing: { label: 'Pricing', icon: ArrowRight, color: 'bg-amber-100 text-amber-700' },
  switching: { label: 'Switching', icon: ArrowRight, color: 'bg-red-100 text-red-700' },
};

const FUNNEL_LABELS: Record<FunnelStage, string> = {
  TOFU: 'Top of Funnel',
  MOFU: 'Middle of Funnel',
  BOFU: 'Bottom of Funnel',
};

// ============= COMPONENT =============
interface CompetitivePromptViewProps {
  brandId?: string | null;
  onAcceptPrompt?: (prompt: string) => void;
  onAcceptMultiple?: (prompts: string[]) => void;
  onIncludeFunnelChange?: (include: boolean) => void;
  includeFunnel?: boolean;
}

export function CompetitivePromptView({ 
  brandId, 
  onAcceptPrompt,
  onAcceptMultiple,
  onIncludeFunnelChange,
  includeFunnel = false
}: CompetitivePromptViewProps) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<CompetitivePrompt[]>([]);
  const [competitorsUsed, setCompetitorsUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [skipReason, setSkipReason] = useState<string | null>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [localIncludeFunnel, setLocalIncludeFunnel] = useState(includeFunnel);

  // Fetch competitive prompts
  const fetchCompetitivePrompts = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSkipped(false);

    try {
      const response = await supabase.functions.invoke('generate-competitor-prompts', {
        body: { 
          brandId, 
          params: { perCompetitor: 4, maxCompetitors: 5 } 
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch competitive prompts');
      }

      const result = response.data;
      
      if (result.skipped) {
        setSkipped(true);
        setSkipReason(result.reason);
        setPrompts([]);
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to get competitive prompts');
      }

      setPrompts(result.data || []);
      setCompetitorsUsed(result.competitorsUsed || []);
    } catch (err) {
      console.error('Error fetching competitive prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
      toast.error('Failed to load competitive prompts');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchCompetitivePrompts();
  }, [brandId, user]);

  // Handle include funnel toggle
  const handleIncludeFunnelToggle = (checked: boolean) => {
    setLocalIncludeFunnel(checked);
    onIncludeFunnelChange?.(checked);
  };

  // Group prompts by competitor
  const promptsByCompetitor: Record<string, CompetitivePrompt[]> = {};
  for (const p of prompts) {
    const competitor = p.competitor_name || 'Unknown';
    if (!promptsByCompetitor[competitor]) promptsByCompetitor[competitor] = [];
    promptsByCompetitor[competitor].push(p);
  }

  // Group by seed topic within competitor
  const groupByTopic = (competitorPrompts: CompetitivePrompt[]) => {
    const groups: Record<string, CompetitivePrompt[]> = {
      vs: [],
      alternatives: [],
      reviews: [],
      pricing: [],
      switching: []
    };
    for (const p of competitorPrompts) {
      const topic = p.seed_topic as SeedTopic;
      if (groups[topic]) groups[topic].push(p);
      else groups.vs.push(p); // Default to vs
    }
    return groups;
  };

  // Handle selection
  const togglePromptSelection = (prompt: string) => {
    setSelectedPrompts(prev => {
      const next = new Set(prev);
      if (next.has(prompt)) {
        next.delete(prompt);
      } else {
        next.add(prompt);
      }
      return next;
    });
  };

  // Accept selected
  const acceptSelected = () => {
    if (selectedPrompts.size === 0) return;
    
    if (onAcceptMultiple) {
      onAcceptMultiple(Array.from(selectedPrompts));
    } else if (onAcceptPrompt) {
      selectedPrompts.forEach(p => onAcceptPrompt(p));
    }
    
    setSelectedPrompts(new Set());
    toast.success(`Added ${selectedPrompts.size} prompts`);
  };

  // Loading state
  if (loading && prompts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating competitive prompts...</span>
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3, 4].map(j => (
                <Skeleton key={j} className="h-14 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Skipped state (no competitors)
  if (skipped) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="font-medium text-foreground">No Competitors Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {skipReason === 'no_competitors' 
                  ? 'Add competitors to your organization settings to generate competitive interception prompts.'
                  : 'Unable to generate competitive prompts at this time.'}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/settings">Add Competitors</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && prompts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchCompetitivePrompts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Swords className="h-3 w-3 mr-1" />
            {competitorsUsed.length} Competitors
          </Badge>
          
          {/* Include in Funnel Toggle */}
          <div className="flex items-center gap-2">
            <Switch 
              id="include-funnel" 
              checked={localIncludeFunnel}
              onCheckedChange={handleIncludeFunnelToggle}
            />
            <Label htmlFor="include-funnel" className="text-xs text-muted-foreground cursor-pointer">
              Include in Funnel View
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedPrompts.size > 0 && (
            <Button size="sm" onClick={acceptSelected}>
              <Plus className="h-4 w-4 mr-1" />
              Add {selectedPrompts.size} Selected
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchCompetitivePrompts}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      {/* Competitor cards */}
      {Object.entries(promptsByCompetitor).map(([competitor, competitorPrompts]) => {
        const topicGroups = groupByTopic(competitorPrompts);
        
        return (
          <Card key={competitor}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-amber-500" />
                {competitor}
                <Badge variant="secondary" className="text-xs ml-2">
                  {competitorPrompts.length} prompts
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Topic sections */}
              {Object.entries(topicGroups).map(([topic, topicPrompts]) => {
                if (topicPrompts.length === 0) return null;
                const config = SEED_TOPIC_CONFIG[topic as SeedTopic];
                const Icon = config?.icon || Scale;
                
                return (
                  <div key={topic} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${config?.color || ''}`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config?.label || topic}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-2">
                      {topicPrompts.map((p, idx) => (
                        <CompetitivePromptCard
                          key={`${competitor}-${topic}-${idx}`}
                          prompt={p}
                          isSelected={selectedPrompts.has(p.prompt)}
                          onToggleSelect={() => togglePromptSelection(p.prompt)}
                          onAccept={() => {
                            if (onAcceptPrompt) {
                              onAcceptPrompt(p.prompt);
                              toast.success('Prompt added');
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
      
      {prompts.length === 0 && !loading && !skipped && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No competitive prompts generated yet.</p>
            <Button className="mt-4" onClick={fetchCompetitivePrompts}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Prompts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============= PROMPT CARD =============
interface CompetitivePromptCardProps {
  prompt: CompetitivePrompt;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAccept: () => void;
}

function CompetitivePromptCard({ prompt, isSelected, onToggleSelect, onAccept }: CompetitivePromptCardProps) {
  return (
    <div
      className={`
        p-2.5 rounded-lg border bg-background/80 transition-all cursor-pointer
        ${isSelected 
          ? 'border-primary ring-1 ring-primary' 
          : 'border-border/50 hover:border-primary/50'
        }
      `}
      onClick={onToggleSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          {/* Prompt Text */}
          <p className="text-xs font-medium leading-snug">
            "{prompt.prompt}"
          </p>

          {/* Chips */}
          <div className="flex flex-wrap items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] px-1.5 py-0 ${
                      prompt.funnel_stage === 'BOFU' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {FUNNEL_LABELS[prompt.funnel_stage]}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{prompt.why_relevant}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {prompt.intent_type}
            </Badge>
            
            {prompt.target_offering !== 'general' && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {prompt.target_offering.slice(0, 15)}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {isSelected && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CompetitivePromptView;
