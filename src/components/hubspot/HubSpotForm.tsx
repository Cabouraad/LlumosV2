import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface HubSpotFormProps {
  portalId: string;
  formId: string;
  onFormSubmit?: () => void;
  className?: string;
}

declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (options: {
          region?: string;
          portalId: string;
          formId: string;
          target: string;
          onFormSubmit?: () => void;
          onFormReady?: () => void;
        }) => void;
      };
    };
  }
}

export function HubSpotForm({ portalId, formId, onFormSubmit, className = '' }: HubSpotFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const formCreatedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const uniqueId = useRef(`hubspot-form-${formId}-${Date.now()}`);

  useEffect(() => {
    // Reset on mount
    formCreatedRef.current = false;
    setIsLoading(true);

    const createForm = () => {
      if (window.hbspt && containerRef.current && !formCreatedRef.current) {
        formCreatedRef.current = true;
        
        try {
          window.hbspt.forms.create({
            region: 'na1',
            portalId,
            formId,
            target: `#${uniqueId.current}`,
            onFormReady: () => {
              setIsLoading(false);
            },
            onFormSubmit: () => {
              onFormSubmit?.();
            },
          });
        } catch (error) {
          console.error('Error creating HubSpot form:', error);
          setIsLoading(false);
        }
      }
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="js.hsforms.net"]');
    
    if (existingScript && window.hbspt) {
      // Script loaded and hbspt available
      createForm();
    } else if (existingScript) {
      // Script exists but hbspt not ready yet - wait for it
      const checkHbspt = setInterval(() => {
        if (window.hbspt) {
          clearInterval(checkHbspt);
          createForm();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkHbspt);
        setIsLoading(false);
      }, 5000);
    } else {
      // Load the script
      const script = document.createElement('script');
      script.src = 'https://js.hsforms.net/forms/embed/v2.js';
      script.charset = 'utf-8';
      script.async = true;
      
      script.onload = () => {
        // Wait a bit for hbspt to initialize
        setTimeout(createForm, 100);
      };
      
      script.onerror = () => {
        console.error('Failed to load HubSpot forms script');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    }

    return () => {
      formCreatedRef.current = false;
    };
  }, [portalId, formId, onFormSubmit]);

  return (
    <div className={className}>
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading form...</span>
        </div>
      )}
      <div 
        ref={containerRef}
        id={uniqueId.current}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
}

// HubSpot configuration
export const HUBSPOT_CONFIG = {
  portalId: '244723281',
  forms: {
    hero: '2pfAKlk66RO-kqYPOtdRdHQ41p9ox',
    exitIntent: '2pFUJhbtWQ8qtnErWelgFlQ',
  },
} as const;
