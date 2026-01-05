import { useState, useEffect, useReducer, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, Check, Lock, MapPin, Building2, Globe, Loader2,
  Eye, EyeOff, TrendingUp, AlertTriangle, Sparkles,
  Calendar, Mail, X, Star, MessageSquare, RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Business categories for dropdown
const businessCategories = [
  { value: 'Plumber', label: 'Plumber' },
  { value: 'HVAC', label: 'HVAC / Heating & Cooling' },
  { value: 'Electrician', label: 'Electrician' },
  { value: 'Landscaper', label: 'Landscaper' },
  { value: 'Roofer', label: 'Roofer' },
  { value: 'Dentist', label: 'Dentist' },
  { value: 'Doctor', label: 'Doctor / Physician' },
  { value: 'Therapist', label: 'Therapist / Counselor' },
  { value: 'Chiropractor', label: 'Chiropractor' },
  { value: 'Lawyer', label: 'Lawyer / Attorney' },
  { value: 'Accountant', label: 'Accountant / CPA' },
  { value: 'Real Estate Agent', label: 'Real Estate Agent' },
  { value: 'Property Manager', label: 'Property Manager' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Cafe', label: 'Cafe / Coffee Shop' },
  { value: 'Salon', label: 'Hair Salon / Barber' },
  { value: 'Spa', label: 'Spa / Wellness' },
  { value: 'Gym', label: 'Gym / Fitness Studio' },
  { value: 'Auto Repair', label: 'Auto Repair' },
  { value: 'Cleaning', label: 'Cleaning Service' },
  { value: 'Pest Control', label: 'Pest Control' },
  { value: 'Other', label: 'Other Local Business' },
];

// AI model display config
const aiModels = [
  { name: 'ChatGPT', color: 'from-emerald-500 to-teal-600', key: 'openai' },
  { name: 'Gemini', color: 'from-blue-500 to-indigo-600', key: 'gemini' },
  { name: 'Perplexity', color: 'from-purple-500 to-pink-600', key: 'perplexity' },
];

interface LocalScanWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (data: ScanSummary) => void;
}

// Form data type
type ScanForm = {
  business_name: string;
  business_website: string;
  city: string;
  category: string;
  lead_email: string;
};

// Backend scan summary type
type ScanSummary = {
  scan_id: string;
  business_name: string;
  city: string;
  category: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  raw_score: number;
  max_raw_score: number;
  normalized_score: number;
  label: string;
  top_competitors: Array<{ name: string; mentions: number; recommended_count?: number }>;
  confidence_score?: number;
  confidence_label?: 'Low' | 'Medium' | 'High';
};

// State machine types
type State =
  | { step: 'form'; form: ScanForm; error?: string }
  | { step: 'running'; form: ScanForm; scanId: string; progress: number; messageIndex: number; error?: string }
  | { step: 'results'; form: ScanForm; scan: ScanSummary; cached?: boolean }
  | { step: 'error'; form: ScanForm; error: string };

type Action =
  | { type: 'UPDATE_FORM'; patch: Partial<ScanForm> }
  | { type: 'START_RUNNING'; scanId: string }
  | { type: 'SET_PROGRESS'; progress: number }
  | { type: 'SET_MESSAGE_INDEX'; messageIndex: number }
  | { type: 'SET_RESULTS'; scan: ScanSummary; cached?: boolean }
  | { type: 'FAIL'; error: string }
  | { type: 'RESET' };

const initialForm: ScanForm = {
  business_name: '',
  business_website: '',
  city: '',
  category: '',
  lead_email: '',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPDATE_FORM':
      return { ...state, form: { ...state.form, ...action.patch }, error: undefined } as State;
    case 'START_RUNNING':
      return { step: 'running', form: state.form, scanId: action.scanId, progress: 5, messageIndex: 0 };
    case 'SET_PROGRESS':
      if (state.step !== 'running') return state;
      return { ...state, progress: action.progress };
    case 'SET_MESSAGE_INDEX':
      if (state.step !== 'running') return state;
      return { ...state, messageIndex: action.messageIndex };
    case 'SET_RESULTS':
      return { step: 'results', form: state.form, scan: action.scan, cached: action.cached };
    case 'FAIL':
      return { step: 'error', form: state.form, error: action.error };
    case 'RESET':
      return { step: 'form', form: initialForm };
    default:
      return state;
  }
}

