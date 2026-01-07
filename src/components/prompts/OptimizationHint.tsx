/**
 * Optimization Hint Component
 * Displays optimization guidance with color-coded hints and action CTAs
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eye, TrendingUp, Zap, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

// Optimization type enum
type OptimizationType =
  | 'not_visible'
  | 'weak_visibility'
  | 'competitor_dominant'
  | 'local_gap'
  | 'strong_visibility'
  | 'high_intent_expand'
  | 'monitor_only'
  | 'insufficient_data';

// Color and style configuration per type
const TYPE_CONFIG: Record<OptimizationType, {
  color: string;
  icon: React.ElementType;
  ctaLabel?: string;
  ctaAction?: 'monitor' | 'improve' | 'expand';
}> = {
  // Warning types
  not_visible: {
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: AlertTriangle,
    ctaLabel: 'Improve Visibility',
    ctaAction: 'improve',
  },
  competitor_dominant: {
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: AlertTriangle,
    ctaLabel: 'Improve Visibility',
    ctaAction: 'improve',
  },
  
  // Neutral types
  weak_visibility: {
    color: 'text-muted-foreground bg-muted/50 border-border',
    icon: TrendingUp,
    ctaLabel: 'Improve Visibility',
    ctaAction: 'improve',
  },
  local_gap: {
    color: 'text-muted-foreground bg-muted/50 border-border',
    icon: TrendingUp,
    ctaLabel: 'Add Local Content',
    ctaAction: 'improve',
  },
  
  // Success type
  strong_visibility: {
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: CheckCircle,
  },
  
  // Action types
  high_intent_expand: {
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: Zap,
    ctaLabel: 'Start Monitoring',
    ctaAction: 'monitor',
  },
  monitor_only: {
    color: 'text-muted-foreground bg-muted/50 border-border',
    icon: Eye,
    ctaLabel: 'Start Monitoring',
    ctaAction: 'monitor',
  },
  
  // Fallback
  insufficient_data: {
    color: 'text-muted-foreground bg-muted/30 border-border',
    icon: HelpCircle,
    ctaLabel: 'Start Monitoring',
    ctaAction: 'monitor',
  },
};

interface OptimizationHintProps {
  hint?: string;
  type?: OptimizationType;
  isMonitored?: boolean;
  onStartMonitoring?: () => void;
  onImproveVisibility?: () => void;
  onExpandCoverage?: () => void;
  showCta?: boolean;
  compact?: boolean;
}

export function OptimizationHint({
  hint,
  type,
  isMonitored = false,
  onStartMonitoring,
  onImproveVisibility,
  onExpandCoverage,
  showCta = true,
  compact = false,
}: OptimizationHintProps) {
  if (!hint || !type) return null;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.insufficient_data;
  const Icon = config.icon;

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (config.ctaAction === 'monitor' && onStartMonitoring) {
      onStartMonitoring();
    } else if (config.ctaAction === 'improve' && onImproveVisibility) {
      onImproveVisibility();
    } else if (config.ctaAction === 'expand' && onExpandCoverage) {
      onExpandCoverage();
    }
  };

  // Don't show monitor CTA if already monitored
  const shouldShowCta = showCta && config.ctaLabel && (
    config.ctaAction !== 'monitor' || !isMonitored
  );

  if (compact) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border',
        config.color
      )}>
        <Icon className="h-3 w-3 flex-shrink-0" />
        <span className="truncate max-w-[200px]">{hint}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-start gap-2 text-xs p-2 rounded-md border mt-2',
      config.color
    )}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="leading-snug">{hint}</p>
      </div>
      {shouldShowCta && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px] font-medium hover:bg-background/50 flex-shrink-0"
          onClick={handleCtaClick}
        >
          {config.ctaLabel}
        </Button>
      )}
    </div>
  );
}

export default OptimizationHint;
