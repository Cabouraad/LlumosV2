import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HUBSPOT_ACCESS_TOKEN = Deno.env.get("HUBSPOT_ACCESS_TOKEN");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Form IDs to sync - these are the forms used across the site
const FORM_IDS = [
  "a5f00a96-4eba-44ef-a4a9-83ceb5d45d1d", // Hero form / AI Visibility Landing
  "fada3578-f269-4b9f-8bd1-3ace25fc31af", // Free Visibility Checker
  "a4550985-bb56-43ca-ad9c-4ad67a580595", // Exit intent
];

interface HubSpotSubmission {
  submittedAt: string;
  values: Array<{ name: string; value: string }>;
}

interface HubSpotResponse {
  results: HubSpotSubmission[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

const log = (step: string, details?: unknown) => {
  console.log(`[sync-hubspot] ${step}`, details ? JSON.stringify(details) : "");
};

async function fetchFormSubmissions(formId: string, afterTimestamp?: string): Promise<HubSpotSubmission[]> {
  const submissions: HubSpotSubmission[] = [];
  let after: string | undefined;
  
  do {
    const params = new URLSearchParams({ limit: "50" });
    if (after) params.set("after", after);
    
    const url = `https://api.hubapi.com/form-integrations/v1/submissions/forms/${formId}?${params}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      log(`HubSpot API error for form ${formId}`, { status: response.status, error: errorText });
      break;
    }
    
    const data: HubSpotResponse = await response.json();
    
    // Filter by timestamp if provided
    for (const submission of data.results) {
      if (afterTimestamp) {
        const submittedAt = new Date(parseInt(submission.submittedAt)).toISOString();
        if (submittedAt <= afterTimestamp) {
          // We've reached submissions we've already processed
          return submissions;
        }
      }
      submissions.push(submission);
    }
    
    after = data.paging?.next?.after;
  } while (after);
  
  return submissions;
}

function extractFieldValue(values: Array<{ name: string; value: string }>, fieldName: string): string {
  return values.find((v) => v.name === fieldName)?.value || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for scheduled runs
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    
    if (!cronSecret && !authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (cronSecret && cronSecret !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Invalid cron secret" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!HUBSPOT_ACCESS_TOKEN) {
      throw new Error("HUBSPOT_ACCESS_TOKEN not configured");
    }

    log("Starting HubSpot sync");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get last sync timestamp from app_settings
    const { data: settingData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "hubspot_last_sync")
      .maybeSingle();
    
    const lastSync = settingData?.value || null;
    log("Last sync timestamp", { lastSync });
    
    let totalSynced = 0;
    let totalSkipped = 0;
    const newLastSync = new Date().toISOString();
    
    for (const formId of FORM_IDS) {
      log(`Fetching submissions for form ${formId}`);
      
      const submissions = await fetchFormSubmissions(formId, lastSync);
      log(`Found ${submissions.length} new submissions for form ${formId}`);
      
      for (const submission of submissions) {
        const email = extractFieldValue(submission.values, "email");
        const firstName = extractFieldValue(submission.values, "firstname");
        const lastName = extractFieldValue(submission.values, "lastname");
        const website = extractFieldValue(submission.values, "website") || 
                       extractFieldValue(submission.values, "domain");
        const company = extractFieldValue(submission.values, "company");
        
        if (!email) {
          log("Skipping submission without email");
          totalSkipped++;
          continue;
        }
        
        // Clean domain
        let cleanDomain = (website || "").trim().toLowerCase();
        if (cleanDomain.startsWith("http://") || cleanDomain.startsWith("https://")) {
          cleanDomain = cleanDomain.replace(/^https?:\/\/(www\.)?/, "");
        } else {
          cleanDomain = cleanDomain.replace(/^(www\.)?/, "");
        }
        cleanDomain = cleanDomain.replace(/\/.*$/, "");
        
        const submittedAt = new Date(parseInt(submission.submittedAt)).toISOString();
        
        // Check if lead already exists
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("email", email.trim().toLowerCase())
          .eq("source", "hubspot_sync")
          .maybeSingle();
        
        if (existingLead) {
          // Update existing lead
          await supabase
            .from("leads")
            .update({
              metadata: {
                firstName,
                lastName,
                domain: cleanDomain,
                company,
                formId,
                hubspotSubmittedAt: submittedAt,
                lastSyncedAt: newLastSync,
              },
            })
            .eq("id", existingLead.id);
          
          log(`Updated existing lead: ${email}`);
        } else {
          // Create new lead
          const { error: insertError } = await supabase
            .from("leads")
            .insert({
              email: email.trim().toLowerCase(),
              source: "hubspot_sync",
              metadata: {
                firstName,
                lastName,
                domain: cleanDomain,
                company,
                formId,
                hubspotSubmittedAt: submittedAt,
              },
            });
          
          if (insertError) {
            log(`Error inserting lead: ${email}`, { error: insertError.message });
            continue;
          }
          
          log(`Created new lead: ${email}`);
        }
        
        // Also store in visibility_report_requests if domain is present
        if (cleanDomain) {
          const { data: existingRequest } = await supabase
            .from("visibility_report_requests")
            .select("id")
            .eq("email", email.trim().toLowerCase())
            .eq("domain", cleanDomain)
            .maybeSingle();
          
          if (!existingRequest) {
            await supabase
              .from("visibility_report_requests")
              .insert({
                email: email.trim().toLowerCase(),
                domain: cleanDomain,
                score: 0,
                status: "pending",
                metadata: { 
                  firstName, 
                  source: "hubspot_sync",
                  formId,
                  hubspotSubmittedAt: submittedAt,
                },
              });
            
            log(`Created visibility report request for: ${cleanDomain}`);
          }
        }
        
        totalSynced++;
      }
    }
    
    // Update last sync timestamp
    await supabase
      .from("app_settings")
      .upsert({
        key: "hubspot_last_sync",
        value: newLastSync,
        description: "Last successful HubSpot form submissions sync timestamp",
        updated_at: newLastSync,
      });
    
    log("Sync completed", { totalSynced, totalSkipped, newLastSync });
    
    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        skipped: totalSkipped,
        lastSync: newLastSync,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log("Error during sync", { error: message });
    
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
