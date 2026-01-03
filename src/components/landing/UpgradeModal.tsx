import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Mail, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const freeFeatures = [
  'One-time AI visibility score',
  'One example missed prompt',
  'Single competitor insight',
  'Limited AI model checks',
];

const paidFeatures = [
  'Daily AI prompt monitoring',
  'Full prompt list (all buyer questions)',
  'Competitor frequency & share-of-answer tracking',
  'Citation & source influence analysis',
  'Visibility change alerts',
  'Actionable optimization recommendations',
  'Historical trends & reporting',
];

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/signup');
    onClose();
  };

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    
    setIsSubmitting(true);
    // Simulate email capture - in production this would call an API
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSubmitting(false);
    toast.success("We'll notify you when your AI visibility changes");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-4xl md:w-full z-50 overflow-y-auto max-h-[90vh]"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="p-6 md:p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    Unlock Full AI Visibility Tracking
                  </h2>
                  <p className="text-muted-foreground">
                    Your free report is only a snapshot. Full visibility requires continuous monitoring.
                  </p>
                </div>

                {/* Free vs Paid Comparison */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {/* Free Column */}
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-5">
                    <div className="text-sm font-medium text-muted-foreground mb-4">
                      Free Snapshot
                    </div>
                    <ul className="space-y-3 mb-4">
                      {freeFeatures.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground/70 italic">
                      Good for curiosity — not enough to compete.
                    </p>
                  </div>

                  {/* Paid Column */}
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30 rounded-xl p-5 relative">
                    <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      RECOMMENDED
                    </div>
                    <div className="text-sm font-semibold text-foreground mb-4 mt-1">
                      Full AI Visibility Tracking
                    </div>
                    <ul className="space-y-3 mb-4">
                      {paidFeatures.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs font-medium text-primary">
                      Built for teams that want to win AI recommendations.
                    </p>
                  </div>
                </div>

                {/* Why Upgrade Now */}
                <div className="bg-muted/20 border border-border/50 rounded-xl p-5 mb-8">
                  <p className="text-sm text-foreground font-medium mb-2">
                    AI recommendations change constantly.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Competitors publish content, earn citations, and shift visibility every day.
                    A one-time snapshot becomes outdated quickly.
                    <span className="font-medium text-foreground"> Continuous tracking is the only way to stay visible.</span>
                  </p>
                </div>

                {/* Price Anchor */}
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground">
                    Plans start for less than the cost of one SEO article per month.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Most teams upgrade after seeing competitors win AI answers.
                  </p>
                </div>

                {/* Primary CTA */}
                <div className="text-center mb-8">
                  <Button
                    size="lg"
                    onClick={handleUpgrade}
                    className="h-14 px-10 text-base font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 border-0 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 group"
                  >
                    Start Full AI Visibility Tracking
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Cancel anytime · No long-term contracts
                  </p>
                </div>

                {/* Secondary Exit Path */}
                <div className="border-t border-border/50 pt-6">
                  <p className="text-sm text-center text-muted-foreground mb-3">
                    Not ready yet? Stay in the loop.
                  </p>
                  <form onSubmit={handleEmailCapture} className="flex gap-2 max-w-md mx-auto">
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 bg-background/50 border-border/50"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSubmitting}
                      className="h-10 shrink-0"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Email me updates
                        </>
                      )}
                    </Button>
                  </form>
                  <p className="text-xs text-center text-muted-foreground/70 mt-2">
                    We'll notify you when your AI visibility changes.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
