import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SEOHelmet } from '@/components/SEOHelmet';
import { 
  ArrowRight, 
  CheckCircle, 
  Search, 
  Target, 
  Eye, 
  TrendingUp,
  Users,
  Briefcase,
  FileText,
  BarChart3,
  Zap,
  Quote,
  Brain,
  Sparkles,
  X,
  MessageSquare,
  Link as LinkIcon
} from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { AudienceToggle } from '@/components/landing/AudienceToggle';
import { useAudienceToggle } from '@/hooks/useAudienceToggle';
import { HubSpotForm, HUBSPOT_CONFIG } from '@/components/hubspot/HubSpotForm';

// AI Platform logos section
const aiPlatforms = [
  { name: 'ChatGPT', icon: '🤖' },
  { name: 'Gemini', icon: '✨' },
  { name: 'Perplexity', icon: '🔍' },
  { name: 'AI Overviews', icon: '🌐' },
];

// Audience-specific content
const audienceContent = {
  marketing: {
    headline: "See Why AI Recommends Certain Brands —",
    headlineHighlight: "and How to Become One",
    subheadline: "Llumos helps in-house marketing teams understand how AI search engines decide which brands to recommend — and what to change to improve visibility across ChatGPT, Gemini, and Perplexity.",
    valueBullets: [
      "Understand how AI search impacts demand",
      "Identify content gaps that reduce AI visibility",
      "Prioritize updates that actually influence recommendations",
      "Track progress over time",
    ],
    snapshotExplanation: "Your AI Visibility Snapshot is designed to help marketing teams:",
    snapshotBullets: [
      "Make AI visibility part of growth strategy",
      "Reduce guesswork around content planning",
      "Align SEO, content, and brand strategy for AI search",
    ],
  },
  agency: {
    headline: "Show Clients Why AI Recommends",
    headlineHighlight: "Certain Brands",
    subheadline: "Llumos gives agencies clear insight into how AI search engines evaluate brands — so you can explain competitive gaps, justify recommendations, and deliver AI visibility reporting to clients.",
    valueBullets: [
      "Explain why AI favors certain competitors",
      "Back recommendations with prompt-level data",
      "Deliver AI visibility reporting across multiple clients",
      "Differentiate services beyond traditional SEO",
    ],
    snapshotExplanation: "Your AI Visibility Snapshot helps agencies:",
    snapshotBullets: [
      "Diagnose client visibility issues in AI search",
      "Support strategic recommendations with data",
      "Expand services into AI search optimization",
    ],
  },
};

// Value strip items for scannable above-the-fold context
const valueStripItems = [
  { icon: MessageSquare, text: "Prompts AI responds to" },
  { icon: LinkIcon, text: "Sources AI cites" },
  { icon: Users, text: "Why competitors are recommended" },
];

