/**
 * Prompt Filters Component
 * Provides filtering controls for prompts by score, funnel stage, and intent type
 */

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface PromptFiltersState {
  minScore: number;
  funnelStages: string[];
  intentTypes: string[];
}

interface PromptFiltersProps {
  filters: PromptFiltersState;
  onChange: (filters: PromptFiltersState) => void;
  availableFunnelStages?: string[];
  availableIntentTypes?: string[];
}

const DEFAULT_FUNNEL_STAGES = ['TOFU', 'MOFU', 'BOFU'];
const DEFAULT_INTENT_TYPES = ['discovery', 'validation', 'comparison', 'recommendation', 'action', 'local_intent'];

const INTENT_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  validation: 'Validation',
  comparison: 'Comparison',
  recommendation: 'Recommendation',
  action: 'Action',
  local_intent: 'Local',
};

export function PromptFilters({
  filters,
  onChange,
  availableFunnelStages = DEFAULT_FUNNEL_STAGES,
  availableIntentTypes = DEFAULT_INTENT_TYPES,
}: PromptFiltersProps) {
  const activeFilterCount = 
    (filters.minScore > 0 ? 1 : 0) +
    (filters.funnelStages.length < availableFunnelStages.length ? 1 : 0) +
    (filters.intentTypes.length < availableIntentTypes.length ? 1 : 0);

  const handleFunnelToggle = (stage: string) => {
    const newStages = filters.funnelStages.includes(stage)
      ? filters.funnelStages.filter(s => s !== stage)
      : [...filters.funnelStages, stage];
    onChange({ ...filters, funnelStages: newStages });
  };

  const handleIntentToggle = (intent: string) => {
    const newIntents = filters.intentTypes.includes(intent)
      ? filters.intentTypes.filter(i => i !== intent)
      : [...filters.intentTypes, intent];
    onChange({ ...filters, intentTypes: newIntents });
  };

  const resetFilters = () => {
    onChange({
      minScore: 0,
      funnelStages: availableFunnelStages,
      intentTypes: availableIntentTypes,
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filter Prompts</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={resetFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Minimum Score Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Minimum Score</Label>
              <span className="text-xs font-medium">{filters.minScore}+</span>
            </div>
            <Slider
              value={[filters.minScore]}
              min={0}
              max={100}
              step={5}
              onValueChange={([value]) => onChange({ ...filters, minScore: value })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>All</span>
              <span>50+</span>
              <span>75+</span>
              <span>100</span>
            </div>
          </div>

          {/* Funnel Stage Checkboxes */}
          <div className="space-y-2">
            <Label className="text-xs">Funnel Stage</Label>
            <div className="flex flex-wrap gap-2">
              {availableFunnelStages.map(stage => (
                <label
                  key={stage}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.funnelStages.includes(stage)}
                    onCheckedChange={() => handleFunnelToggle(stage)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs">{stage}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Intent Type Checkboxes */}
          <div className="space-y-2">
            <Label className="text-xs">Intent Type</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {availableIntentTypes.map(intent => (
                <label
                  key={intent}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.intentTypes.includes(intent)}
                    onCheckedChange={() => handleIntentToggle(intent)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs">{INTENT_LABELS[intent] || intent}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const defaultFilters: PromptFiltersState = {
  minScore: 0,
  funnelStages: DEFAULT_FUNNEL_STAGES,
  intentTypes: DEFAULT_INTENT_TYPES,
};

export default PromptFilters;
