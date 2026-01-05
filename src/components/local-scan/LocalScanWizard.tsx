import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, Check, Lock, MapPin, Building2, Globe, Loader2,
  Eye, EyeOff, TrendingUp, AlertTriangle, ChevronRight, Sparkles,
  Calendar, Mail, X, Star, MessageSquare, Phone
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Business categories for dropdown
const businessCategories = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'hvac', label: 'HVAC / Heating & Cooling' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'doctor', label: 'Doctor / Physician' },
  { value: 'therapist', label: 'Therapist / Counselor' },
  { value: 'chiropractor', label: 'Chiropractor' },
  { value: 'lawyer', label: 'Lawyer / Attorney' },
  { value: 'accountant', label: 'Accountant / CPA' },
  { value: 'realtor', label: 'Real Estate Agent' },
  { value: 'property-manager', label: 'Property Manager' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe / Coffee Shop' },
  { value: 'salon', label: 'Hair Salon / Barber' },
  { value: 'spa', label: 'Spa / Wellness' },
  { value: 'gym', label: 'Gym / Fitness Studio' },
  { value: 'auto-repair', label: 'Auto Repair' },
  { value: 'cleaning', label: 'Cleaning Service' },
  { value: 'pest-control', label: 'Pest Control' },
  { value: 'other', label: 'Other Local Business' },
];

// Scanning messages that rotate
const scanningMessages = [
  { text: 'Checking AI recommendations for {category} in {city}...', icon: MapPin },
  { text: 'Analyzing competitor mentions...', icon: Building2 },
  { text: 'Detecting AI trust signals...', icon: Star },
  { text: 'Evaluating local visibility patterns...', icon: Eye },
  { text: 'Comparing with top local businesses...', icon: TrendingUp },
];

// AI model logos/icons for visual display
const aiModels = [
  { name: 'ChatGPT', color: 'from-emerald-500 to-teal-600' },
  { name: 'Gemini', color: 'from-blue-500 to-indigo-600' },
  { name: 'Perplexity', color: 'from-purple-500 to-pink-600' },
  { name: 'Claude', color: 'from-orange-500 to-red-500' },
];

interface LocalScanWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (data: ScanResults) => void;
}

interface ScanResults {
  businessName: string;
  website: string;
  city: string;
  category: string;
  visibilityVerdict: 'not_mentioned' | 'occasionally_mentioned' | 'frequently_recommended';
  score: number;
  competitors: Array<{ name: string; mentionRate: string }>;
  googleMapsRank: number;
  aiVisibilityScore: number;
}

type WizardStep = 'input' | 'scanning' | 'results';

