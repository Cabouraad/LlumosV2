/**
 * Report Sharing Edge Function
 * Generates and validates public share links for reports
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REPORTS-SHARE] ${step}${detailsStr}`);
};

// Generate a secure random token
function generateShareToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Handle GET request for public report viewing
    if (req.method === 'GET') {
      const shareToken = url.searchParams.get('token');
      
      if (!shareToken) {
        return new Response(
          JSON.stringify({ error: 'Share token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logStep('Validating share token', { tokenPrefix: shareToken.substring(0, 8) });

      // Look up report by share token
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('id, org_id, week_key, period_start, period_end, storage_path, share_token_expires_at')
        .eq('share_token', shareToken)
        .single();

      if (reportError || !report) {
        logStep('Invalid share token', { error: reportError?.message });
        return new Response(
          JSON.stringify({ error: 'Invalid or expired share link' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token has expired
      if (report.share_token_expires_at) {
        const expiresAt = new Date(report.share_token_expires_at);
        if (expiresAt < new Date()) {
          logStep('Share token expired', { expiresAt: report.share_token_expires_at });
          return new Response(
            JSON.stringify({ error: 'Share link has expired' }),
            { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Get organization name for display
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', report.org_id)
        .single();

      // Generate a signed URL for the PDF (valid for 1 hour)
      const storagePath = report.storage_path.replace('reports/', '');
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('reports')
        .createSignedUrl(storagePath, 3600);

      if (signedUrlError) {
        logStep('Failed to generate signed URL', { error: signedUrlError.message });
        return new Response(
          JSON.stringify({ error: 'Failed to access report file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logStep('Share token validated successfully', { reportId: report.id });

      return new Response(
        JSON.stringify({
          success: true,
          report: {
            id: report.id,
            orgName: org?.name || 'Organization',
            weekKey: report.week_key,
            periodStart: report.period_start,
            periodEnd: report.period_end,
            downloadUrl: signedUrlData.signedUrl,
            expiresAt: report.share_token_expires_at
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request to create/revoke share link (requires authentication)
    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.slice(7);
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { reportId, action, expiresInDays = 7 } = body;

      if (!reportId) {
        return new Response(
          JSON.stringify({ error: 'Report ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has access to this report
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('id, org_id, share_token')
        .eq('id', reportId)
        .single();

      if (reportError || !report) {
        return new Response(
          JSON.stringify({ error: 'Report not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (report.org_id !== userData?.org_id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'revoke') {
        logStep('Revoking share token', { reportId });
        
        const { error: updateError } = await supabase
          .from('reports')
          .update({ 
            share_token: null, 
            share_token_expires_at: null 
          })
          .eq('id', reportId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to revoke share link' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Share link revoked' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new share token
      const shareToken = generateShareToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      logStep('Generating share token', { reportId, expiresInDays });

      const { error: updateError } = await supabase
        .from('reports')
        .update({ 
          share_token: shareToken, 
          share_token_expires_at: expiresAt.toISOString() 
        })
        .eq('id', reportId);

      if (updateError) {
        logStep('Failed to save share token', { error: updateError.message });
        return new Response(
          JSON.stringify({ error: 'Failed to create share link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const shareUrl = `${Deno.env.get('SITE_URL') || 'https://llumos.app'}/reports/shared/${shareToken}`;

      logStep('Share token created', { reportId, expiresAt: expiresAt.toISOString() });

      return new Response(
        JSON.stringify({
          success: true,
          shareUrl,
          shareToken,
          expiresAt: expiresAt.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    logStep('Error', { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