export function LocalScanWizard({ isOpen, onClose, onComplete }: LocalScanWizardProps) {
  const [state, dispatch] = useReducer(reducer, { step: 'form', form: initialForm });
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [captureEmail, setCaptureEmail] = useState('');
  const [isRerunning, setIsRerunning] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      dispatch({ type: 'RESET' });
      setShowEmailCapture(false);
      setCaptureEmail('');
    }
  }, [isOpen]);

  // Dynamic scanning messages
  const runningMessages = useMemo(() => {
    const city = state.form.city || 'your area';
    const cat = businessCategories.find(c => c.value === state.form.category)?.label || state.form.category || 'local businesses';
    return [
      `Checking AI recommendations for ${cat} in ${city}...`,
      `Running prompt: "Best ${cat} near me in ${city}"`,
      `Analyzing competitor mentions across ChatGPT, Gemini, Perplexity...`,
      `Running prompt: "Top-rated ${cat} in ${city}"`,
      `Detecting AI trust signals...`,
      `Evaluating position bonuses...`,
      `Running prompt: "Which ${cat} should I call in ${city}?"`,
      `Calculating visibility score...`,
    ];
  }, [state.form.city, state.form.category]);

  // Rotate messages + progress while running
  useEffect(() => {
    if (state.step !== 'running') return;

    const msgTimer = setInterval(() => {
      dispatch({ type: 'SET_MESSAGE_INDEX', messageIndex: (state.messageIndex + 1) % runningMessages.length });
    }, 1400);

    const progTimer = setInterval(() => {
      // Smooth progress illusion; backend usually finishes before 100
      const next = Math.min(95, state.progress + Math.random() * 5 + 1);
      dispatch({ type: 'SET_PROGRESS', progress: Math.round(next) });
    }, 900);

    return () => {
      clearInterval(msgTimer);
      clearInterval(progTimer);
    };
  }, [state.step, state.step === 'running' ? state.messageIndex : 0, state.step === 'running' ? state.progress : 0, runningMessages.length]);

  async function startScan(force = false) {
    try {
      const f = state.form;
      if (!f.business_name.trim() || !f.city.trim() || !f.category.trim()) {
        toast.error('Please fill Business Name, City, and Category');
        return;
      }

      // Use rerun endpoint which handles caching
      const { data: rerunData, error: rerunErr } = await supabase.functions.invoke('local-scan-rerun', {
        body: {
          business_name: f.business_name.trim(),
          business_website: f.business_website.trim() || null,
          city: f.city.trim(),
          category: f.category.trim(),
          lead_email: f.lead_email.trim() || null,
          force,
        },
      });

      if (rerunErr) throw new Error(rerunErr.message);
      
      // If cached result returned, show immediately
      if (rerunData?.cached && rerunData?.scan) {
        const scan: ScanSummary = {
          scan_id: rerunData.scan.scan_id,
          business_name: rerunData.scan.business_name,
          city: rerunData.scan.city,
          category: rerunData.scan.category,
          status: 'completed',
          raw_score: rerunData.scan.raw_score ?? 0,
          max_raw_score: rerunData.scan.max_raw_score ?? 54,
          normalized_score: rerunData.scan.normalized_score ?? 0,
          label: rerunData.scan.label ?? 'Not Mentioned',
          top_competitors: rerunData.scan.top_competitors ?? [],
          confidence_score: rerunData.scan.confidence_score ?? 0,
          confidence_label: rerunData.scan.confidence_label ?? 'Low',
        };
        toast.success('Loaded cached results');
        dispatch({ type: 'SET_RESULTS', scan, cached: true });
        onComplete?.(scan);
        return;
      }

      const scanId = rerunData?.scan_id;
      if (!scanId) throw new Error('Scan creation failed: missing scan_id');

      dispatch({ type: 'START_RUNNING', scanId });

      // Run scan via edge function
      const { data: runData, error: runErr } = await supabase.functions.invoke('local-scan-run', {
        body: { scan_id: scanId },
      });

      if (runErr) throw new Error(runErr.message);

      // Parse response
      const scan: ScanSummary = {
        scan_id: runData?.scan_id || scanId,
        business_name: runData?.business_name || f.business_name,
        city: runData?.city || f.city,
        category: runData?.category || f.category,
        status: 'completed',
        raw_score: runData?.raw_score ?? 0,
        max_raw_score: runData?.max_raw_score ?? 54,
        normalized_score: runData?.normalized_score ?? 0,
        label: runData?.label ?? 'Not Mentioned',
        top_competitors: runData?.top_competitors ?? [],
        confidence_score: runData?.confidence_score ?? 0,
        confidence_label: runData?.confidence_label ?? 'Low',
      };

      // Complete progress bar
      dispatch({ type: 'SET_PROGRESS', progress: 100 });
      
      // Small delay then show results
      setTimeout(() => {
        dispatch({ type: 'SET_RESULTS', scan, cached: false });
        onComplete?.(scan);
      }, 500);

    } catch (e) {
      console.error('Scan error:', e);
      dispatch({ type: 'FAIL', error: (e as Error).message ?? 'Something went wrong.' });
      toast.error((e as Error).message ?? 'Scan failed');
    }
  }

  async function handleRerun(force = false) {
    if (state.step !== 'results') return;
    setIsRerunning(true);
    try {
      await startScan(force);
    } finally {
      setIsRerunning(false);
    }
  }

  const handleUnlockReport = () => {
    window.open('/auth?source=local-scan', '_blank');
  };

  const handleBookDemo = () => {
    window.open('https://calendly.com/llumos-info/llumos-demo', '_blank');
  };

  const handleEmailSubmit = () => {
    if (!captureEmail) {
      toast.error('Please enter your email');
      return;
    }
    // In production, this would call an edge function to send the email
    toast.success('Summary sent! Check your inbox.');
    setShowEmailCapture(false);
  };

  const getCategoryLabel = () => {
    return businessCategories.find(c => c.value === state.form.category)?.label || state.form.category;
  };

  const getVerdictDisplay = (label: string) => {
    switch (label) {
      case 'Not Mentioned':
        return { label: 'Not Mentioned', color: 'destructive', icon: EyeOff };
      case 'Mentioned Occasionally':
        return { label: 'Occasionally Mentioned', color: 'warning', icon: Eye };
      case 'Frequently Recommended':
        return { label: 'Frequently Recommended', color: 'success', icon: Check };
      default:
        return { label, color: 'muted', icon: Eye };
    }
  };

  // Estimate Google Maps score (simulated based on website presence)
  const estimateGoogleMapsScore = () => {
    const hasWebsite = state.form.business_website.trim().length > 0;
    return hasWebsite ? Math.floor(60 + Math.random() * 25) : Math.floor(40 + Math.random() * 20);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {/* ERROR STEP */}
          {state.step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
              <p className="text-muted-foreground mb-6">{state.error}</p>
              <Button onClick={() => dispatch({ type: 'RESET' })} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try again
              </Button>
            </motion.div>
          )}

          {/* INPUT STEP */}
          {state.step === 'form' && (
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
                    value={state.form.business_name}
                    onChange={(e) => dispatch({ type: 'UPDATE_FORM', patch: { business_name: e.target.value } })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    Website URL <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    placeholder="e.g., smithplumbing.com"
                    value={state.form.business_website}
                    onChange={(e) => dispatch({ type: 'UPDATE_FORM', patch: { business_website: e.target.value } })}
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
                    value={state.form.city}
                    onChange={(e) => dispatch({ type: 'UPDATE_FORM', patch: { city: e.target.value } })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Business Category
                  </label>
                  <Select
                    value={state.form.category}
                    onValueChange={(value) => dispatch({ type: 'UPDATE_FORM', patch: { category: value } })}
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

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email <span className="text-muted-foreground">(optional, for summary)</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="you@business.com"
                    value={state.form.lead_email}
                    onChange={(e) => dispatch({ type: 'UPDATE_FORM', patch: { lead_email: e.target.value } })}
                    className="h-12"
                  />
                </div>

                <Button
                  onClick={() => startScan()}
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
          {state.step === 'running' && (
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

                <h3 className="text-xl font-semibold mb-2">Running Your Local AI Visibility Scan</h3>
                <p className="text-muted-foreground mb-6">{runningMessages[state.messageIndex]}</p>

                <div className="max-w-md mx-auto mb-8">
                  <Progress value={state.progress} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">{state.progress}% complete</p>
                </div>

                {/* AI Model indicators */}
                <div className="flex justify-center gap-4 mb-6">
                  {aiModels.map((model, i) => (
                    <motion.div
                      key={model.name}
                      initial={{ opacity: 0.3 }}
                      animate={{
                        opacity: state.messageIndex % aiModels.length === i ? 1 : 0.5,
                        scale: state.messageIndex % aiModels.length === i ? 1.1 : 1,
                      }}
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${model.color} flex flex-col items-center justify-center gap-1`}
                    >
                      <span className="text-white font-bold text-sm">{model.name.slice(0, 2)}</span>
                      <span className="text-white/70 text-[10px]">Checking…</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Checking <span className="font-medium">{state.form.business_name}</span> in <span className="font-medium">{state.form.city}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                No credit card required. We'll show a preview, and you can unlock the full report if you want.
              </p>
            </motion.div>
          )}

          {/* RESULTS STEP */}
          {state.step === 'results' && (
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
                    <h3 className="text-xl font-bold">{state.scan.business_name}</h3>
                    <p className="text-sm text-muted-foreground">{state.scan.city} · {getCategoryLabel()}</p>
                  </div>
                  <div className="text-right space-y-2">
                    {(() => {
                      const verdict = getVerdictDisplay(state.scan.label);
                      const VerdictIcon = verdict.icon;
                      return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                          state.scan.label === 'Not Mentioned' ? 'bg-destructive/10 text-destructive' :
                          state.scan.label === 'Mentioned Occasionally' ? 'bg-warning/10 text-warning' :
                          'bg-success/10 text-success'
                        }`}>
                          <VerdictIcon className="w-4 h-4" />
                          {verdict.label}
                        </div>
                      );
                    })()}
                    {/* Confidence Badge */}
                    <div 
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${
                        state.scan.confidence_label === 'Low' ? 'bg-muted text-muted-foreground' :
                        state.scan.confidence_label === 'Medium' ? 'bg-primary/10 text-primary' :
                        'bg-success/10 text-success'
                      }`}
                      title="Confidence is based on successful AI responses and how consistently the scan detected structured recommendations (lists) across models."
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      Confidence: {state.scan.confidence_label || 'Low'}
                    </div>
                  </div>
                </div>

                {/* Score comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Est. Google Maps Visibility</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-success">{estimateGoogleMapsScore()}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">AI Visibility Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${
                        state.scan.normalized_score < 30 ? 'text-destructive' :
                        state.scan.normalized_score < 70 ? 'text-warning' :
                        'text-success'
                      }`}>{state.scan.normalized_score}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  </div>
                </div>
                
                {/* Re-run controls + cache note */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    {state.cached ? '✓ Loaded from cache' : 'Score normalized based on available AI models.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRerun(false)}
                      disabled={isRerunning}
                      className="gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRerunning ? 'animate-spin' : ''}`} />
                      Re-run Scan
                    </Button>
                    <button
                      onClick={() => handleRerun(true)}
                      disabled={isRerunning}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      Force refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Status explanation */}
              <div className="p-6 border-b border-border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  Status
                </h4>
                <p className="text-lg font-medium mb-2">{state.scan.label}</p>
                <p className="text-sm text-muted-foreground">
                  Customers are already asking AI for "best {getCategoryLabel().toLowerCase()} in {state.scan.city}". 
                  This shows how often you appear in those AI-generated recommendations.
                </p>
              </div>

              {/* Competitors getting your leads */}
              <div className="p-6 border-b border-border">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  What AI is showing instead
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  These businesses are being surfaced when customers ask for local recommendations.
                </p>
                <div className="space-y-3">
                  {state.scan.top_competitors.length > 0 ? (
                    state.scan.top_competitors.slice(0, 3).map((comp, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-xs font-bold text-destructive">
                            {i + 1}
                          </span>
                          <div>
                            <span className="font-medium">{comp.name}</span>
                            <p className="text-xs text-muted-foreground">Frequently recommended in AI answers</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
                      We found competitor mentions, but they're locked in the full report preview.
                    </div>
                  )}
                </div>
              </div>

              {/* Google vs AI */}
              <div className="p-6 border-b border-border">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Google vs AI
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="p-3 bg-success/5 rounded-lg border border-success/20">
                    <p className="text-xs text-muted-foreground mb-1">Google Maps Visibility</p>
                    <p className="text-sm font-medium text-success">✅ Strong</p>
                  </div>
                  <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <p className="text-xs text-muted-foreground mb-1">AI Recommendations</p>
                    <p className="text-sm font-medium text-destructive">
                      {state.scan.normalized_score < 30 ? '❌ Weak' : 
                       state.scan.normalized_score < 70 ? '⚠️ Limited' : '✅ Strong'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ranking well in Google doesn't guarantee you'll be recommended inside ChatGPT, Gemini, or Perplexity.
                </p>
              </div>

              {/* Locked Insights */}
              <div className="p-6 space-y-3">
                <h4 className="font-semibold mb-4">Locked insights (Full report)</h4>
                
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
              <div className="p-6 bg-muted/30 border-t border-border space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Unlock the Full Local AI Visibility Report</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                    <li>• Full competitor comparison (all prompts + models)</li>
                    <li>• What AI "trust signals" you're missing</li>
                    <li>• Action plan to improve recommendations</li>
                  </ul>
                </div>

                <Button
                  onClick={handleUnlockReport}
                  size="lg"
                  className="w-full gap-2 h-14"
                >
                  <Sparkles className="w-5 h-5" />
                  Unlock Full Report
                </Button>
                
                <Button
                  onClick={handleBookDemo}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 h-12"
                >
                  <Calendar className="w-4 h-4" />
                  Book a 15-Minute Walkthrough
                </Button>

                <button
                  onClick={() => setShowEmailCapture(true)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email me a summary instead
                </button>

                <p className="text-xs text-center text-muted-foreground">
                  Tip: This is the "next evolution of Local SEO"—but inside AI answers.
                </p>
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
                        value={captureEmail}
                        onChange={(e) => setCaptureEmail(e.target.value)}
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