export function LocalScanWizard({ isOpen, onClose, onComplete }: LocalScanWizardProps) {
  const [step, setStep] = useState<WizardStep>('input');
  const [formData, setFormData] = useState({
    businessName: '',
    website: '',
    city: '',
    category: '',
  });
  const [scanProgress, setScanProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [results, setResults] = useState<ScanResults | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setFormData({ businessName: '', website: '', city: '', category: '' });
      setScanProgress(0);
      setCurrentMessageIndex(0);
      setResults(null);
      setShowEmailCapture(false);
      setEmail('');
    }
  }, [isOpen]);

  // Scanning animation
  useEffect(() => {
    if (step !== 'scanning') return;

    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 80);

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % scanningMessages.length);
    }, 1500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [step]);

  // Complete scan when progress reaches 100
  useEffect(() => {
    if (scanProgress >= 100 && step === 'scanning') {
      const timer = setTimeout(() => {
        // Generate mock results
        const mockResults = generateMockResults(formData);
        setResults(mockResults);
        setStep('results');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [scanProgress, step, formData]);

  const generateMockResults = (data: typeof formData): ScanResults => {
    // Generate a deterministic score based on business name
    const hash = data.businessName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const score = 15 + Math.abs(hash % 30); // 15-45 range
    
    const categoryLabel = businessCategories.find(c => c.value === data.category)?.label || data.category;
    
    return {
      businessName: data.businessName,
      website: data.website,
      city: data.city,
      category: categoryLabel,
      visibilityVerdict: score < 25 ? 'not_mentioned' : score < 40 ? 'occasionally_mentioned' : 'frequently_recommended',
      score,
      competitors: [
        { name: `${data.city} Pro ${categoryLabel.split(' ')[0]}`, mentionRate: '68%' },
        { name: `Elite ${categoryLabel.split(' ')[0]} Services`, mentionRate: '52%' },
        { name: `${data.city} Best ${categoryLabel.split(' ')[0]}`, mentionRate: '41%' },
      ],
      googleMapsRank: Math.floor(Math.random() * 5) + 1,
      aiVisibilityScore: score,
    };
  };

  const handleSubmit = () => {
    if (!formData.businessName || !formData.website || !formData.city || !formData.category) {
      toast.error('Please fill in all fields');
      return;
    }
    setStep('scanning');
  };

  const handleUnlockReport = () => {
    // Navigate to signup or show HubSpot form
    window.open('/auth?source=local-scan', '_blank');
    onComplete?.(results!);
  };

  const handleBookDemo = () => {
    window.open('https://calendly.com/llumos/demo', '_blank');
  };

  const handleEmailSubmit = () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    toast.success('Summary sent! Check your inbox.');
    setShowEmailCapture(false);
  };

  const getCategoryLabel = () => {
    return businessCategories.find(c => c.value === formData.category)?.label || formData.category;
  };

  const getCurrentMessage = () => {
    const msg = scanningMessages[currentMessageIndex];
    return msg.text
      .replace('{category}', getCategoryLabel())
      .replace('{city}', formData.city || 'your area');
  };

  const getVerdictDisplay = () => {
    if (!results) return null;
    switch (results.visibilityVerdict) {
      case 'not_mentioned':
        return { label: 'Not Mentioned', color: 'destructive', icon: EyeOff };
      case 'occasionally_mentioned':
        return { label: 'Occasionally Mentioned', color: 'warning', icon: Eye };
      case 'frequently_recommended':
        return { label: 'Frequently Recommended', color: 'success', icon: Check };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {/* INPUT STEP */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    Free · No credit card
                  </span>
                </div>
                <DialogTitle className="text-2xl">Run Your Free Local AI Visibility Scan</DialogTitle>
                <DialogDescription className="text-base">
                  Find out if ChatGPT, Gemini & Perplexity recommend your business — or your competitors.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Business Name
                  </label>
                  <Input
                    placeholder="e.g., Smith Plumbing"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    Website URL
                  </label>
                  <Input
                    placeholder="e.g., smithplumbing.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Primary City / Service Area
                  </label>
                  <Input
                    placeholder="e.g., Austin, TX"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Business Category
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select your business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="w-full gap-2 h-14 text-lg mt-6"
                >
                  Run Free Visibility Scan
                  <ArrowRight className="w-5 h-5" />
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Takes ~60 seconds · No credit card required
                </p>
              </div>
            </motion.div>
          )}

          {/* SCANNING STEP */}
          {step === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 text-center"
            >
              <div className="mb-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-2">Scanning AI Recommendations</h3>
                <p className="text-muted-foreground mb-6">{getCurrentMessage()}</p>

                <div className="max-w-md mx-auto mb-8">
                  <Progress value={scanProgress} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">{Math.round(scanProgress)}% complete</p>
                </div>

                {/* AI Model logos */}
                <div className="flex justify-center gap-4">
                  {aiModels.map((model, i) => (
                    <motion.div
                      key={model.name}
                      initial={{ opacity: 0.3 }}
                      animate={{
                        opacity: currentMessageIndex === i % aiModels.length ? 1 : 0.3,
                        scale: currentMessageIndex === i % aiModels.length ? 1.1 : 1,
                      }}
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${model.color} flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-xs">{model.name.slice(0, 2)}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Checking <span className="font-medium">{formData.businessName}</span> in <span className="font-medium">{formData.city}</span>
              </p>
            </motion.div>
          )}

          {/* RESULTS STEP */}
          {step === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-0"
            >
              {/* Results Header */}
              <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-6 border-b border-border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Visibility Report for</p>
                    <h3 className="text-xl font-bold">{results.businessName}</h3>
                    <p className="text-sm text-muted-foreground">{results.city} · {results.category}</p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const verdict = getVerdictDisplay();
                      const VerdictIcon = verdict?.icon;
                      return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                          results.visibilityVerdict === 'not_mentioned' ? 'bg-destructive/10 text-destructive' :
                          results.visibilityVerdict === 'occasionally_mentioned' ? 'bg-warning/10 text-warning' :
                          'bg-success/10 text-success'
                        }`}>
                          {VerdictIcon && <VerdictIcon className="w-4 h-4" />}
                          {verdict?.label}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Score comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Google Maps Visibility</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-success">#{results.googleMapsRank}</span>
                      <span className="text-sm text-muted-foreground">in your area</span>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">AI Visibility Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${
                        results.aiVisibilityScore < 25 ? 'text-destructive' :
                        results.aiVisibilityScore < 40 ? 'text-warning' :
                        'text-success'
                      }`}>{results.aiVisibilityScore}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Competitors getting your leads */}
              <div className="p-6 border-b border-border">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Businesses AI Recommends Instead of You
                </h4>
                <div className="space-y-3">
                  {results.competitors.map((comp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-xs font-bold text-destructive">
                          {i + 1}
                        </span>
                        <span className="font-medium">{comp.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Mentioned in <span className="font-semibold text-foreground">{comp.mentionRate}</span> of AI answers
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Locked Insights */}
              <div className="p-6 space-y-3">
                <h4 className="font-semibold mb-4">What's Holding You Back</h4>
                
                {[
                  { title: 'Why Competitors Rank Higher', desc: 'See exactly what makes AI prefer them' },
                  { title: 'Content Gaps Analysis', desc: 'Topics you need to cover to get recommended' },
                  { title: 'AI Trust Signals Missing', desc: 'What AI looks for that you don\'t have' },
                  { title: 'Step-by-Step Fix Plan', desc: 'Clear actions to improve your visibility' },
                ].map((item, i) => (
                  <div key={i} className="relative p-4 bg-muted/30 rounded-lg border border-border overflow-hidden">
                    <div className="absolute inset-0 backdrop-blur-sm bg-background/60 flex items-center justify-center z-10">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Conversion Gate CTAs */}
              <div className="p-6 bg-muted/30 border-t border-border space-y-3">
                <Button
                  onClick={handleUnlockReport}
                  size="lg"
                  className="w-full gap-2 h-14"
                >
                  <Sparkles className="w-5 h-5" />
                  Unlock Full Local AI Visibility Report
                </Button>
                
                <Button
                  onClick={handleBookDemo}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 h-12"
                >
                  <Calendar className="w-4 h-4" />
                  Book a 15-Minute AI Visibility Walkthrough
                </Button>

                <button
                  onClick={() => setShowEmailCapture(true)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email me a summary instead
                </button>
              </div>

              {/* Email Capture Modal */}
              {showEmailCapture && (
                <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-6 z-20">
                  <div className="w-full max-w-sm">
                    <button
                      onClick={() => setShowEmailCapture(false)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="text-lg font-semibold mb-2">Get Your Summary</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      We'll email you a summary of your visibility plus tips to improve.
                    </p>
                    <div className="space-y-3">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12"
                      />
                      <Button onClick={handleEmailSubmit} className="w-full">
                        Send My Summary
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
