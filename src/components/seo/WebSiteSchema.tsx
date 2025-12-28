import { Helmet } from 'react-helmet-async';

/**
 * WebSite Schema Component
 * 
 * Helps with sitelinks search box in Google and establishes website identity.
 * 
 * @see https://schema.org/WebSite
 */
export const WebSiteSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://llumos.app/#website",
    "name": "Llumos",
    "url": "https://llumos.app",
    "description": "Track your brand visibility across AI-powered search engines like ChatGPT, Gemini, and Perplexity",
    "publisher": {
      "@type": "Organization",
      "@id": "https://llumos.app/#organization"
    },
    "inLanguage": "en-US",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://llumos.app/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default WebSiteSchema;
