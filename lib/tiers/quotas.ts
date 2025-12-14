/**
 * Tier-based quota management
 */

export type PlanTier = 'starter' | 'growth' | 'pro' | 'agency' | 'free';

export interface TierQuotas {
  promptsPerDay: number;
  providersPerPrompt: number;
  maxUsers: number;
  maxBrands: number;
  /** Maximum number of prompts the user can track (for free tier) */
  maxPrompts?: number;
  /** Run frequency: 'daily' | 'weekly' */
  runFrequency?: 'daily' | 'weekly';
}

export function getQuotasForTier(planTier: PlanTier): TierQuotas {
  switch (planTier) {
    case 'starter':
      return { promptsPerDay: 25, providersPerPrompt: 2, maxUsers: 1, maxBrands: 1, runFrequency: 'daily' };
    case 'growth':
      return { promptsPerDay: 100, providersPerPrompt: 4, maxUsers: 3, maxBrands: 3, runFrequency: 'daily' };
    case 'pro':
      return { promptsPerDay: 200, providersPerPrompt: 4, maxUsers: 5, maxBrands: 3, runFrequency: 'daily' };
    case 'agency':
      return { promptsPerDay: 300, providersPerPrompt: 4, maxUsers: 10, maxBrands: 10, runFrequency: 'daily' };
    case 'free':
      return { 
        promptsPerDay: 5, 
        providersPerPrompt: 1, 
        maxUsers: 1, 
        maxBrands: 1,
        maxPrompts: 5, 
        runFrequency: 'weekly' 
      };
    default:
      return { 
        promptsPerDay: 5, 
        providersPerPrompt: 1, 
        maxUsers: 1, 
        maxBrands: 1,
        maxPrompts: 5, 
        runFrequency: 'weekly' 
      };
  }
}