/**
 * Send Weekly Report Email
 * Sends automated weekly visibility report emails to subscribed users
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WEEKLY-REPORT-EMAIL] ${step}${detailsStr}`);
};

interface ReportSummary {
  orgName: string;
  weekKey: string;
  periodStart: string;
  periodEnd: string;
  avgScore: number;
  totalResponses: number;
  brandPresenceRate: number;
  topCompetitors: string[];
  scoreChange: number;
  pdfUrl?: string;
}

async function generateReportSummary(
  supabase: any, 
  orgId: string, 
  brandId: string | null,
  periodStart: string,
  periodEnd: string
): Promise<ReportSummary> {
  // Get org name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  // Get responses for this period
  const { data: responses } = await supabase
    .from('prompt_provider_responses')
    .select('score, org_brand_present, competitors_json')
    .eq('org_id', orgId)
    .eq('status', 'completed')
    .gte('run_at', `${periodStart}T00:00:00Z`)
    .lte('run_at', `${periodEnd}T23:59:59Z`);

  const totalResponses = responses?.length || 0;
  const avgScore = totalResponses > 0 
    ? responses.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / totalResponses 
    : 0;
  const brandPresent = responses?.filter((r: any) => r.org_brand_present).length || 0;
  const brandPresenceRate = totalResponses > 0 ? (brandPresent / totalResponses) * 100 : 0;

  // Get top competitors
  const competitorCounts: Record<string, number> = {};
  responses?.forEach((r: any) => {
    const comps = Array.isArray(r.competitors_json) ? r.competitors_json : [];
    comps.forEach((c: string) => {
      competitorCounts[c] = (competitorCounts[c] || 0) + 1;
    });
  });
  const topCompetitors = Object.entries(competitorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Get previous period for comparison
  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(periodEnd);
  prevEnd.setDate(prevEnd.getDate() - 7);
  
  const { data: prevResponses } = await supabase
    .from('prompt_provider_responses')
    .select('score')
    .eq('org_id', orgId)
    .eq('status', 'completed')
    .gte('run_at', prevStart.toISOString())
    .lte('run_at', prevEnd.toISOString());

  const prevAvg = prevResponses?.length > 0 
    ? prevResponses.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / prevResponses.length 
    : avgScore;
  const scoreChange = avgScore - prevAvg;

  // Get PDF URL if exists
  const weekKey = `${periodStart}-to-${periodEnd}`;
  const { data: report } = await supabase
    .from('reports')
    .select('storage_path, share_token')
    .eq('org_id', orgId)
    .eq('week_key', weekKey)
    .maybeSingle();

  let pdfUrl: string | undefined;
  if (report?.storage_path) {
    // Generate a short-lived signed URL
    const path = report.storage_path.replace('reports/', '');
    const { data: signedUrl } = await supabase.storage
      .from('reports')
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
    pdfUrl = signedUrl?.signedUrl;
  }

  return {
    orgName: org?.name || 'Your Organization',
    weekKey,
    periodStart,
    periodEnd,
    avgScore: Math.round(avgScore * 10) / 10,
    totalResponses,
    brandPresenceRate: Math.round(brandPresenceRate),
    topCompetitors,
    scoreChange: Math.round(scoreChange * 10) / 10,
    pdfUrl
  };
}

function generateEmailHtml(summary: ReportSummary): string {
  const scoreColor = summary.avgScore >= 6 ? '#22c55e' : summary.avgScore >= 4 ? '#f59e0b' : '#ef4444';
  const changeIcon = summary.scoreChange > 0 ? '↑' : summary.scoreChange < 0 ? '↓' : '→';
  const changeColor = summary.scoreChange > 0 ? '#22c55e' : summary.scoreChange < 0 ? '#ef4444' : '#6b7280';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Visibility Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Weekly Visibility Report</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${summary.periodStart} to ${summary.periodEnd}</p>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 24px 0; font-size: 18px; color: #1f2937;">Hi ${summary.orgName},</h2>
      
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
        Here's your AI visibility summary for the past week. Your brand was analyzed across multiple AI platforms.
      </p>
      
      <!-- Score Card -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 4px 0;">Visibility Score</p>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 48px; font-weight: 700; color: ${scoreColor};">${summary.avgScore}</span>
              <span style="font-size: 14px; color: ${changeColor};">${changeIcon} ${Math.abs(summary.scoreChange)}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Brand Presence</p>
            <span style="font-size: 24px; font-weight: 600; color: #1f2937;">${summary.brandPresenceRate}%</span>
          </div>
        </div>
      </div>
      
      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #3b82f6; font-size: 28px; font-weight: 700; margin: 0;">${summary.totalResponses}</p>
          <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0;">AI Responses Analyzed</p>
        </div>
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #d97706; font-size: 28px; font-weight: 700; margin: 0;">${summary.topCompetitors.length}</p>
          <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0;">Competitors Detected</p>
        </div>
      </div>
      
      ${summary.topCompetitors.length > 0 ? `
      <!-- Top Competitors -->
      <div style="margin-bottom: 24px;">
        <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">Top Competitors This Week</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${summary.topCompetitors.map(c => `
            <span style="background-color: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 16px; font-size: 13px;">${c}</span>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- CTA Button -->
      ${summary.pdfUrl ? `
      <a href="${summary.pdfUrl}" style="display: block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 16px 24px; border-radius: 8px; text-align: center; font-weight: 600; margin-bottom: 24px;">
        Download Full Report (PDF)
      </a>
      ` : ''}
      
      <a href="https://llumos.app/dashboard" style="display: block; background-color: #f3f4f6; color: #1f2937; text-decoration: none; padding: 16px 24px; border-radius: 8px; text-align: center; font-weight: 500;">
        View Dashboard →
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        You're receiving this because you subscribed to weekly reports.
        <a href="https://llumos.app/settings" style="color: #3b82f6;">Manage preferences</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 12px 0 0 0;">
        © ${new Date().getFullYear()} Llumos. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Weekly report email sender started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Check authentication
    const cronHeader = req.headers.get('x-cron-secret')?.trim();
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET')?.trim();
    
    const isScheduled = cronSecret && (cronHeader === cronSecret || authHeader?.includes(cronSecret));
    
    // Parse request body
    let singleOrgId: string | null = null;
    let singleUserId: string | null = null;
    try {
      const body = await req.json();
      singleOrgId = body?.orgId || null;
      singleUserId = body?.userId || null;
    } catch {
      // No body
    }

    // Calculate last week's date range
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysToSubtract = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    const lastSunday = new Date(now);
    lastSunday.setUTCDate(now.getUTCDate() - daysToSubtract);
    lastSunday.setUTCHours(23, 59, 59, 999);
    
    const lastMonday = new Date(lastSunday);
    lastMonday.setUTCDate(lastSunday.getUTCDate() - 6);
    lastMonday.setUTCHours(0, 0, 0, 0);
    
    const periodStart = lastMonday.toISOString().split('T')[0];
    const periodEnd = lastSunday.toISOString().split('T')[0];
    
    logStep('Processing week', { periodStart, periodEnd });

    // Get active email preferences
    let prefsQuery = supabase
      .from('report_email_preferences')
      .select('*')
      .eq('is_active', true)
      .eq('frequency', 'weekly');
    
    if (singleOrgId) {
      prefsQuery = prefsQuery.eq('org_id', singleOrgId);
    }
    if (singleUserId) {
      prefsQuery = prefsQuery.eq('user_id', singleUserId);
    }
    
    const { data: prefs, error: prefsError } = await prefsQuery;
    
    if (prefsError) {
      throw new Error(`Failed to fetch preferences: ${prefsError.message}`);
    }

    logStep('Found email preferences', { count: prefs?.length || 0 });

    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active email subscriptions', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const pref of prefs) {
      try {
        // Check if already sent this week
        if (pref.last_sent_at) {
          const lastSent = new Date(pref.last_sent_at);
          if (lastSent >= lastMonday) {
            logStep('Already sent this week, skipping', { email: pref.email });
            continue;
          }
        }

        logStep('Generating summary for', { orgId: pref.org_id, email: pref.email });

        // Generate report summary
        const summary = await generateReportSummary(
          supabase,
          pref.org_id,
          pref.brand_id,
          periodStart,
          periodEnd
        );

        // Only send if there's actual data
        if (summary.totalResponses === 0) {
          logStep('No data for this period, skipping', { orgId: pref.org_id });
          continue;
        }

        // Generate and send email
        const emailHtml = generateEmailHtml(summary);
        
        logStep('Sending email', { to: pref.email });

        const { error: sendError } = await resend.emails.send({
          from: 'Llumos <reports@llumos.app>',
          to: [pref.email],
          subject: `📊 Your Weekly AI Visibility Report - ${summary.orgName}`,
          html: emailHtml,
        });

        if (sendError) {
          throw sendError;
        }

        // Update last_sent_at
        await supabase
          .from('report_email_preferences')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', pref.id);

        sentCount++;
        logStep('Email sent successfully', { to: pref.email });

      } catch (emailError: any) {
        logStep('Failed to send email', { email: pref.email, error: emailError.message });
        errorCount++;
        errors.push({ email: pref.email, error: emailError.message });
      }
    }

    logStep('Email sending completed', { sent: sentCount, errors: errorCount });

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
        periodStart,
        periodEnd
      }),
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
