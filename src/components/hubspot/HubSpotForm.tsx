import { useEffect, useRef } from 'react';

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
          portalId: string;
          formId: string;
          target: string;
          onFormSubmit?: () => void;
        }) => void;
      };
    };
  }
}

export function HubSpotForm({ portalId, formId, onFormSubmit, className = '' }: HubSpotFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const formCreated = useRef(false);

  useEffect(() => {
    // Load HubSpot script if not already loaded
    const existingScript = document.querySelector('script[src*="js.hsforms.net"]');
    
    const createForm = () => {
      if (window.hbspt && containerRef.current && !formCreated.current) {
        formCreated.current = true;
        window.hbspt.forms.create({
          portalId,
          formId,
          target: `#hubspot-form-${formId}`,
          onFormSubmit: () => {
            onFormSubmit?.();
          },
        });
      }
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://js.hsforms.net/forms/v2.js';
      script.async = true;
      script.onload = createForm;
      document.head.appendChild(script);
    } else {
      // Script already exists, just create form
      if (window.hbspt) {
        createForm();
      } else {
        // Wait for script to load
        existingScript.addEventListener('load', createForm);
      }
    }

    return () => {
      formCreated.current = false;
    };
  }, [portalId, formId, onFormSubmit]);

  return (
    <div 
      ref={containerRef}
      id={`hubspot-form-${formId}`}
      className={className}
    />
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
