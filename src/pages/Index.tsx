import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { SEOHelmet } from '@/components/SEOHelmet';
import { LandingNavbar } from '@/components/landing/LandingNavbar';

import { ConversionHeroSection } from '@/components/landing/ConversionHeroSection';
import { ClientLogoCarousel } from '@/components/landing/ClientLogoCarousel';
import { FreeVisibilityChecker } from '@/components/landing/FreeVisibilityChecker';
import { BeforeAfterSection } from '@/components/landing/BeforeAfterSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SolutionSection } from '@/components/landing/SolutionSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { AIModelsGrid } from '@/components/landing/AIModelsGrid';
import { TrustSection } from '@/components/landing/TrustSection';
import { ConversionFAQSection } from '@/components/landing/ConversionFAQSection';
import { ConversionFinalCTA } from '@/components/landing/ConversionFinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { ExitIntentPopup } from '@/components/home/ExitIntentPopup';
import { StickyBottomCTA } from '@/components/landing/StickyBottomCTA';
import { OrganizationSchema } from '@/components/seo/OrganizationSchema';
import { WebSiteSchema } from '@/components/seo/WebSiteSchema';
import { ProductSchema } from '@/components/seo/ProductSchema';
import { LLUMOS_PRICING } from '@/components/seo/SoftwareApplicationSchema';

const Index = () => {
  const { user, loading, orgData, orgStatus, ready, isChecking } = useAuth();

  if (loading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto"></div>
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
        title="Turn AI Search Mentions Into Revenue | Llumos"
        description="See how your brand appears in ChatGPT, Gemini, and Perplexity — and get clear actions to improve visibility and win more demand from AI-powered search."
        keywords="AI search visibility, ChatGPT ranking, GEO platform, brand visibility tracking, AI SEO, Gemini search, Perplexity monitoring"
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
            description: "AI Search Visibility & GEO Tracking Platform. Track your brand visibility across AI-powered search engines like ChatGPT, Claude, Perplexity, and Google AI Overviews.",
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
              "AI Search Visibility Tracking",
              "ChatGPT Brand Monitoring",
              "Perplexity Visibility Analytics",
              "Google AI Overviews Tracking",
              "Competitor Analysis",
              "Citation Analytics",
              "Content Studio",
              "White-Label Reports"
            ]
          }
        ]}
      />
      {/* Separate schema components for better organization */}
      <OrganizationSchema />
      <WebSiteSchema />
      <ProductSchema />
      
      {/* Force dark mode for landing page */}
      <div className="dark min-h-screen bg-background text-foreground">
        <ExitIntentPopup />
        <StickyBottomCTA />
        <LandingNavbar />
        <main>
          <ConversionHeroSection />
          <ClientLogoCarousel />
          <BeforeAfterSection />
          <FreeVisibilityChecker />
          <ProblemSection />
          <HowItWorksSection />
          <AIModelsGrid />
          <SolutionSection />
          <TrustSection />
          <ConversionFAQSection />
          <ConversionFinalCTA />
        </main>
        <LandingFooter />
      </div>
    </>
  );
};

export default Index;
