import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowRight, Check, Lock, MapPin, Search, TrendingUp, Users, 
  Building2, Stethoscope, Scale, Home, Utensils, Wrench, 
  AlertTriangle, Eye, EyeOff, ChevronRight, Sparkles, Target,
  BarChart3, Shield, Clock, Star, MessageSquare, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HubSpotForm } from '@/components/hubspot/HubSpotForm';
import { Helmet } from 'react-helmet-async';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';

// Sample AI conversation for demo
const sampleAIConversation = {
  query: "Who's the best plumber near me?",
  response: {
    recommended: "Austin Pro Plumbing",
    reason: "Top-rated with same-day service and great reviews",
    notMentioned: "[Your Business]"
  }
};

// Local business types
const businessTypes = [
  { icon: Wrench, label: 'Home Services', example: 'Plumbers, HVAC, Electricians' },
  { icon: Stethoscope, label: 'Medical & Dental', example: 'Dentists, Doctors, Therapists' },
  { icon: Scale, label: 'Professional Services', example: 'Lawyers, Accountants, Consultants' },
  { icon: Home, label: 'Real Estate', example: 'Agents, Property Managers' },
  { icon: Utensils, label: 'Restaurants & Food', example: 'Cafes, Catering, Bars' },
  { icon: Building2, label: 'Retail & Shops', example: 'Boutiques, Salons, Gyms' },
];

// FAQ data - rewritten for local business owners
const faqs = [
  {
    question: "I already do Local SEO. Do I need this too?",
    answer: "Yes — and here's why. Local SEO gets you found on Google. But more customers now skip Google entirely and ask AI directly: 'Who should I call for roof repair?' If AI doesn't mention you, you miss those leads. This works alongside your Local SEO to capture a new source of customers."
  },
  {
    question: "Will this help me show up on Google Maps?",
    answer: "This is different from Google Maps. AI tools like ChatGPT don't use Google Maps rankings — they make their own recommendations. You could be #1 on Maps but invisible to AI users. We help you get found in both places."
  },
  {
    question: "How quickly will I start getting more leads?",
    answer: "Most businesses see improved AI visibility within 2-4 weeks. The recommendations are simple: update your website content, strengthen your online reviews, and build local mentions. No technical skills needed — just follow the steps we give you."
  },
  {
    question: "Is this complicated? I'm not tech-savvy.",
    answer: "Not at all. We give you a simple checklist in plain English. Things like 'Add this sentence to your About page' or 'Get listed on these 3 directories.' If you can update your Google Business Profile, you can do this."
  },
  {
    question: "How is this different from my current marketing?",
    answer: "Your current marketing targets Google searchers. This targets a growing group of customers who ask AI for recommendations instead. It's like adding a new lead source without competing in the same crowded space as everyone else."
  }
];

