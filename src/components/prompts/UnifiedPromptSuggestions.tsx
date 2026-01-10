/**
 * Unified Prompt Suggestions Component
 * 
 * Combines Intent Prompts and Classic Suggestions into a single view
 * with a toggle to enable/disable Intent Prompts.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, Sparkles } from 'lucide-react';
import { IntentPromptSuggestions } from './IntentPromptSuggestions';
import { PromptSuggestions } from '@/components/PromptSuggestions';

interface UnifiedPromptSuggestionsProps {
  brandId?: string | null;
  // Intent prompt callbacks
  onAcceptIntentPrompt?: (prompt: string) => void;
  onAcceptMultipleIntentPrompts?: (prompts: string[]) => void;
  // Classic suggestion props
  classicSuggestions: any[];
  classicLoading: boolean;
  classicGenerating: boolean;
  onAcceptClassic: (suggestionId: string) => void;
  onDismissClassic: (suggestionId: string) => void;
  onGenerateClassic: () => void;
  onClassicSettingsUpdated?: () => void;
}

export function UnifiedPromptSuggestions({
  brandId,
  onAcceptIntentPrompt,
  onAcceptMultipleIntentPrompts,
  classicSuggestions,
  classicLoading,
  classicGenerating,
  onAcceptClassic,
  onDismissClassic,
  onGenerateClassic,
  onClassicSettingsUpdated,
}: UnifiedPromptSuggestionsProps) {
  const [intentPromptsEnabled, setIntentPromptsEnabled] = useState(true);

  return (
    <div className="space-y-6">
      {/* Toggle Card */}
      <Card className="shadow-soft rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Prompt Suggestions</CardTitle>
                <CardDescription>
                  AI-generated prompts tailored to your brand
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
                <Zap className="h-4 w-4 text-amber-500" />
                <Label htmlFor="intent-toggle" className="text-sm font-medium cursor-pointer">
                  Intent Prompts
                </Label>
                <Switch
                  id="intent-toggle"
                  checked={intentPromptsEnabled}
                  onCheckedChange={setIntentPromptsEnabled}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Intent Prompts Section */}
      {intentPromptsEnabled && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <IntentPromptSuggestions
            brandId={brandId}
            onAcceptPrompt={onAcceptIntentPrompt}
            onAcceptMultiple={onAcceptMultipleIntentPrompts}
          />
        </div>
      )}

      {/* Classic Suggestions Section */}
      <div className={intentPromptsEnabled ? 'mt-8' : ''}>
        {intentPromptsEnabled && (
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-sm text-muted-foreground px-3">Classic Suggestions</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
        )}
        <PromptSuggestions
          suggestions={classicSuggestions}
          loading={classicLoading}
          generating={classicGenerating}
          onAccept={onAcceptClassic}
          onDismiss={onDismissClassic}
          onGenerate={onGenerateClassic}
          onSettingsUpdated={onClassicSettingsUpdated}
        />
      </div>
    </div>
  );
}
