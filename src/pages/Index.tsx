import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { SEOHelmet } from '@/components/SEOHelmet';
import { LandingNavbar } from '@/components/landing/LandingNavbar';

import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SolutionSection } from '@/components/landing/SolutionSection';
import { SocialProofSection } from '@/components/landing/SocialProofSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { ExitIntentPopup } from '@/components/home/ExitIntentPopup';
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
    return <Navigate to="/dashboard" replace />;
  }

  if (user && orgStatus === 'not_found' && !isChecking) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      <SEOHelmet
        title="AI Search Visibility & GEO Platform for Modern Brands"
        description="Stop guessing if ChatGPT recommends you. Track, measure, and optimize your brand's visibility in AI search engines like Gemini, Perplexity & ChatGPT. Start for free."
        keywords="AI search visibility, ChatGPT ranking, GEO platform, brand visibility tracking, AI SEO, Gemini search, Perplexity monitoring"
        canonicalPath="/"
        ogImage="/og-home.png"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Llumos",
            url: "https://llumos.ai",
            logo: "https://llumos.ai/logo.png",
            description: "Track and improve your brand's visibility on AI-powered search engines like ChatGPT, Gemini, and Perplexity",
            sameAs: ["https://twitter.com/llumos_ai"]
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Llumos",
            url: "https://llumos.ai",
            description: "AI Search Visibility Tracking Platform"
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Llumos",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Cloud/Web",
            description: "AI Search Visibility & GEO Tracking Platform. Track your brand visibility across AI-powered search engines like ChatGPT, Claude, Perplexity, and Google AI Overviews.",
            url: "https://llumos.ai",
            image: "https://llumos.ai/og-home.png",
            author: {
              "@type": "Organization",
              name: "Llumos",
              url: "https://llumos.ai"
            },
            offers: {
              "@type": "Offer",
              price: LLUMOS_PRICING.starter.price.toFixed(2),
              priceCurrency: LLUMOS_PRICING.starter.currency,
              priceValidUntil: "2025-12-31",
              availability: "https://schema.org/InStock",
              url: "https://llumos.ai/pricing"
            },
            featureList: [
              "AI Search Visibility Tracking",
              "ChatGPT Brand Monitoring",
              "Perplexity Visibility Analytics",
              "Google AI Overviews Tracking",
              "Competitor Analysis",
              "Citation Analytics"
            ],
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.8",
              reviewCount: "124",
              bestRating: "5",
              worstRating: "1"
            }
          }
        ]}
      />
      
      {/* Force dark mode for landing page */}
      <div className="dark min-h-screen bg-background text-foreground">
        <ExitIntentPopup />
        <LandingNavbar />
        <main>
          <HeroSection />
          <ProblemSection />
          <SolutionSection />
          <SocialProofSection />
          <FinalCTASection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
};

export default Index;
