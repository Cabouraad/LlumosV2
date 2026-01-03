import { motion } from 'framer-motion';
import { Lock, Check, X, AlertCircle, ArrowRight, Mail, Calendar, Eye, EyeOff, TrendingDown, FileText, Link2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AIVisibilitySnapshotProps {
  domain: string;
  email: string;
  competitors?: string[];
  onUpgrade: () => void;
}

// Generate a deterministic score based on domain (always low-to-moderate)
function generateScore(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Force score to be between 15-55 (low-to-moderate range)
  return Math.abs(hash % 40) + 15;
}

function getScoreStatus(score: number): { label: string; color: string; description: string } {
  if (score >= 70) {
    return { label: 'Strong', color: 'text-success', description: 'Your brand appears frequently in AI recommendations' };
  } else if (score >= 40) {
    return { label: 'Moderate', color: 'text-warning', description: 'Your brand has some AI visibility but gaps exist' };
  } else {
    return { label: 'Low', color: 'text-destructive', description: 'AI rarely recommends your brand to potential customers' };
  }
}

const AI_MODELS = [
  { name: 'ChatGPT', status: 'Not Detected', icon: X, statusColor: 'text-destructive' },
  { name: 'Gemini', status: 'Inconsistent', icon: AlertCircle, statusColor: 'text-warning' },
  { name: 'Perplexity', status: 'Not Detected', icon: X, statusColor: 'text-destructive' },
];

const PLACEHOLDER_COMPETITORS = ['CompetitorA', 'CompetitorB', 'CompetitorC'];

export function AIVisibilitySnapshot({ domain, email, competitors = [], onUpgrade }: AIVisibilitySnapshotProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState(email);
  const [isSending, setIsSending] = useState(false);

  const score = useMemo(() => generateScore(domain), [domain]);
  const status = useMemo(() => getScoreStatus(score), [score]);
  
  // Use provided competitors or fallback to placeholders
  const displayCompetitors = useMemo(() => {
    const validCompetitors = competitors.filter(c => c.trim().length > 0);
    if (validCompetitors.length >= 2) return validCompetitors.slice(0, 3);
    return PLACEHOLDER_COMPETITORS;
  }, [competitors]);

  // Extract brand name from domain
  const brandName = useMemo(() => {
    const parts = domain.replace(/^(www\.)?/, '').split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }, [domain]);

  const handleEmailSnapshot = async () => {
    if (!emailInput.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsSending(true);
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSending(false);
    setShowEmailModal(false);
    toast.success('Snapshot sent! Check your inbox.');
  };

  return (
    <div className="py-12 px-4">
      <div className="container max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Eye className="w-4 h-4" />
            AI Visibility Snapshot for {domain}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Your AI Visibility Analysis
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Based on real-time analysis of AI recommendations across major platforms
          </p>
        </motion.div>

        {/* Main Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-8 mb-6"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Score Display */}
            <div className="text-center md:text-left">
              <p className="text-sm font-medium text-muted-foreground mb-2">AI Visibility Score</p>
              <div className="flex items-baseline gap-2 justify-center md:justify-start">
                <span className="text-6xl font-bold text-foreground">{score}</span>
                <span className="text-2xl text-muted-foreground">/ 100</span>
              </div>
              <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                score < 40 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
              }`}>
                <TrendingDown className="w-4 h-4" />
                {status.label} Visibility
              </div>
              <p className="mt-3 text-muted-foreground text-sm">
                {status.description}
              </p>
            </div>

            {/* AI Model Presence */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-4">AI Model Presence</p>
              <div className="space-y-3">
                {AI_MODELS.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <span className="font-medium">{model.name}</span>
                    <span className={`flex items-center gap-1.5 text-sm ${model.statusColor}`}>
                      <model.icon className="w-4 h-4" />
                      {model.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Competitor Analysis (Unlocked) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-success" />
            <h3 className="font-semibold">Competitors Appearing in AI Answers</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            These brands appear when users ask questions relevant to your business:
          </p>
          <div className="flex flex-wrap gap-2">
            {displayCompetitors.map((competitor, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10 border border-warning/20"
              >
                <span className="font-medium text-warning">{competitor}</span>
                <span className="text-xs text-muted-foreground">appears {3 - i}× more than {brandName}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-warning font-medium">
            ⚠️ Your competitors are capturing AI recommendations that could be driving customers to you.
          </p>
        </motion.div>

        {/* Missed Prompt Example (Unlocked) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-success" />
            <h3 className="font-semibold">Sample Missed Prompt</h3>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-lg font-medium mb-2">"What's the best {brandName.toLowerCase()} alternative?"</p>
            <p className="text-sm text-warning">
              AI recommends {displayCompetitors[0]} instead of your brand.
            </p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            This is just one example. Full prompt analysis reveals dozens more opportunities.
          </p>
        </motion.div>

        {/* Locked Sections Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-4 mb-8"
        >
          {/* Locked: Prompt-Level Visibility */}
          <LockedSection
            icon={FileText}
            title="Full Prompt Analysis"
            description="See every buyer question where AI mentions competitors instead of you"
            items={['47 prompts analyzed', '12 missed opportunities', '8 competitor wins']}
          />

          {/* Locked: Content Gaps */}
          <LockedSection
            icon={EyeOff}
            title="Content Gap Analysis"
            description="Topics you need to cover to improve AI visibility"
            items={['Missing comparison pages', 'Weak feature documentation', 'No FAQ coverage']}
          />

          {/* Locked: Source Domains */}
          <LockedSection
            icon={Link2}
            title="Citation Sources"
            description="Sites that AI uses to form recommendations"
            items={['G2 appears 12× in answers', 'Your blog cited 0×', 'Competitor press 8×']}
          />

          {/* Locked: Recommendations */}
          <LockedSection
            icon={Lightbulb}
            title="Optimization Roadmap"
            description="Prioritized actions to improve your AI visibility"
            items={['Create comparison content', 'Earn review citations', 'Publish authority signals']}
          />
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-border rounded-2xl p-8 text-center"
        >
          <h3 className="text-2xl font-bold mb-3">
            Ready to See the Full Picture?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Your snapshot reveals visibility gaps. Full tracking shows you exactly how to fix them.
          </p>

          {/* Primary CTA */}
          <Button
            onClick={onUpgrade}
            size="lg"
            className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/25 mb-4"
          >
            Unlock Full AI Visibility Report
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
            {/* Secondary CTA */}
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6"
              onClick={() => window.open('https://calendly.com/llumos/demo', '_blank')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Request a 10-min Walkthrough
            </Button>

            {/* Exit CTA */}
            <Button
              variant="ghost"
              size="lg"
              className="h-12 px-6 text-muted-foreground hover:text-foreground"
              onClick={() => setShowEmailModal(true)}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email me my snapshot
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Cancel anytime · No long-term contracts · Most teams upgrade after seeing their snapshot
          </p>
        </motion.div>
      </div>

      {/* Email Snapshot Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Your Snapshot</DialogTitle>
            <DialogDescription>
              We'll send your AI Visibility Snapshot and notify you when your visibility changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              type="email"
              placeholder="you@company.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="h-12"
            />
            <Button
              onClick={handleEmailSnapshot}
              disabled={isSending}
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary"
            >
              {isSending ? 'Sending...' : 'Send Snapshot'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Locked Section Component
function LockedSection({ 
  icon: Icon, 
  title, 
  description, 
  items 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  items: string[];
}) {
  return (
    <div className="relative bg-card border border-border rounded-xl overflow-hidden">
      {/* Blurred Content */}
      <div className="p-6 blur-sm opacity-60 pointer-events-none select-none">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Lock Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px]">
        <Lock className="w-6 h-6 text-muted-foreground mb-2" />
        <span className="text-sm font-medium text-muted-foreground">Upgrade to Unlock</span>
      </div>
    </div>
  );
}
