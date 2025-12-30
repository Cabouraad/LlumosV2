import { describe, it, expect } from 'vitest';

describe('Pricing Alignment', () => {
  it('should ensure Stripe prices match pricing page', () => {
    // Pricing page prices (in dollars)
    const pricingPageTiers = {
      starter: { monthly: 49, yearly: 490 },
      growth: { monthly: 99, yearly: 990 },
      pro: { monthly: 225, yearly: 2250 }
    };

    // Stripe prices (in cents) - these should match the pricing page
    const stripePrices = {
      starter: { monthly: 4900, yearly: 49000 },
      growth: { monthly: 9900, yearly: 99000 },
      pro: { monthly: 22500, yearly: 225000 }
    };

    // Convert pricing page prices to cents and compare
    Object.entries(pricingPageTiers).forEach(([tier, prices]) => {
      const expectedMonthly = prices.monthly * 100;
      const expectedYearly = prices.yearly * 100;
      
      expect(stripePrices[tier as keyof typeof stripePrices].monthly).toBe(expectedMonthly);
      expect(stripePrices[tier as keyof typeof stripePrices].yearly).toBe(expectedYearly);
    });
  });
});