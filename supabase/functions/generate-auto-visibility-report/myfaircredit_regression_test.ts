// Regression test for the MyFairCreditSite AI Visibility Report bug, where
// the report classified ~196 "competitors" — most of which were AI-answer
// headings, advice phrases, product features, sentence fragments, generic
// nouns, and laws/regulations rather than real competitors.
//
// This test runs the validateEntity layer against:
//   1. A list of MUST-INCLUDE real competitors/providers (credit monitoring,
//      credit repair, business credit, adjacent resources).
//   2. A list of MUST-EXCLUDE false positives (headings, features, generic
//      nouns, laws/regulations, fragments).
//
// Each false positive is asserted to either be:
//   - excluded from the competitor landscape (`includeInCompetitorLandscape: false`),
//   - and have a non-empty `excludedReason`,
//   - and never reach Share of Voice.
//
// Real competitors are asserted to be included in the landscape with a
// recognised, non-"Excluded / Unknown" entity type.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// NOTE: We import from `entity-validation.ts` (the pure module) instead of
// `index.ts` so the test runner doesn't need to resolve npm:resend / pdf-lib.
import {
  validateEntity,
  categorizeExclusionReason,
} from "./entity-validation.ts";

// ---------------------------------------------------------------------------
// Mocked AI response snippets — short, realistic excerpts that mirror the
// kinds of strings the extractor pulled out of MyFairCreditSite responses.
// ---------------------------------------------------------------------------

const MOCK_RESPONSE_PERSONAL_CREDIT = `
For monitoring your personal credit, the top recommended providers are:
1. Credit Karma — free credit scores from TransUnion and Equifax.
2. Credit Sesame — free monitoring with identity theft protection.
3. Experian — direct access to FICO scores and full credit reports.
4. Identity Guard — identity theft protection bundled with monitoring.
5. Chase Credit Journey — free service from Chase, no account required.
6. Capital One CreditWise — free credit monitoring from Capital One.
Key Considerations: pricing, bureau coverage, and reputation.
Bottom Line: Credit Karma and Experian offer the best free options.
`;

const MOCK_RESPONSE_CREDIT_REPAIR = `
Best credit repair companies include Lexington Law, Sky Blue Credit, Credit Saint,
The Credit People, The Credit Pros, Pyramid Credit Repair, Safeport Law, and CreditRepair.com.
Important Considerations when choosing a credit repair company:
- Upfront Fees and Written Contract are required by the Credit Repair Organizations Act (CROA).
- Look for Money-Back Guarantee and Good BBB rating.
- Watch for False Claims and Red Flags.
The Fair Credit Reporting Act (FCRA) and Fair Debt Collection Practices Act (FDCPA)
govern what these companies can do.
`;

const MOCK_RESPONSE_BUSINESS_CREDIT = `
For business credit, the major providers are Dun & Bradstreet, Nav, Credit Suite,
Moody's Analytics CreditEdge, Zywave, Experian Business, and Equifax Business.
Services They Should Provide: Business Credit Reports Here, Provides PAYDEX,
Offers D-U-N-S Number, Provides Business Credit Score.
Important Implementation Notes For business owners: get an EIN first.
`;

const MOCK_RESPONSE_RESOURCES = `
Adjacent free resources include AnnualCreditReport.com, BestCompany, ConsumerAffairs,
BBB, Money Management International, Mission Asset Fund, and SCORE.
Compliance frameworks to know: GDPR, CCPA, SEC, SOC II, AML.
`;

const ALL_RESPONSES = [
  MOCK_RESPONSE_PERSONAL_CREDIT,
  MOCK_RESPONSE_CREDIT_REPAIR,
  MOCK_RESPONSE_BUSINESS_CREDIT,
  MOCK_RESPONSE_RESOURCES,
].join("\n\n");

