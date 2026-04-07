import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Scale, Shield, Users, TrendingUp, AlertTriangle, Search, BookOpen, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HubSpotForm } from '@/components/hubspot/HubSpotForm';
import { SEOHead } from '@/components/seo/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import smbTeamLogo from '@/assets/smbteam-logo.png';

export default function LawFirmAIVisibility() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Law Firm AI Visibility Audit | Llumos × SMB Team"
        description="Is AI recommending your law firm or your competitors? Get a free AI visibility audit and discover how ChatGPT, Gemini & Perplexity rank your firm."
        canonical="/lp/law-firm-ai-visibility"
        noIndex
      />

      <div className="min-h-screen bg-background">
        {/* Co-Branded Header */}
        <header className="py-5 px-4 border-b border-border bg-card">
          <div className="container max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Llumos Logo */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">L</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Llumos
                  </span>
                </div>

                {/* Separator */}
                <span className="text-muted-foreground text-lg font-light">×</span>

                {/* SMB Team Logo */}
                <img
                  src={smbTeamLogo}
                  alt="SMB Team"
                  className="h-10 w-auto brightness-150 contrast-125"
                />
              </div>

              <span className="hidden sm:inline text-sm text-muted-foreground">
                Free AI Visibility Audit for Law Firms
              </span>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-background to-muted/20">
          <div className="container max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Copy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Scale className="w-4 h-4" />
                  Exclusive for Law Firms
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-[3.3rem] font-bold leading-tight mb-6">
                  Is AI Sending Clients to{' '}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Your Competitors
                  </span>{' '}
                  Instead of Your Firm?
                </h1>

                <h2 className="text-xl md:text-2xl text-muted-foreground mb-6 leading-relaxed">
                  When someone asks ChatGPT for the "best family law attorney near me" or "top personal injury lawyer," is your firm in the answer?
                </h2>

                <p className="text-base text-muted-foreground mb-4">
                  <strong className="text-foreground">Potential clients are already using AI to find attorneys.</strong>{' '}
                  Your firm needs to show up where they're searching — and that's no longer just Google.
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                  {['ChatGPT', 'Gemini', 'Perplexity'].map((platform) => (
                    <span key={platform} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm font-medium">
                      <Search className="w-3.5 h-3.5 text-primary" />
                      {platform}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Right: HubSpot Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-8 shadow-lg"
              >
                <h3 className="text-xl font-bold mb-1">Get Your Free AI Visibility Audit</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  See exactly how AI platforms represent your law firm — takes 2 minutes.
                </p>

                <HubSpotForm
                  portalId="244723281"
                  formId="a5f00a96-4eba-44ef-a4a9-83ceb5d45d1d"
                  region="na2"
                  redirectUrl={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/lp/ai-visibility/thank-you`
                      : '/lp/ai-visibility/thank-you'
                  }
                  onFormSubmit={async (formData) => {
                    let emailVal = formData?.email || '';
                    let firstName = formData?.firstName || '';
                    let domain = (formData as any)?.website || (formData as any)?.domain || '';

                    if (!emailVal || !domain) {
                      const formContainer = document.querySelector('.hubspot-embedded-form');
                      if (!emailVal) {
                        const emailInput = formContainer?.querySelector('input[name="email"], input[type="email"]') as HTMLInputElement;
                        emailVal = emailInput?.value || '';
                      }
                      if (!domain) {
                        const domainInput = formContainer?.querySelector('input[name="website"], input[name="domain"], input[type="url"]') as HTMLInputElement;
                        domain = domainInput?.value || '';
                      }
                      if (!firstName) {
                        const firstNameInput = formContainer?.querySelector('input[name="firstname"]') as HTMLInputElement;
                        firstName = firstNameInput?.value || '';
                      }
                    }

                    let cleanDomain = (domain || '').trim().toLowerCase();
                    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
                      cleanDomain = cleanDomain.replace(/^https?:\/\/(www\.)?/, '');
                    } else {
                      cleanDomain = cleanDomain.replace(/^(www\.)?/, '');
                    }
                    cleanDomain = cleanDomain.replace(/\/.*$/, '');

                    if (emailVal && cleanDomain) {
                      supabase.functions.invoke('ai-visibility-submit', {
                        body: {
                          email: emailVal.trim(),
                          domain: cleanDomain,
                          firstName: firstName.trim() || undefined,
                          utmSource: new URLSearchParams(window.location.search).get('utm_source') || 'smbteam-webinar',
                          utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || 'partner',
                          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || 'law-firm-ai-visibility',
                          referrer: document.referrer || undefined,
                        }
                      }).catch(err => console.error('Edge function error:', err));
                    }

                    window.setTimeout(() => {
                      if (window.location.pathname !== '/lp/ai-visibility/thank-you') {
                        window.location.assign('/lp/ai-visibility/thank-you');
                      }
                    }, 300);
                  }}
                />

                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-foreground mb-2">What happens next:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• We query ChatGPT, Gemini & Perplexity with legal-specific prompts</li>
                    <li>• You receive a full AI visibility report via email</li>
                    <li>• See which firms AI recommends instead of yours</li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* WHY AI VISIBILITY MATTERS FOR LAW FIRMS */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why AI Visibility Matters for Law Firms
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                AI-powered search is transforming how people find legal services. Potential clients increasingly turn to ChatGPT and other AI tools <em>before</em> they ever open Google.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  stat: '40%',
                  label: 'of consumers now use AI for local service research',
                  icon: Users,
                  description: 'People ask AI tools "Who is the best divorce lawyer in [city]?" and trust the answer — often without checking Google at all.'
                },
                {
                  stat: '0',
                  label: 'law firms currently optimize for AI recommendations',
                  icon: AlertTriangle,
                  description: 'Most law firms focus exclusively on Google SEO. AI search uses different ranking signals, and nearly no firms are optimizing for it.'
                },
                {
                  stat: '3×',
                  label: 'more likely to get a call when AI recommends you',
                  icon: TrendingUp,
                  description: 'AI recommendations carry outsized trust. When ChatGPT suggests your firm by name, potential clients treat it as a personal referral.'
                },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">{item.stat}</div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT THE AUDIT REVEALS */}
        <section className="py-16 px-4">
          <div className="container max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              What Your Free Audit Reveals
            </motion.h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Search, title: 'AI Visibility Score', desc: 'A clear score showing how often AI platforms mention and recommend your firm for relevant legal queries.' },
                { icon: Scale, title: 'Practice Area Analysis', desc: 'See which practice areas AI associates with your firm — and where competitors are outranking you.' },
                { icon: Users, title: 'Competitor Intelligence', desc: 'Discover which competing firms AI recommends for the same legal queries potential clients are asking.' },
                { icon: Shield, title: 'Brand Sentiment', desc: 'Understand how AI describes your firm — whether it positions you as authoritative, experienced, or missing entirely.' },
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

        {/* LEGAL-SPECIFIC AI PROMPTS */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                The Questions Clients Are Asking AI
              </h2>
              <p className="text-lg text-muted-foreground">
                These are real prompts potential clients type into ChatGPT, Gemini, and Perplexity every day. Is your firm in the answer?
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                '"Who is the best personal injury lawyer in [city]?"',
                '"Top-rated family law attorneys near me"',
                '"Which law firm should I hire for a business dispute?"',
                '"Best criminal defense attorney for DUI cases"',
                '"Estate planning lawyer recommendations"',
                '"Affordable immigration attorney in [state]"',
                '"Which firms have the best reviews for workers comp?"',
                '"Recommend a real estate attorney for closing"',
              ].map((prompt, i) => (
                <motion.div
                  key={prompt}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg"
                >
                  <Search className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium italic text-foreground">{prompt}</span>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center text-muted-foreground mt-8 text-sm"
            >
              We test your firm against these and dozens more legal-specific prompts across all major AI platforms.
            </motion.p>
          </div>
        </section>

        {/* HOW AI SEARCH DIFFERS FROM GOOGLE */}
        <section className="py-16 px-4">
          <div className="container max-w-5xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              AI Search ≠ Google Search
            </motion.h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-muted-foreground">🔍</span> Google (Traditional SEO)
                </h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="mt-1">•</span> Shows a list of 10 blue links</li>
                  <li className="flex items-start gap-2"><span className="mt-1">•</span> Users click through to your website</li>
                  <li className="flex items-start gap-2"><span className="mt-1">•</span> Ranking based on backlinks & keywords</li>
                  <li className="flex items-start gap-2"><span className="mt-1">•</span> Pay-per-click ads supplement organic</li>
                  <li className="flex items-start gap-2"><span className="mt-1">•</span> Users compare multiple options themselves</li>
                </ul>
              </div>

              <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>🤖</span> AI Search (New Frontier)
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> AI gives a single, curated answer</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> Users trust the recommendation immediately</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> Ranking based on authority & context signals</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> No ads — organic authority is everything</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> AI pre-selects the firm, reducing comparison</li>
                </ul>
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center text-lg font-medium mt-8"
            >
              <strong>The firms that optimize for AI search now will dominate client acquisition for years.</strong>
            </motion.p>
          </div>
        </section>

        {/* WHAT INFLUENCES AI RECOMMENDATIONS */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-5xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-4"
            >
              What Makes AI Recommend Your Firm?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto"
            >
              AI models synthesize data from many sources. Here's what influences whether your firm gets recommended.
            </motion.p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: BookOpen,
                  title: 'Structured Content & Schema',
                  desc: 'AI favors firms with well-structured websites that use legal schema markup, FAQ pages, and clearly organized practice area content.'
                },
                {
                  icon: Shield,
                  title: 'Authoritative Citations',
                  desc: 'Being mentioned on legal directories, bar association websites, legal publications, and case studies builds the authority signals AI trusts.'
                },
                {
                  icon: Building2,
                  title: 'Google Business Profile & Reviews',
                  desc: 'Strong review profiles, up-to-date GBP listings, and consistent NAP data across directories significantly influence AI recommendations.'
                },
                {
                  icon: TrendingUp,
                  title: 'Content Depth & Freshness',
                  desc: 'Regularly published legal insights, case results, and educational content signal to AI that your firm is active and authoritative.'
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 bg-card border border-border rounded-xl p-6"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
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
                { step: '1', title: 'Enter your firm\'s website', desc: 'Tell us your domain and we\'ll identify your practice areas and location automatically.' },
                { step: '2', title: 'We query AI platforms', desc: 'We run real legal-specific prompts across ChatGPT, Gemini, and Perplexity to see where your firm appears.' },
                { step: '3', title: 'Get your audit report', desc: 'Receive a detailed report showing your AI visibility score, competitor analysis, and actionable recommendations.' },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Don't Let AI Send Your Clients Elsewhere
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get your free AI visibility audit now and see exactly how AI platforms represent your law firm.
              </p>
              <Button
                size="lg"
                className="h-16 px-10 text-xl font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Get My Free AI Audit
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
              <p className="mt-4 text-muted-foreground text-sm">
                100% free · No credit card · Results delivered by email
              </p>
            </motion.div>
          </div>
        </section>

        {/* Co-Branded Footer */}
        <footer className="py-8 px-4 border-t border-border">
          <div className="container max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xs">L</span>
                  </div>
                  <span className="text-sm font-semibold">Llumos</span>
                </div>
                <span className="text-muted-foreground text-sm">×</span>
                <img src={smbTeamLogo} alt="SMB Team" className="h-6 w-auto brightness-150 contrast-125" />
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Llumos × SMB Team. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
