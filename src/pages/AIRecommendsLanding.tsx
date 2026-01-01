import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LandingFooter } from '@/components/landing/LandingFooter';

// AI Platform logos section
const aiPlatforms = [
  { name: 'ChatGPT', icon: '🤖' },
  { name: 'Gemini', icon: '✨' },
  { name: 'Perplexity', icon: '🔍' },
  { name: 'AI Overviews', icon: '🌐' },
];

export default function AIRecommendsLanding() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [isQualified, setIsQualified] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !company.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Store lead in database
      const { error } = await supabase.from('leads').insert({
        email: email.trim(),
        source: 'ai-recommends-landing',
        metadata: {
          company: company.trim(),
          isQualified: isQualified === 'yes',
          landingPage: 'ai-recommends',
          timestamp: new Date().toISOString(),
        },
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Request submitted! We\'ll send your AI Visibility Snapshot shortly.');
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          <section className="relative pt-32 pb-20 px-4 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-background to-blue-950/20" />
            <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-violet-500/8 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />

            <div className="container max-w-4xl mx-auto relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  See Why AI Recommends Certain Brands —{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                    and How to Become One
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                  AI search engines don't choose brands randomly.<br />
                  Llumos reveals the prompts, citations, and content signals that cause AI to recommend your competitors — and gives you clear next steps to improve your visibility.
                </p>

                <Button
                  onClick={scrollToForm}
                  size="lg"
                  className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 group"
                >
                  Get Your Free AI Visibility Snapshot
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="mt-4 text-sm text-muted-foreground">
                  No demo. No sales call.
                </p>
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
                <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                  What You Get in Your{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                    Free AI Visibility Snapshot
                  </span>
                </h2>

                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                  {/* Benefits list */}
                  <div className="space-y-4">
                    {[
                      'Current AI visibility across major platforms',
                      'Competitive comparison vs AI-recommended brands',
                      'Key prompts affecting your category',
                      'Clear, actionable opportunities to improve',
                    ].map((benefit, index) => (
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
                  </div>

                  {/* Form */}
                  <div className="p-6 rounded-xl bg-white/[0.05] border border-white/10">
                    {submitted ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Request Received!</h3>
                        <p className="text-muted-foreground">
                          We'll send your AI Visibility Snapshot to your email shortly.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">
                            Work Email *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-white/5 border-white/10 focus:border-violet-500/50"
                          />
                        </div>

                        <div>
                          <Label htmlFor="company" className="text-sm font-medium mb-1.5 block">
                            Company *
                          </Label>
                          <Input
                            id="company"
                            type="text"
                            placeholder="Your company name"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            required
                            className="bg-white/5 border-white/10 focus:border-violet-500/50"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Are you responsible for content, SEO, or growth?
                          </Label>
                          <RadioGroup
                            value={isQualified || ''}
                            onValueChange={setIsQualified}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="yes" />
                              <Label htmlFor="yes" className="cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="no" />
                              <Label htmlFor="no" className="cursor-pointer">No</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-12 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500"
                        >
                          {isSubmitting ? 'Submitting...' : 'Get Your Free AI Visibility Snapshot'}
                          {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Audience Split Section */}
          <section className="py-20 px-4">
            <div className="container max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                {/* For In-House Teams */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="p-8 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">For In-House Marketing Teams</h3>
                  <ul className="space-y-3">
                    {[
                      'Understand how AI search impacts demand',
                      'Prioritize content updates that matter',
                      'Track visibility changes over time',
                      'Make AI visibility part of your growth strategy',
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* For Agencies */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">For Agencies & Consultants</h3>
                  <ul className="space-y-3">
                    {[
                      'Show clients why AI favors competitors',
                      'Back recommendations with data',
                      'Differentiate services with AI search insights',
                      'Monitor AI visibility across multiple brands',
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
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
