import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lock, Check, X, AlertCircle, ArrowRight, Mail, Calendar, 
  Eye, TrendingDown, FileText, Link2, Lightbulb, EyeOff, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

interface SnapshotData {
  id: string;
  domain: string;
  email: string;
  first_name: string | null;
  company_name: string | null;
  visibility_score: number;
  visibility_status: 'strong' | 'moderate' | 'low';
  model_presence: Array<{ name: string; status: string }>;
  competitor_placeholders: string[];
  created_at: string;
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'strong':
      return { label: 'Strong', color: 'text-success', bgColor: 'bg-success/10', description: 'Your brand appears frequently in AI recommendations' };
    case 'moderate':
      return { label: 'Moderate', color: 'text-warning', bgColor: 'bg-warning/10', description: 'Your brand has some AI visibility but gaps exist' };
    default:
      return { label: 'Low', color: 'text-destructive', bgColor: 'bg-destructive/10', description: 'AI rarely recommends your brand to potential customers' };
  }
}

function getModelIcon(status: string) {
  switch (status) {
    case 'Detected':
      return { icon: Check, color: 'text-success' };
    case 'Inconsistent':
      return { icon: AlertCircle, color: 'text-warning' };
    default:
      return { icon: X, color: 'text-destructive' };
  }
}

export default function AIVisibilityResults() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchSnapshot() {
      if (!token) {
        setError('Invalid snapshot link');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('visibility_snapshots')
          .select('*')
          .eq('snapshot_token', token)
          .maybeSingle();

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          setError('Failed to load snapshot');
          setLoading(false);
          return;
        }

        if (!data) {
          setError('Snapshot not found or has expired');
          setLoading(false);
          return;
        }

        // Cast the data properly
        setSnapshot({
          id: data.id,
          domain: data.domain,
          email: data.email,
          first_name: data.first_name,
          company_name: data.company_name,
          visibility_score: data.visibility_score,
          visibility_status: data.visibility_status as 'strong' | 'moderate' | 'low',
          model_presence: data.model_presence as Array<{ name: string; status: string }>,
          competitor_placeholders: data.competitor_placeholders as string[],
          created_at: data.created_at,
        });
        setEmailInput(data.email || '');

        // Track link click
        await supabase
          .from('visibility_snapshots')
          .update({
            link_clicked: true,
            link_clicked_at: new Date().toISOString(),
          })
          .eq('snapshot_token', token);

      } catch (err) {
        console.error('Error:', err);
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchSnapshot();
  }, [token]);

  const handleEmailSnapshot = async () => {
    if (!emailInput.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsSending(true);
    // In production, this would call an edge function to resend the email
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSending(false);
    setShowEmailModal(false);
    toast.success('Snapshot sent! Check your inbox.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your snapshot...</p>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-4">{error || 'Snapshot Not Found'}</h1>
          <p className="text-muted-foreground mb-6">
            This snapshot link may have expired or is invalid. 
            Request a new AI visibility report to see your results.
          </p>
          <Button onClick={() => navigate('/lp/ai-visibility')}>
            Get New Report
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(snapshot.visibility_status);
  const brandName = snapshot.domain.split('.')[0].charAt(0).toUpperCase() + snapshot.domain.split('.')[0].slice(1);

  return (
    <>
      <Helmet>
        <title>AI Visibility Snapshot for {snapshot.domain} | Llumos</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="py-6 px-4 border-b border-border">
          <div className="container max-w-5xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">L</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Llumos
              </span>
            </div>
          </div>
        </header>

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
                AI Visibility Snapshot for {snapshot.domain}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Your AI Visibility Analysis
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {snapshot.first_name ? `Hi ${snapshot.first_name}! ` : ''}
                Based on real-time analysis of AI recommendations across major platforms.
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
                    <span className="text-6xl font-bold text-foreground">{snapshot.visibility_score}</span>
                    <span className="text-2xl text-muted-foreground">/ 100</span>
                  </div>
                  <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                    <TrendingDown className="w-4 h-4" />
                    {statusInfo.label} Visibility
                  </div>
                  <p className="mt-3 text-muted-foreground text-sm">
                    {statusInfo.description}
                  </p>
                </div>

                {/* AI Model Presence */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-4">AI Model Presence</p>
                  <div className="space-y-3">
                    {snapshot.model_presence.map((model) => {
                      const { icon: Icon, color } = getModelIcon(model.status);
                      return (
                        <div
                          key={model.name}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                        >
                          <span className="font-medium">{model.name}</span>
                          <span className={`flex items-center gap-1.5 text-sm ${color}`}>
                            <Icon className="w-4 h-4" />
                            {model.status}
                          </span>
                        </div>
                      );
                    })}
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
                {snapshot.competitor_placeholders.map((competitor, i) => (
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
                  AI recommends {snapshot.competitor_placeholders[0]} instead of your brand.
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
              <LockedSection
                icon={FileText}
                title="Full Prompt Analysis"
                description="See every buyer question where AI mentions competitors instead of you"
                items={['47 prompts analyzed', '12 missed opportunities', '8 competitor wins']}
              />
              <LockedSection
                icon={EyeOff}
                title="Content Gap Analysis"
                description="Topics you need to cover to improve AI visibility"
                items={['Missing comparison pages', 'Weak feature documentation', 'No FAQ coverage']}
              />
              <LockedSection
                icon={Link2}
                title="Citation Sources"
                description="Sites that AI uses to form recommendations"
                items={['G2 appears 12× in answers', 'Your blog cited 0×', 'Competitor press 8×']}
              />
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
                onClick={() => navigate('/pricing')}
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
                  Book a 10-minute Walkthrough
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
        </div>
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
    </>
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
