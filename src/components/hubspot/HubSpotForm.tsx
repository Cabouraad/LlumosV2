import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface HubSpotFormProps {
  portalId: string;
  formId: string;
  region?: string;
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
          css?: string;
          cssClass?: string;
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

export function HubSpotForm({ portalId, formId, region = 'na2', onFormSubmit, className = '' }: HubSpotFormProps) {
  const targetId = useMemo(
    () => `hubspot-form-${portalId}-${formId}-${Math.random().toString(36).slice(2)}`,
    [portalId, formId]
  );
  const createdRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRenderedForm, setHasRenderedForm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    createdRef.current = false;
    setIsLoading(true);
    setHasRenderedForm(false);
    setLoadError(null);

    let timeoutId: number | undefined;
    let observer: MutationObserver | null = null;

    const init = async () => {
      try {
        await ensureHubSpotScript();

        const container = document.getElementById(targetId);
        if (!container) {
          throw new Error('HubSpot target container not found.');
        }

        const detectRendered = () =>
          Boolean(container.querySelector('form, .hs-form, input, textarea, select, iframe'));

        const markLoaded = () => {
          setIsLoading(false);
          setHasRenderedForm(true);
          setLoadError(null);
          if (timeoutId) window.clearTimeout(timeoutId);
        };

        // Clean slate (important for dialogs/remounts)
        container.innerHTML = '';

        // Observe DOM changes: HubSpot sometimes renders without firing callbacks
        observer = new MutationObserver(() => {
          if (detectRendered()) {
            markLoaded();
          }
        });
        observer.observe(container, { childList: true, subtree: true });

        if (!window.hbspt || createdRef.current) return;
        createdRef.current = true;

        // Fallback timeout so we don’t spin forever
        timeoutId = window.setTimeout(() => {
          // If the form is actually present, don't show an error
          if (detectRendered()) {
            markLoaded();
            return;
          }

          console.error('[HubSpotForm] Load timeout', { portalId, formId, targetId, region });
          setIsLoading(false);
          setLoadError(
            'Form failed to load. This usually means the HubSpot Form ID is incorrect (it should look like a UUID) or the form is unpublished.'
          );
        }, 12000);

        // Listen for hsFormCallback messages as an additional “ready” signal
        const onMessage = (event: MessageEvent) => {
          const data: any = event.data;
          if (data?.type === 'hsFormCallback' && data?.id === formId) {
            if (data.eventName === 'onFormReady') {
              markLoaded();
            }
            if (data.eventName === 'onFormSubmit') {
              onFormSubmit?.();
            }
          }
        };
        window.addEventListener('message', onMessage);

        const hsCss = `
          .hs-form, .hs-form * { font-family: inherit; }
          .hs-richtext, .hs-richtext * { color: hsl(210 40% 98%) !important; opacity: 1 !important; }
          label, .hs-form-field > label, .hs-form-field label, legend {
            color: hsl(210 40% 98%) !important;
            opacity: 1 !important;
            font-weight: 600 !important;
          }
          .hs-form-required { color: hsl(0 84% 65%) !important; }
          .hs-error-msgs, .hs-error-msgs * { color: hsl(0 84% 65%) !important; }
        `;

        window.hbspt.forms.create({
          region,
          portalId,
          formId,
          target: `#${targetId}`,
          css: hsCss,
          cssClass: 'hubspot-embedded-form',
          onFormReady: () => {
            markLoaded();
          },
          onFormSubmit: () => {
            onFormSubmit?.();
          },
        });

        // Extra: if an iframe is used, treat iframe load as loaded
        const iframeTimer = window.setInterval(() => {
          const iframe = container.querySelector('iframe') as HTMLIFrameElement | null;
          if (iframe) {
            iframe.addEventListener('load', markLoaded, { once: true });
            window.clearInterval(iframeTimer);
          }
        }, 200);
        window.setTimeout(() => window.clearInterval(iframeTimer), 8000);

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
      if (observer) observer.disconnect();
      createdRef.current = false;
      // Best-effort cleanup
      const container = document.getElementById(targetId);
      if (container) container.innerHTML = '';
      void cleanupPromise;
    };
  }, [portalId, formId, region, onFormSubmit, targetId]);

  return (
    <div className={className}>
      <div className="relative">
        <div id={targetId} />

        {isLoading && !hasRenderedForm && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading form...</span>
            </div>
          </div>
        )}

        {loadError && !hasRenderedForm && (
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
    exitIntent: 'a4550985-bb56-43ca-ad9c-4ad67a580595',
  },
} as const;

export async function preloadHubSpotForms() {
  if (typeof window === 'undefined') return;
  try {
    await ensureHubSpotScript();
  } catch (e) {
    console.warn('[HubSpotForm] Preload failed', e);
  }
}