// Known-alias set the extractor would have built from the catalog of
// known credit-industry brands. Used by validateEntity test #1.
const KNOWN_ALIASES = new Set<string>([
  "experian", "credit karma", "credit sesame", "identity guard",
  "chase credit journey", "capital one creditwise", "transunion",
  "equifax", "fico", "lexington law", "sky blue credit", "credit saint",
  "the credit people", "the credit pros", "pyramid credit repair",
  "safeport law", "creditrepair.com", "dun & bradstreet", "nav",
  "credit suite", "moody's analytics creditedge", "zywave",
  "experian business", "equifax business", "annualcreditreport.com",
  "bestcompany", "consumeraffairs", "bbb", "money management international",
  "mission asset fund", "score",
]);

// ---------------------------------------------------------------------------
// MUST-INCLUDE: real competitors / providers from MyFairCreditSite report
// ---------------------------------------------------------------------------
const MUST_INCLUDE: string[] = [
  // Credit monitoring / personal credit
  "Experian", "Credit Karma", "Credit Sesame", "Identity Guard",
  "Chase Credit Journey", "Capital One CreditWise", "TransUnion", "Equifax", "FICO",
  // Credit repair
  "Lexington Law", "Sky Blue Credit", "Credit Saint", "The Credit People",
  "The Credit Pros", "Pyramid Credit Repair", "Safeport Law", "CreditRepair.com",
  // Business credit
  "Dun & Bradstreet", "Nav", "Credit Suite", "Moody's Analytics CreditEdge",
  "Zywave", "Experian Business", "Equifax Business",
  // Resources / adjacent
  "AnnualCreditReport.com", "BestCompany", "ConsumerAffairs", "BBB",
  "Money Management International", "Mission Asset Fund", "SCORE",
];

// ---------------------------------------------------------------------------
// MUST-EXCLUDE: false positives that the report wrongly classified
// ---------------------------------------------------------------------------
const MUST_EXCLUDE: string[] = [
  // Headings / advice phrases
  "Key Considerations", "Important Considerations", "Additional Considerations",
  "Top Recommendations", "Best Free Options", "Best Value", "Bottom Line",
  "Key Differences", "Source Highlights", "Specific Needs", "Conclusion Selecting",
  "Important Implementation Notes For",
  // Generic nouns / fragments
  "Customer", "Your Company", "Your Selection",
  "Updates", "Covers", "Monitors", "Provides", "Up to",
  // Service-list phrases / features
  "Services Offered", "Services They Should Provide",
  "Customer Reviews", "Reputation and Reviews", "Licensing and Certification",
  "Personalized Service", "Educational Resources",
  "Upfront Fees", "Written Contract", "Money-Back Guarantee",
  "False Claims", "Red Flags", "Positive Signs", "Good BBB",
  // Product features
  "Credit Monitoring", "Credit Scores", "Identity Theft Protection",
  "Paid Plans", "Bureaus Monitored", "Scoring Model",
  "Business Credit Reports Here", "Provides PAYDEX",
  "Offers D-U-N-S Number", "Provides Business Credit Score",
  // Laws / regulations / acronyms
  "Credit Repair Organizations Act", "Fair Credit Reporting Act",
  "Fair Debt Collection Practices Act",
  "CROA", "FCRA", "FDCPA", "GDPR", "CCPA", "SEC", "EIN", "SOC II", "AML",
];

