import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2, Search } from 'lucide-react';
import { MockChatInterface } from './MockChatInterface';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function HeroSection() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    // Clean up the URL
    let cleanUrl = url.trim().toLowerCase();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = cleanUrl.replace(/^(www\.)?/, '');
    } else {
      cleanUrl = cleanUrl.replace(/^https?:\/\/(www\.)?/, '');
    }
    cleanUrl = cleanUrl.replace(/\/.*$/, '');

    // Basic validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanUrl)) {
      toast.error('Please enter a valid domain (e.g., example.com)');
      return;
    }

    setIsLoading(true);
    
    // Store the domain for the signup flow
    sessionStorage.setItem('analysis-domain', cleanUrl);
    
    // Redirect to signup with the domain
    setTimeout(() => {
      navigate('/signup', { state: { domain: cleanUrl } });
    }, 500);
  };

  return (
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
                  className="h-14 px-8 text-base bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 group whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze Visibility
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <p className="text-sm text-muted-foreground">
              Trusted by 500+ brands • Free analysis • No credit card required
            </p>
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
  );
}
