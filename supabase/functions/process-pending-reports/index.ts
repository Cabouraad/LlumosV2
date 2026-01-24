import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[ProcessPending] Starting daily pending report processor");

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all pending submissions older than 5 minutes (to avoid race conditions with sync)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: pendingRequests, error: fetchError } = await supabase
      .from("visibility_report_requests")
      .select("id, email, domain, metadata")
      .eq("status", "pending")
      .lt("created_at", fiveMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(20); // Process max 20 per run to avoid timeouts

    if (fetchError) {
      throw new Error(`Failed to fetch pending requests: ${fetchError.message}`);
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log("[ProcessPending] No pending submissions to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending submissions" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ProcessPending] Found ${pendingRequests.length} pending submissions to process`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      details: [] as Array<{ email: string; domain: string; status: string; error?: string }>
    };

    // Process each pending request
    for (const request of pendingRequests) {
      const { email, domain, metadata } = request;
      const firstName = (metadata as any)?.firstName || "";

      console.log(`[ProcessPending] Processing: ${email} - ${domain}`);

      try {
        // Mark as processing to prevent duplicate runs
        await supabase
          .from("visibility_report_requests")
          .update({ 
            status: "processing",
            metadata: { 
              ...(metadata as object || {}), 
              processingStartedAt: new Date().toISOString() 
            }
          })
          .eq("id", request.id);

        // Call the generate-auto-visibility-report function
        const reportResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/generate-auto-visibility-report`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              firstName,
              email,
              domain,
              score: 0,
            }),
          }
        );

        const reportResult = await reportResponse.json();

        if (reportResponse.ok && reportResult.success) {
          console.log(`[ProcessPending] Successfully processed ${domain}`);
          results.succeeded++;
          results.details.push({ email, domain, status: "success" });
        } else {
          console.log(`[ProcessPending] Report generation returned error for ${domain}: ${reportResult.error}`);
          results.failed++;
          results.details.push({ email, domain, status: "failed", error: reportResult.error });
        }

        results.processed++;

      } catch (processingError: any) {
        console.error(`[ProcessPending] Error processing ${domain}:`, processingError);
        results.failed++;
        results.details.push({ 
          email, 
          domain, 
          status: "error", 
          error: processingError.message 
        });

        // Update status to error
        await supabase
          .from("visibility_report_requests")
          .update({ 
            status: "error",
            metadata: { 
              ...(metadata as object || {}), 
              errorAt: new Date().toISOString(),
              errorMessage: processingError.message
            }
          })
          .eq("id", request.id);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[ProcessPending] Completed. Processed: ${results.processed}, Succeeded: ${results.succeeded}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[ProcessPending] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
