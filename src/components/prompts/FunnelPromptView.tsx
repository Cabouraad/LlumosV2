/**
 * Funnel-Based Prompt View Component
 * 
 * Displays prompts organized by TOFU/MOFU/BOFU funnel stages.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Search, 
  Target,
  ShoppingCart,
  ArrowRight,
  MapPin, 
  Scale, 
  ThumbsUp,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// ============= TYPES =============
type IntentType = 'discovery' | 'validation' | 'comparison' | 'recommendation' | 'action' | 'local_intent';
type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

interface GeneratedPrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string;
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
}

interface FunnelStats {
  counts: { TOFU: number; MOFU: number; BOFO: number };
  coverage_ok: boolean;
  missing: { TOFU: number; MOFU: number; BOFU: number };
}

interface FunnelView {
  TOFU: GeneratedPrompt[];
  MOFU: GeneratedPrompt[];
  BOFU: GeneratedPrompt[];
  stats: FunnelStats;
}

// ============= FUNNEL CONFIG =============
const FUNNEL_CONFIG: Record<FunnelStage, { 
  label: string; 
  fullName: string;
  icon: React.ElementType; 
  description: string; 
  color: string;
  bgColor: string;
}> = {
  TOFU: {
    label: 'TOFU',
    fullName: 'Top of Funnel',
    icon: Search,
    description: 'Awareness & Discovery',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  MOFU: {
    label: 'MOFU',
    fullName: 'Middle of Funnel',
    icon: Target,
    description: 'Consideration & Comparison',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  BOFU: {
    label: 'BOFU',
    fullName: 'Bottom of Funnel',
    icon: ShoppingCart,
    description: 'Decision & Action',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
};

const INTENT_ICONS: Record<IntentType, React.ElementType> = {
  discovery: Search,
  validation: ThumbsUp,
  comparison: Scale,
  recommendation: Sparkles,
  action: ArrowRight,
  local_intent: MapPin,
};

// ============= COMPONENT =============
interface FunnelPromptViewProps {
  brandId?: string | null;
  onAcceptPrompt?: (prompt: string) => void;
  onAcceptMultiple?: (prompts: string[]) => void;
  includeCompetitive?: boolean;
}

export function FunnelPromptView({ 
  brandId, 
  onAcceptPrompt,
  onAcceptMultiple,
  includeCompetitive = false
}: FunnelPromptViewProps) {
  const { user } = useAuth();
  const [funnelView, setFunnelView] = useState<FunnelView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());

  // Fetch funnel prompts
  const fetchFunnelPrompts = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('get-funnel-prompts', {
        body: { 
          brandId, 
          params: { minPerBucket: 5, totalDefault: 15, includeCompetitive } 
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch funnel prompts');
      }

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get funnel prompts');
      }

      setFunnelView(result.funnel_view);
    } catch (err) {
      console.error('Error fetching funnel prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
      toast.error('Failed to load funnel prompts');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchFunnelPrompts();
  }, [brandId, user]);

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
  if (loading && !funnelView) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['TOFU', 'MOFU', 'BOFU'] as FunnelStage[]).map(stage => (
          <Card key={stage} className={FUNNEL_CONFIG[stage].bgColor}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error && !funnelView) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchFunnelPrompts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!funnelView) return null;

  const stats = funnelView.stats;

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Coverage indicator */}
          {stats.coverage_ok ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Balanced funnel coverage
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Limited coverage in some stages
            </Badge>
          )}
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
            onClick={fetchFunnelPrompts}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Generate More
          </Button>
        </div>
      </div>

      {/* Funnel columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['TOFU', 'MOFU', 'BOFU'] as FunnelStage[]).map(stage => {
          const config = FUNNEL_CONFIG[stage];
          const stagePrompts = funnelView[stage] || [];
          const Icon = config.icon;
          
          return (
            <Card key={stage} className={`border ${config.bgColor}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`flex items-center gap-2 text-base ${config.color}`}>
                  <Icon className="h-5 w-5" />
                  <div>
                    <span className="font-bold">{config.label}</span>
                    <span className="text-xs font-normal ml-2 opacity-75">
                      {config.fullName}
                    </span>
                  </div>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-2">
                {stagePrompts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No prompts for this stage
                  </div>
                ) : (
                  stagePrompts.map((p, idx) => (
                    <FunnelPromptCard
                      key={`${stage}-${idx}`}
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
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats summary */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <span>TOFU: {stats.counts.TOFU}</span>
        <span>MOFU: {stats.counts.MOFU}</span>
        <span>BOFU: {stats.counts.BOFO}</span>
      </div>
    </div>
  );
}

// ============= PROMPT CARD =============
interface FunnelPromptCardProps {
  prompt: GeneratedPrompt;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAccept: () => void;
}

function FunnelPromptCard({ prompt, isSelected, onToggleSelect, onAccept }: FunnelPromptCardProps) {
  const IntentIcon = INTENT_ICONS[prompt.intent_type];
  
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
          <p className="text-xs font-medium leading-snug line-clamp-2">
            "{prompt.prompt}"
          </p>

          {/* Chips */}
          <div className="flex flex-wrap items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    <IntentIcon className="h-2.5 w-2.5 mr-0.5" />
                    {prompt.intent_type.replace('_', ' ')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{prompt.why_relevant}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
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

export default FunnelPromptView;
