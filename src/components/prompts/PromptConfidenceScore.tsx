/**
 * Prompt Confidence Score Component
 * Displays confidence score badge with "Why this prompt?" tooltip
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

// Reason code to human-readable label mapping
const REASON_LABELS: Record<string, string> = {
  high_commercial_intent: 'High purchase intent',
  primary_offering_match: 'Matches your primary offering',
  secondary_offering_match: 'Matches a secondary offering',
  clear_user_language: 'Uses natural, conversational phrasing',
  good_length: 'Optimal prompt length',
  unique_angle: 'Unique approach or perspective',
  includes_brand_when_helpful: 'Includes brand name strategically',
  competitive_interception: 'Captures competitor comparison intent',
  local_relevance: 'Strong local intent',
  ambiguous_offering: 'May target excluded offerings',
  too_generic: 'Too generic for targeted visibility',
  too_long: 'Prompt is too long',
  duplicate_like: 'Similar to another prompt',
  weak_commercial_intent: 'Lower commercial intent',
  missing_geo_data: 'Missing geographic targeting data',
  llm_calibrated: 'Score adjusted by AI calibration',
};

interface PromptConfidenceScoreProps {
  score?: number;
  reasons?: string[];
  showTooltip?: boolean;
  size?: 'sm' | 'md';
}

export function PromptConfidenceScore({ 
  score, 
  reasons = [], 
  showTooltip = true,
  size = 'sm'
}: PromptConfidenceScoreProps) {
  if (score === undefined || score === null) return null;

  // Determine badge color based on score
  const getScoreColor = (s: number): string => {
    if (s >= 75) return 'bg-green-100 text-green-800 border-green-200';
    if (s >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Separate positive and negative reasons
  const positiveReasons = reasons.filter(r => 
    !['ambiguous_offering', 'too_generic', 'too_long', 'duplicate_like', 'weak_commercial_intent', 'missing_geo_data'].includes(r)
  );
  const negativeReasons = reasons.filter(r => 
    ['ambiguous_offering', 'too_generic', 'too_long', 'duplicate_like', 'weak_commercial_intent', 'missing_geo_data'].includes(r)
  );

  const badgeContent = (
    <Badge 
      variant="outline" 
      className={`${getScoreColor(score)} ${size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'} font-semibold`}
    >
      {score}
    </Badge>
  );

  if (!showTooltip || reasons.length === 0) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {badgeContent}
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="space-y-2">
            <p className="font-medium text-sm">Why this prompt?</p>
            
            {positiveReasons.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Strengths:</p>
                <ul className="text-xs space-y-0.5">
                  {positiveReasons.map(r => (
                    <li key={r} className="flex items-start gap-1">
                      <span className="text-green-600">+</span>
                      <span>{REASON_LABELS[r] || r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {negativeReasons.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Considerations:</p>
                <ul className="text-xs space-y-0.5">
                  {negativeReasons.map(r => (
                    <li key={r} className="flex items-start gap-1">
                      <span className="text-amber-600">−</span>
                      <span>{REASON_LABELS[r] || r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default PromptConfidenceScore;
