import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Validate domain format — must have at least one dot and only valid chars */
function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
  return domainRegex.test(domain.trim().toLowerCase());
}

/** Retry-aware Supabase query — handles 522/503 transient errors */
async function fetchPendingWithRetry(
  supabase: ReturnType<typeof createClient>,
  batchSize: number,
  maxRetries = 3,
): Promise<Array<{ id: string; email: string; domain: string; metadata: any }>> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      // Only pick up rows that are still 'pending'. Do NOT retry 'error' rows here —
      // an errored row may have already sent the email but failed the post-send DB update,
      // and re-running it would send a duplicate email. Errored rows should be retried
      // manually after investigation.
      const { data, error } = await supabase
        .from("visibility_report_requests")
        .select("id, email, domain, metadata")
        .eq("status", "pending")
        .lt("created_at", twoMinutesAgo)
        .order("created_at", { ascending: true })
        .limit(batchSize);

      if (error) {
        // Check if error message contains HTML (Cloudflare 522/503)
        if (typeof error.message === "string" && error.message.includes("<!DOCTYPE")) {
          throw new Error(`Supabase returned HTML error (likely 522/503)`);
        }
        throw new Error(`DB query failed: ${error.message}`);
      }

      // Filter out rows whose metadata.emailSent === true (defense in depth — should never
      // happen since we filter by status='pending', but guards against status drift).
      const safe = (data || []).filter((r: any) => {
        const meta = r.metadata || {};
        return meta.emailSent !== true && !meta.reportGeneratedAt;
      });

      return safe as Array<{ id: string; email: string; domain: string; metadata: any }>;
    } catch (err: any) {
      console.warn(`[ProcessPending] DB fetch attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        const delay = attempt * 3000; // 3s, 6s, 9s backoff
        console.log(`[ProcessPending] Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  return []; // unreachable but satisfies TS
}

/** Process a wave of N reports concurrently, return per-item results */
async function processWave(
  supabase: ReturnType<typeof createClient>,
  requests: Array<{ id: string; email: string; domain: string; metadata: any }>,
): Promise<Array<{ email: string; domain: string; status: string; error?: string }>> {
  const results: Array<{ email: string; domain: string; status: string; error?: string }> = [];

  // Mark all as processing first
  await Promise.all(
    requests.map((r) =>
      supabase
        .from("visibility_report_requests")
        .update({
          status: "processing",
          metadata: {
            ...(r.metadata as object || {}),
            processingStartedAt: new Date().toISOString(),
          },
        })
        .eq("id", r.id)
    ),
  );

  // Fire all reports in this wave concurrently
  const promises = requests.map(async (request) => {
    const { email, domain, metadata } = request;
    const firstName = (metadata as any)?.firstName || "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 150_000);

      const reportResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-auto-visibility-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ firstName, email, domain, score: 0 }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      const reportResult = await reportResponse.json();

      if (reportResponse.ok && reportResult.success) {
        console.log(`[ProcessPending] ✅ ${domain}`);
        results.push({ email, domain, status: "success" });
      } else {
        console.log(`[ProcessPending] ❌ ${domain}: ${reportResult.error}`);
        results.push({ email, domain, status: "failed", error: reportResult.error });

        await supabase
          .from("visibility_report_requests")
          .update({
            status: "error",
            metadata: {
              ...(metadata as object || {}),
              errorAt: new Date().toISOString(),
              errorMessage: reportResult.error,
            },
          })
          .eq("id", request.id);
      }
    } catch (processingError: any) {
      console.error(`[ProcessPending] 💥 ${domain}:`, processingError.message);
      results.push({ email, domain, status: "error", error: processingError.message });

      await supabase
        .from("visibility_report_requests")
        .update({
          status: "error",
          metadata: {
            ...(metadata as object || {}),
            errorAt: new Date().toISOString(),
            errorMessage: processingError.message,
          },
        })
        .eq("id", request.id);
    }
    return null;
  });

  await Promise.all(promises);
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[ProcessPending] Starting pending report processor");

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Accept optional config from request body
    let batchSize = 50;
    let concurrency = 5;
    try {
      const body = await req.json();
      if (body?.batchSize) batchSize = Math.min(body.batchSize, 100);
      if (body?.concurrency) concurrency = Math.min(body.concurrency, 10);
    } catch {
      // no body is fine — use defaults
    }

    // Fetch pending with retry logic for transient DB errors
    const pendingRequests = await fetchPendingWithRetry(supabase, batchSize);

    if (pendingRequests.length === 0) {
      console.log("[ProcessPending] No pending submissions to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending submissions" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Filter out invalid domains before processing
    const validRequests: typeof pendingRequests = [];
    const skippedRequests: Array<{ id: string; domain: string; reason: string }> = [];

    for (const r of pendingRequests) {
      if (!isValidDomain(r.domain)) {
        skippedRequests.push({ id: r.id, domain: r.domain, reason: "invalid_domain" });
      } else {
        validRequests.push(r);
      }
    }

    // Mark invalid entries as skipped so they don't clog the queue
    if (skippedRequests.length > 0) {
      console.log(
        `[ProcessPending] Skipping ${skippedRequests.length} invalid domains: ${skippedRequests.map((s) => s.domain).join(", ")}`,
      );
      await Promise.all(
        skippedRequests.map((s) =>
          supabase
            .from("visibility_report_requests")
            .update({
              status: "error",
              metadata: {
                errorAt: new Date().toISOString(),
                errorMessage: `Invalid domain format: "${s.domain}"`,
                skippedByProcessor: true,
              },
            })
            .eq("id", s.id)
        ),
      );
    }

    if (validRequests.length === 0) {
      console.log("[ProcessPending] No valid domains to process after filtering");
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          skipped: skippedRequests.length,
          message: "All pending requests had invalid domains",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[ProcessPending] Found ${validRequests.length} valid submissions (skipped ${skippedRequests.length}) — processing in waves of ${concurrency}`,
    );

    const allResults: Array<{ email: string; domain: string; status: string; error?: string }> = [];

    // Split into waves of `concurrency` size
    for (let i = 0; i < validRequests.length; i += concurrency) {
      const wave = validRequests.slice(i, i + concurrency);
      const waveNum = Math.floor(i / concurrency) + 1;
      console.log(
        `[ProcessPending] Wave ${waveNum}: processing ${wave.length} reports (${wave.map((r) => r.domain).join(", ")})`,
      );

      const waveResults = await processWave(supabase, wave);
      allResults.push(...waveResults);

      // 5-second cooldown between waves to respect rate limits
      if (i + concurrency < validRequests.length) {
        console.log(`[ProcessPending] Cooldown 5s before next wave...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const succeeded = allResults.filter((r) => r.status === "success").length;
    const failed = allResults.filter((r) => r.status !== "success").length;

    console.log(
      `[ProcessPending] Done. Valid: ${validRequests.length}, Skipped: ${skippedRequests.length}, Succeeded: ${succeeded}, Failed: ${failed}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed: allResults.length,
        skipped: skippedRequests.length,
        succeeded,
        failed,
        details: allResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[ProcessPending] Fatal error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
