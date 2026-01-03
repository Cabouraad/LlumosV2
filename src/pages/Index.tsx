import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { SEOHelmet } from '@/components/SEOHelmet';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { OrganizationSchema } from '@/components/seo/OrganizationSchema';
import { WebSiteSchema } from '@/components/seo/WebSiteSchema';
import { ProductSchema } from '@/components/seo/ProductSchema';
import { LLUMOS_PRICING } from '@/components/seo/SoftwareApplicationSchema';

// New conversion-focused components
import { ConversionHeroV2 } from '@/components/landing/ConversionHeroV2';
import { WhatReportShows } from '@/components/landing/WhatReportShows';
import { ResultsPreview } from '@/components/landing/ResultsPreview';
import { WhyLlumosDifferent } from '@/components/landing/WhyLlumosDifferent';
import { HowItWorksV2 } from '@/components/landing/HowItWorksV2';
import { UpgradeTriggers } from '@/components/landing/UpgradeTriggers';
import { PricingTease } from '@/components/landing/PricingTease';
import { FinalCTAV2 } from '@/components/landing/FinalCTAV2';

const Index = () => {
  const { user, loading, orgData, orgStatus, ready, isChecking } = useAuth();

  if (loading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && orgData && orgStatus === 'success') {
    return <Navigate to="/brands" replace />;
  }

  if (user && orgStatus === 'not_found' && !isChecking) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      <SEOHelmet
        title="See If AI Recommends Your Brand — Or Your Competitors | Llumos"
        description="ChatGPT, Gemini, and Perplexity now decide which brands get recommended. Get your free AI Visibility Report and see where you appear, where you don't, and why."
        keywords="AI visibility report, ChatGPT recommendations, AI search visibility, Gemini brand mentions, Perplexity monitoring, AI SEO"
        canonicalPath="/"
        ogImage="/og-home.png"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "@id": "https://llumos.app/#software",
            name: "Llumos",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Cloud/Web",
            description: "AI Search Visibility Platform. Get your free AI Visibility Report and track your brand across ChatGPT, Gemini, and Perplexity.",
            url: "https://llumos.app",
            image: "https://llumos.app/og-home.png",
            author: {
              "@type": "Organization",
              "@id": "https://llumos.app/#organization"
            },
            offers: {
              "@type": "AggregateOffer",
              lowPrice: "0",
              highPrice: LLUMOS_PRICING.agency.price.toFixed(2),
              priceCurrency: LLUMOS_PRICING.starter.currency,
              offerCount: "5",
              availability: "https://schema.org/InStock",
              url: "https://llumos.app/pricing"
            },
            featureList: [
              "Free AI Visibility Report",
              "AI Search Visibility Tracking",
              "ChatGPT Brand Monitoring",
              "Competitor Analysis",
              "Citation Analytics",
              "Optimization Recommendations"
            ]
          }
        ]}
      />
      <OrganizationSchema />
      <WebSiteSchema />
      <ProductSchema />
      
      {/* Force dark mode for landing page */}
      <div className="dark min-h-screen bg-background text-foreground">
        <LandingNavbar />
        <main>
          <ConversionHeroV2 />
          <WhatReportShows />
          <ResultsPreview />
          <WhyLlumosDifferent />
          <HowItWorksV2 />
          <UpgradeTriggers />
          <PricingTease />
          <FinalCTAV2 />
        </main>
        <LandingFooter />
      </div>
    </>
  );
};

export default Index;
