// Pure scoring helpers for the AI Visibility Report.
//
// Kept in a separate module (no `npm:` imports) so it can be unit-tested with
// `deno test` without pulling in the full edge function's runtime deps.

export type ProviderResultLike = {
  provider: string;
  prompt: string;
  response: string;
  brandMentioned: boolean;
  // Per-response quality 0–100 (positioning, recommendation strength, brand-adjacent context)
  score: number;
  // Optional fields the scorer doesn't read but real ProviderResult carries:
  competitors?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'not_mentioned';
  recommendationStrength?: 'strong' | 'moderate' | 'weak' | 'absent';
  brandPosition?: number | null;
};

// ---- Buyer-intent weights (mirrors the full classifier in index.ts) --------
//
// Keep this in sync with `classifyPromptIntent` in index.ts. The full classifier
// is more elaborate (priority labels, etc.); here we only need the weight.
//
// Weights:
//   High Commercial Intent  → 1.25
//   Provider Search Intent  → 1.00
//   Comparison / Evaluation → 0.75
//   Educational             → 0.50
export function promptIntentWeight(prompt: string): number {
  const p = (prompt || '').toLowerCase();

  const highCommercial =
    /\b(best|top|leading|#1|number\s+one|cheapest|most\s+(?:trusted|recommended|reputable)|highest[-\s]rated|five[-\s]star)\b/.test(p) ||
    /\bnear\s+me\b/.test(p) ||
    /\balternatives?\s+to\b/.test(p) ||
    /\b(law\s*firm|attorney|lawyer|agency|company|provider|service|firm)\s+for\b/.test(p);
  if (highCommercial) return 1.25;

  const providerSearch =
    /\b(attorney|lawyer|law\s*firm|agency|company|provider|service|firm|consultant|specialist|expert)s?\b/.test(p);
  if (providerSearch) return 1.0;

  const comparison =
    /\bvs\.?\b|\bversus\b|\bcompare(?:d|s)?\b|\bcomparison\b|\bhow\s+to\s+choose\b|\bdifference\s+between\b/.test(p);
  if (comparison) return 0.75;

  const educational =
    /\bwhat\s+is\b|\bhow\s+(?:does|do)\b|\bwhy\s+(?:does|do|is|are)\b|\bguide\s+to\b|\bbasics\s+of\b|\bdefinition\s+of\b/.test(p);
  if (educational) return 0.5;

  // Default to "Provider Search" weight for unmatched prompts (most reports).
  return 1.0;
}

// ---- AI Visibility Score ---------------------------------------------------

export interface VisibilityScoreBreakdown {
  components: {
    mentionCoverage:  { score: number; max: 40 };
    promptCoverage:   { score: number; max: 20 };
    providerCoverage: { score: number; max: 15 };
    mentionQuality:   { score: number; max: 15 };
    competitiveSov:   { score: number; max: 10 };
  };
  diagnostics: {
    validResponses: number;
    verifiedBrandMentions: number;
    promptsCovered:   string;     // "X/Y"
    providersCovered: string;   // "X/Y"
    weightedMentionRate: number;
    avgQuality: number;
    sov: number;
    singleMentionGuardrailApplied: boolean;
  };
  finalScore: number;
}

/**
 * Pure, transparent AI Visibility Score calculator.
 *
 * Components (sum to 100):
 *   • Mention Coverage           (0–40) — intent-weighted share of valid responses that mention the brand
 *   • Prompt Coverage            (0–20) — share of unique prompts where the brand is mentioned at least once
 *   • Provider Coverage          (0–15) — share of unique providers where the brand is mentioned at least once
 *   • Mention Quality            (0–15) — average per-response quality (0–100), scaled to 15
 *   • Competitive Share of Voice (0–10) — pre-computed SoV ratio × 10
 *
 * Guardrails:
 *   1. Zero verified mentions  → final = 0 AND every component = 0
 *   2. Single mention on a large run (≥20 valid responses) → quality + SoV caps
 *      keep final < 15 even with a "perfect" mention.
 *   3. Category Difficulty is NEVER added (function takes no category arg).
 *   4. SoV ratio MUST come from `computeShareOfVoice` (which excludes
 *      research-backed entities not present in AI text). This function does
 *      no SoV math.
 *   5. Per-response context handling (positive-words-only-when-brand-adjacent,
 *      negative context, etc.) lives upstream in `r.score` which feeds Mention
 *      Quality. This function does no text analysis.
 */
export function computeVisibilityScore(
  results: ProviderResultLike[],
  sov: number,
): VisibilityScoreBreakdown {
  const validResults = results.filter(
    (r) =>
      !r.response.startsWith('Error') &&
      !r.response.startsWith('Provider not') &&
      !r.response.startsWith('No AI Overview'),
  );
  const mentionedResults = validResults.filter((r) => r.brandMentioned);
  const verifiedBrandMentions = mentionedResults.length;

  // Intent-weighted mention coverage
  let weightedMentionNum = 0;
  let weightedMentionDen = 0;
  for (const r of validResults) {
    const w = promptIntentWeight(r.prompt);
    weightedMentionDen += w;
    if (r.brandMentioned) weightedMentionNum += w;
  }
  const mentionRate = weightedMentionDen > 0 ? weightedMentionNum / weightedMentionDen : 0;

  // Quality of mentions when present
  const avgQuality = mentionedResults.length > 0
    ? mentionedResults.reduce((s, r) => s + (r.score || 0), 0) / mentionedResults.length
    : 0;

  // Coverage sets
  const promptsWithBrand = new Set<string>();
  const allPrompts = new Set<string>();
  const providersWithBrand = new Set<string>();
  const allProviders = new Set<string>();
  for (const r of validResults) {
    allPrompts.add(r.prompt);
    allProviders.add(r.provider);
    if (r.brandMentioned) {
      promptsWithBrand.add(r.prompt);
      providersWithBrand.add(r.provider);
    }
  }
  const promptCoverageRatio = allPrompts.size > 0 ? promptsWithBrand.size / allPrompts.size : 0;
  const providerCoverageRatio = allProviders.size > 0 ? providersWithBrand.size / allProviders.size : 0;

  // Component scores (max caps applied)
  let mentionCoverageScore  = Math.min(40, Math.round(mentionRate * 40));
  let promptCoverageScore   = Math.min(20, Math.round(promptCoverageRatio * 20));
  let providerCoverageScore = Math.min(15, Math.round(providerCoverageRatio * 15));
  let mentionQualityScore   = Math.min(15, Math.round((avgQuality / 100) * 15));
  let competitiveSovScore   = Math.min(10, Math.round(Math.max(0, Math.min(1, sov)) * 10));

  // ===== Guardrail 2: single mention on a large run cannot inflate the score
  let singleMentionGuardrailApplied = false;
  if (verifiedBrandMentions === 1 && validResults.length >= 20) {
    singleMentionGuardrailApplied = true;
    mentionQualityScore = Math.min(mentionQualityScore, 5);
    competitiveSovScore = Math.min(competitiveSovScore, 2);
  }

  let finalScore = mentionCoverageScore + promptCoverageScore + providerCoverageScore +
                   mentionQualityScore + competitiveSovScore;

  // Belt-and-suspenders cap so a single mention never produces ≥ 15
  if (singleMentionGuardrailApplied && finalScore >= 15) {
    const overflow = finalScore - 14;
    mentionCoverageScore = Math.max(0, mentionCoverageScore - overflow);
    finalScore = mentionCoverageScore + promptCoverageScore + providerCoverageScore +
                 mentionQualityScore + competitiveSovScore;
  }

  // ===== Guardrail 1: zero verified mentions => everything zero
  if (verifiedBrandMentions === 0) {
    mentionCoverageScore = 0;
    promptCoverageScore = 0;
    providerCoverageScore = 0;
    mentionQualityScore = 0;
    competitiveSovScore = 0;
    finalScore = 0;
  }

  finalScore = Math.max(0, Math.min(100, finalScore));

  return {
    components: {
      mentionCoverage:  { score: mentionCoverageScore,  max: 40 },
      promptCoverage:   { score: promptCoverageScore,   max: 20 },
      providerCoverage: { score: providerCoverageScore, max: 15 },
      mentionQuality:   { score: mentionQualityScore,   max: 15 },
      competitiveSov:   { score: competitiveSovScore,   max: 10 },
    },
    diagnostics: {
      validResponses: validResults.length,
      verifiedBrandMentions,
      promptsCovered:   `${promptsWithBrand.size}/${allPrompts.size}`,
      providersCovered: `${providersWithBrand.size}/${allProviders.size}`,
      weightedMentionRate: Number(mentionRate.toFixed(4)),
      avgQuality: Number(avgQuality.toFixed(2)),
      sov: Number(sov.toFixed(4)),
      singleMentionGuardrailApplied,
    },
    finalScore,
  };
}
