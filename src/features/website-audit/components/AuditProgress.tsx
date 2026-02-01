import { Progress } from '@/components/ui/progress';
import { Check, Loader2, Globe, FileSearch, BarChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CrawlProgress } from '../types';

interface AuditProgressProps {
  domain: string;
  phase: 'idle' | 'initializing' | 'crawling' | 'scoring' | 'done' | 'error';
  progress: CrawlProgress | null;
}

const PHASES = [
  { key: 'initializing', label: 'Initializing audit...', icon: Globe },
  { key: 'crawling', label: 'Crawling pages...', icon: FileSearch },
  { key: 'scoring', label: 'Analyzing & scoring...', icon: BarChart },
];

export function AuditProgress({ domain, phase, progress }: AuditProgressProps) {
  // Calculate overall progress
  let overallProgress = 0;
  
  if (phase === 'initializing') {
    overallProgress = 5;
  } else if (phase === 'crawling' && progress) {
    // Crawling is 10-80% of total progress
    const crawlProgress = progress.crawl_limit > 0 
      ? (progress.crawled_count / progress.crawl_limit) * 100 
      : 0;
    overallProgress = 10 + (crawlProgress * 0.7);
  } else if (phase === 'scoring') {
    overallProgress = 85;
  } else if (phase === 'done') {
    overallProgress = 100;
  }

  const getPhaseIndex = () => {
    switch (phase) {
      case 'initializing': return 0;
      case 'crawling': return 1;
      case 'scoring': return 2;
      case 'done': return 3;
      default: return -1;
    }
  };

  const currentPhaseIndex = getPhaseIndex();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Auditing {domain}</h2>
        <p className="text-muted-foreground">
          {phase === 'crawling' && progress
            ? `Crawled ${progress.crawled_count} of ${progress.crawl_limit} pages`
            : phase === 'scoring'
            ? 'Analyzing SEO & GEO factors...'
            : 'Setting up the audit...'}
        </p>
      </div>

      <Progress value={overallProgress} className="h-3" />

      {/* Crawl stats */}
      {phase === 'crawling' && progress && (
        <div className="grid grid-cols-2 gap-4 text-center max-w-sm mx-auto">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{progress.crawled_count}</div>
            <div className="text-xs text-muted-foreground">Pages Crawled</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{progress.crawl_limit}</div>
            <div className="text-xs text-muted-foreground">Target</div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {PHASES.map((phaseItem, index) => {
          const isComplete = index < currentPhaseIndex;
          const isCurrent = index === currentPhaseIndex;
          const isPending = index > currentPhaseIndex;
          const Icon = phaseItem.icon;

          return (
            <div
              key={phaseItem.key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                isComplete && 'bg-green-500/10',
                isCurrent && 'bg-primary/10',
                isPending && 'opacity-50'
              )}
            >
              {isComplete && <Check className="w-5 h-5 text-green-500" />}
              {isCurrent && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
              {isPending && <Icon className="w-5 h-5 text-muted-foreground" />}
              <span className={cn(
                'font-medium',
                isComplete && 'text-green-700 dark:text-green-400',
                isCurrent && 'text-primary'
              )}>
                {phaseItem.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {phase === 'crawling' 
          ? 'This may take a few minutes for larger sites...'
          : 'Please wait while we analyze your website...'}
      </p>
    </div>
  );
}