export default function AIRecommendsLanding() {
  const navigate = useNavigate();
  const [audience, setAudience] = useAudienceToggle();

  const content = audienceContent[audience];

  const handleHubSpotSubmit = () => {
    // Redirect to thank you page after HubSpot form submission
    navigate('/lp/ai-recommends/thank-you');
  };

  const scrollToForm = () => {
    document.getElementById('snapshot-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <SEOHelmet
        title="See Why AI Recommends Certain Brands | Llumos"
        description="AI search engines don't choose brands randomly. Llumos reveals the prompts, citations, and content signals that cause AI to recommend your competitors."
        keywords="AI visibility, ChatGPT recommendations, AI search optimization, brand visibility AI"
        canonicalPath="/lp/ai-recommends"
        ogImage="/og-home.png"
      />

      <div className="dark min-h-screen bg-background text-foreground">
        {/* Minimal Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/5">
          <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="https://llumos.app" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold">Llumos</span>
            </a>
            <Button
              onClick={scrollToForm}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500"
            >
              Get Your Snapshot
            </Button>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative pt-32 pb-16 px-4 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-background to-blue-950/20" />
            <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-violet-500/8 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />

            <div className="container max-w-4xl mx-auto relative z-10">
              {/* Audience Toggle */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex justify-center mb-8"
              >
                <AudienceToggle audience={audience} onChange={setAudience} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
                key={audience}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
                  {content.headline}{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                    {content.headlineHighlight}
                  </span>
                </h1>

                {/* Micro-explainer line for clarity */}
                <p className="text-sm text-violet-400/80 mb-6">
                  Based on real AI answers, prompts, and citations — not assumptions.
                </p>

                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                  {content.subheadline}
                </p>

                <Button
                  onClick={scrollToForm}
                  size="lg"
                  className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 group"
                >
                  Get Your Free AI Visibility Snapshot
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                {/* Meta-friction reduction micro-copy */}
                <p className="mt-3 text-xs text-muted-foreground/70">
                  Free snapshot • No demo • No sales outreach
                </p>
              </motion.div>
            </div>
          </section>

          {/* Scannable Value Strip */}
          <section className="py-6 px-4">
            <div className="container max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
              >
                {valueStripItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className="w-4 h-4 text-violet-400" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Trust / Context Strip */}
          <section className="py-8 px-4 border-y border-white/5 bg-white/[0.02]">
            <div className="container max-w-4xl mx-auto">
              <p className="text-center text-sm text-muted-foreground mb-4">
                Track AI visibility across the platforms your customers are already using
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {aiPlatforms.map((platform) => (
                  <div key={platform.name} className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xl">{platform.icon}</span>
                    <span className="font-medium">{platform.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* What This Snapshot Is (and Isn't) - Fast Context Section */}
          <section className="py-16 px-4">
            <div className="container max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                  What This Snapshot Is{' '}
                  <span className="text-muted-foreground font-normal">(and Isn't)</span>
                </h2>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {/* Is */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/[0.02] border border-green-500/10">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-400">Is</span>
                    </div>
                    <ul className="space-y-3">
                      {[
                        "A focused analysis of how AI search treats your brand",
                        "Competitive and prompt-driven",
                        "Designed to show causes, not just outcomes",
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-foreground/80">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500/60 mt-2 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Isn't */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                      <X className="w-5 h-5 text-muted-foreground" />
                      <span className="font-semibold text-muted-foreground">Isn't</span>
                    </div>
                    <ul className="space-y-3">
                      {[
                        "A generic SEO audit",
                        "A sales demo",
                        "A vanity score",
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Early Visual Anchor - Dashboard Preview */}
          <section className="py-12 px-4">
            <div className="container max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                {/* Dashboard Preview Mock */}
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] shadow-2xl shadow-violet-500/5">
                  {/* Mock browser bar */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="h-6 bg-white/5 rounded-md max-w-xs mx-auto flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">app.llumos.ai/dashboard</span>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard content preview */}
                  <div className="p-6 md:p-8">
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      {/* Score card */}
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
                        <p className="text-xs text-muted-foreground mb-1">AI Visibility Score</p>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-bold text-violet-400">67</span>
                          <span className="text-xs text-green-400 mb-1">+12</span>
                        </div>
                      </div>
                      {/* Prompts tracked */}
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
                        <p className="text-xs text-muted-foreground mb-1">Prompts Analyzed</p>
                        <span className="text-3xl font-bold text-foreground">24</span>
                      </div>
                      {/* Competitors */}
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
                        <p className="text-xs text-muted-foreground mb-1">Competitors Found</p>
                        <span className="text-3xl font-bold text-foreground">8</span>
                      </div>
                    </div>

                    {/* Chart placeholder */}
                    <div className="h-32 rounded-lg bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-violet-500/5 border border-white/5 flex items-end justify-around px-4 pb-4">
                      {[40, 55, 35, 70, 60, 75, 65].map((height, i) => (
                        <div
                          key={i}
                          className="w-6 md:w-8 rounded-t bg-gradient-to-t from-violet-500/40 to-violet-400/60"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating label */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs bg-background border border-white/10 rounded-full text-muted-foreground">
                    Sample dashboard view
                  </span>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Problem Section */}
          <section className="py-20 px-4">
            <div className="container max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                  AI Search Is Already Deciding{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                    Which Brands Win
                  </span>
                </h2>

                <div className="space-y-6 max-w-2xl mx-auto">
                  {[
                    'More buyers are asking AI for recommendations instead of scrolling search results.',
                    "AI doesn't return ten links — it returns a few trusted brands.",
                    "If you're not one of them, you lose demand you never even see.",
                  ].map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Target className="w-4 h-4 text-violet-400" />
                      </div>
                      <p className="text-lg text-foreground/90">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* Education / Qualification Section */}
          <section className="py-20 px-4 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent">
            <div className="container max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                  How AI Chooses Which Brands to Recommend
                </h2>

                <p className="text-lg text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
                  AI recommendations are driven by:
                </p>

                <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
                  {[
                    { icon: Search, text: 'The exact prompts users ask' },
                    { icon: FileText, text: 'The sources and citations AI trusts' },
                    { icon: Eye, text: 'Content gaps between you and competitors' },
                    { icon: Brain, text: 'Brand and entity signals across the web' },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/5"
                    >
                      <item.icon className="w-5 h-5 text-violet-400" />
                      <span className="text-foreground/90">{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">
                    Most teams never see this data — which makes AI search feel unpredictable.
                  </p>
                  <p className="text-lg font-semibold text-violet-400">
                    It isn't.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Product Value Section */}
          <section className="py-20 px-4">
            <div className="container max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
                  Llumos Shows You{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                    Why
                  </span>
                  {' '}— Not Just If
                </h2>

                <p className="text-lg text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
                  Llumos analyzes real AI responses in your category and shows:
                </p>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10">
                  {[
                    { icon: Eye, title: 'Visibility gaps', desc: "Where your brand appears (and where it doesn't)" },
                    { icon: TrendingUp, title: 'Competitive edge', desc: 'Which competitors AI prefers — and why' },
                    { icon: FileText, title: 'Citation intelligence', desc: 'The sources and pages AI cites most' },
                    { icon: Zap, title: 'Action plan', desc: 'The highest-impact opportunities to improve AI visibility' },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="p-6 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/5 hover:border-violet-500/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center mb-4">
                        <item.icon className="w-5 h-5 text-violet-400" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>

                <p className="text-center text-lg">
                  <span className="text-muted-foreground">This isn't just monitoring.</span>
                  <br />
                  <span className="font-semibold text-foreground">It's diagnosis and direction.</span>
                </p>
              </motion.div>
            </div>
          </section>

          {/* Free Snapshot Section (Conversion Core) */}
          <section id="snapshot-form" className="py-20 px-4 bg-gradient-to-b from-violet-950/20 via-violet-950/30 to-violet-950/20">
            <div className="container max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
                  What You Get in Your{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                    Free AI Visibility Snapshot
                  </span>
                </h2>

                <p className="text-center text-muted-foreground mb-8">
                  {content.snapshotExplanation}
                </p>

                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                  {/* Benefits list */}
                  <div className="space-y-4" key={audience}>
                    {content.snapshotBullets.map((benefit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-foreground/90">{benefit}</span>
                      </motion.div>
                    ))}
                    {/* Common bullets */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-foreground/90">Clear, actionable opportunities to improve</span>
                    </motion.div>
                  </div>

                  {/* HubSpot Form */}
                  <div className="p-6 rounded-xl bg-white/[0.05] border border-white/10 min-h-[500px]">
                    <HubSpotForm
                      portalId="244723281"
                      formId="a5f00a96-4eba-44ef-a4a9-83ceb5d45d1d"
                      region="na2"
                      onFormSubmit={handleHubSpotSubmit}
                      className="hubspot-form-container [&_form]:min-h-[450px]"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Value Props Section (audience-specific) */}
          <section className="py-20 px-4">
            <div className="container max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                key={audience}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">
                  {audience === 'marketing' ? 'Built for Marketing Teams' : 'Built for Agencies & Consultants'}
                </h2>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {content.valueBullets.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-start gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/5"
                    >
                      <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* Friction Removal Section */}
          <section className="py-16 px-4 border-y border-white/5 bg-white/[0.01]">
            <div className="container max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  No Demo. No Sales Call.
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  You don't need to talk to sales to understand your AI visibility.
                </p>
                <p className="text-lg text-foreground mt-2">
                  Get the insights first.<br />
                  Decide what to do next on your own terms.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-24 px-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-t from-violet-950/40 via-background to-background" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/10 rounded-full blur-[120px]" />

            <div className="container max-w-4xl mx-auto relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  Start With{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                    Clarity
                  </span>
                  {' '}— Not Guesswork
                </h2>

                <Button
                  onClick={scrollToForm}
                  size="lg"
                  className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 group"
                >
                  Get Your Free AI Visibility Snapshot
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="mt-4 text-sm text-muted-foreground">
                  Built for serious marketers and agencies.
                </p>
              </motion.div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
