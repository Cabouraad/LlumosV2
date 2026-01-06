/**
 * Local Authority Setup Wizard
 * Multi-step form for configuring local business profile
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, MapPin, Building2, Users, ClipboardList } from 'lucide-react';
import { LocalAuthorityFormData } from '@/hooks/useLocalAuthority';
import { BusinessInfoStep } from './wizard/BusinessInfoStep';
import { LocationStep } from './wizard/LocationStep';
import { CategoriesStep } from './wizard/CategoriesStep';
import { ReviewStep } from './wizard/ReviewStep';

interface LocalAuthorityWizardProps {
  step: 1 | 2 | 3 | 4;
  formData: LocalAuthorityFormData;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  onFormUpdate: (patch: Partial<LocalAuthorityFormData>) => void;
  onStartScan: () => void;
  validateStep: (step: number) => boolean;
  isScanning: boolean;
}

const steps = [
  { id: 1, title: 'Business Info', icon: Building2 },
  { id: 2, title: 'Location', icon: MapPin },
  { id: 3, title: 'Categories', icon: Users },
  { id: 4, title: 'Review', icon: ClipboardList },
];

export function LocalAuthorityWizard({
  step,
  formData,
  onStepChange,
  onFormUpdate,
  onStartScan,
  validateStep,
  isScanning,
}: LocalAuthorityWizardProps) {
  const progress = (step / 4) * 100;
  
  const handleNext = () => {
    if (step < 4 && validateStep(step)) {
      onStepChange((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      onStepChange((step - 1) as 1 | 2 | 3 | 4);
    }
  };

  const canProceed = validateStep(step);

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="space-y-4">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {steps.map((s) => {
            const Icon = s.icon;
            const isComplete = step > s.id;
            const isCurrent = step === s.id;
            
            return (
              <button
                key={s.id}
                onClick={() => s.id <= step && onStepChange(s.id as 1 | 2 | 3 | 4)}
                disabled={s.id > step}
                className={`flex flex-col items-center gap-2 transition-colors ${
                  isCurrent 
                    ? 'text-primary' 
                    : isComplete 
                    ? 'text-primary/70 cursor-pointer hover:text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCurrent 
                    ? 'border-primary bg-primary text-primary-foreground' 
                    : isComplete 
                    ? 'border-primary bg-primary/10' 
                    : 'border-muted-foreground/30'
                }`}>
                  {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && (
            <BusinessInfoStep formData={formData} onUpdate={onFormUpdate} />
          )}
          {step === 2 && (
            <LocationStep formData={formData} onUpdate={onFormUpdate} />
          )}
          {step === 3 && (
            <CategoriesStep formData={formData} onUpdate={onFormUpdate} />
          )}
          {step === 4 && (
            <ReviewStep formData={formData} onEdit={onStepChange} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1 || isScanning}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {step < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={onStartScan} 
            disabled={!canProceed || isScanning}
            className="min-w-[180px]"
          >
            {isScanning ? 'Starting...' : 'Start Local AI Scan'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
