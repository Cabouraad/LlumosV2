import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

export function ScoreGauge({ score, size = 'md', showLabel = true, label }: ScoreGaugeProps) {
  const sizeClasses = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-24 h-24 text-2xl',
    lg: 'w-32 h-32 text-4xl'
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500 border-green-500/30 bg-green-500/10';
    if (score >= 60) return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
    if (score >= 40) return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
    return 'text-red-500 border-red-500/30 bg-red-500/10';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'rounded-full border-4 flex items-center justify-center font-bold',
          sizeClasses[size],
          getScoreColor(score)
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          {label || getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}