function runValidate(rawText: string) {
  // The pure entity-validation module doesn't ship the canonicalization map.
  // For the purposes of this regression test we use the lower-cased rawText
  // as the canonical key; the alias-set already contains lower-cased canonical
  // names so the alias_map_match path still fires for real competitors.
  const canonical = rawText.toLowerCase().trim();
  return validateEntity({
    rawText,
    canonicalName: canonical,
    classifiedType: "unknown",
    mentionStatus: "listed",
    evidenceSnippet: "",
    provider: "openai",
    promptId: "p1",
    response: ALL_RESPONSES,
    knownAliases: KNOWN_ALIASES,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test("MyFairCredit regression: real competitors must be included", () => {
  const failures: Array<{ name: string; reason: string; type: string; conf: number }> = [];
  for (const name of MUST_INCLUDE) {
    const v = runValidate(name);
    if (!v.includeInCompetitorLandscape || v.entityType === "Excluded / Unknown") {
      failures.push({
        name,
        reason: v.excludedReason || "(none)",
        type: v.entityType,
        conf: v.confidenceScore,
      });
    }
  }
  if (failures.length > 0) {
    console.error("Real competitors WRONGLY excluded:", JSON.stringify(failures, null, 2));
  }
  assertEquals(
    failures.length,
    0,
    `${failures.length}/${MUST_INCLUDE.length} real competitors were wrongly excluded`,
  );
});

Deno.test("MyFairCredit regression: false positives must be excluded with a reason", () => {
  const failures: Array<{ name: string; type: string; conf: number; reason?: string }> = [];
  for (const name of MUST_EXCLUDE) {
    const v = runValidate(name);
    const isExcludedFromLandscape = !v.includeInCompetitorLandscape;
    const isNotInSoV = !v.includeInShareOfVoice;
    const hasReason = !!v.excludedReason && v.excludedReason.length > 0;
    if (!isExcludedFromLandscape || !isNotInSoV || !hasReason) {
      failures.push({
        name,
        type: v.entityType,
        conf: v.confidenceScore,
        reason: v.excludedReason,
      });
    }
  }
  if (failures.length > 0) {
    console.error("False positives WRONGLY included:", JSON.stringify(failures, null, 2));
  }
  assertEquals(
    failures.length,
    0,
    `${failures.length}/${MUST_EXCLUDE.length} false positives leaked into the landscape`,
  );
});

Deno.test("MyFairCredit regression: laws and regulations classify as Regulatory / Legal Context", () => {
  const laws = [
    "CROA", "FCRA", "FDCPA", "GDPR", "CCPA",
    "Credit Repair Organizations Act",
    "Fair Credit Reporting Act",
    "Fair Debt Collection Practices Act",
  ];
  for (const law of laws) {
    const v = runValidate(law);
    assertEquals(
      v.entityType,
      "Regulatory / Legal Context",
      `${law} should be Regulatory / Legal Context, got ${v.entityType}`,
    );
    assert(!v.includeInCompetitorLandscape, `${law} must not enter the landscape`);
    assert(!v.includeInShareOfVoice, `${law} must not enter Share of Voice`);
    assertEquals(
      categorizeExclusionReason(v.excludedReason),
      "legal/regulatory term",
      `${law} should bucket into legal/regulatory term`,
    );
  }
});

// (Canonicalization / parent-brand rollup is verified via the index.ts integration
// path in production; it lives outside the pure entity-validation module and
// is not exercised by this regression test.)

Deno.test("MyFairCredit regression: bulk sanity — far fewer than 196 competitors", () => {
  // The original bug produced ~196 false-positive competitors. Run the full
  // MUST_INCLUDE + MUST_EXCLUDE set through validation and assert that the
  // count of accepted entities is bounded by the real competitor list.
  const all = [...MUST_INCLUDE, ...MUST_EXCLUDE];
  const accepted = all.filter(name => {
    const v = runValidate(name);
    return v.includeInCompetitorLandscape && v.entityType !== "Excluded / Unknown";
  });
  // Hard ceiling: at most MUST_INCLUDE.length entities should pass.
  // (We tolerate a small upward slack for entities that genuinely also
  // classify as providers, but it must be far below 196.)
  assert(
    accepted.length <= MUST_INCLUDE.length + 5,
    `Expected ≤ ${MUST_INCLUDE.length + 5} competitors, got ${accepted.length}. ` +
    `False positives: ${accepted.filter(n => !MUST_INCLUDE.includes(n)).join(", ")}`,
  );
  assert(
    accepted.length < 50,
    `Total accepted (${accepted.length}) must stay far below the 196 false-positive baseline`,
  );
});
