/**
 * Local AI Authority - Plan Gating
 * 
 * Checks if a user's subscription tier allows access to the Local AI Authority feature.
 * This is a stub for server-side validation in edge functions.
 */

// Plan tier type (matching lib/tiers/quotas.ts)
type PlanTier = 'starter' | 'growth' | 'pro' | 'agency' | 'free';

// Tiers that have access to Local AI Authority
const ELIGIBLE_TIERS: PlanTier[] = ['growth', 'pro', 'agency'];

/**
 * Check if a subscription tier has access to Local AI Authority
 */
export function isLocalAuthorityEligible(tier: PlanTier | string | null | undefined): boolean {
  if (!tier) return false;
  return ELIGIBLE_TIERS.includes(tier as PlanTier);
}

/**
 * Get the minimum tier required for Local AI Authority
 */
export function getMinimumRequiredTier(): PlanTier {
  return 'growth';
}

/**
 * Get a user-friendly error message for ineligible tiers
 */
export function getIneligibleTierMessage(currentTier: string | null | undefined): string {
  const tierDisplay = currentTier || 'free';
  return `Local AI Authority requires a Growth plan or higher. Your current plan is ${tierDisplay}. Please upgrade to access this feature.`;
}

/**
 * Local Authority feature limits by tier
 */
export interface LocalAuthorityLimits {
  maxProfiles: number;
  maxRunsPerDay: number;
  maxPromptsPerProfile: number;
  modelsAllowed: string[];
}

/**
 * Get feature limits for a given tier
 */
export function getLocalAuthorityLimits(tier: PlanTier | string | null | undefined): LocalAuthorityLimits {
  const normalizedTier = tier as PlanTier;
  
  switch (normalizedTier) {
    case 'growth':
      return {
        maxProfiles: 3,
        maxRunsPerDay: 5,
        maxPromptsPerProfile: 20,
        modelsAllowed: ['openai', 'perplexity'],
      };
    case 'pro':
      return {
        maxProfiles: 5,
        maxRunsPerDay: 10,
        maxPromptsPerProfile: 50,
        modelsAllowed: ['openai', 'perplexity', 'gemini'],
      };
    case 'agency':
      return {
        maxProfiles: 10,
        maxRunsPerDay: 25,
        maxPromptsPerProfile: 100,
        modelsAllowed: ['openai', 'perplexity', 'gemini', 'anthropic'],
      };
    default:
      // Free/starter tiers get no access
      return {
        maxProfiles: 0,
        maxRunsPerDay: 0,
        maxPromptsPerProfile: 0,
        modelsAllowed: [],
      };
  }
}
