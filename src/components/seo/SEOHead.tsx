import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  /** Canonical URL path (e.g., "/pricing") - will be prefixed with BASE_URL */
  canonical?: string;
  /** @deprecated Use canonical instead */
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
  schemaJson?: object | object[];
  keywords?: string;
  ogType?: 'website' | 'article';
  publishedDate?: string;
  modifiedDate?: string;
  authorName?: string;
}

const BASE_URL = 'https://llumos.app';

/**
 * SEOHead - Unified component for all page meta tags
 * Use this component at the top of every page before the main content
 * 
 * @param title - Page title (will be appended with " | Llumos" if not already present)
 * @param description - Meta description for the page
 * @param canonical - Canonical URL path (e.g., "/pricing" - will be prefixed with BASE_URL)
 * @param ogImage - Open Graph image path or full URL
 * @param noIndex - If true, adds noindex,nofollow robots meta tag
 * @param schemaJson - JSON-LD structured data object(s)
 * @param keywords - Meta keywords (optional)
 * @param ogType - Open Graph type (website or article)
 * @param publishedDate - ISO date string for article published date
 * @param modifiedDate - ISO date string for article modified date
 * @param authorName - Author name for articles
 */
export function SEOHead({ 
  title, 
  description, 
  canonical,
  canonicalUrl,
  ogImage = '/og-home.png',
  noIndex = false,
  schemaJson,
  keywords,
  ogType = 'website',
  publishedDate,
  modifiedDate,
  authorName = 'Llumos'
}: SEOHeadProps) {
  // Support both canonical and canonicalUrl (deprecated) for backwards compatibility
  const canonicalPath = canonical || canonicalUrl || '/';
  
  // Build full URLs
  const fullUrl = canonicalPath.startsWith('http') ? canonicalPath : `${BASE_URL}${canonicalPath}`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`;
  
  // Format title - append Llumos if not already present
  const fullTitle = title.includes('Llumos') ? title : `${title} | Llumos`;

  // Process schema JSON
  const getSchemaScript = () => {
    if (!schemaJson) return null;
    return JSON.stringify(Array.isArray(schemaJson) ? schemaJson : [schemaJson]);
  };

  const schemaScript = getSchemaScript();

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Language & Locale */}
      <meta property="og:locale" content="en_US" />
      <link rel="alternate" hrefLang="en" href={fullUrl} />
      <link rel="alternate" hrefLang="x-default" href={fullUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Llumos" />
      
      {/* Article-specific Open Graph tags */}
      {ogType === 'article' && publishedDate && (
        <meta property="article:published_time" content={publishedDate} />
      )}
      {ogType === 'article' && modifiedDate && (
        <meta property="article:modified_time" content={modifiedDate} />
      )}
      {ogType === 'article' && authorName && (
        <meta property="article:author" content={authorName} />
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      <meta name="twitter:site" content="@llumos_ai" />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* JSON-LD Structured Data */}
      {schemaScript && (
        <script type="application/ld+json">
          {schemaScript}
        </script>
      )}
    </Helmet>
  );
}

export default SEOHead;
