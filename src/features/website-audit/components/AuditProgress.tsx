import { Progress } from '@/components/ui/progress';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCAN_STEPS } from '../types';

interface AuditProgressProps {
  currentStep: number;
  domain: string;
}

export function AuditProgress({ currentStep, domain }: AuditProgressProps) {
  const progress = ((currentStep + 1) / SCAN_STEPS.length) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Auditing {domain}</h2>
        <p className="text-muted-foreground">
          This may take 30-60 seconds depending on your site size
        </p>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="space-y-2">
        {SCAN_STEPS.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                isComplete && 'bg-green-500/10',
                isCurrent && 'bg-primary/10',
                isPending && 'opacity-50'
              )}
            >
              {isComplete && <Check className="w-5 h-5 text-green-500" />}
              {isCurrent && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
              {isPending && <div className="w-5 h-5 rounded-full border-2 border-muted" />}
              <span className={cn(
                'font-medium',
                isComplete && 'text-green-700',
                isCurrent && 'text-primary'
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
