import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2, Search, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { MockChatInterface } from './MockChatInterface';
import { LiveStats } from './LiveStats';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HubSpotForm, HUBSPOT_CONFIG, preloadHubSpotForms, HubSpotFormData } from '@/components/hubspot/HubSpotForm';
import { supabase } from '@/integrations/supabase/client';
import { validateDomain, DomainValidationResult } from '@/utils/domainValidation';

export function HeroSection() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHubSpotModal, setShowHubSpotModal] = useState(false);
  const [cleanedDomain, setCleanedDomain] = useState('');
  const [domainWarning, setDomainWarning] = useState<string | null>(null);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [pendingValidation, setPendingValidation] = useState<DomainValidationResult | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Preload HubSpot so the gated form appears quickly
    preloadHubSpotForms();
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    // Validate the domain
    const validation = validateDomain(url);
    
    if (!validation.isValid) {
      // Hard block - show error
      toast.error(validation.warning || 'Please enter a valid domain');
      setDomainWarning(validation.warning || null);
      return;
    }

    if (validation.warning) {
      // Soft warning - ask for confirmation
      setPendingValidation(validation);
      setShowWarningConfirm(true);
      return;
    }

    // All good - proceed
    proceedWithDomain(validation.cleanedDomain);
  };

  const proceedWithDomain = (domain: string) => {
    setCleanedDomain(domain);
    setDomainWarning(null);
    setPendingValidation(null);
    setShowWarningConfirm(false);
    setShowHubSpotModal(true);
  };

  const handleWarningConfirm = () => {
    if (pendingValidation) {
      proceedWithDomain(pendingValidation.cleanedDomain);
    }
  };

  const handleWarningCancel = () => {
    setShowWarningConfirm(false);
    setPendingValidation(null);
  };

  const handleHubSpotSubmit = async (formData?: HubSpotFormData) => {
    setShowHubSpotModal(false);
    setIsLoading(true);
    
    const email = formData?.email || '';
    const firstName = formData?.firstName || '';
    
    console.log('[HeroSection] Form submission:', { 
      email, 
      firstName, 
      domain: cleanedDomain,
      hasEmail: !!email,
      hasDomain: !!cleanedDomain 
    });
    
    // Trigger the visibility report using the reliable request-visibility-report endpoint
    if (email && cleanedDomain) {
      try {
        console.log('[HeroSection] Calling request-visibility-report for:', cleanedDomain);
        
        const { data, error } = await supabase.functions.invoke('request-visibility-report', {
          body: {
            firstName: firstName || 'Visitor',
            email,
            domain: cleanedDomain,
            score: 0,
          }
        });
        
        if (error) {
          console.error('[HeroSection] Report request error:', error);
        } else {
          console.log('[HeroSection] Report request successful:', data);
        }
      } catch (err) {
        console.error('[HeroSection] Failed to request report:', err);
      }
    } else {
      console.warn('[HeroSection] Missing email or domain:', { email, cleanedDomain });
    }
    
    setTimeout(() => {
      navigate(`/score-results?domain=${encodeURIComponent(cleanedDomain)}`);
    }, 300);
  };

  return (
    <>
      <section className="relative min-h-[70vh] flex flex-col pt-24 pb-8 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-background to-blue-950/20" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="container max-w-7xl mx-auto relative z-10">
          {/* Logo at top */}
          <motion.div 
            className="flex flex-col items-center justify-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="flex items-center gap-4 mb-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                <Search className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <span className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Llumos
              </span>
            </motion.div>
            <motion.p 
              className="text-base md:text-lg text-muted-foreground text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              AI Search Visibility Platform
            </motion.p>
          </motion.div>
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
                AI Visibility Platform
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Your customers are asking{' '}
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  ChatGPT
                </span>
                . Is ChatGPT recommending{' '}
                <span className="italic">you</span>?
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Stop optimizing for ten blue links. Start optimizing for the single right answer. 
                Track your brand visibility across ChatGPT, Perplexity, Google AI Overviews, and Gemini.
              </p>

              {/* URL Input Form */}
              <form onSubmit={handleAnalyze} className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="yourcompany.com"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        setDomainWarning(null); // Clear warning on change
                      }}
                      className={`h-14 px-5 text-base bg-card/50 border-white/10 focus:border-violet-500/50 placeholder:text-muted-foreground/60 ${
                        domainWarning ? 'border-amber-500/50' : ''
                      }`}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    size="lg"
                    className="h-14 px-8 text-base bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 group whitespace-nowrap"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Get Your Free Score
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Domain warning message */}
                {domainWarning && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{domainWarning}</span>
                  </div>
                )}
                
                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Free instant analysis
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-violet-400" />
                    Results in 30 seconds
                  </span>
                </div>
              </form>

              {/* Live stats */}
              <LiveStats />
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

      {/* Warning Confirmation Dialog */}
      <Dialog open={showWarningConfirm} onOpenChange={setShowWarningConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Domain Warning
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {pendingValidation?.warning}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-4 mt-2">
            <p className="text-sm text-muted-foreground">
              You entered: <strong className="text-foreground">{pendingValidation?.cleanedDomain}</strong>
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleWarningCancel}
            >
              Go Back & Edit
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-500"
              onClick={handleWarningConfirm}
            >
              Continue Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
