/**
 * Intent-Driven Prompt Suggestions Component
 * 
 * Displays prompts grouped by intent taxonomy with funnel stage indicators.
 * Includes toggle between "By Intent" and "By Funnel" views.
 * Now includes confidence scoring, filtering, and top prompts view.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
  Layers,
  Trophy
} from 'lucide-react';
import { FunnelPromptView } from './FunnelPromptView';
import { CompetitivePromptView } from './CompetitivePromptView';
import { LocalGeoPromptView } from './LocalGeoPromptView';
import { PromptVariantsExpander } from './PromptVariantsExpander';
import { PromptConfidenceScore } from './PromptConfidenceScore';
import { PromptFilters, defaultFilters, type PromptFiltersState } from './PromptFilters';
import { OptimizationHint } from './OptimizationHint';

// ============= TYPES =============
const INTENT_TYPES = ['discovery', 'validation', 'comparison', 'recommendation', 'action', 'local_intent'] as const;
type IntentType = typeof INTENT_TYPES[number];

type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

type OptimizationType =
  | 'not_visible'
  | 'weak_visibility'
  | 'competitor_dominant'
  | 'local_gap'
  | 'strong_visibility'
  | 'high_intent_expand'
  | 'monitor_only'
  | 'insufficient_data';

interface GeneratedPrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string;
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
  confidence_score?: number;
  confidence_reasons?: string[];
  optimization_hint?: string;
  optimization_type?: OptimizationType;
  is_monitored?: boolean;
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
  const [viewMode, setViewMode] = useState<'intent' | 'funnel' | 'competitive' | 'local' | 'top'>('top');
  const [includeCompetitiveInFunnel, setIncludeCompetitiveInFunnel] = useState(false);
  const [includeLocalInFunnel, setIncludeLocalInFunnel] = useState(false);
  const [promptVariants, setPromptVariants] = useState<Record<string, { model: 'chatgpt' | 'gemini' | 'perplexity'; variant_text: string }[]>>({});
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [filters, setFilters] = useState<PromptFiltersState>(defaultFilters);
  const [scoringTriggered, setScoringTriggered] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const initialLoadDone = useRef(false);
  const isGenerating = useRef(false);

  // Fetch cached prompts from database (no generation)
  const fetchCachedPrompts = useCallback(async () => {
    if (!user) return null;
    
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!userData?.org_id) return null;

      // Query matches what edge function stores: version=1, status='ready'
      const { data: suggestions, error } = await supabase
        .from('prompt_suggestions')
        .select('prompts_json, generation_params, status')
        .eq('org_id', userData.org_id)
        .eq('version', 1)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('[IntentPrompts] Cache fetch error:', error.message);
        return null;
      }

      if (suggestions?.prompts_json) {
        const promptsData = suggestions.prompts_json as unknown as GeneratedPrompt[];
        console.log('[IntentPrompts] Cache HIT:', promptsData.length, 'prompts');
        return promptsData;
      }
      console.log('[IntentPrompts] Cache MISS - no ready prompts found');
      return null;
    } catch (err) {
      console.error('Error fetching cached prompts:', err);
      return null;
    }
  }, [user]);

  // Poll for prompt generation status
  const pollForPrompts = useCallback(async () => {
    if (!user) return;

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!userData?.org_id) return;

    const maxAttempts = 30; // 30 attempts * 2s = 60s max
    let attempt = 0;

    const poll = async () => {
      attempt++;
      setGenerationProgress(Math.min(20 + attempt * 2.5, 95));

      const { data: suggestion } = await supabase
        .from('prompt_suggestions')
        .select('status, prompts_json, error_message')
        .eq('org_id', userData.org_id)
        .eq('version', 1)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (suggestion?.status === 'ready' && suggestion.prompts_json) {
        const promptsData = suggestion.prompts_json as unknown as GeneratedPrompt[];
        setPrompts(promptsData);
        setGenerationProgress(100);
        setLoading(false);
        isGenerating.current = false;

        // Trigger scoring if prompts don't have scores
        const hasScores = promptsData.some(p => typeof p.confidence_score === 'number');
        if (!hasScores && !scoringTriggered) {
          setScoringTriggered(true);
          triggerScoringBackground();
        }

        setTimeout(() => setGenerationProgress(0), 500);
        return;
      }

      if (suggestion?.status === 'error') {
        setError(suggestion.error_message || 'Generation failed');
        setLoading(false);
        isGenerating.current = false;
        setGenerationProgress(0);
        return;
      }

      if (attempt >= maxAttempts) {
        setError('Generation timed out. Please try again.');
        setLoading(false);
        isGenerating.current = false;
        setGenerationProgress(0);
        return;
      }

      // Continue polling
      setTimeout(poll, 2000);
    };

    poll();
  }, [user, scoringTriggered]);

  // Generate prompts (only when explicitly called)
  const generatePrompts = useCallback(async (forceNew = false) => {
    if (!user) return;
    if (isGenerating.current) return;

    isGenerating.current = true;
    setLoading(true);
    setError(null);
    setGenerationProgress(10);

    try {
      const response = await supabase.functions.invoke('generate-intent-prompts', {
        body: {
          brandId,
          params: {
            countPerIntent: forceNew ? countPerIntent + 3 : countPerIntent,
            language: 'en-US',
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start generation');
      }

      const result = response.data;

      // If cached result returned immediately
      if (result?.cached && result?.data) {
        setPrompts(result.data);
        setContext(result.context);
        setGenerationProgress(100);
        setLoading(false);
        isGenerating.current = false;
        setTimeout(() => setGenerationProgress(0), 500);
        return;
      }

      // Generation queued in background - start polling
      if (result?.queued || result?.status === 'building') {
        setGenerationProgress(20);
        pollForPrompts();
        return;
      }

      // Unexpected response
      throw new Error('Unexpected response from server');
    } catch (err) {
      console.error('[IntentPrompts] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
      toast.error('Failed to generate prompts');
      setLoading(false);
      isGenerating.current = false;
      setGenerationProgress(0);
    }
  }, [user, brandId, countPerIntent, pollForPrompts]);

  // Trigger scoring in background (no refetch to avoid loop)
  const triggerScoringBackground = async () => {
    try {
      await supabase.functions.invoke('score-prompt-suggestions', {
        body: { brandId },
      });
      await supabase.functions.invoke('generate-optimization-guidance', {
        body: { brandId },
      });
      // Fetch updated prompts from cache
      const updated = await fetchCachedPrompts();
      if (updated) setPrompts(updated);
    } catch (err) {
      console.error('Error triggering scoring/guidance:', err);
    }
  };

  // Generate prompt variants
  const generateVariants = async () => {
    if (!user) return;
    
    setVariantsLoading(true);
    try {
      const response = await supabase.functions.invoke('generate-prompt-variants', {
        body: { brandId },
      });

      if (response.error) {
        console.error('Error generating variants:', response.error);
        return;
      }

      // Fetch variants from database
      await fetchVariants();
    } catch (err) {
      console.error('Error generating variants:', err);
    } finally {
      setVariantsLoading(false);
    }
  };

  // Fetch existing variants
  const fetchVariants = async () => {
    if (!user) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!userData?.org_id) return;

      const { data: variants } = await supabase
        .from('prompt_variants')
        .select('base_prompt_id, model, variant_text')
        .eq('org_id', userData.org_id);

      if (variants) {
        const grouped: Record<string, { model: 'chatgpt' | 'gemini' | 'perplexity'; variant_text: string }[]> = {};
        for (const v of variants) {
          if (!grouped[v.base_prompt_id]) grouped[v.base_prompt_id] = [];
          grouped[v.base_prompt_id].push({
            model: v.model as 'chatgpt' | 'gemini' | 'perplexity',
            variant_text: v.variant_text,
          });
        }
        setPromptVariants(grouped);
      }
    } catch (err) {
      console.error('Error fetching variants:', err);
    }
  };

  // Load cached prompts on mount (no auto-generation)
  useEffect(() => {
    if (!user) return;

    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const init = async () => {
      setLoading(true);
      setGenerationProgress(5);

      const cached = await fetchCachedPrompts();
      if (cached && cached.length > 0) {
        setPrompts(cached);
      }

      setLoading(false);
      setGenerationProgress(0);
      fetchVariants();
    };

    init();
  }, [user, fetchCachedPrompts]);

  // Reset on brandId change (no auto-generation)
  useEffect(() => {
    if (!user) return;

    initialLoadDone.current = false;
    setScoringTriggered(false);
    setPrompts([]);
    setContext(null);
    setError(null);
    setGenerationProgress(0);

    // Re-fetch cache for the new brand
    const reinit = async () => {
      setLoading(true);
      const cached = await fetchCachedPrompts();
      if (cached && cached.length > 0) {
        setPrompts(cached);
      }
      setLoading(false);
    };

    reinit();
  }, [brandId, user, fetchCachedPrompts]);

  // Filter and sort prompts
  const filteredPrompts = useMemo(() => {
    return prompts
      .filter(p => {
        // Apply score filter
        if (filters.minScore > 0 && (p.confidence_score || 0) < filters.minScore) return false;
        // Apply funnel filter
        if (!filters.funnelStages.includes(p.funnel_stage)) return false;
        // Apply intent filter
        if (!filters.intentTypes.includes(p.intent_type)) return false;
        return true;
      })
      .sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
  }, [prompts, filters]);

  // Top 15 prompts sorted by score
  const topPrompts = useMemo(() => {
    return [...prompts]
      .sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0))
      .slice(0, 15);
  }, [prompts]);

  // Group prompts by intent
  const promptsByIntent = INTENT_TYPES.reduce((acc, intent) => {
    acc[intent] = filteredPrompts.filter(p => p.intent_type === intent);
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

  // Loading state with progress bar
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
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating AI-native prompts...</span>
              </div>
              <span className="text-muted-foreground font-medium">{generationProgress}%</span>
            </div>
            <Progress value={generationProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {generationProgress < 30 && "Analyzing your business context..."}
              {generationProgress >= 30 && generationProgress < 70 && "Generating prompts for all intent types..."}
              {generationProgress >= 70 && generationProgress < 90 && "Validating and organizing prompts..."}
              {generationProgress >= 90 && "Almost done!"}
            </p>
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

  // Empty state - no prompts yet, show generate button
  if (!loading && prompts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Intent-Driven Prompts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No prompts generated yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Generate AI-native prompts tailored to your business context, organized by intent type and funnel stage.
            </p>
            <Button onClick={() => generatePrompts()} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Prompts
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
              onValueChange={(v) => v && setViewMode(v as 'intent' | 'funnel' | 'competitive' | 'local' | 'top')}
              className="bg-muted rounded-md p-0.5"
            >
              <ToggleGroupItem 
                value="top" 
                aria-label="Top Prompts"
                className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background"
              >
                <Trophy className="h-3.5 w-3.5 mr-1" />
                Top 15
              </ToggleGroupItem>
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

            {/* Filters - show in top and intent views */}
            {(viewMode === 'top' || viewMode === 'intent') && (
              <PromptFilters filters={filters} onChange={setFilters} />
            )}

            {(viewMode === 'intent' || viewMode === 'top') && selectedPrompts.size > 0 && (
              <Button size="sm" onClick={acceptSelected}>
                <Plus className="h-4 w-4 mr-1" />
                Add {selectedPrompts.size} Selected
              </Button>
            )}
            {(viewMode === 'intent' || viewMode === 'top') && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateVariants}
                  disabled={variantsLoading || loading}
                  className="text-xs"
                >
                  {variantsLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Gen Variants
                </Button>
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
              </>
            )}
          </div>
        </div>

        {/* Context Accordion - show in intent and top views */}
        {(viewMode === 'intent' || viewMode === 'top') && context && (
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
        {/* Top View - Default */}
        {viewMode === 'top' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Top {Math.min(15, filteredPrompts.length)} prompts sorted by confidence score
              </p>
              {filteredPrompts.some(p => p.confidence_score !== undefined) && (
                <Badge variant="outline" className="text-[10px]">
                  Scored
                </Badge>
              )}
            </div>
            
            {filteredPrompts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No prompts match your filters
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPrompts.slice(0, 15).map((p, idx) => (
                  <PromptCard
                    key={`top-${idx}`}
                    prompt={p}
                    intentConfig={INTENT_CONFIG[p.intent_type]}
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
          </div>
        ) : viewMode === 'funnel' ? (
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
                      No prompts match your filters for this intent type
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
  variants?: { model: 'chatgpt' | 'gemini' | 'perplexity'; variant_text: string }[];
  basePromptId?: string;
  onMonitorVariant?: (model: string, variantText: string) => void;
  onStartMonitoring?: () => void;
}

function PromptCard({ prompt, intentConfig, isSelected, onToggleSelect, onAccept, variants, basePromptId, onMonitorVariant, onStartMonitoring }: PromptCardProps) {
  const Icon = intentConfig.icon;
  
  const handleStartMonitoring = () => {
    if (onStartMonitoring) {
      onStartMonitoring();
    } else {
      // Fallback: accept prompt to add it to monitoring
      onAccept();
    }
  };
  
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
            {/* Confidence Score */}
            <PromptConfidenceScore 
              score={prompt.confidence_score} 
              reasons={prompt.confidence_reasons} 
            />
            
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

          {/* Optimization Hint */}
          {prompt.optimization_hint && prompt.optimization_type && (
            <OptimizationHint
              hint={prompt.optimization_hint}
              type={prompt.optimization_type}
              isMonitored={prompt.is_monitored}
              onStartMonitoring={handleStartMonitoring}
              onImproveVisibility={onAccept}
              showCta={true}
            />
          )}

          {/* Variants Expander */}
          {variants && variants.length > 0 && basePromptId && (
            <PromptVariantsExpander
              basePromptId={basePromptId}
              variants={variants}
              onMonitorVariant={onMonitorVariant}
            />
          )}
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
