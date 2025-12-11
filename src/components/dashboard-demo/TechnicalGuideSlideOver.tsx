import { X, Copy, Check, Info, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface TechnicalGuideSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const sampleJsonLd = `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Llumos Pro",
  "description": "AI Search Visibility Platform",
  "offers": {
    "@type": "Offer",
    "price": "29.00",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}`;

const steps = [
  {
    number: 1,
    text: "Open your website builder (Webflow, WordPress, etc).",
  },
  {
    number: 2,
    text: "Paste into the <head> tag of your Pricing Page.",
  },
  {
    number: 3,
    text: "Request Re-indexing from Google Search Console.",
  },
];

export function TechnicalGuideSlideOver({
  isOpen,
  onClose,
  title = "Resolution Guide: Schema Fix",
}: TechnicalGuideSlideOverProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sampleJsonLd);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "JSON-LD code has been copied successfully.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[500px] bg-[#1a1f26] border-l border-gray-700 shadow-2xl animate-slide-in-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Why This Works Section */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-400 mb-1">
                    Why This Works
                  </h4>
                  <p className="text-sm text-blue-200/80">
                    LLMs prioritize Structured Data. Adding this code creates a
                    "source of truth" for robots, ensuring accurate information
                    is returned.
                  </p>
            </div>

            {/* Pro Tip Section */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
              <div className="flex gap-3">
                <div className="p-1.5 bg-violet-500/20 rounded-md h-fit">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-violet-400 mb-1">
                    Pro Tip
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    To ensure ChatGPT knows exactly who you are, add the{" "}
                    <code className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono text-xs">
                      "sameAs"
                    </code>{" "}
                    property to your schema and link to your Wikipedia, Crunchbase, or
                    LinkedIn profile. This creates an <span className="text-violet-300 font-medium">Entity Identity</span> that
                    connects your brand across the web.
                  </p>
                </div>
              </div>
            </div>
              </div>
            </div>

            {/* Code Block Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  JSON-LD Schema
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  application/ld+json
                </span>
              </div>
              <div className="relative group">
                <pre className="p-4 rounded-lg bg-[#0d1117] border border-gray-800 overflow-x-auto text-sm font-mono">
                  <code className="text-gray-300">
                    {sampleJsonLd.split("\n").map((line, i) => (
                      <div key={i} className="flex">
                        <span className="select-none text-gray-600 w-6 text-right mr-4">
                          {i + 1}
                        </span>
                        <span>
                          {line.split(/(".*?":?|".*?"|\d+\.\d+)/).map((part, j) => {
                            if (part.match(/^"@?\w+":?$/)) {
                              return (
                                <span key={j} className="text-purple-400">
                                  {part}
                                </span>
                              );
                            }
                            if (part.match(/^".*"$/)) {
                              return (
                                <span key={j} className="text-green-400">
                                  {part}
                                </span>
                              );
                            }
                            if (part.match(/^\d+\.\d+$/)) {
                              return (
                                <span key={j} className="text-amber-400">
                                  {part}
                                </span>
                              );
                            }
                            return <span key={j}>{part}</span>;
                          })}
                        </span>
                      </div>
                    ))}
                  </code>
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopy}
                  className="absolute top-3 right-3 h-8 gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Implementation Steps */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">
                Implementation Steps
              </h4>
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                      {step.number}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 bg-white/[0.02]">
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Need an expert to implement this?</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
