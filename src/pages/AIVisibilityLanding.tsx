import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Check, Lock, Zap, Target, Users, Link2, TrendingUp, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HubSpotForm } from '@/components/hubspot/HubSpotForm';
import { Helmet } from 'react-helmet-async';
import { UpgradeModal } from '@/components/landing/UpgradeModal';
import { AIVisibilitySnapshot } from '@/components/landing/AIVisibilitySnapshot';

export default function AIVisibilityLanding() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [competitors, setCompetitors] = useState(['', '', '']);
  const [showHubSpotModal, setShowHubSpotModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [cleanedDomain, setCleanedDomain] = useState('');
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ domain: string; email: string; competitors: string[] } | null>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    let cleanUrl = url.trim().toLowerCase();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = cleanUrl.replace(/^(www\.)?/, '');
    } else {
      cleanUrl = cleanUrl.replace(/^https?:\/\/(www\.)?/, '');
    }
    cleanUrl = cleanUrl.replace(/\/.*$/, '');

    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanUrl)) {
      toast.error('Please enter a valid domain (e.g., example.com)');
      return;
    }

    setCleanedDomain(cleanUrl);
    setShowHubSpotModal(true);
  };

  const handleHubSpotSubmit = () => {
    setShowHubSpotModal(false);
    navigate(`/score-results?domain=${encodeURIComponent(cleanedDomain)}`);
  };

  const updateCompetitor = (index: number, value: string) => {
    const newCompetitors = [...competitors];
    newCompetitors[index] = value;
    setCompetitors(newCompetitors);
  };

  return (
    <>
      <Helmet>
        <title>Free AI Visibility Report | See If AI Recommends Your Brand | Llumos</title>
        <meta name="description" content="Discover if ChatGPT, Gemini, and Perplexity recommend your brand or your competitors. Get your free AI visibility report in 2 minutes." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Minimal Header - Logo Only */}
        <header className="py-6 px-4">
          <div className="container max-w-6xl mx-auto">
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

        {/* HERO SECTION */}
        <section className="py-16 md:py-24 px-4">
          <div className="container max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Copy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Is AI Recommending Your Brand — Or Your Competitors?
                </h1>
                <h2 className="text-xl md:text-2xl text-muted-foreground mb-6">
                  ChatGPT, Gemini, and Perplexity now decide which brands get recommended.
                  <br />
                  <span className="text-foreground font-medium">See where you appear, where you don't, and why.</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Built for SEO & growth teams · Tracks real AI answers · No credit card required
                </p>
                <p className="text-xs text-muted-foreground/80 border border-border/50 rounded-full px-4 py-2 inline-block">
                  Used by SEO & growth teams to track real AI recommendations
                </p>
              </motion.div>

              {/* Right: Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-8 shadow-lg"
              >
                <HubSpotForm
                  portalId="244723281"
                  formId="a5f00a96-4eba-44ef-a4a9-83ceb5d45d1d"
                  region="na2"
                  onFormSubmit={() => {
                    // Extract domain from HubSpot form - we'll use a placeholder approach
                    // HubSpot captures the data, we show the snapshot with a sample domain
                    const formContainer = document.querySelector('.hubspot-embedded-form');
                    const domainInput = formContainer?.querySelector('input[name="website"], input[name="domain"], input[type="url"]') as HTMLInputElement;
                    const emailInput = formContainer?.querySelector('input[name="email"], input[type="email"]') as HTMLInputElement;
                    
                    const domain = domainInput?.value || 'yourcompany.com';
                    const emailVal = emailInput?.value || '';
                    
                    // Clean the domain
                    let cleanDomain = domain.trim().toLowerCase();
                    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
                      cleanDomain = cleanDomain.replace(/^https?:\/\/(www\.)?/, '');
                    } else {
                      cleanDomain = cleanDomain.replace(/^(www\.)?/, '');
                    }
                    cleanDomain = cleanDomain.replace(/\/.*$/, '');
                    
                    setSubmittedData({
                      domain: cleanDomain || 'yourcompany.com',
                      email: emailVal,
                      competitors: []
                    });
                    setShowSnapshot(true);
                    
                    // Scroll to snapshot after a brief delay
                    setTimeout(() => {
                      snapshotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                  }}
                />
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-foreground mb-2">What happens next:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• We run real AI prompts</li>
                    <li>• You see your visibility snapshot</li>
                    <li>• You decide if you want full tracking</li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* AI VISIBILITY SNAPSHOT - Shows after form submission */}
        {showSnapshot && submittedData && (
          <section ref={snapshotRef} className="bg-muted/30 border-t border-border">
            <AIVisibilitySnapshot
              domain={submittedData.domain}
              email={submittedData.email}
              competitors={submittedData.competitors}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          </section>
        )}

        {/* WHAT THIS REPORT SHOWS */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              What Your Free AI Visibility Report Shows
            </motion.h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Zap, title: 'AI Visibility Score', desc: 'A single score showing how often AI recommends your brand.' },
                { icon: Target, title: 'Winning & Missed Prompts', desc: 'The exact questions AI answers — and where competitors appear instead.' },
                { icon: Users, title: 'Competitor Comparison', desc: 'See which brands AI prefers and how often they\'re mentioned.' },
                { icon: Link2, title: 'Source & Citation Signals', desc: 'Understand which sites influence AI recommendations.' },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <card.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                  <p className="text-muted-foreground text-sm">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* RESULTS PREVIEW MODULE */}
        <section className="py-16 px-4">
          <div className="container max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              Your AI Visibility Snapshot <span className="text-muted-foreground font-normal">(Preview)</span>
            </motion.h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Unlocked Preview */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">AI Visibility Score</span>
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <div className="text-4xl font-bold text-primary">42 / 100</div>
                  <p className="text-sm text-warning mt-2">Below industry average</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">Missed Prompt Example</span>
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-lg font-medium">"Best [category] for [use case]"</p>
                  <p className="text-sm text-warning mt-2">AI recommends a competitor instead of you.</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">AI Models Checked</span>
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['ChatGPT', 'Gemini', 'Perplexity'].map((model) => (
                      <span key={model} className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success rounded-full text-sm">
                        <Check className="w-3 h-3" /> {model}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">Competitor Advantage</span>
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-lg font-medium text-warning">One competitor appears 3× more often than your brand in AI answers</p>
                </div>
              </motion.div>

              {/* Locked Preview */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="space-y-4 blur-sm opacity-60">
                  <div className="bg-card border border-border rounded-xl p-6 h-24" />
                  <div className="bg-card border border-border rounded-xl p-6 h-32" />
                  <div className="bg-card border border-border rounded-xl p-6 h-28" />
                  <div className="bg-card border border-border rounded-xl p-6 h-24" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
                  <Lock className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-center text-muted-foreground mb-2 max-w-xs">
                    Full prompt list · Frequency trends · Citation breakdown · Historical tracking · Optimization recommendations
                  </p>
                  <p className="text-center text-sm text-foreground font-medium mb-4 max-w-xs">
                    Unlock full AI visibility tracking to see every missed opportunity, every competitor mention, and exactly what to fix.
                  </p>
                  <Button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="h-12 px-6 text-base font-semibold bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/25"
                  >
                    Unlock Full AI Visibility
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">Most users upgrade after seeing their snapshot</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* WHY LLUMOS IS DIFFERENT */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-4xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-8"
            >
              Most Tools Guess. Llumos Measures.
            </motion.h2>
            <motion.ul
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-left max-w-md mx-auto space-y-4 mb-8"
            >
              {[
                'Runs real prompts across ChatGPT, Gemini, and Perplexity',
                'Tracks answers over time — not one-off screenshots',
                'Shows which competitors AI actually recommends',
                'Built for SEO, content, and growth teams',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </motion.ul>
            <p className="text-muted-foreground italic">
              Traditional SEO tools ≠ AI answer visibility
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 px-4">
          <div className="container max-w-4xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              How It Works
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '1', title: 'Enter your website and competitors' },
                { step: '2', title: 'Llumos runs real AI queries daily' },
                { step: '3', title: 'Track visibility, fix gaps, and monitor improvements' },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <p className="text-lg font-medium">{item.title}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* UPGRADE TRIGGERS */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: AlertTriangle, text: "You're missing high-intent AI answers customers use to decide.", cta: 'See missed prompts →' },
                { icon: TrendingUp, text: 'AI is already recommending your competitor instead.', cta: 'See why they\'re winning →' },
                { icon: BarChart3, text: 'AI answers change daily — static reports fall behind.', cta: 'Start continuous tracking →' },
                { icon: Lightbulb, text: 'We show exactly which content and sources influence AI answers.', cta: 'Get optimization insights →' },
              ].map((trigger, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <trigger.icon className="w-8 h-8 text-warning mb-4" />
                  <p className="text-lg font-medium mb-3">{trigger.text}</p>
                  <button className="text-primary hover:underline font-medium">
                    {trigger.cta}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING TEASE */}
        <section className="py-16 px-4">
          <div className="container max-w-4xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-8"
            >
              Free Report → Continuous AI Visibility Monitoring
            </motion.h2>
            <motion.ul
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-left max-w-md mx-auto space-y-3 mb-8"
            >
              {[
                'Daily AI visibility tracking',
                'Alerts when recommendations change',
                'Prompt-level optimization guidance',
                'Exportable reports',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </motion.ul>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/pricing')}
            >
              View plans →
            </Button>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
          <div className="container max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Button
                size="lg"
                className="h-16 px-10 text-xl font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Get My Free AI Visibility Report
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
              <p className="mt-4 text-muted-foreground">
                Built for AI search · No credit card · Instant preview
              </p>
            </motion.div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="py-8 px-4 border-t border-border">
          <div className="container max-w-6xl mx-auto text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Llumos. All rights reserved.
          </div>
        </footer>
      </div>

      {/* HubSpot Form Modal */}
      <Dialog open={showHubSpotModal} onOpenChange={setShowHubSpotModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Get Your Free Report 🔍
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Enter your email to receive your AI visibility report for <strong>{cleanedDomain}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <HubSpotForm
              portalId="244723281"
              formId="fada3578-f269-4b9f-8bd1-3ace25fc31af"
              region="na2"
              onFormSubmit={handleHubSpotSubmit}
              className="hubspot-form-container"
            />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-4">
            We'll never share your email · Instant access
          </p>
        </DialogContent>
      </Dialog>

      <UpgradeModal 
        open={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </>
  );
}
