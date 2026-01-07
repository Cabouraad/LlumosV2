/**
 * Local & Geo-Optimized Prompt View Component
 * 
 * Displays local prompts with city/state/near-me chips.
 * Matches styling with Classic Suggestions tab.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  MapPin,
  CheckCircle2,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Navigation,
  Building2,
  Sparkles,
  Clock,
  Check,
  X,
} from 'lucide-react';

// ============= TYPES =============
type IntentType = 'discovery' | 'validation' | 'comparison' | 'recommendation' | 'action' | 'local_intent';
type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

interface LocalPrompt {
  prompt: string;
  intent_type: IntentType;
  why_relevant: string;
  target_offering: string;
  funnel_stage: FunnelStage;
  needs_geo_variant: boolean;
  seed_topic: string;
  geo_target?: string;
}

// ============= CONSTANTS =============
const SEED_TOPIC_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  'near me': { label: 'Near Me', icon: Navigation },
  'best in city': { label: 'Best In City', icon: Building2 },
  'local reviews': { label: 'Local Reviews', icon: CheckCircle2 },
  'open now': { label: 'Open Now', icon: AlertCircle },
  'book local': { label: 'Book Local', icon: MapPin },
};

const FUNNEL_COLORS: Record<FunnelStage, string> = {
  TOFU: 'bg-blue-100 text-blue-800',
  MOFU: 'bg-amber-100 text-amber-800',
  BOFU: 'bg-green-100 text-green-800',
};

// ============= COMPONENT =============
interface LocalGeoPromptViewProps {
  brandId?: string | null;
  onAcceptPrompt?: (prompt: string) => void;
  onAcceptMultiple?: (prompts: string[]) => void;
  includeInFunnel?: boolean;
  onIncludeInFunnelChange?: (value: boolean) => void;
}

export function LocalGeoPromptView({
  brandId,
  onAcceptPrompt,
  onAcceptMultiple,
}: LocalGeoPromptViewProps) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<LocalPrompt[]>([]);
  const [geoTargets, setGeoTargets] = useState<string[]>([]);
  const [geoScope, setGeoScope] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [skipReason, setSkipReason] = useState<string | null>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  // Fetch cached prompts from database
  const fetchCachedPrompts = useCallback(async () => {
    if (!user) return null;
    
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!userData?.org_id) return null;

      // Query for local-geo type suggestions
      const { data: suggestions, error } = await supabase
        .from('prompt_suggestions')
        .select('prompts_json, generation_params, status')
        .eq('org_id', userData.org_id)
        .eq('suggestion_type', 'local-geo')
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('[LocalGeo] Cache fetch error:', error.message);
        return null;
      }

      if (suggestions?.prompts_json) {
        const promptsData = suggestions.prompts_json as unknown as LocalPrompt[];
        const params = suggestions.generation_params as any;
        console.log('[LocalGeo] Cache HIT:', promptsData.length, 'prompts');
        return { 
          prompts: promptsData, 
          geoTargets: params?.geo_targets || [],
          geoScope: params?.geo_scope || ''
        };
      }
      console.log('[LocalGeo] Cache MISS - no ready prompts found');
      return null;
    } catch (err) {
      console.error('Error fetching cached local prompts:', err);
      return null;
    }
  }, [user]);

  // Generate prompts (only when explicitly called)
  const generatePrompts = async () => {
    if (!user) return;
    
    setGenerating(true);
    setError(null);
    setSkipped(false);
    setGenerationProgress(10);

    try {
      const response = await supabase.functions.invoke('generate-local-geo-prompts', {
        body: { 
          brandId, 
          params: { perCity: 3 } 
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate local prompts');
      }

      const result = response.data;
      
      if (result.skipped) {
        setSkipped(true);
        setSkipReason(result.reason);
        setGeoScope(result.geo_scope || 'unknown');
        setGenerating(false);
        setGenerationProgress(0);
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      setPrompts(result.data || []);
      setGeoTargets(result.geo_targets || []);
      setGeoScope(result.geo_scope || '');
      setGenerationProgress(100);
      
      if (result.cached) {
        toast.info('Loaded cached local prompts');
      } else {
        toast.success(`Generated ${result.data?.length || 0} local prompts`);
      }
      
      setTimeout(() => setGenerationProgress(0), 500);
    } catch (err) {
      console.error('Error generating local prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
      toast.error('Failed to generate local prompts');
      setGenerationProgress(0);
    } finally {
      setGenerating(false);
    }
  };

  // Load cached prompts on mount (no auto-generation)
  useEffect(() => {
    if (!user) return;
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const init = async () => {
      setLoading(true);
      const cached = await fetchCachedPrompts();
      if (cached) {
        setPrompts(cached.prompts);
        setGeoTargets(cached.geoTargets);
        setGeoScope(cached.geoScope);
      }
      setLoading(false);
    };

    init();
  }, [user, fetchCachedPrompts]);

  // Reset on brandId change
  useEffect(() => {
    if (!user) return;
    
    initialLoadDone.current = false;
    setPrompts([]);
    setError(null);
    setSkipped(false);
    setGenerationProgress(0);

    const reinit = async () => {
      setLoading(true);
      const cached = await fetchCachedPrompts();
      if (cached) {
        setPrompts(cached.prompts);
        setGeoTargets(cached.geoTargets);
        setGeoScope(cached.geoScope);
      }
      setLoading(false);
    };

    reinit();
  }, [brandId, user, fetchCachedPrompts]);

  // Group prompts by seed_topic
  const promptsBySeedTopic = prompts.reduce((acc, p) => {
    const topic = p.seed_topic || 'other';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(p);
    return acc;
  }, {} as Record<string, LocalPrompt[]>);

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

  // Loading skeleton state
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-soft rounded-2xl border-0">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
        </Card>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-soft rounded-2xl border-0">
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Skipped state (not a local business)
  if (skipped) {
    return (
      <div className="space-y-6">
        <Card className="shadow-soft rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-6 w-6 text-muted-foreground" />
              Localized Prompts
            </CardTitle>
            <CardDescription>
              Generate location-specific prompts for local businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">
                Local prompts are not available for this business.
              </p>
              <p className="text-sm text-muted-foreground">
                {skipReason === 'not_local_business' 
                  ? 'Your business appears to be national or global in scope.'
                  : 'Add a city or state to your organization settings to enable local prompts.'}
              </p>
              <Badge variant="outline" className="mt-4">
                Geographic Scope: {geoScope || 'Global'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && prompts.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="shadow-soft rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-6 w-6 text-destructive" />
              Localized Prompts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive/50" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={generatePrompts}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state - show generate button
  if (prompts.length === 0 && !generating) {
    return (
      <div className="space-y-6">
        <Card className="shadow-soft rounded-2xl border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="h-6 w-6 text-accent" />
                  Localized Prompts
                </CardTitle>
                <CardDescription className="mt-2">
                  Generate location-specific prompts like "best [service] in [city]" based on your business location
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No local prompts generated yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Generate AI-native local prompts tailored to your business location, perfect for "near me" and city-specific queries.
              </p>
              <Button onClick={generatePrompts} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-soft">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Local Prompts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generating state with progress
  if (generating) {
    return (
      <div className="space-y-6">
        <Card className="shadow-soft rounded-2xl border-0 overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <MapPin className="h-7 w-7 text-primary animate-bounce" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Clock className="h-3 w-3 text-accent-foreground animate-spin" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    Generating Local Prompts
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Creating location-specific prompts for your business...
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={generationProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing...</span>
                  <span>{Math.round(generationProgress)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-soft rounded-2xl border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="h-6 w-6 text-accent" />
                Localized Prompts
              </CardTitle>
              <CardDescription className="mt-2">
                {prompts.length} location-specific prompts for local AI visibility
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedPrompts.size > 0 && (
                <Button size="sm" onClick={acceptSelected}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add {selectedPrompts.size} Selected
                </Button>
              )}
              <Button
                onClick={generatePrompts}
                disabled={generating}
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-soft"
              >
                {generating ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate More
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Geo scope info */}
      <div className="flex items-center gap-2 px-2">
        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
          <MapPin className="h-3 w-3 mr-1" />
          {geoScope} scope
        </Badge>
        {geoTargets.map(target => (
          <Badge key={target} variant="secondary" className="text-xs">
            {target}
          </Badge>
        ))}
      </div>

      {/* Prompts grouped by seed topic */}
      {Object.entries(promptsBySeedTopic).map(([topic, topicPrompts]) => {
        const config = SEED_TOPIC_CONFIG[topic] || { label: topic, icon: MapPin };
        const Icon = config.icon;

        return (
          <Card key={topic} className="shadow-soft rounded-2xl border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {config.label}
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {topicPrompts.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topicPrompts.map((p, idx) => (
                <LocalPromptCard
                  key={`${topic}-${idx}`}
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============= PROMPT CARD =============
interface LocalPromptCardProps {
  prompt: LocalPrompt;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAccept: () => void;
}

function LocalPromptCard({ prompt, isSelected, onToggleSelect, onAccept }: LocalPromptCardProps) {
  return (
    <div
      className={`
        p-4 rounded-xl border transition-all cursor-pointer
        ${isSelected 
          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
          : 'border-border/50 hover:border-primary/50 hover:bg-muted/50'
        }
      `}
      onClick={onToggleSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Prompt Text */}
          <p className="text-sm font-medium leading-snug">
            "{prompt.prompt}"
          </p>

          {/* Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
              <MapPin className="h-3 w-3 mr-1" />
              {prompt.intent_type.replace('_', ' ')}
            </Badge>
            
            <Badge variant="secondary" className={`text-[10px] ${FUNNEL_COLORS[prompt.funnel_stage]}`}>
              {prompt.funnel_stage}
            </Badge>

            {prompt.geo_target && (
              <Badge variant="outline" className="text-[10px]">
                <Navigation className="h-2.5 w-2.5 mr-1" />
                {prompt.geo_target}
              </Badge>
            )}

            {prompt.needs_geo_variant && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                near me
              </Badge>
            )}
            
            {prompt.target_offering !== 'general' && (
              <Badge variant="outline" className="text-[10px]">
                {prompt.target_offering}
              </Badge>
            )}
          </div>

          {/* Why relevant */}
          <p className="text-xs text-muted-foreground">
            {prompt.why_relevant}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isSelected && (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 border-success/30 hover:bg-success/10"
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
          >
            <Check className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
