import { Helmet } from 'react-helmet-async';

export interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency?: string;
  features: string[];
  sku?: string;
}

interface ProductSchemaProps {
  tiers?: PricingTier[];
}

// Default pricing tiers based on Llumos plans
const DEFAULT_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    description: 'For small companies tracking AI visibility. Includes 25 prompts daily, 2 AI platforms, and real-time tracking.',
    monthlyPrice: 39,
    yearlyPrice: 390,
    features: ['25 prompts daily', '2 AI platforms', 'Real-time tracking', 'Email support'],
    sku: 'llumos-starter'
  },
  {
    name: 'Growth',
    description: 'For growing companies needing deeper insights. Includes 100 prompts daily, all 4 AI platforms, and AI-powered recommendations.',
    monthlyPrice: 89,
    yearlyPrice: 890,
    features: ['100 prompts daily', '4 AI platforms', '50 competitors', 'AI recommendations', 'Content Studio'],
    sku: 'llumos-growth'
  },
  {
    name: 'Pro',
    description: 'For teams managing multiple brands. Includes 200 prompts daily, up to 3 brands, and custom optimization plans.',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: ['200 prompts daily', 'Up to 3 brands', '50 competitors', 'Custom optimization', 'Priority support'],
    sku: 'llumos-pro'
  },
  {
    name: 'Agency',
    description: 'For agencies and enterprises. Includes 300 prompts daily, up to 10 brands, white-label reports, and dedicated account manager.',
    monthlyPrice: 399,
    yearlyPrice: 3990,
    features: ['300 prompts daily', 'Up to 10 brands', 'White-label reports', 'Dedicated account manager'],
    sku: 'llumos-agency'
  }
];

/**
 * Product Schema Component
 * 
 * Generates JSON-LD structured data for Product schema with multiple pricing offers.
 * This helps Google understand Llumos pricing and can enable rich snippets.
 * 
 * @see https://schema.org/Product
 */
export const ProductSchema = ({ tiers = DEFAULT_TIERS }: ProductSchemaProps) => {
  const priceValidUntil = '2025-12-31';
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": "https://llumos.app/#product",
    "name": "Llumos AI Search Visibility Platform",
    "description": "Track, measure, and optimize your brand's visibility across AI-powered search engines like ChatGPT, Claude, Perplexity, and Google AI Overviews.",
    "image": "https://llumos.app/og-home.png",
    "brand": {
      "@type": "Brand",
      "name": "Llumos"
    },
    "manufacturer": {
      "@type": "Organization",
      "@id": "https://llumos.app/#organization"
    },
    "category": "Business Software",
    "url": "https://llumos.app/pricing",
    "offers": tiers.map(tier => ({
      "@type": "Offer",
      "name": `Llumos ${tier.name}`,
      "description": tier.description,
      "price": tier.monthlyPrice.toFixed(2),
      "priceCurrency": tier.currency || "USD",
      "priceValidUntil": priceValidUntil,
      "availability": "https://schema.org/InStock",
      "url": `https://llumos.app/pricing#${tier.name.toLowerCase()}`,
      "seller": {
        "@type": "Organization",
        "@id": "https://llumos.app/#organization"
      },
      "itemCondition": "https://schema.org/NewCondition",
      "priceSpecification": [
        {
          "@type": "UnitPriceSpecification",
          "price": tier.monthlyPrice.toFixed(2),
          "priceCurrency": tier.currency || "USD",
          "unitText": "month",
          "billingDuration": {
            "@type": "QuantitativeValue",
            "value": 1,
            "unitCode": "MON"
          }
        },
        {
          "@type": "UnitPriceSpecification",
          "price": tier.yearlyPrice.toFixed(2),
          "priceCurrency": tier.currency || "USD",
          "unitText": "year",
          "billingDuration": {
            "@type": "QuantitativeValue",
            "value": 1,
            "unitCode": "ANN"
          }
        }
      ]
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default ProductSchema;
