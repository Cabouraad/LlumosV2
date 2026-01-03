import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function ConversionHeroV2() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!websiteUrl.trim()) {
      toast.error('Please enter your website URL');
      return;
    }
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    
    // Clean the URL
    let cleanedUrl = websiteUrl.trim().toLowerCase();
    cleanedUrl = cleanedUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
    cleanedUrl = cleanedUrl.replace(/\/.*$/, '');
    
    // Store lead data for later use
    sessionStorage.setItem('lead_data', JSON.stringify({
      domain: cleanedUrl,
      email: email.trim(),
      competitors: competitors.trim()
    }));

    // Navigate to results page
    setTimeout(() => {
      setIsSubmitting(false);
      navigate(`/score-results?domain=${encodeURIComponent(cleanedUrl)}`);
    }, 800);
  };

  const trustItems = [
    { text: 'Built for SEO & growth teams' },
    { text: 'Tracks real AI answers — not estimates' },
    { text: 'No credit card required' },
  ];

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-4 overflow-hidden min-h-[90vh] flex items-center">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] opacity-50" />
      
      <div className="container max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Headlines */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              See If AI Recommends Your Brand — Or Your{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Competitors
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
              ChatGPT, Gemini, and Perplexity now decide which brands get recommended.
              Llumos shows where you appear, where you don't, and why.
            </p>

            {/* Trust micro-copy */}
            <div className="flex flex-wrap gap-4">
              {trustItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-success" />
                  </div>
                  {item.text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 shadow-elevated">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-foreground font-medium">
                    Website URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="h-12 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="competitors" className="text-muted-foreground font-medium">
                    Competitors <span className="text-muted-foreground text-xs">(optional, up to 3)</span>
                  </Label>
                  <Input
                    id="competitors"
                    type="text"
                    placeholder="competitor1.com, competitor2.com"
                    value={competitors}
                    onChange={(e) => setCompetitors(e.target.value)}
                    className="h-12 bg-background/50 border-border/50 focus:border-primary"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 group"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    <>
                      Get My Free AI Visibility Report
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Takes ~2 minutes · Instant preview · No credit card
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
