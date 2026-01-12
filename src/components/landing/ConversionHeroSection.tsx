import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2, Search, Eye, FileText, Users } from 'lucide-react';
import { MockChatInterface } from './MockChatInterface';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HubSpotForm, HUBSPOT_CONFIG, preloadHubSpotForms, HubSpotFormData } from '@/components/hubspot/HubSpotForm';
import { supabase } from '@/integrations/supabase/client';

export function ConversionHeroSection() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHubSpotModal, setShowHubSpotModal] = useState(false);
  const [cleanedDomain, setCleanedDomain] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    preloadHubSpotForms();
  }, []);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    console.log('[ConversionHeroSection] handleAnalyze called, url:', url);
    
    if (!url.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    let cleanUrl = url.trim().toLowerCase();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = cleanUrl.replace(/^(www\.)?/, '');
    } else {
      cleanUrl = cleanUrl.replace(/^https?:\/\/(www\.)?/, '');
    }
    cleanUrl = cleanUrl.replace(/\/.*$/, '');

    console.log('[ConversionHeroSection] Cleaned URL:', cleanUrl);

    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanUrl)) {
      toast.error('Please enter a valid domain (e.g., example.com)');
      return;
    }

    console.log('[ConversionHeroSection] Opening HubSpot modal for:', cleanUrl);
    setCleanedDomain(cleanUrl);
    setShowHubSpotModal(true);
  };

  const handleHubSpotSubmit = async (formData?: HubSpotFormData) => {
    setShowHubSpotModal(false);
    setIsLoading(true);
    
    const email = formData?.email || '';
    const firstName = formData?.firstName || '';
    
    console.log('[ConversionHeroSection] Form submission:', { 
      email, 
      firstName, 
      domain: cleanedDomain,
      hasEmail: !!email,
      hasDomain: !!cleanedDomain 
    });
    
    // Trigger the visibility report using the reliable request-visibility-report endpoint
    if (email && cleanedDomain) {
      try {
        console.log('[ConversionHeroSection] Calling request-visibility-report for:', cleanedDomain);
        
        const { data, error } = await supabase.functions.invoke('request-visibility-report', {
          body: {
            firstName: firstName || 'Visitor',
            email,
            domain: cleanedDomain,
            score: 0,
          }
        });
        
        if (error) {
          console.error('[ConversionHeroSection] Report request error:', error);
        } else {
          console.log('[ConversionHeroSection] Report request successful:', data);
        }
      } catch (err) {
        console.error('[ConversionHeroSection] Failed to request report:', err);
      }
    } else {
      console.warn('[ConversionHeroSection] Missing email or domain:', { email, cleanedDomain });
    }
    
    setTimeout(() => {
      navigate(`/score-results?domain=${encodeURIComponent(cleanedDomain)}`);
    }, 300);
  };

  return (
    <>
      <section className="relative min-h-[80vh] flex flex-col pt-24 pb-12 px-4 overflow-hidden">
        {/* Background effects - pointer-events-none to not block clicks */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-background to-blue-950/20 pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        <div className="container max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400"></span>
                </span>
                AI Visibility Platform for Marketing Teams
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Turn AI Search Mentions Into{' '}
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  Revenue
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                See how your brand appears in ChatGPT, Gemini, and Perplexity — and get clear actions to improve visibility and win more demand from AI-powered search.
              </p>

              {/* URL Input Form */}
              <form onSubmit={handleAnalyze} className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Enter your website URL"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="h-14 px-5 text-base bg-card/50 border-white/10 focus:border-violet-500/50 placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    size="lg"
                    onClick={(e) => {
                      console.log('[ConversionHeroSection] Button clicked');
                      // Form submit should handle this, but onClick as backup
                    }}
                    className="h-14 px-8 text-base bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 group whitespace-nowrap"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Check My AI Visibility
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Secondary CTA */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 hover:bg-white/5"
                  onClick={() => navigate('/demo')}
                >
                  View Live Demo
                </Button>
              </div>

              {/* Value Strip */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-violet-400" />
                  Prompts AI responds to
                </span>
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  Sources AI cites
                </span>
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  Why competitors are recommended
                </span>
              </div>
            </motion.div>

            {/* Right content - Mock Chat */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <MockChatInterface />
            </motion.div>
          </div>
        </div>
      </section>

      {/* HubSpot Form Modal */}
      <Dialog open={showHubSpotModal} onOpenChange={setShowHubSpotModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Almost there! 🎯
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Enter your details to get your free AI visibility score for <strong>{cleanedDomain}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <HubSpotForm
              portalId={HUBSPOT_CONFIG.portalId}
              formId={HUBSPOT_CONFIG.forms.hero}
              region={HUBSPOT_CONFIG.region}
              onFormSubmit={handleHubSpotSubmit}
              className="hubspot-form-container"
            />
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            No credit card required • Results in 30 seconds
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
