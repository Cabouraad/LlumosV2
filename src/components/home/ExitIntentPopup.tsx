import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HubSpotForm, HUBSPOT_CONFIG } from '@/components/hubspot/HubSpotForm';
import { useAnalytics } from '@/hooks/useAnalytics';

// Timing constants
const POPUP_DELAY_MS = 45000; // 45 seconds
const EXIT_INTENT_ENABLE_MS = 15000; // 15 seconds before enabling exit intent

export function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { trackEvent } = useAnalytics();
  const hasTriggeredRef = useRef(false);
  const lastScrollY = useRef(0);
  const scrollUpCount = useRef(0);

  useEffect(() => {
    // Global singleton guard to prevent multiple instances
    if ((window as any).__EXIT_INTENT_IN_USE) {
      return;
    }
    (window as any).__EXIT_INTENT_IN_USE = true;

    // Check if user has already seen the popup in this session
    const hasSeenPopup = sessionStorage.getItem('exitIntentShown');
    if (hasSeenPopup) {
      return;
    }

    let popupTimeoutId: NodeJS.Timeout;
    let exitIntentTimeoutId: NodeJS.Timeout;
    let isExitIntentEnabled = false;

    // Function to trigger the popup (only once)
    const trigger = () => {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsOpen(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    };

    // Set timeout for automatic popup after delay
    popupTimeoutId = setTimeout(() => {
      trigger();
    }, POPUP_DELAY_MS);

    // Enable exit intent detection after delay
    exitIntentTimeoutId = setTimeout(() => {
      isExitIntentEnabled = true;
    }, EXIT_INTENT_ENABLE_MS);

    // Mouse leave handler for exit intent (desktop)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && isExitIntentEnabled && !hasTriggeredRef.current) {
        trigger();
      }
    };

    // Scroll handler for mobile exit intent
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Only on mobile
      if (window.innerWidth > 768 || !isExitIntentEnabled) {
        lastScrollY.current = currentScrollY;
        return;
      }
      
      // User scrolled up rapidly from below the fold
      if (currentScrollY < lastScrollY.current && lastScrollY.current > 500) {
        scrollUpCount.current += 1;
        
        // Trigger after significant scroll up behavior (user trying to leave)
        if (scrollUpCount.current > 3 && currentScrollY < 200 && !hasTriggeredRef.current) {
          trigger();
        }
      } else {
        scrollUpCount.current = 0;
      }
      
      lastScrollY.current = currentScrollY;
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup function
    return () => {
      clearTimeout(popupTimeoutId);
      clearTimeout(exitIntentTimeoutId);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      delete (window as any).__EXIT_INTENT_IN_USE;
    };
  }, []);

  const handleFormSubmit = () => {
    setIsSubmitted(true);
    trackEvent('exit_popup_hubspot_submitted', {});
    
    // Auto-close after submission
    setTimeout(() => {
      setIsOpen(false);
    }, 2000);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && !isSubmitted) {
      sessionStorage.setItem('exitIntentShown', 'true');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!isSubmitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Don't leave your AI visibility to chance.
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                Get your free AI Visibility Report before you go.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <HubSpotForm
                portalId={HUBSPOT_CONFIG.portalId}
                formId={HUBSPOT_CONFIG.forms.exitIntent}
                onFormSubmit={handleFormSubmit}
                className="hubspot-form-container"
              />
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              No credit card required • Instant delivery • Unsubscribe anytime
            </p>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <DialogTitle className="text-2xl font-bold mb-2">
              Thank you!
            </DialogTitle>
            <DialogDescription className="text-base">
              We'll be in touch shortly with your AI Visibility Report.
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
