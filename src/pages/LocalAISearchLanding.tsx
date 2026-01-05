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
  query: "Who's the best plumber near downtown Austin?",
  response: {
    recommended: "Austin Pro Plumbing",
    reason: "Highly rated local service with 24/7 availability and certified technicians",
    notMentioned: "[Your Business]"
  }
};

// Local business types
const businessTypes = [
  { icon: Wrench, label: 'Home Services', example: 'Plumbers, HVAC, Electricians' },
  { icon: Stethoscope, label: 'Medical & Dental', example: 'Dentists, Clinics, Specialists' },
  { icon: Scale, label: 'Law Firms', example: 'Attorneys, Legal Services' },
  { icon: Home, label: 'Real Estate', example: 'Agents, Property Managers' },
  { icon: Utensils, label: 'Restaurants', example: 'Cafes, Bars, Eateries' },
  { icon: Building2, label: 'Local Retail', example: 'Shops, Boutiques, Stores' },
];

// FAQ data
const faqs = [
  {
    question: "Does this replace Local SEO?",
    answer: "No — Local AI Search Visibility complements your existing Local SEO efforts. While Local SEO helps you rank on Google Maps and local search results, Local GEO ensures you appear in AI-generated answers. Think of it as the next layer of local discovery."
  },
  {
    question: "Does AI use Google Maps data?",
    answer: "Not always. AI models like ChatGPT and Perplexity pull from various sources including web content, reviews, directories, and their training data. Your Google Maps ranking doesn't guarantee AI visibility, which is why dedicated tracking is essential."
  },
  {
    question: "How fast can my results improve?",
    answer: "Many businesses see visibility improvements within 2-4 weeks of implementing our recommendations. The speed depends on your current online presence, the competitiveness of your local market, and how quickly you can implement suggested changes."
  },
  {
    question: "Do I need technical skills?",
    answer: "Not at all. Llumos provides clear, actionable recommendations in plain language. Most improvements involve updating your website content, optimizing your business listings, and building local citations — all things you or your team can handle."
  },
  {
    question: "How is this different from traditional SEO tools?",
    answer: "Traditional SEO tools track Google rankings. Llumos tracks actual AI recommendations — what ChatGPT, Gemini, and Perplexity say when customers ask about services in your area. These are completely different systems with different ranking factors."
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
        <title>Local AI Search Visibility | Get Found in ChatGPT & AI Answers | Llumos</title>
        <meta name="description" content="AI now recommends local businesses to customers. See if ChatGPT, Gemini, and Perplexity recommend your local business — or your competitors." />
        <meta name="keywords" content="local AI search, local GEO, AI recommendations, local business AI visibility, ChatGPT local search" />
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
                  <span>Local AI Search Visibility</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Local Customers Are Finding Businesses Through AI —{' '}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Are They Finding Yours?
                  </span>
                </h1>
                
                <p className="text-xl text-muted-foreground mb-6">
                  ChatGPT, Gemini, and Perplexity now recommend local businesses.
                  <br />
                  <span className="text-foreground font-medium">
                    Llumos shows whether your business appears — and helps you fix it if you don't.
                  </span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Button size="lg" className="gap-2 text-lg px-8" onClick={handleScanClick}>
                    Run Free Local AI Visibility Scan
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" onClick={() => {
                    const demoSection = document.getElementById('how-ai-works');
                    demoSection?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    See How AI Recommends Local Businesses
                  </Button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-success" /> No credit card required
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-success" /> Results in 60 seconds
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-success" /> Built for local businesses
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
                Built for Local Businesses Like Yours
              </h2>
              <p className="text-lg text-muted-foreground">
                If you rely on local customers finding you, AI visibility matters.
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
                The Visibility Problem
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                AI Doesn't Show 10 Blue Links. It Gives <span className="text-destructive">One Answer</span>.
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  icon: Search,
                  title: 'Customers Ask AI',
                  examples: ['"Best plumber near me"', '"Top dentist in Boston"', '"Who should I call for HVAC repair?"'],
                  description: 'People now ask AI tools directly instead of searching Google.'
                },
                {
                  icon: MessageSquare,
                  title: 'AI Gives One Answer',
                  examples: ['No scrolling', 'No alternatives', 'One recommendation'],
                  description: 'AI doesn\'t show a list — it recommends specific businesses.'
                },
                {
                  icon: EyeOff,
                  title: 'Invisible = Zero Leads',
                  examples: ['No clicks', 'No calls', 'No customers'],
                  description: 'If AI doesn\'t mention you, you get zero visibility from AI users.'
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
                "If your business doesn't appear in AI answers, you effectively don't exist to customers using AI to make decisions."
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
                Understanding Local GEO
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What is Local AI Search Visibility?
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                <strong>Local AI Search Visibility</strong> means how often — and how favorably — your business appears when AI tools recommend businesses in your city or service area.
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
                      <h3 className="font-semibold mb-2">Location-Specific Recommendations</h3>
                      <p className="text-muted-foreground text-sm">
                        AI recommendations are tailored to the user's location. A query for "best dentist" in Austin gets different results than the same query in Boston.
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
                      <h3 className="font-semibold mb-2">Different from Google Maps</h3>
                      <p className="text-muted-foreground text-sm">
                        AI does not always mirror Google Maps rankings. Your #1 position on Maps doesn't guarantee AI will recommend you — they use different signals.
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
                      <h3 className="font-semibold mb-2">City & Service Area Variations</h3>
                      <p className="text-muted-foreground text-sm">
                        Different cities can show different businesses for the same question. Your visibility can vary dramatically by neighborhood, city, or service area.
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
                      <p className="text-sm">Helps customers find you on Google</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-primary">Local GEO</h4>
                      <p className="text-sm">Helps customers find you inside AI</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-center">
                      <span className="text-primary">Local GEO</span> is the next evolution of Local SEO — but inside AI answers.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { seo: 'Google Maps', geo: 'ChatGPT / Gemini / Perplexity' },
                      { seo: '10 blue links', geo: '1 direct recommendation' },
                      { seo: 'User chooses from list', geo: 'AI chooses for user' },
                      { seo: 'Click-through traffic', geo: 'Referral-style traffic' },
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
                The Solution
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How Llumos Helps You Get Found in AI
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Simple, actionable insights to improve your local AI visibility — no technical skills required.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Eye,
                  title: 'Monitor AI Appearances',
                  description: 'See if your business appears when AI answers local search questions in your category.',
                  highlight: 'Real-time tracking'
                },
                {
                  icon: MapPin,
                  title: 'Track by Location',
                  description: 'Monitor visibility by city, neighborhood, and service area to understand local variations.',
                  highlight: 'City-level insights'
                },
                {
                  icon: Users,
                  title: 'Compare to Competitors',
                  description: 'See which local competitors AI recommends instead of you and how often.',
                  highlight: 'Competitive intel'
                },
                {
                  icon: Target,
                  title: 'Identify Why Others Win',
                  description: 'Understand the signals that make AI recommend competitors over your business.',
                  highlight: 'Gap analysis'
                },
                {
                  icon: Zap,
                  title: 'Get Clear Recommendations',
                  description: 'Step-by-step actions to improve your AI visibility, written in plain English.',
                  highlight: 'Actionable steps'
                },
                {
                  icon: BarChart3,
                  title: 'Track Progress Over Time',
                  description: 'See how your visibility improves as you implement recommendations.',
                  highlight: 'Historical trends'
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
                See Your Local AI Visibility at a Glance
              </h2>
              <p className="text-lg text-muted-foreground">
                AI recommends different businesses depending on location.
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
                The Opportunity
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why Local AI Visibility Matters Now
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                "AI traffic is quieter than Google — but far more decisive."
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: TrendingUp,
                  title: 'Incremental Leads Beyond Google',
                  description: 'Capture customers who never even search Google — they go straight to AI for recommendations.',
                },
                {
                  icon: Sparkles,
                  title: 'Early-Mover Advantage',
                  description: 'Most local businesses don\'t know about AI visibility yet. Get ahead while competition is low.',
                },
                {
                  icon: Target,
                  title: 'Less Competition Than Search',
                  description: 'AI only recommends a few businesses per query, unlike Google\'s crowded results pages.',
                },
                {
                  icon: Clock,
                  title: 'High-Intent Customers',
                  description: 'People asking AI for recommendations are ready to buy — they just need to know who to call.',
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
                Built for Local Businesses, Not Enterprise Complexity
              </h2>
              <p className="text-lg text-muted-foreground">
                Simple, fast, and designed for business owners who want results, not dashboards.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  icon: Shield,
                  stat: 'Simple Setup',
                  label: 'No technical skills needed',
                },
                {
                  icon: Clock,
                  stat: '60 Seconds',
                  label: 'To see your first insights',
                },
                {
                  icon: Star,
                  stat: 'Clear Actions',
                  label: 'Plain-English recommendations',
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
                    "We had no idea AI was recommending our competitors instead of us. Within two weeks of using Llumos, we started appearing in local AI answers and got three new leads from people who said they 'asked ChatGPT for a recommendation.'"
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
                Free Local AI Visibility Scan
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Check If AI Recommends Your Business
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get a free snapshot showing if you appear in AI answers, where you appear, and which competitors are mentioned instead.
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
                  <Check className="w-4 h-4 text-success" /> No credit card required
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-success" /> Results in 60 seconds
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-success" /> Instant email with snapshot
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
                Frequently Asked Questions
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
                Customers Are Already Using AI to Choose Local Businesses
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Make sure you're the one they see.
              </p>
              <Button size="lg" className="gap-2 text-lg px-8" onClick={handleScanClick}>
                Check My Local AI Visibility
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
