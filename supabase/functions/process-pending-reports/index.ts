import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      const timeout = setTimeout(() => controller.abort(), 150_000); // 150s timeout

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

        // Mark as error so it can be retried
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

    // Fetch pending submissions older than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: pendingRequests, error: fetchError } = await supabase
      .from("visibility_report_requests")
      .select("id, email, domain, metadata")
      .in("status", ["pending", "error"]) // also retry errors
      .lt("created_at", twoMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch pending requests: ${fetchError.message}`);
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log("[ProcessPending] No pending submissions to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending submissions" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[ProcessPending] Found ${pendingRequests.length} submissions — processing in waves of ${concurrency}`,
    );

    const allResults: Array<{ email: string; domain: string; status: string; error?: string }> = [];

    // Split into waves of `concurrency` size
    for (let i = 0; i < pendingRequests.length; i += concurrency) {
      const wave = pendingRequests.slice(i, i + concurrency);
      const waveNum = Math.floor(i / concurrency) + 1;
      console.log(
        `[ProcessPending] Wave ${waveNum}: processing ${wave.length} reports (${wave.map((r) => r.domain).join(", ")})`,
      );

      const waveResults = await processWave(supabase, wave);
      allResults.push(...waveResults);

      // 5-second cooldown between waves to respect rate limits
      if (i + concurrency < pendingRequests.length) {
        console.log(`[ProcessPending] Cooldown 5s before next wave...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const succeeded = allResults.filter((r) => r.status === "success").length;
    const failed = allResults.filter((r) => r.status !== "success").length;

    console.log(
      `[ProcessPending] Done. Total: ${allResults.length}, Succeeded: ${succeeded}, Failed: ${failed}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed: allResults.length,
        succeeded,
        failed,
        details: allResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[ProcessPending] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
