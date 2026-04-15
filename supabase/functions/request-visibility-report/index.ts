import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const HUBSPOT_PORTAL_ID = Deno.env.get("HUBSPOT_PORTAL_ID");
const HUBSPOT_FORM_GUID = Deno.env.get("HUBSPOT_FORM_GUID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  firstName: string;
  email: string;
  domain: string;
  score: number;
  /** When true, queue only — don't fire background generation (for webinar / high-volume mode) */
  queueOnly?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, email, domain, score, queueOnly }: ReportRequest = await req.json();

    // Validate required fields
    if (!firstName?.trim() || !email?.trim() || !domain?.trim()) {
      return new Response(
        JSON.stringify({ error: "First name, email, and domain are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate domain format — must be a real domain with TLD (e.g., example.com)
    const cleanDomain = domain.trim().toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/\/.*$/, '');
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid domain (e.g., example.com)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate length limits
    if (firstName.length > 100 || email.length > 255 || cleanDomain.length > 255) {
      return new Response(
        JSON.stringify({ error: "Input exceeds maximum length" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for existing pending/processing request to prevent duplicates
    const { data: existing } = await supabase
      .from("visibility_report_requests")
      .select("id, status")
      .eq("email", email.trim().toLowerCase())
      .eq("domain", domain.trim())
      .in("status", ["pending", "processing"])
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[RequestReport] Duplicate request for ${email} / ${domain} — skipping insert`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Report already queued. You'll receive your AI Visibility Report via email shortly!",
          queued: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the report request
    const { error: insertError } = await supabase
      .from("visibility_report_requests")
      .insert({
        email: email.trim().toLowerCase(),
        domain: domain.trim(),
        score,
        status: "pending",
        metadata: { firstName: firstName.trim() },
      });

    if (insertError) {
      console.error("Error storing report request:", insertError);
      throw insertError;
    }

    // Submit to HubSpot Forms API
    if (HUBSPOT_PORTAL_ID && HUBSPOT_FORM_GUID) {
      try {
        const hubspotResponse = await fetch(
          `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: [
                { name: "firstname", value: firstName.trim() },
                { name: "email", value: email.trim() },
                { name: "website", value: domain.trim() },
              ],
              context: {
                pageUri: "https://llumos.app/brands",
                pageName: "Brand Visibility Report Request",
              },
            }),
          }
        );

        if (hubspotResponse.ok) {
          console.log(`Lead submitted to HubSpot for ${email}`);
        } else {
          const errorText = await hubspotResponse.text();
          console.error("HubSpot submission failed:", errorText);
        }
      } catch (hubspotError) {
        console.error("Error submitting to HubSpot:", hubspotError);
      }
    }

    console.log(`Visibility report requested for ${domain} by ${firstName} (${email}) - Score: ${score} - QueueOnly: ${!!queueOnly}`);

    // In queue-only mode (webinar), leave as pending for process-pending-reports to pick up
    if (queueOnly) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Report queued successfully. You'll receive your AI Visibility Report via email within 15 minutes!",
          queued: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normal mode: mark as processing and fire background generation immediately
    await supabase
      .from("visibility_report_requests")
      .update({ 
        status: "processing",
        metadata: { firstName: firstName.trim(), backgroundTriggeredAt: new Date().toISOString() }
      })
      .eq("email", email.trim().toLowerCase())
      .eq("domain", domain.trim())
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    // Trigger automatic report generation as a background task
    const generateReportInBackground = async () => {
      try {
        console.log(`[Background] Starting auto report generation for ${domain}`);
        
        const reportResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/generate-auto-visibility-report`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              firstName: firstName.trim(),
              email: email.trim(),
              domain: domain.trim(),
              score
            }),
          }
        );

        if (reportResponse.ok) {
          const result = await reportResponse.json();
          console.log(`[Background] Auto report completed for ${domain}:`, result);
        } else {
          const errorText = await reportResponse.text();
          console.error(`[Background] Auto report failed for ${domain}:`, errorText);
        }
      } catch (bgError) {
        console.error(`[Background] Error generating auto report for ${domain}:`, bgError);
      }
    };

    // Use EdgeRuntime.waitUntil if available, otherwise fire-and-forget
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(generateReportInBackground());
    } else {
      generateReportInBackground();
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Report request received successfully. You'll receive your AI Visibility Report via email shortly!" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in request-visibility-report:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
