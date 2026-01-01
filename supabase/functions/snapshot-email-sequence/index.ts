/**
 * Snapshot Email Sequence
 * Handles sending the 5-email follow-up sequence for AI Visibility Snapshot leads
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SNAPSHOT-EMAIL-SEQUENCE] ${step}${detailsStr}`);
};

// Email templates
const EMAIL_TEMPLATES = {
  confirmation: {
    subject: 'Your AI Visibility Snapshot is in progress',
    delayHours: 0, // Immediate
  },
  results_ready: {
    subject: 'Your AI Visibility Snapshot is ready',
    delayHours: 1, // Simulate processing time
  },
  interpret_results: {
    subject: 'How to interpret your AI visibility results',
    delayHours: 25, // 1 day after results
  },
  ongoing_tracking: {
    subject: "AI visibility isn't static — here's why",
    delayHours: 97, // 3 days after results
  },
  final_nudge: {
    subject: 'Turn AI visibility insights into action',
    delayHours: 169, // ~7 days after results
  },
};

interface Lead {
  id: string;
  email: string;
  metadata: {
    company?: string;
    isQualified?: boolean;
    landingPage?: string;
  };
}

interface EmailSequenceRow {
  id: string;
  lead_id: string;
  email_key: string;
  scheduled_at: string;
  status: string;
}

function getFirstName(email: string): string {
  const localPart = email.split('@')[0];
  // Try to extract a name from the email
  const namePart = localPart.split(/[._+-]/)[0];
  return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
}

function generateEmailHtml(emailKey: string, firstName: string, company: string): string {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #1f2937;
  `;
  
  const buttonStyle = `
    display: inline-block;
    background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
    color: white;
    text-decoration: none;
    padding: 14px 28px;
    border-radius: 8px;
    font-weight: 600;
    margin: 24px 0;
  `;

  const linkStyle = `color: #8b5cf6; text-decoration: none;`;

  const footer = `
    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">— The Llumos Team</p>
    </div>
  `;

  const wrapper = (content: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="${baseStyles}">
            ${content}
            ${footer}
          </div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} Llumos. All rights reserved.<br>
            <a href="https://llumos.app" style="${linkStyle}">llumos.app</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const templates: Record<string, string> = {
    confirmation: wrapper(`
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Hi ${firstName},</h2>
      
      <p>Thanks for requesting your AI Visibility Snapshot.</p>
      
      <p>We're currently analyzing how AI search engines like ChatGPT, Gemini, and Perplexity respond to real prompts in your category.</p>
      
      <p style="margin-bottom: 8px;"><strong>This includes:</strong></p>
      <ul style="margin: 0; padding-left: 24px;">
        <li>Where your brand appears (and where it doesn't)</li>
        <li>Which competitors AI prefers — and why</li>
        <li>The prompts, citations, and sources influencing AI answers</li>
      </ul>
      
      <p style="margin-top: 24px;">You'll be notified as soon as your snapshot is ready.</p>
      
      <p style="color: #6b7280; font-style: italic;">
        No demo. No sales call.<br>
        Just clear insights you can act on.
      </p>
    `),

    results_ready: wrapper(`
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Hi ${firstName},</h2>
      
      <p><strong>Your AI Visibility Snapshot is ready to view.</strong></p>
      
      <p style="margin-bottom: 8px;">Inside, you'll see:</p>
      <ul style="margin: 0; padding-left: 24px;">
        <li>How visible your brand is across AI platforms</li>
        <li>Which competitors AI recommends most often</li>
        <li>The prompts and citations shaping AI answers</li>
        <li>Clear opportunities to improve visibility</li>
      </ul>
      
      <a href="https://llumos.app/dashboard" style="${buttonStyle}">
        👉 View Your AI Visibility Snapshot
      </a>
      
      <p>This snapshot is designed to give you clarity — not overwhelm.</p>
      
      <p style="color: #6b7280;">If you have questions as you review it, everything is explained directly in the dashboard.</p>
    `),

    interpret_results: wrapper(`
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Hi ${firstName},</h2>
      
      <p>AI visibility can feel abstract — so here's how to think about your snapshot.</p>
      
      <p style="margin-bottom: 8px;"><strong>When AI recommends brands, it's responding to:</strong></p>
      <ul style="margin: 0; padding-left: 24px;">
        <li>Specific prompts users ask</li>
        <li>Sources it trusts and cites</li>
        <li>Content coverage across the web</li>
      </ul>
      
      <p style="margin-bottom: 8px;"><strong>Your snapshot highlights:</strong></p>
      <ul style="margin: 0; padding-left: 24px;">
        <li>Where you're already visible</li>
        <li>Where competitors have an advantage</li>
        <li>Which gaps matter most</li>
      </ul>
      
      <p style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <strong>💡 Tip:</strong> Focus first on the highest-impact opportunities — not everything at once.
      </p>
      
      <a href="https://llumos.app/dashboard" style="${buttonStyle}">
        👉 Review Your Snapshot
      </a>
    `),

    ongoing_tracking: wrapper(`
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Hi ${firstName},</h2>
      
      <p><strong>AI search results change as:</strong></p>
      <ul style="margin: 0 0 16px 0; padding-left: 24px;">
        <li>New content is published</li>
        <li>Sources gain or lose authority</li>
        <li>Competitors adjust their strategy</li>
      </ul>
      
      <p>That's why many teams move from a one-time snapshot to ongoing AI visibility tracking.</p>
      
      <p style="margin-bottom: 8px;"><strong>With ongoing tracking, you can:</strong></p>
      <ul style="margin: 0; padding-left: 24px;">
        <li>Monitor visibility changes over time</li>
        <li>Validate whether updates improve AI recommendations</li>
        <li>Stay ahead of competitors in AI search</li>
      </ul>
      
      <p style="color: #6b7280; margin-top: 24px;">If that's useful, you can explore Llumos further — but start with your snapshot first.</p>
      
      <a href="https://llumos.app/pricing" style="${buttonStyle}">
        👉 Learn How Ongoing Tracking Works
      </a>
    `),

    final_nudge: wrapper(`
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Hi ${firstName},</h2>
      
      <p>Most teams never see how AI search actually treats their brand.</p>
      
      <p><strong>You now have that clarity.</strong></p>
      
      <p>If AI visibility matters to your growth, the next step is making it measurable and improvable over time.</p>
      
      <p style="color: #6b7280;">Whenever you're ready, Llumos is built to support that — without demos or sales pressure.</p>
      
      <a href="https://llumos.app/signup" style="${buttonStyle}">
        👉 Continue with Llumos
      </a>
    `),
  };

  return templates[emailKey] || templates.confirmation;
}

// Schedule all emails for a new lead
async function scheduleEmailSequence(supabase: any, lead: Lead): Promise<void> {
  const now = new Date();
  const emailKeys = Object.keys(EMAIL_TEMPLATES) as Array<keyof typeof EMAIL_TEMPLATES>;
  
  const sequenceRows = emailKeys.map((key) => {
    const template = EMAIL_TEMPLATES[key];
    const scheduledAt = new Date(now.getTime() + template.delayHours * 60 * 60 * 1000);
    
    return {
      lead_id: lead.id,
      sequence_type: 'snapshot_followup',
      email_key: key,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
      metadata: {
        company: lead.metadata?.company || '',
        email: lead.email,
      },
    };
  });

  const { error } = await supabase
    .from('lead_email_sequences')
    .upsert(sequenceRows, { onConflict: 'lead_id,email_key' });

  if (error) {
    logStep('Error scheduling email sequence', { error: error.message, leadId: lead.id });
    throw error;
  }

  logStep('Scheduled email sequence', { leadId: lead.id, emailCount: sequenceRows.length });
}

// Process pending emails that are due
async function processPendingEmails(supabase: any, resend: any): Promise<{ sent: number; errors: number }> {
  const now = new Date().toISOString();
  
  // Get pending emails that are due
  const { data: pendingEmails, error: fetchError } = await supabase
    .from('lead_email_sequences')
    .select(`
      id,
      lead_id,
      email_key,
      scheduled_at,
      metadata,
      leads!inner (
        id,
        email,
        metadata
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(50);

  if (fetchError) {
    logStep('Error fetching pending emails', { error: fetchError.message });
    throw fetchError;
  }

  if (!pendingEmails || pendingEmails.length === 0) {
    logStep('No pending emails to process');
    return { sent: 0, errors: 0 };
  }

  logStep('Processing pending emails', { count: pendingEmails.length });

  let sent = 0;
  let errors = 0;

  for (const emailRecord of pendingEmails) {
    try {
      const lead = emailRecord.leads;
      const firstName = getFirstName(lead.email);
      const company = lead.metadata?.company || 'your company';
      
      const html = generateEmailHtml(emailRecord.email_key, firstName, company);
      const template = EMAIL_TEMPLATES[emailRecord.email_key as keyof typeof EMAIL_TEMPLATES];
      
      logStep('Sending email', { 
        to: lead.email, 
        emailKey: emailRecord.email_key,
        subject: template.subject 
      });

      const { error: sendError } = await resend.emails.send({
        from: 'Llumos <hello@llumos.app>',
        to: [lead.email],
        subject: template.subject,
        html,
      });

      if (sendError) {
        throw sendError;
      }

      // Mark as sent
      await supabase
        .from('lead_email_sequences')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', emailRecord.id);

      sent++;
      logStep('Email sent successfully', { to: lead.email, emailKey: emailRecord.email_key });

    } catch (error: any) {
      logStep('Failed to send email', { 
        emailId: emailRecord.id, 
        error: error.message 
      });

      // Mark as failed
      await supabase
        .from('lead_email_sequences')
        .update({ 
          status: 'failed', 
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', emailRecord.id);

      errors++;
    }
  }

  return { sent, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Snapshot email sequence started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Parse request
    let action = 'process'; // Default action: process pending emails
    let leadId: string | null = null;
    
    try {
      const body = await req.json();
      action = body?.action || 'process';
      leadId = body?.leadId || null;
    } catch {
      // No body or invalid JSON, use defaults
    }

    let result: any = {};

    if (action === 'schedule' && leadId) {
      // Schedule emails for a specific lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      await scheduleEmailSequence(supabase, lead);
      result = { success: true, action: 'scheduled', leadId };

    } else if (action === 'schedule_new') {
      // Find leads without scheduled emails and schedule them
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('source', 'ai-recommends-landing')
        .order('created_at', { ascending: false })
        .limit(100);

      if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`);
      }

      let scheduled = 0;
      for (const lead of leads || []) {
        // Check if already has sequence
        const { data: existing } = await supabase
          .from('lead_email_sequences')
          .select('id')
          .eq('lead_id', lead.id)
          .limit(1);

        if (!existing || existing.length === 0) {
          await scheduleEmailSequence(supabase, lead);
          scheduled++;
        }
      }

      result = { success: true, action: 'schedule_new', scheduled };

    } else {
      // Process pending emails (default action)
      const processResult = await processPendingEmails(supabase, resend);
      result = { success: true, action: 'process', ...processResult };
    }

    logStep('Operation completed', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep('Error', { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
