import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, ArrowRight, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [reminderEmail, setReminderEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/pricing');
    onClose();
  };

  const handleEmailReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }
    toast.success('We\'ll notify you when your AI visibility changes');
    setShowEmailInput(false);
    setReminderEmail('');
    onClose();
  };

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <h2 className="text-2xl md:text-3xl font-bold">Unlock Full AI Visibility Tracking</h2>
          <p className="text-muted-foreground mt-2">
            Your free report is only a snapshot. Full visibility requires continuous monitoring.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Free vs Paid Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Free Column */}
            <div className="border border-border rounded-xl p-5 bg-muted/30">
              <div className="text-sm font-medium text-muted-foreground mb-4">Free Snapshot</div>
              <ul className="space-y-3 mb-4">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground/70 italic">
                Good for curiosity — not enough to compete.
              </p>
            </div>

            {/* Paid Column */}
            <div className="border-2 border-primary rounded-xl p-5 bg-primary/5 relative">
              <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded">
                RECOMMENDED
              </div>
              <div className="text-sm font-semibold text-primary mb-4">Full AI Visibility Tracking</div>
              <ul className="space-y-3 mb-4">
                {paidFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-foreground font-medium">
                Built for teams that want to win AI recommendations.
              </p>
            </div>
          </div>

          {/* Urgency Section */}
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-5">
            <p className="text-sm leading-relaxed">
              <span className="font-semibold text-warning">AI recommendations change constantly.</span>
              <br />
              <span className="text-muted-foreground">
                Competitors publish content, earn citations, and shift visibility every day. 
                A one-time snapshot becomes outdated quickly.
              </span>
              <br />
              <span className="font-medium text-foreground mt-2 block">
                Continuous tracking is the only way to stay visible.
              </span>
            </p>
          </div>

          {/* Price Anchor */}
          <div className="text-center py-2">
            <p className="text-muted-foreground text-sm">
              Plans start for less than the cost of one SEO article per month.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Most teams upgrade after seeing competitors win AI answers.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="text-center">
            <Button
              onClick={handleUpgrade}
              size="lg"
              className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/25"
            >
              Start Full AI Visibility Tracking
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Cancel anytime · No long-term contracts
            </p>
          </div>

          {/* Secondary Exit Path */}
          <div className="border-t border-border pt-6">
            {!showEmailInput ? (
              <div className="text-center">
                <button
                  onClick={() => setShowEmailInput(true)}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 inline-flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email me my report and reminders
                </button>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  We'll notify you when your AI visibility changes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailReminder} className="max-w-sm mx-auto">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={reminderEmail}
                    onChange={(e) => setReminderEmail(e.target.value)}
                    className="h-10"
                  />
                  <Button type="submit" variant="outline" size="sm" className="h-10 px-4">
                    Send
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  We'll notify you when your AI visibility changes.
                </p>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
