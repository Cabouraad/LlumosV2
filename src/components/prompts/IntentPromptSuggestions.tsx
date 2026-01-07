/**
 * Intent-Driven Prompt Suggestions Component
 * 
 * Displays prompts grouped by intent taxonomy with funnel stage indicators.
 * Includes toggle between "By Intent" and "By Funnel" views.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  MapPin, 
  Scale, 
  ThumbsUp,
  RefreshCw,
  Plus,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Layers
} from 'lucide-react';
import { FunnelPromptView } from './FunnelPromptView';
import { CompetitivePromptView } from './CompetitivePromptView';
import { LocalGeoPromptView } from './LocalGeoPromptView';

// ============= TYPES =============
const INTENT_TYPES = ['discovery', 'validation', 'comparison', 'recommendation', 'action', 'local_intent'] as const;
type IntentType = typeof INTENT_TYPES[number];

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

interface PromptContext {
  businessName: string;
  industry: string;
  geographicScope: { type: string };
  brandStrength: { type: string };
}

// ============= CONSTANTS =============
const INTENT_CONFIG: Record<IntentType, { label: string; icon: React.ElementType; description: string; color: string }> = {
  discovery: { 
    label: 'Discovery', 
    icon: Search, 
    description: 'Learning & awareness prompts',
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
  },
  validation: { 
    label: 'Validation', 
    icon: ThumbsUp, 
    description: 'Trust, reviews & proof',
    color: 'bg-green-500/10 text-green-700 border-green-500/20'
  },
  comparison: { 
    label: 'Comparison', 
    icon: Scale, 
    description: 'Alternatives & comparisons',
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/20'
  },
  recommendation: { 
    label: 'Recommendation', 
    icon: Sparkles, 
    description: 'Decision guidance',
    color: 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  },
  action: { 
    label: 'Action', 
    icon: ArrowRight, 
    description: 'Ready to buy/act',
    color: 'bg-red-500/10 text-red-700 border-red-500/20'
  },
  local_intent: { 
    label: 'Local', 
    icon: MapPin, 
    description: 'Location-based queries',
    color: 'bg-teal-500/10 text-teal-700 border-teal-500/20'
  },
};

const FUNNEL_COLORS: Record<FunnelStage, string> = {
  TOFU: 'bg-blue-100 text-blue-800',
  MOFU: 'bg-amber-100 text-amber-800',
  BOFU: 'bg-green-100 text-green-800',
};

// ============= COMPONENT =============
interface IntentPromptSuggestionsProps {
  brandId?: string | null;
  onAcceptPrompt?: (prompt: string) => void;
  onAcceptMultiple?: (prompts: string[]) => void;
}

export function IntentPromptSuggestions({ 
  brandId, 
  onAcceptPrompt,
  onAcceptMultiple 
}: IntentPromptSuggestionsProps) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [context, setContext] = useState<PromptContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<IntentType>('discovery');
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [countPerIntent, setCountPerIntent] = useState(5);
  const [showContext, setShowContext] = useState(false);
  const [viewMode, setViewMode] = useState<'intent' | 'funnel' | 'competitive' | 'local'>('intent');
  const [includeCompetitiveInFunnel, setIncludeCompetitiveInFunnel] = useState(false);
  const [includeLocalInFunnel, setIncludeLocalInFunnel] = useState(false);

  // Generate prompts
  const generatePrompts = async (forceNew = false) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await supabase.functions.invoke('generate-intent-prompts', {
        body: { 
          brandId, 
          params: { 
            countPerIntent: forceNew ? countPerIntent + 3 : countPerIntent, // Request more on regenerate
            language: 'en-US' 
          } 
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate prompts');
      }

      const result = response.data;
      
      if (!result.success && !result.partialData) {
        throw new Error(result.error || 'Generation failed');
      }

      setPrompts(result.data || result.partialData || []);
      setContext(result.context);
      
      if (result.partialData) {
        toast.warning('Some prompts failed validation', {
          description: 'Showing partial results',
        });
      } else if (result.cached) {
        toast.info('Loaded cached prompts', {
          description: 'Click "Generate More" for new suggestions',
        });
      }
    } catch (err) {
      console.error('Error generating prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
      toast.error('Failed to generate prompts');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    generatePrompts();
  }, [brandId, user]);

  // Group prompts by intent
  const promptsByIntent = INTENT_TYPES.reduce((acc, intent) => {
    acc[intent] = prompts.filter(p => p.intent_type === intent);
    return acc;
  }, {} as Record<IntentType, GeneratedPrompt[]>);

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Intent-Driven Prompts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating AI-native prompts...</span>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && prompts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Intent-Driven Prompts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => generatePrompts()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Intent-Driven Prompts
          </CardTitle>
          
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'intent' | 'funnel' | 'competitive' | 'local')}
              className="bg-muted rounded-md p-0.5"
            >
              <ToggleGroupItem 
                value="intent" 
                aria-label="View by Intent"
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                By Intent
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="funnel" 
                aria-label="View by Funnel"
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background"
              >
                <Layers className="h-3.5 w-3.5 mr-1" />
                By Funnel
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="competitive" 
                aria-label="Competitive Prompts"
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background"
              >
                <Scale className="h-3.5 w-3.5 mr-1" />
                Competitive
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="local" 
                aria-label="Local Prompts"
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background"
              >
                <MapPin className="h-3.5 w-3.5 mr-1" />
                Local
              </ToggleGroupItem>
            </ToggleGroup>

            {viewMode === 'intent' && selectedPrompts.size > 0 && (
              <Button size="sm" onClick={acceptSelected}>
                <Plus className="h-4 w-4 mr-1" />
                Add {selectedPrompts.size} Selected
              </Button>
            )}
            {viewMode === 'intent' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => generatePrompts(true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Generate More
              </Button>
            )}
          </div>
        </div>

        {/* Context Accordion - only show in intent view */}
        {viewMode === 'intent' && context && (
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
              onClick={() => setShowContext(!showContext)}
            >
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Context: {context.businessName} • {context.industry}
              </span>
              {showContext ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showContext && (
              <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><strong>Business:</strong> {context.businessName}</p>
                <p><strong>Industry:</strong> {context.industry}</p>
                <p><strong>Geographic Scope:</strong> {context.geographicScope?.type || 'global'}</p>
                <p><strong>Brand Strength:</strong> {context.brandStrength?.type || 'emerging'}</p>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Funnel View */}
        {viewMode === 'funnel' ? (
          <FunnelPromptView 
            brandId={brandId} 
            onAcceptPrompt={onAcceptPrompt}
            onAcceptMultiple={onAcceptMultiple}
            includeCompetitive={includeCompetitiveInFunnel}
            includeLocal={includeLocalInFunnel}
          />
        ) : viewMode === 'competitive' ? (
          <CompetitivePromptView
            brandId={brandId}
            onAcceptPrompt={onAcceptPrompt}
            onAcceptMultiple={onAcceptMultiple}
            includeFunnel={includeCompetitiveInFunnel}
            onIncludeFunnelChange={setIncludeCompetitiveInFunnel}
          />
        ) : viewMode === 'local' ? (
          <LocalGeoPromptView
            brandId={brandId}
            onAcceptPrompt={onAcceptPrompt}
            onAcceptMultiple={onAcceptMultiple}
            includeInFunnel={includeLocalInFunnel}
            onIncludeInFunnelChange={setIncludeLocalInFunnel}
          />
        ) : (
          /* Intent View */
          <Tabs value={selectedIntent} onValueChange={(v) => setSelectedIntent(v as IntentType)}>
            <TabsList className="w-full flex-wrap h-auto gap-1 mb-4">
              {INTENT_TYPES.map(intent => {
                const config = INTENT_CONFIG[intent];
                const count = promptsByIntent[intent]?.length || 0;
                const Icon = config.icon;
                
                return (
                  <TabsTrigger 
                    key={intent} 
                    value={intent}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                    {count > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {INTENT_TYPES.map(intent => {
              const intentPrompts = promptsByIntent[intent] || [];
              const config = INTENT_CONFIG[intent];
              
              return (
                <TabsContent key={intent} value={intent} className="mt-0">
                  <div className="text-sm text-muted-foreground mb-3">
                    {config.description}
                  </div>

                  {intentPrompts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No prompts generated for this intent type
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {intentPrompts.map((p, idx) => (
                        <PromptCard
                          key={`${intent}-${idx}`}
                          prompt={p}
                          intentConfig={config}
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
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// ============= PROMPT CARD =============
interface PromptCardProps {
  prompt: GeneratedPrompt;
  intentConfig: typeof INTENT_CONFIG[IntentType];
  isSelected: boolean;
  onToggleSelect: () => void;
  onAccept: () => void;
}

function PromptCard({ prompt, intentConfig, isSelected, onToggleSelect, onAccept }: PromptCardProps) {
  const Icon = intentConfig.icon;
  
  return (
    <div
      className={`
        p-3 rounded-lg border transition-all cursor-pointer
        ${isSelected 
          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }
      `}
      onClick={onToggleSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          {/* Prompt Text */}
          <p className="text-sm font-medium leading-snug">
            "{prompt.prompt}"
          </p>

          {/* Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] ${intentConfig.color}`}>
              <Icon className="h-3 w-3 mr-1" />
              {intentConfig.label}
            </Badge>
            
            <Badge variant="secondary" className={`text-[10px] ${FUNNEL_COLORS[prompt.funnel_stage]}`}>
              {prompt.funnel_stage}
            </Badge>
            
            {prompt.target_offering !== 'general' && (
              <Badge variant="outline" className="text-[10px]">
                {prompt.target_offering}
              </Badge>
            )}
            
            {prompt.needs_geo_variant && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-700">
                      <MapPin className="h-3 w-3 mr-0.5" />
                      Geo
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Can be localized with city/region</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Why Relevant */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  <span className="font-medium">Topic:</span> {prompt.seed_topic} • {prompt.why_relevant}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{prompt.why_relevant}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isSelected && (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IntentPromptSuggestions;
