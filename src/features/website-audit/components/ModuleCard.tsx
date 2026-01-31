import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MODULE_LABELS, MODULE_DESCRIPTIONS, AuditCheck } from '../types';

interface ModuleCardProps {
  module: string;
  score: number;
  checks: AuditCheck[];
  onClick?: () => void;
}

export function ModuleCard({ module, score, checks, onClick }: ModuleCardProps) {
  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/20';
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
    if (score >= 40) return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  return (
    <Card 
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow border',
        getScoreBg(score)
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {MODULE_LABELS[module] || module}
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold text-white',
                getScoreColor(score)
              )}>
                {score}
              </span>
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {MODULE_DESCRIPTIONS[module]}
            </CardDescription>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
        
        <div className="flex items-center gap-3 mt-3 text-xs">
          {passCount > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-3.5 h-3.5" />
              {passCount} passed
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertCircle className="w-3.5 h-3.5" />
              {warnCount} warnings
            </span>
          )}
          {failCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-3.5 h-3.5" />
              {failCount} failed
            </span>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
