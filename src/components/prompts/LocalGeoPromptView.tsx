/**
 * Local & Geo-Optimized Prompt View Component
 * 
 * Displays local prompts with city/state/near-me chips.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  includeInFunnel = false,
  onIncludeInFunnelChange,
}: LocalGeoPromptViewProps) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<LocalPrompt[]>([]);
  const [geoTargets, setGeoTargets] = useState<string[]>([]);
  const [geoScope, setGeoScope] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [skipReason, setSkipReason] = useState<string | null>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());

  // Generate prompts
  const generatePrompts = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSkipped(false);

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
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      setPrompts(result.data || []);
      setGeoTargets(result.geo_targets || []);
      setGeoScope(result.geo_scope || '');
      
      if (result.cached) {
        toast.info('Loaded cached local prompts');
      }
    } catch (err) {
      console.error('Error generating local prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
      toast.error('Failed to generate local prompts');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    generatePrompts();
  }, [brandId, user]);

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

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating local prompts...</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Skipped state (not a local business)
  if (skipped) {
    return (
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
    );
  }

  // Error state
  if (error && prompts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={generatePrompts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (prompts.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground mb-4">
          No local prompts generated yet.
        </p>
        <Button onClick={generatePrompts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate Local Prompts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-4">
          {/* Include in Funnel Toggle */}
          {onIncludeInFunnelChange && (
            <div className="flex items-center gap-2">
              <Switch
                id="include-local-funnel"
                checked={includeInFunnel}
                onCheckedChange={onIncludeInFunnelChange}
              />
              <Label htmlFor="include-local-funnel" className="text-xs text-muted-foreground">
                Include in Funnel View
              </Label>
            </div>
          )}

          {selectedPrompts.size > 0 && (
            <Button size="sm" onClick={acceptSelected}>
              <Plus className="h-4 w-4 mr-1" />
              Add {selectedPrompts.size} Selected
            </Button>
          )}

          <Button 
            size="sm" 
            variant="outline" 
            onClick={generatePrompts}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Local AI prompts based on how people ask ChatGPT for local recommendations
      </p>

      {/* Prompts grouped by seed topic */}
      <div className="space-y-6">
        {Object.entries(promptsBySeedTopic).map(([topic, topicPrompts]) => {
          const config = SEED_TOPIC_CONFIG[topic] || { label: topic, icon: MapPin };
          const Icon = config.icon;

          return (
            <div key={topic} className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                {config.label}
                <Badge variant="secondary" className="text-[10px]">
                  {topicPrompts.length}
                </Badge>
              </h4>

              <div className="space-y-2">
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
              </div>
            </div>
          );
        })}
      </div>
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
            <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
              <MapPin className="h-3 w-3 mr-1" />
              {prompt.intent_type.replace('_', ' ')}
            </Badge>
            
            <Badge variant="secondary" className={`text-[10px] ${FUNNEL_COLORS[prompt.funnel_stage]}`}>
              {prompt.funnel_stage}
            </Badge>

            {/* Geo target chip */}
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
            variant="ghost"
            className="h-7 px-2"
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
