import { Search } from 'lucide-react';
import { SEOHelmet } from '@/components/SEOHelmet';
import { ConversionHeroV2 } from '@/components/landing/ConversionHeroV2';
import { WhatReportShows } from '@/components/landing/WhatReportShows';
import { ResultsPreview } from '@/components/landing/ResultsPreview';
import { WhyLlumosDifferent } from '@/components/landing/WhyLlumosDifferent';
import { HowItWorksV2 } from '@/components/landing/HowItWorksV2';
import { UpgradeTriggers } from '@/components/landing/UpgradeTriggers';
import { PricingTease } from '@/components/landing/PricingTease';
import { FinalCTAV2 } from '@/components/landing/FinalCTAV2';

const AIVisibilityReport = () => {
  return (
    <>
      <SEOHelmet
        title="Free AI Visibility Report | Llumos"
        description="See if ChatGPT, Gemini, and Perplexity recommend your brand — or your competitors. Get your free AI Visibility Report instantly."
        keywords="AI visibility report, ChatGPT recommendations, AI search visibility, brand monitoring"
        canonicalPath="/lp/ai-visibility"
        ogImage="/og-home.png"
      />
      
      {/* Force dark mode for landing page */}
      <div className="dark min-h-screen bg-background text-foreground">
        {/* Minimal header - just logo, non-clickable */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center shadow-glow">
                <Search className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-display font-bold gradient-primary bg-clip-text text-transparent">
                  Llumos
                </span>
                <span className="text-xs text-muted-foreground font-medium tracking-wider opacity-60">
                  AI INSIGHTS
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="pt-16">
          <ConversionHeroV2 />
          <WhatReportShows />
          <ResultsPreview />
          <WhyLlumosDifferent />
          <HowItWorksV2 />
          <UpgradeTriggers />
          <PricingTease />
          <FinalCTAV2 />
        </main>

        {/* Minimal footer - no links */}
        <footer className="py-8 border-t border-border/50">
          <div className="container max-w-6xl mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Llumos. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default AIVisibilityReport;
