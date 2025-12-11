import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, TrendingUp, TrendingDown, Check, X, ArrowRight, 
  Mail, Building, User, Sparkles, BarChart3, Target, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SEOHelmet } from '@/components/SEOHelmet';

interface ScoreData {
  score: number;
  composite: number;
  tier: string;
  domain: string;
  message: string;
  insights: {
    strengths: string[];
    improvements: string[];
  };
}

const ANALYSIS_STEPS = [
  { text: 'Fetching website content...', icon: Target },
  { text: 'Analyzing content quality...', icon: BarChart3 },
  { text: 'Evaluating brand clarity...', icon: Sparkles },
  { text: 'Checking SEO structure...', icon: Zap },
  { text: 'Calculating visibility score...', icon: TrendingUp },
];

export default function ScoreResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const domain = searchParams.get('domain') || '';
  
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Lead form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    if (!domain) {
      navigate('/');
      return;
    }
    
    analyzeWebsite();
  }, [domain]);

  const analyzeWebsite = async () => {
    setIsAnalyzing(true);
    setCurrentStep(0);
    setProgress(0);
    setError(null);

    // Animate through steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => Math.min(prev + 1, ANALYSIS_STEPS.length - 1));
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 95));
    }, 200);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-llumos-score-demo', {
        body: { domain }
      });

      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setProgress(100);
      
      if (fnError) {
        throw new Error(fnError.message || 'Failed to analyze website');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setScoreData(data);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze website. Please try again.');
    } finally {
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 500);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmitting(true);

    try {
      // Store lead in database
      const { error: insertError } = await supabase
        .from('visibility_report_requests')
        .insert({
          email: email.trim(),
          domain: domain,
          score: scoreData?.score || null,
          metadata: {
            name: name.trim() || null,
            company: company.trim() || null,
            score_tier: scoreData?.tier || null,
            source: 'score_results_page',
            requested_at: new Date().toISOString()
          }
        });

      if (insertError) {
        throw insertError;
      }

      setFormSubmitted(true);
      toast.success('Report request submitted! We\'ll be in touch shortly.');
    } catch (err: any) {
      console.error('Form submission error:', err);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 700) return 'text-green-500';
    if (score >= 500) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 700) return 'bg-green-500/10 border-green-500/20';
    if (score >= 500) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getTierLabel = (tier: string) => {
    const tiers: Record<string, { label: string; color: string }> = {
      'Excellent': { label: 'Excellent', color: 'text-green-400' },
      'Very Good': { label: 'Very Good', color: 'text-green-400' },
      'Good': { label: 'Good', color: 'text-emerald-400' },
      'Fair': { label: 'Fair', color: 'text-amber-400' },
      'Needs Improvement': { label: 'Needs Improvement', color: 'text-red-400' },
    };
    return tiers[tier] || { label: tier, color: 'text-muted-foreground' };
  };

  return (
    <>
      <SEOHelmet
        title={`AI Visibility Score for ${domain} | Llumos`}
        description={`See how ${domain} ranks in AI search results across ChatGPT, Perplexity, and Gemini.`}
      />
      
      <div className="min-h-screen bg-background">
        {/* Background effects */}
        <div className="fixed inset-0 bg-gradient-to-br from-violet-950/30 via-background to-blue-950/20" />
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />

        <div className="relative z-10 container max-w-5xl mx-auto px-4 py-12">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              ← Back to Home
            </button>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              AI Visibility Analysis
            </h1>
            <p className="text-lg text-muted-foreground">
              Results for <span className="text-foreground font-semibold">{domain}</span>
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-xl mx-auto"
              >
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8">
                  <div className="text-center mb-8">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Analyzing Your Website</h2>
                    <p className="text-muted-foreground">
                      {ANALYSIS_STEPS[currentStep]?.text}
                    </p>
                  </div>
                  
                  <Progress value={progress} className="h-2 mb-4" />
                  
                  <div className="space-y-3">
                    {ANALYSIS_STEPS.map((step, index) => {
                      const Icon = step.icon;
                      const isComplete = index < currentStep;
                      const isCurrent = index === currentStep;
                      
                      return (
                        <div 
                          key={index}
                          className={`flex items-center gap-3 text-sm transition-colors ${
                            isComplete ? 'text-green-500' : isCurrent ? 'text-foreground' : 'text-muted-foreground/50'
                          }`}
                        >
                          {isComplete ? (
                            <Check className="h-4 w-4" />
                          ) : isCurrent ? (
                            <Icon className="h-4 w-4 animate-pulse" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                          <span>{step.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-xl mx-auto text-center"
              >
                <div className="bg-card/60 backdrop-blur-xl border border-destructive/50 rounded-2xl p-8">
                  <X className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Analysis Failed</h2>
                  <p className="text-muted-foreground mb-6">{error}</p>
                  <Button onClick={analyzeWebsite}>
                    Try Again
                  </Button>
                </div>
              </motion.div>
            ) : scoreData ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-2 gap-8"
              >
                {/* Score Card */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8">
                  <h2 className="text-lg font-semibold mb-6">Your Llumos Score</h2>
                  
                  {/* Score Display */}
                  <div className={`rounded-xl p-6 mb-6 border ${getScoreBgColor(scoreData.score)}`}>
                    <div className="text-center">
                      <div className={`text-6xl md:text-7xl font-bold ${getScoreColor(scoreData.score)}`}>
                        {scoreData.score}
                      </div>
                      <div className="text-muted-foreground text-sm mt-1">out of 850</div>
                      <div className={`text-lg font-medium mt-2 ${getTierLabel(scoreData.tier).color}`}>
                        {getTierLabel(scoreData.tier).label}
                      </div>
                    </div>
                  </div>

                  {/* Analysis Summary */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Analysis</h3>
                    <p className="text-sm leading-relaxed">{scoreData.message}</p>
                  </div>

                  {/* Strengths */}
                  {scoreData.insights.strengths.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {scoreData.insights.strengths.map((strength, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {scoreData.insights.improvements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                        Areas to Improve
                      </h3>
                      <ul className="space-y-2">
                        {scoreData.insights.improvements.map((improvement, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* How it's calculated */}
                  <div className="mt-8 pt-6 border-t border-border/50">
                    <h3 className="text-sm font-medium mb-4">How Your Score is Calculated</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Content Quality & Depth</span>
                        <span className="font-medium">25 points</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brand Clarity & Messaging</span>
                        <span className="font-medium">20 points</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SEO Elements & Structure</span>
                        <span className="font-medium">20 points</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Authority Signals</span>
                        <span className="font-medium">15 points</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Topic Relevance & Expertise</span>
                        <span className="font-medium">20 points</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lead Capture Form */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8">
                  {formSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-green-500" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">Request Submitted!</h2>
                      <p className="text-muted-foreground mb-6">
                        We'll analyze your website in detail and send you a comprehensive visibility report within 24 hours.
                      </p>
                      <Button onClick={() => navigate('/signup')} className="gap-2">
                        Create Free Account <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-2">Get Your Full Visibility Report</h2>
                        <p className="text-muted-foreground text-sm">
                          Receive a detailed analysis with competitor insights, AI platform breakdown, and personalized recommendations.
                        </p>
                      </div>

                      <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-sm mb-3">What's included:</h3>
                        <ul className="space-y-2 text-sm">
                          {[
                            'Visibility breakdown across ChatGPT, Perplexity, Gemini',
                            'Competitor comparison and rankings',
                            'Content optimization recommendations',
                            'AI search keyword opportunities',
                            'Actionable next steps to improve'
                          ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-violet-400 shrink-0" />
                              <span className="text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <form onSubmit={handleSubmitForm} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Email <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="you@company.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Your name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Company</label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Your company"
                              value={company}
                              onChange={(e) => setCompany(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full h-12 text-base gap-2"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              Get Full Report
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </form>

                      <p className="text-xs text-muted-foreground text-center mt-4">
                        By submitting, you agree to our{' '}
                        <a href="/terms" className="underline hover:text-foreground">Terms</a>
                        {' '}and{' '}
                        <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
