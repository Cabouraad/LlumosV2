/**
 * Scan Progress Component
 * Shows the progress of the Local Authority scan with animated stages
 */

import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2, AlertCircle, Building2, FileText, Play, BarChart3, Sparkles } from 'lucide-react';
import { ScanStage } from '@/hooks/useLocalAuthority';

interface ScanProgressProps {
  stage: ScanStage;
  error?: string | null;
  promptCounts?: { geo_cluster: number; implicit: number; radius_neighborhood: number; problem_intent: number } | null;
}

const stages: Array<{
  id: ScanStage;
  title: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: 'creating_profile',
    title: 'Setting up profile',
    description: 'Saving your business configuration',
    icon: Building2,
  },
  {
    id: 'generating_prompts',
    title: 'Building prompt plan',
    description: 'Generating local AI prompts',
    icon: FileText,
  },
  {
    id: 'creating_run',
    title: 'Checking AI models',
    description: 'Preparing scan across ChatGPT, Gemini, Perplexity',
    icon: Play,
  },
  {
    id: 'executing_scan',
    title: 'Running local prompts',
    description: 'Querying AI models and extracting data',
    icon: BarChart3,
  },
  {
    id: 'complete',
    title: 'Calculating score',
    description: 'Computing your Local AI Authority Score',
    icon: Sparkles,
  },
];

const stageOrder: ScanStage[] = ['idle', 'creating_profile', 'generating_prompts', 'creating_run', 'executing_scan', 'complete'];

function getStageIndex(stage: ScanStage): number {
  return stageOrder.indexOf(stage);
}

export function ScanProgress({ stage, error, promptCounts }: ScanProgressProps) {
  const currentIndex = getStageIndex(stage);
  const progress = stage === 'complete' ? 100 : stage === 'error' ? 0 : Math.min(95, (currentIndex / (stageOrder.length - 1)) * 100);

  if (stage === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Scan Failed</h3>
        <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
      </motion.div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Running Local AI Scan</h3>
        <p className="text-muted-foreground">
          This typically takes 30-60 seconds. Please don't close this page.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <Progress value={progress} className="h-2 mb-6" />
        
        <div className="space-y-4">
          {stages.map((s, index) => {
            const stageIdx = getStageIndex(s.id);
            const isComplete = currentIndex > stageIdx;
            const isCurrent = stage === s.id;
            const isPending = currentIndex < stageIdx;
            const Icon = s.icon;

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                  isCurrent ? 'bg-primary/10' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isComplete 
                    ? 'bg-primary text-primary-foreground' 
                    : isCurrent 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isPending ? 'text-muted-foreground' : ''}`}>
                    {s.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.description}
                    {s.id === 'generating_prompts' && promptCounts && (
                      <span className="ml-1">
                        ({Object.values(promptCounts).reduce((a, b) => a + b, 0)} prompts)
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
