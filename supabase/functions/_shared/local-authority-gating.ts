/**
 * Local AI Authority - Server-side Plan Gating
 * 
 * Edge function utility for validating user access to Local AI Authority feature.
 * Uses existing subscription validation patterns.
 */

// Tiers that have access to Local AI Authority
const ELIGIBLE_TIERS = ['growth', 'pro', 'agency'];

export interface GatingResult {
  allowed: boolean;
  tier: string | null;
  reason?: string;
  limits?: {
    maxProfiles: number;
    maxRunsPerDay: number;
    maxPromptsPerProfile: number;
    modelsAllowed: string[];
  };
}

/**
 * Check if a subscription tier has access to Local AI Authority
 */
export function checkLocalAuthorityAccess(tier: string | null | undefined): GatingResult {
  if (!tier) {
    return {
      allowed: false,
      tier: null,
      reason: 'No subscription tier found. Please subscribe to access Local AI Authority.',
    };
  }

  const normalizedTier = tier.toLowerCase();
  
  if (!ELIGIBLE_TIERS.includes(normalizedTier)) {
    return {
      allowed: false,
      tier: normalizedTier,
      reason: `Local AI Authority requires a Growth plan or higher. Your current plan is ${tier}. Please upgrade to access this feature.`,
    };
  }

  return {
    allowed: true,
    tier: normalizedTier,
    limits: getLocalAuthorityLimits(normalizedTier),
  };
}

/**
 * Get feature limits for a given tier
 */
function getLocalAuthorityLimits(tier: string): GatingResult['limits'] {
  switch (tier) {
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
      return {
        maxProfiles: 0,
        maxRunsPerDay: 0,
        maxPromptsPerProfile: 0,
        modelsAllowed: [],
      };
  }
}

/**
 * Create an error response for unauthorized access
 */
export function createGatingErrorResponse(
  result: GatingResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'subscription_required',
      message: result.reason,
      current_tier: result.tier,
      required_tier: 'growth',
    }),
    {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Validate user access using Supabase client
 * Call this at the start of Local Authority edge functions
 */
export async function validateLocalAuthorityAccess(
  supabase: any,
  userId: string
): Promise<GatingResult> {
  try {
    // Get user's subscription from subscribers table
    const { data: subscriber, error } = await supabase
      .from('subscribers')
      .select('subscription_tier, subscribed, payment_collected')
      .eq('user_id', userId)
      .single();

    if (error || !subscriber) {
      return {
        allowed: false,
        tier: null,
        reason: 'No subscription found. Please subscribe to access Local AI Authority.',
      };
    }

    // Check if subscription is active
    if (!subscriber.subscribed || !subscriber.payment_collected) {
      return {
        allowed: false,
        tier: subscriber.subscription_tier,
        reason: 'Your subscription is not active. Please ensure payment is collected.',
      };
    }

    return checkLocalAuthorityAccess(subscriber.subscription_tier);
  } catch (err) {
    console.error('Error validating Local Authority access:', err);
    return {
      allowed: false,
      tier: null,
      reason: 'Error validating subscription. Please try again.',
    };
  }
}
