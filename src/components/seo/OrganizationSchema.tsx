import { Helmet } from 'react-helmet-async';

/**
 * Organization Schema Component
 * 
 * Enhanced schema for establishing Llumos as a recognized entity.
 * Includes complete sameAs profiles, contact points, and founding info.
 * 
 * @see https://schema.org/Organization
 */
export const OrganizationSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://llumos.app/#organization",
    "name": "Llumos",
    "legalName": "Llumos Inc.",
    "url": "https://llumos.app",
    "logo": {
      "@type": "ImageObject",
      "url": "https://llumos.app/lovable-uploads/a3631033-2657-4c97-8fd8-079913859ab0.png",
      "width": 512,
      "height": 512
    },
    "image": "https://llumos.app/og-home.png",
    "description": "AI Search Visibility & GEO Tracking Platform. Track, measure, and optimize your brand's visibility across AI-powered search engines like ChatGPT, Claude, Perplexity, and Google AI Overviews.",
    "foundingDate": "2024",
    "numberOfEmployees": {
      "@type": "QuantitativeValue",
      "minValue": 1,
      "maxValue": 10
    },
    "sameAs": [
      "https://twitter.com/llumos_ai",
      "https://www.linkedin.com/company/llumos",
      "https://github.com/llumos"
    ],
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "contactType": "Customer Support",
        "email": "support@llumos.app",
        "availableLanguage": ["English"]
      },
      {
        "@type": "ContactPoint",
        "contactType": "Sales",
        "email": "sales@llumos.app",
        "availableLanguage": ["English"]
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    },
    "areaServed": {
      "@type": "GeoShape",
      "name": "Worldwide"
    },
    "slogan": "Track your AI search visibility",
    "knowsAbout": [
      "AI Search Optimization",
      "Generative Engine Optimization",
      "Brand Visibility Tracking",
      "ChatGPT SEO",
      "LLM Marketing",
      "AI-powered Search Analytics"
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default OrganizationSchema;
