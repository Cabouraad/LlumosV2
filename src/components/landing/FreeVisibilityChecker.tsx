import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2, Zap, Shield, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HubSpotForm, HUBSPOT_CONFIG } from '@/components/hubspot/HubSpotForm';

export function FreeVisibilityChecker() {
  const [url, setUrl] = useState('');
  const [brandName, setBrandName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHubSpotModal, setShowHubSpotModal] = useState(false);
  const [cleanedDomain, setCleanedDomain] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    setIsLoading(true);
    
    setTimeout(() => {
      navigate(`/score-results?domain=${encodeURIComponent(cleanedDomain)}&brand=${encodeURIComponent(brandName)}`);
    }, 300);
  };

  return (
    <>
      <section className="py-16 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 to-transparent" />
        
        <div className="container max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Get Your Free AI Visibility Snapshot
              </h2>
              <p className="text-muted-foreground text-lg">
                See where your brand appears in AI answers — and where competitors outrank you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Website URL (e.g., example.com)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 px-4 bg-background/50 border-white/10 focus:border-violet-500/50"
                />
                <Input
                  type="text"
                  placeholder="Brand Name (optional)"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="h-12 px-4 bg-background/50 border-white/10 focus:border-violet-500/50"
                />
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Running Scan...
                  </>
                ) : (
                  <>
                    Run Free Scan
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Instant results
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                Takes 30 seconds
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HubSpot Form Modal */}
      <Dialog open={showHubSpotModal} onOpenChange={setShowHubSpotModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Get Your Free Scan 🔍
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Enter your email to receive your AI visibility snapshot for <strong>{cleanedDomain}</strong>
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
            We'll never share your email • Instant access
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
