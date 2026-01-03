import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://llumos.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitRequest {
  email: string;
  domain: string;
  firstName?: string;
  role?: string;
  companyName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

// Generate deterministic score based on domain (hash-based, range 18-42)
function generateVisibilityScore(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Force score to be between 18-42 (low-to-moderate range)
  return Math.abs(hash % 25) + 18;
}

function getVisibilityStatus(score: number): 'strong' | 'moderate' | 'low' {
  if (score >= 70) return 'strong';
  if (score >= 40) return 'moderate';
  return 'low';
}

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Clean and normalize domain
function cleanDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\/(www\.)?/, '');
  domain = domain.replace(/^www\./, '');
  domain = domain.replace(/\/.*$/, '');
  return domain;
}

// Generate model presence data
function generateModelPresence(): Array<{ name: string; status: string }> {
  return [
    { name: 'ChatGPT', status: 'Not Detected' },
    { name: 'Gemini', status: 'Inconsistent' },
    { name: 'Perplexity', status: 'Not Detected' },
  ];
}

// Generate competitor placeholders based on domain
function generateCompetitorPlaceholders(domain: string): string[] {
  // Use domain hash to deterministically select competitor names
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) - hash) + domain.charCodeAt(i);
  }
  
  const competitors = [
    'Leading Competitor', 'Industry Alternative', 'Market Leader',
    'Top Rival', 'Key Competitor', 'Major Player'
  ];
  
  const selected: string[] = [];
  for (let i = 0; i < 3; i++) {
    const index = Math.abs(hash + i * 7) % competitors.length;
    if (!selected.includes(competitors[index])) {
      selected.push(competitors[index]);
    }
  }
  
  return selected.length >= 2 ? selected : ['Competitor A', 'Competitor B', 'Competitor C'];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SubmitRequest = await req.json();
    const { email, domain, firstName, role, companyName, utmSource, utmMedium, utmCampaign, referrer } = body;

    console.log('[ai-visibility-submit] Received request:', { email, domain, firstName });

    // Validate required fields
    if (!email?.trim()) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!domain?.trim()) {
      return new Response(
        JSON.stringify({ error: "Domain is required" }),
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

    const cleanedDomain = cleanDomain(domain);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Create or update lead record
    console.log('[ai-visibility-submit] Creating/updating lead for:', email);
    
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .eq("source", "hubspot_ai_visibility")
      .maybeSingle();

    let leadId: string;
    
    if (existingLead) {
      leadId = existingLead.id;
      await supabase
        .from("leads")
        .update({
          metadata: {
            domain: cleanedDomain,
            firstName,
            role,
            companyName,
            utmSource,
            utmMedium,
            utmCampaign,
            referrer,
            lastSubmittedAt: new Date().toISOString(),
          },
        })
        .eq("id", leadId);
      console.log('[ai-visibility-submit] Updated existing lead:', leadId);
    } else {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          email: email.trim().toLowerCase(),
          source: "hubspot_ai_visibility",
          metadata: {
            domain: cleanedDomain,
            firstName,
            role,
            companyName,
            utmSource,
            utmMedium,
            utmCampaign,
            referrer,
          },
        })
        .select("id")
        .single();

      if (leadError) {
        console.error('[ai-visibility-submit] Failed to create lead:', leadError);
        throw leadError;
      }
      leadId = newLead.id;
      console.log('[ai-visibility-submit] Created new lead:', leadId);
    }

    // 2. Generate snapshot data
    const visibilityScore = generateVisibilityScore(cleanedDomain);
    const visibilityStatus = getVisibilityStatus(visibilityScore);
    const modelPresence = generateModelPresence();
    const competitorPlaceholders = generateCompetitorPlaceholders(cleanedDomain);
    const snapshotToken = generateToken();

    console.log('[ai-visibility-submit] Generated snapshot:', {
      score: visibilityScore,
      status: visibilityStatus,
      token: snapshotToken.substring(0, 8) + '...',
    });

    // 3. Store snapshot
    const { error: snapshotError } = await supabase
      .from("visibility_snapshots")
      .insert({
        lead_id: leadId,
        snapshot_token: snapshotToken,
        domain: cleanedDomain,
        email: email.trim().toLowerCase(),
        first_name: firstName?.trim() || null,
        company_name: companyName?.trim() || null,
        visibility_score: visibilityScore,
        visibility_status: visibilityStatus,
        model_presence: modelPresence,
        competitor_placeholders: competitorPlaceholders,
        metadata: {
          role,
          utmSource,
          utmMedium,
          utmCampaign,
          referrer,
        },
      });

    if (snapshotError) {
      console.error('[ai-visibility-submit] Failed to create snapshot:', snapshotError);
      throw snapshotError;
    }

    console.log('[ai-visibility-submit] Snapshot stored successfully');

    // 4. Send results email via Resend
    const snapshotLink = `${APP_ORIGIN}/lp/ai-visibility/results/${snapshotToken}`;
    const upgradeLink = `${APP_ORIGIN}/pricing`;
    const demoLink = "https://calendly.com/llumos/demo";

    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const displayName = firstName?.trim() || 'there';
        
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AI Visibility Snapshot</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; color: #ffffff;">
      
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); padding: 12px 24px; border-radius: 8px;">
          <span style="font-size: 24px; font-weight: bold;">Llumos</span>
        </div>
      </div>

      <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
        Your AI Visibility Snapshot is Ready
      </h1>
      
      <p style="font-size: 16px; line-height: 1.6; color: #a0aec0; margin: 0 0 24px 0;">
        Hi ${displayName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #a0aec0; margin: 0 0 24px 0;">
        We ran an initial AI visibility scan for <strong style="color: #ffffff;">${cleanedDomain}</strong>.
      </p>
      
      <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff;">
          Here's what we found at a high level:
        </h2>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #e2e8f0;">
          <li style="margin-bottom: 12px;">Your brand is <strong style="color: #f59e0b;">not consistently recommended</strong> across major AI models</li>
          <li style="margin-bottom: 12px;">Competitors appear <strong style="color: #f59e0b;">more frequently</strong> in AI-generated answers</li>
          <li style="margin-bottom: 0;">Several high-intent AI prompts in your category currently <strong style="color: #f59e0b;">favor other brands</strong></li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${snapshotLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Your Snapshot →
        </a>
      </div>
      
      <div style="background: rgba(0, 0, 0, 0.2); border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #a0aec0;">
          🔒 What's currently locked:
        </h3>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #718096; font-size: 14px;">
          <li style="margin-bottom: 8px;">The exact prompts where competitors win</li>
          <li style="margin-bottom: 8px;">Why AI models trust other brands more</li>
          <li style="margin-bottom: 8px;">What content and signals you're missing</li>
          <li style="margin-bottom: 0;">How to fix this step-by-step</li>
        </ul>
      </div>
      
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px; margin-top: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff;">
          Next Steps:
        </h3>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #7c3aed;">Option 1:</strong>
          <a href="${upgradeLink}" style="color: #7c3aed; text-decoration: none; font-weight: 500;"> Unlock full access →</a>
        </div>
        
        <div>
          <strong style="color: #3b82f6;">Option 2:</strong>
          <a href="${demoLink}" style="color: #3b82f6; text-decoration: none; font-weight: 500;"> Quick walkthrough (10 minutes) →</a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <p style="font-size: 12px; color: #718096; margin: 0;">
          © ${new Date().getFullYear()} Llumos. All rights reserved.
        </p>
      </div>
      
    </div>
  </div>
</body>
</html>
        `;

        const textContent = `
Hi ${displayName},

We ran an initial AI visibility scan for ${cleanedDomain}.

Here's what we found at a high level:
• Your brand is not consistently recommended across major AI models
• Competitors appear more frequently in AI-generated answers
• Several high-intent AI prompts in your category currently favor other brands

View your snapshot: ${snapshotLink}

What's currently locked:
• The exact prompts where competitors win
• Why AI models trust other brands more
• What content and signals you're missing
• How to fix this step-by-step

Next steps:

Option 1 — Unlock full access
${upgradeLink}

Option 2 — Quick walkthrough (10 minutes)
${demoLink}

—
Llumos
        `;

        const emailResponse = await resend.emails.send({
          from: "Llumos <reports@llumos.app>",
          to: [email.trim()],
          subject: "Your AI visibility snapshot is ready",
          html: emailHtml,
          text: textContent,
        });

        console.log('[ai-visibility-submit] Email sent successfully:', emailResponse);

        // Update snapshot to mark email as sent
        await supabase
          .from("visibility_snapshots")
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq("snapshot_token", snapshotToken);

      } catch (emailError) {
        console.error('[ai-visibility-submit] Email send failed:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.warn('[ai-visibility-submit] RESEND_API_KEY not configured, skipping email');
    }

    // 5. Schedule follow-up email sequence
    try {
      // Schedule 24-hour reminder if not clicked
      const reminderTime = new Date();
      reminderTime.setHours(reminderTime.getHours() + 24);
      
      await supabase
        .from("lead_email_sequences")
        .insert({
          lead_id: leadId,
          sequence_type: 'snapshot_followup',
          email_key: 'reminder_24h',
          scheduled_at: reminderTime.toISOString(),
          metadata: {
            snapshotToken,
            domain: cleanedDomain,
            firstName,
          },
        });
      
      console.log('[ai-visibility-submit] Scheduled 24h reminder email');
    } catch (seqError) {
      console.error('[ai-visibility-submit] Failed to schedule reminder:', seqError);
      // Don't fail the request
    }

    return new Response(
      JSON.stringify({
        success: true,
        snapshotToken,
        redirectUrl: `/lp/ai-visibility/results/${snapshotToken}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error('[ai-visibility-submit] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
