/**
 * Prompt Variants Expander Component
 * 
 * Shows LLM-specific phrasing variants (ChatGPT, Gemini, Perplexity) for a prompt.
 * Collapsed by default to avoid UI clutter.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  ChevronUp, 
  MessageSquare,
  Sparkles,
  Search,
  Plus,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface PromptVariant {
  model: 'chatgpt' | 'gemini' | 'perplexity';
  variant_text: string;
}

interface PromptVariantsExpanderProps {
  basePromptId: string;
  variants: PromptVariant[];
  onMonitorVariant?: (model: string, variantText: string) => void;
  className?: string;
}

const MODEL_CONFIG = {
  chatgpt: {
    label: 'ChatGPT',
    icon: MessageSquare,
    description: 'Conversational, casual',
    color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  },
  gemini: {
    label: 'Gemini',
    icon: Sparkles,
    description: 'Factual, neutral',
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  },
  perplexity: {
    label: 'Perplexity',
    icon: Search,
    description: 'Research-oriented',
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  },
};

export function PromptVariantsExpander({
  basePromptId,
  variants,
  onMonitorVariant,
  className = '',
}: PromptVariantsExpanderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'chatgpt' | 'gemini' | 'perplexity'>('chatgpt');

  if (!variants || variants.length === 0) {
    return null;
  }

  const variantsByModel = variants.reduce((acc, v) => {
    acc[v.model] = v.variant_text;
    return acc;
  }, {} as Record<string, string>);

  const hasAllModels = Object.keys(variantsByModel).length === 3;

  return (
    <div className={`border-t border-border/50 pt-2 mt-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between text-xs text-muted-foreground hover:text-foreground h-7"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          View model variants
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 opacity-50" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">Different LLMs phrase the same intent differently. These variants are optimized for each model's style.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          <Tabs 
            value={selectedModel} 
            onValueChange={(v) => setSelectedModel(v as typeof selectedModel)}
          >
            <TabsList className="h-8 w-full grid grid-cols-3">
              {(['chatgpt', 'gemini', 'perplexity'] as const).map((model) => {
                const config = MODEL_CONFIG[model];
                const Icon = config.icon;
                const hasVariant = !!variantsByModel[model];
                
                return (
                  <TabsTrigger 
                    key={model} 
                    value={model}
                    disabled={!hasVariant}
                    className="text-xs h-7 data-[state=active]:shadow-sm"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(['chatgpt', 'gemini', 'perplexity'] as const).map((model) => {
              const config = MODEL_CONFIG[model];
              const variantText = variantsByModel[model];
              
              if (!variantText) return null;
              
              return (
                <TabsContent key={model} value={model} className="mt-2">
                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] mb-1.5 ${config.color}`}
                        >
                          {config.description}
                        </Badge>
                        <p className="text-sm leading-relaxed">{variantText}</p>
                      </div>
                      
                      {onMonitorVariant && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => {
                            onMonitorVariant(model, variantText);
                            toast.success(`Added ${config.label} variant to monitoring`);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Monitor
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}
    </div>
  );
}
