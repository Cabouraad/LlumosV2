import { useEffect, useMemo, useRef, useState } from 'react';
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

function ensureHubSpotScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.hbspt) return resolve();

    const existing = document.querySelector('script[src*="js.hsforms.net/forms/"]') as HTMLScriptElement | null;
    if (existing) {
      const start = Date.now();
      const timer = window.setInterval(() => {
        if (window.hbspt) {
          window.clearInterval(timer);
          resolve();
        }
        if (Date.now() - start > 8000) {
          window.clearInterval(timer);
          reject(new Error('HubSpot script present but window.hbspt not available (timeout).'));
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.hsforms.net/forms/v2.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load HubSpot forms script.'));
    document.head.appendChild(script);
  });
}

export function HubSpotForm({ portalId, formId, onFormSubmit, className = '' }: HubSpotFormProps) {
  const targetId = useMemo(() => `hubspot-form-${portalId}-${formId}-${Math.random().toString(36).slice(2)}`, [portalId, formId]);
  const createdRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    createdRef.current = false;
    setIsLoading(true);
    setLoadError(null);

    let timeoutId: number | undefined;

    const init = async () => {
      try {
        await ensureHubSpotScript();

        const container = document.getElementById(targetId);
        if (!container) {
          throw new Error('HubSpot target container not found.');
        }

        // Clean slate (important for dialogs/remounts)
        container.innerHTML = '';

        if (!window.hbspt || createdRef.current) return;
        createdRef.current = true;

        // Fallback timeout so we don’t spin forever
        timeoutId = window.setTimeout(() => {
          console.error('[HubSpotForm] Load timeout', { portalId, formId, targetId });
          setIsLoading(false);
          setLoadError(
            'Form failed to load. This usually means the HubSpot Form ID is incorrect (it should look like a UUID) or the form is unpublished.'
          );
        }, 9000);

        // Listen for hsFormCallback messages as an additional “ready” signal
        const onMessage = (event: MessageEvent) => {
          const data: any = event.data;
          if (data?.type === 'hsFormCallback' && data?.id === formId) {
            if (data.eventName === 'onFormReady') {
              setIsLoading(false);
              window.clearTimeout(timeoutId);
            }
            if (data.eventName === 'onFormSubmit') {
              onFormSubmit?.();
            }
          }
        };
        window.addEventListener('message', onMessage);

        window.hbspt.forms.create({
          region: 'na2',
          portalId,
          formId,
          target: `#${targetId}`,
          onFormReady: () => {
            setIsLoading(false);
            if (timeoutId) window.clearTimeout(timeoutId);
          },
          onFormSubmit: () => {
            onFormSubmit?.();
          },
        });

        return () => {
          window.removeEventListener('message', onMessage);
        };
      } catch (e: any) {
        console.error('[HubSpotForm] Init error', e);
        setIsLoading(false);
        setLoadError(e?.message || 'Failed to load form.');
      }
    };

    const cleanupPromise = init();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      createdRef.current = false;
      // Best-effort cleanup
      const container = document.getElementById(targetId);
      if (container) container.innerHTML = '';
      void cleanupPromise;
    };
  }, [portalId, formId, onFormSubmit, targetId]);

  return (
    <div className={className}>
      <div className="relative">
        <div id={targetId} />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading form...</span>
            </div>
          </div>
        )}

        {loadError && (
          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <p className="text-sm text-foreground">{loadError}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Current config: portalId={portalId}, formId={formId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// HubSpot configuration
export const HUBSPOT_CONFIG = {
  portalId: '244723281',
  region: 'na2',
  forms: {
    hero: 'a5f00a96-4eba-44ef-a4a9-83ceb5d45d1d',
    exitIntent: '', // TODO: Add exit intent form UUID
  },
} as const;

