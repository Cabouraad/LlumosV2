import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionGate, TierLimits } from '@/hooks/useSubscriptionGate';

interface QuotaUsageBarProps {
  promptsUsed: number;
  className?: string;
}

export function QuotaUsageBar({ promptsUsed, className = '' }: QuotaUsageBarProps) {
  const navigate = useNavigate();
  const { currentTier, limits, isFreeTier } = useSubscriptionGate();
  
  const maxPrompts = limits.maxPrompts ?? limits.promptsPerDay;
  const usagePercent = Math.min((promptsUsed / maxPrompts) * 100, 100);
  const remaining = Math.max(maxPrompts - promptsUsed, 0);
  
  // Don't show for paid tiers with unlimited prompts
  if (!isFreeTier && !limits.maxPrompts) {
    return null;
  }
  
  const isNearLimit = usagePercent >= 80;
  const isAtLimit = promptsUsed >= maxPrompts;
  
  return (
    <Card className={`${className} ${isAtLimit ? 'border-destructive' : isNearLimit ? 'border-amber-500' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isFreeTier ? (
              <>
                <Clock className="h-4 w-4 text-muted-foreground" />
                Weekly Prompt Usage
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-primary" />
                Daily Prompt Usage
              </>
            )}
          </CardTitle>
          <Badge variant={isFreeTier ? 'secondary' : 'default'} className="text-xs">
            {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {promptsUsed} of {maxPrompts} prompts used
            </span>
            <span className={isAtLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {remaining} remaining
            </span>
          </div>
          <Progress 
            value={usagePercent} 
            className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-amber-500' : ''}`}
          />
        </div>
        
        {isAtLimit && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">
              {isFreeTier 
                ? "You've used all your weekly prompts. Upgrade to track more."
                : "You've reached your daily limit. Resets at midnight UTC."
              }
            </p>
          </div>
        )}
        
        {isFreeTier && !isAtLimit && (
          <div className="text-xs text-muted-foreground">
            Free plan runs weekly. 
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 pl-1 text-xs text-primary"
              onClick={() => navigate('/pricing')}
            >
              Upgrade for daily tracking →
            </Button>
          </div>
        )}
        
        {isFreeTier && (
          <Button 
            size="sm" 
            className="w-full" 
            variant={isAtLimit ? 'default' : 'outline'}
            onClick={() => navigate('/pricing')}
          >
            <Zap className="h-3 w-3 mr-1" />
            {isAtLimit ? 'Upgrade Now' : 'View Plans'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}