export default function LocalAISearchLanding() {
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [showHubSpotModal, setShowHubSpotModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleScanClick = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFormSubmit = async () => {
    setShowHubSpotModal(false);
    setIsSubmitting(true);
    
    try {
      // Extract form data and process
      const formContainer = document.querySelector('.hubspot-embedded-form');
      const domainInput = formContainer?.querySelector('input[name="website"], input[name="domain"], input[type="url"]') as HTMLInputElement;
      const emailInput = formContainer?.querySelector('input[name="email"], input[type="email"]') as HTMLInputElement;
      const firstNameInput = formContainer?.querySelector('input[name="firstname"]') as HTMLInputElement;
      
      const domain = domainInput?.value || '';
      const email = emailInput?.value || '';
      const firstName = firstNameInput?.value || '';
      
      let cleanDomain = domain.trim().toLowerCase();
      if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
        cleanDomain = cleanDomain.replace(/^https?:\/\/(www\.)?/, '');
      } else {
        cleanDomain = cleanDomain.replace(/^(www\.)?/, '');
      }
      cleanDomain = cleanDomain.replace(/\/.*$/, '');
      
      if (cleanDomain && email) {
        const { data, error } = await supabase.functions.invoke('ai-visibility-submit', {
          body: {
            email: email.trim(),
            domain: cleanDomain,
            firstName: firstName.trim() || undefined,
            source: 'local_ai_landing',
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
            referrer: document.referrer || undefined,
          }
        });
        
        if (data?.snapshotToken) {
          navigate(`/lp/ai-visibility/results/${data.snapshotToken}`);
          return;
        }
      }
      
      // Fallback to generic results
      toast.success('Check your email for your visibility snapshot!');
    } catch (err) {
      console.error('Submission error:', err);
      toast.success('Check your email for your visibility snapshot!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Get More Local Leads From AI Search | Llumos</title>
        <meta name="description" content="You worked hard on Local SEO. But customers now ask AI for recommendations. Find out if AI sends leads to you — or your competitors. Free scan." />
        <meta name="keywords" content="local SEO, get more local leads, Google Maps ranking, local marketing help, AI local search, local business marketing" />
        <link rel="canonical" href="https://llumos.app/lp/local-ai-search" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="py-6 px-4 border-b border-border/50">
          <div className="container max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">L</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Llumos
                </span>
              </a>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
                  Pricing
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="py-16 md:py-24 px-4 relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
          
          <div className="container max-w-6xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Copy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                  <MapPin className="w-4 h-4" />
                  <span>The Next Step After Local SEO</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  You Rank on Google Maps.{' '}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    But Does AI Recommend You?
                  </span>
                </h1>
                
                <p className="text-xl text-muted-foreground mb-6">
                  More local customers now skip Google and ask AI directly: "Who should I hire?"
                  <br />
                  <span className="text-foreground font-medium">
                    Find out if you're getting those leads — or losing them to competitors.
                  </span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Button size="lg" className="gap-2 text-lg px-8" onClick={handleScanClick}>
                    Get My Free AI Visibility Check
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" onClick={() => {
                    const demoSection = document.getElementById('how-ai-works');
                    demoSection?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    See How This Works
                  </Button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-success" /> Free — No credit card
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-success" /> See results in 60 seconds
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-success" /> Works alongside your Local SEO
                  </span>
                </div>
              </motion.div>

              {/* Right: AI Demo */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-card border border-border rounded-2xl p-6 shadow-elevated">
                  {/* AI Chat simulation */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">AI Assistant</p>
                      <p className="text-xs text-muted-foreground">ChatGPT / Gemini / Perplexity</p>
                    </div>
                  </div>
                  
                  {/* User query */}
                  <div className="flex justify-end mb-4">
                    <div className="bg-primary/10 rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%]">
                      <p className="text-sm">{sampleAIConversation.query}</p>
                    </div>
                  </div>
                  
                  {/* AI response */}
                  <div className="bg-muted/50 rounded-2xl rounded-bl-sm px-4 py-4">
                    <p className="text-sm mb-3">Based on local reviews and availability, I recommend:</p>
                    <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 mb-3">
                      <p className="font-semibold text-success flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {sampleAIConversation.response.recommended}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{sampleAIConversation.response.reason}</p>
                    </div>
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                      <p className="font-medium text-destructive flex items-center gap-2 text-sm">
                        <EyeOff className="w-4 h-4" />
                        {sampleAIConversation.response.notMentioned} — Not mentioned
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-xs text-warning font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Is this happening to your business?
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* WHO THIS IS FOR - Business Types */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get More Local Leads — From a Source Your Competitors Miss
              </h2>
              <p className="text-lg text-muted-foreground">
                If you rely on local customers finding you, this is your next growth channel.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {businessTypes.map((type, i) => (
                <motion.div
                  key={type.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <type.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{type.label}</h3>
                  <p className="text-xs text-muted-foreground">{type.example}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEM SECTION */}
        <section className="py-20 px-4">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium mb-4">
                You Could Be Losing Leads Right Now
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Google Maps Isn't the Only Place Customers Find Local Businesses Anymore
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  icon: Search,
                  title: 'Customers Ask AI First',
                  examples: ['"Best plumber near me"', '"Who should I call for AC repair?"', '"Top-rated dentist in my area"'],
                  description: 'Instead of scrolling Google, they ask ChatGPT or Siri for a recommendation.'
                },
                {
                  icon: MessageSquare,
                  title: 'AI Gives One Name',
                  examples: ['No list to scroll', 'No ads to skip', 'Just one answer'],
                  description: 'AI doesn\'t show 10 options — it picks one business. That\'s a direct referral.'
                },
                {
                  icon: EyeOff,
                  title: 'Not Mentioned = No Lead',
                  examples: ['Zero phone calls', 'Zero website visits', 'Zero new customers'],
                  description: 'If AI recommends your competitor, that customer never even sees your name.'
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <ul className="space-y-2 mb-4">
                    {item.examples.map((ex) => (
                      <li key={ex} className="text-muted-foreground text-sm flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-primary" />
                        {ex}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-destructive/10 to-warning/10 border border-destructive/30 rounded-2xl p-8 text-center"
            >
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-xl md:text-2xl font-semibold max-w-3xl mx-auto">
                "Your Local SEO is working. But if AI doesn't mention you, you're missing a growing stream of ready-to-buy customers."
              </p>
            </motion.div>
          </div>
        </section>

        {/* WHAT IS LOCAL AI SEARCH VISIBILITY */}
        <section id="how-ai-works" className="py-20 px-4 bg-muted/30">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
                Local SEO + AI = More Leads
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                This Is the Next Step After Google Maps
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                You've done the work to rank locally. Now make sure AI sends customers your way too — not just to your competitors.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">AI Recommendations Are Location-Based</h3>
                      <p className="text-muted-foreground text-sm">
                        When someone asks "best dentist near me," AI tailors the answer to their city. You need to show up in YOUR service area — not just anywhere.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Google Maps Rank ≠ AI Rank</h3>
                      <p className="text-muted-foreground text-sm">
                        You might be #1 on Google Maps — but AI uses different signals. Great reviews and local SEO help, but AI needs more context to recommend you.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Every Neighborhood Is Different</h3>
                      <p className="text-muted-foreground text-sm">
                        AI might recommend you in one part of town but not another. We show you exactly where you're visible — and where you're not.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-sm font-medium text-muted-foreground">Local SEO vs Local GEO</span>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Local SEO</h4>
                      <p className="text-sm">Gets you found on Google & Maps</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-primary">AI Visibility</h4>
                      <p className="text-sm">Gets you recommended by AI</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-center">
                      <span className="text-primary">AI Visibility</span> is the next step after Local SEO — it captures leads that never touch Google.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { seo: 'Google Maps & Search', geo: 'ChatGPT / Siri / Alexa' },
                      { seo: 'Customer scrolls & picks', geo: 'AI picks for them' },
                      { seo: 'Compete with 10+ businesses', geo: 'Compete with 1-2 businesses' },
                      { seo: 'Lead clicks your listing', geo: 'Lead calls you directly' },
                    ].map((row) => (
                      <div key={row.seo} className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-muted-foreground">{row.seo}</div>
                        <div className="font-medium">{row.geo}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* HOW LLUMOS SOLVES THIS */}
        <section className="py-20 px-4">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-sm font-medium mb-4">
                Simple Local Marketing Help
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get More Local Leads With Less Effort
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                We show you exactly what to fix — in plain English. No tech skills required.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Eye,
                  title: 'See If AI Recommends You',
                  description: 'Find out instantly if ChatGPT, Siri, or other AI tools mention your business when customers ask.',
                  highlight: 'Instant visibility check'
                },
                {
                  icon: MapPin,
                  title: 'Track Your Service Area',
                  description: 'See which neighborhoods and cities you show up in — and which ones you\'re missing.',
                  highlight: 'Location-by-location'
                },
                {
                  icon: Users,
                  title: 'See Who\'s Getting Your Leads',
                  description: 'Find out which competitors AI recommends instead of you — and how often.',
                  highlight: 'Competitor tracking'
                },
                {
                  icon: Target,
                  title: 'Learn Why They Win',
                  description: 'Understand what your competitors do differently that makes AI prefer them.',
                  highlight: 'Gap analysis'
                },
                {
                  icon: Zap,
                  title: 'Get a Simple Fix List',
                  description: 'Clear, step-by-step actions to improve your visibility. No jargon, no guesswork.',
                  highlight: 'Plain-English steps'
                },
                {
                  icon: BarChart3,
                  title: 'Watch Your Leads Grow',
                  description: 'Track your progress over time as you implement the recommendations.',
                  highlight: 'Measure results'
                },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-primary">{feature.highlight}</span>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* VISUAL / UI MOCKUP */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                See Exactly Where You're Visible — And Where You're Not
              </h2>
              <p className="text-lg text-muted-foreground">
                Get a clear picture of your AI visibility across your entire service area.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-elevated"
            >
              {/* Dashboard Header */}
              <div className="bg-muted/50 border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Local AI Visibility Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Service Area:</span>
                  <span className="px-3 py-1 bg-primary/10 rounded-full text-sm font-medium text-primary">Austin, TX</span>
                </div>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Visibility Score */}
                  <div className="bg-muted/30 rounded-xl p-6 text-center">
                    <div className="text-6xl font-bold bg-gradient-to-r from-warning to-destructive bg-clip-text text-transparent mb-2">
                      34
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">AI Visibility Score</p>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning/10 text-warning rounded-full text-sm">
                      <AlertTriangle className="w-3 h-3" />
                      Low Visibility
                    </span>
                  </div>

                  {/* Location Breakdown */}
                  <div className="bg-muted/30 rounded-xl p-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Visibility by Area</h4>
                    <div className="space-y-3">
                      {[
                        { area: 'Downtown Austin', status: 'Not Visible', color: 'destructive' },
                        { area: 'South Austin', status: 'Partial', color: 'warning' },
                        { area: 'North Austin', status: 'Visible', color: 'success' },
                      ].map((item) => (
                        <div key={item.area} className="flex items-center justify-between">
                          <span className="text-sm">{item.area}</span>
                          <span className={`text-xs px-2 py-1 rounded bg-${item.color}/10 text-${item.color}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Competitor Comparison */}
                  <div className="bg-muted/30 rounded-xl p-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Top Competitor</h4>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive mb-2">Austin Pro Services</p>
                      <p className="text-sm text-muted-foreground">Appears <span className="text-foreground font-semibold">4x more often</span> than you in AI answers</p>
                    </div>
                  </div>
                </div>

                {/* AI Response Sample */}
                <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-dashed border-border">
                  <p className="text-xs text-muted-foreground mb-2">Sample AI Response for "Best plumber in Austin":</p>
                  <p className="text-sm">
                    "I recommend <span className="font-semibold text-success">Austin Pro Plumbing</span> for their excellent reviews and same-day service availability."
                  </p>
                  <p className="text-xs text-destructive mt-2">
                    Your business: Not mentioned
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* WHY THIS MATTERS */}
        <section className="py-20 px-4">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-sm font-medium mb-4">
                A New Way to Get Local Leads
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why Smart Local Businesses Are Adding AI Visibility Now
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                "AI leads are quieter than Google — but they convert better because customers already trust the recommendation."
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: TrendingUp,
                  title: 'New Lead Source Beyond Google',
                  description: 'Reach customers who skip Google entirely and go straight to AI for local recommendations.',
                },
                {
                  icon: Sparkles,
                  title: 'Beat Competitors to the Punch',
                  description: 'Most local businesses don\'t know about AI visibility yet. Get ahead now while the window is open.',
                },
                {
                  icon: Target,
                  title: 'Less Competition, More Wins',
                  description: 'AI only recommends 1-2 businesses per query — not a page of 10 competitors.',
                },
                {
                  icon: Clock,
                  title: 'Ready-to-Buy Customers',
                  description: 'People asking AI "who should I call" are ready to hire — they just need a name.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-6 bg-card border border-border rounded-xl"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST & AUTHORITY */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Made for Busy Business Owners — Not Marketing Experts
              </h2>
              <p className="text-lg text-muted-foreground">
                No dashboards to learn. No jargon to decode. Just clear steps that get results.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  icon: Shield,
                  stat: '2-Minute Setup',
                  label: 'Just enter your website',
                },
                {
                  icon: Clock,
                  stat: 'Instant Results',
                  label: 'See your visibility now',
                },
                {
                  icon: Star,
                  stat: 'Simple Action Steps',
                  label: 'Know exactly what to do next',
                },
              ].map((item) => (
                <motion.div
                  key={item.stat}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-2xl font-bold mb-1">{item.stat}</p>
                  <p className="text-muted-foreground">{item.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Testimonial placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-2xl p-8 max-w-3xl mx-auto"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">JM</span>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-lg mb-4">
                    "We've been doing Local SEO for years. But we had no idea customers were asking ChatGPT for recommendations — and getting our competitor's name. Within two weeks of using Llumos, we fixed that. Now we get calls from people who say AI told them to call us."
                  </p>
                  <p className="font-semibold">James Mitchell</p>
                  <p className="text-sm text-muted-foreground">Owner, Mitchell HVAC Services</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CONVERSION SECTION / FORM */}
        <section ref={formRef} className="py-20 px-4" id="scan-form">
          <div className="container max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
                Free Visibility Check
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Find Out If AI Is Sending You Leads — Or Sending Them to Competitors
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get a free snapshot showing your AI visibility, who's getting recommended instead of you, and what to do about it.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-2xl p-8 shadow-elevated"
            >
              <HubSpotForm
                portalId="244723281"
                formId="a5f00a96-4eba-44ef-a4a9-83ceb5d45d1d"
                region="na2"
                onFormSubmit={handleFormSubmit}
              />
              
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-success" /> 100% Free
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-success" /> Takes 60 seconds
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-success" /> No credit card needed
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Common Questions About AI Visibility
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/50"
                  >
                    <AccordionTrigger className="text-left font-semibold hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20 px-4">
          <div className="container max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 border border-primary/20 rounded-2xl p-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Your Competitors Might Already Be Getting These Leads
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Find out in 60 seconds if AI is working for you — or against you.
              </p>
              <Button size="lg" className="gap-2 text-lg px-8" onClick={handleScanClick}>
                Check My AI Visibility — Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-border">
          <div className="container max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">L</span>
                </div>
                <span className="font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Llumos
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Llumos. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
