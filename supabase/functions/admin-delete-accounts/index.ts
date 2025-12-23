import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPER_ADMIN_EMAIL = 'abouraa.chri@gmail.com';
const PROTECTED_EMAILS = [
  'abouraa.chri@gmail.com',
  'emaediongeyo5@gmail.com',
  'eliza.templet@gmail.com',
  'amir@test.com',
  '409450051@qq.com'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Super admin verified, starting account deletion...');

    // Get all users except protected ones
    const { data: usersToDelete, error: fetchError } = await supabase
      .from('users')
      .select('id, email, org_id')
      .not('email', 'in', `(${PROTECTED_EMAILS.join(',')})`);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      throw new Error('Failed to fetch users');
    }

    console.log(`Found ${usersToDelete?.length || 0} users to delete`);

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const userRecord of usersToDelete || []) {
      try {
        console.log(`Deleting user: ${userRecord.email}`);

        // Get org_id for this user
        const orgId = userRecord.org_id;

        if (orgId) {
          // Delete org-related data
          await supabase.from('prompt_provider_responses').delete().eq('org_id', orgId);
          await supabase.from('prompts').delete().eq('org_id', orgId);
          await supabase.from('brand_catalog').delete().eq('org_id', orgId);
          await supabase.from('brand_candidates').delete().eq('org_id', orgId);
          await supabase.from('brands').delete().eq('org_id', orgId);
          await supabase.from('recommendations').delete().eq('org_id', orgId);
          await supabase.from('batch_jobs').delete().eq('org_id', orgId);
          await supabase.from('daily_usage').delete().eq('org_id', orgId);
          await supabase.from('ai_sources').delete().eq('org_id', orgId);
          await supabase.from('llumos_scores').delete().eq('org_id', orgId);
          await supabase.from('optimizations_v2').delete().eq('org_id', orgId);
          await supabase.from('content_studio_items').delete().eq('org_id', orgId);
          await supabase.from('cms_connections').delete().eq('org_id', orgId);
          await supabase.from('report_templates').delete().eq('org_id', orgId);
          await supabase.from('reports').delete().eq('org_id', orgId);
          await supabase.from('weekly_reports').delete().eq('org_id', orgId);
          await supabase.from('domain_invitations').delete().eq('org_id', orgId);
          await supabase.from('llms_generations').delete().eq('org_id', orgId);
          await supabase.from('suggested_prompts').delete().eq('org_id', orgId);
          await supabase.from('org_competitor_exclusions').delete().eq('org_id', orgId);
          await supabase.from('user_roles').delete().eq('org_id', orgId);
        }

        // Delete user roles for this user
        await supabase.from('user_roles').delete().eq('user_id', userRecord.id);

        // Delete from subscribers
        await supabase.from('subscribers').delete().eq('user_id', userRecord.id);

        // Delete from users table
        await supabase.from('users').delete().eq('id', userRecord.id);

        // Delete organization if user was in one
        if (orgId) {
          // Check if any other users belong to this org
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

          if (count === 0) {
            await supabase.from('organizations').delete().eq('id', orgId);
            console.log(`Deleted orphaned organization: ${orgId}`);
          }
        }

        // Delete from auth.users
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userRecord.id);
        if (authDeleteError) {
          console.error(`Error deleting auth user ${userRecord.email}:`, authDeleteError);
        }

        results.push({ email: userRecord.email, success: true });
        console.log(`Successfully deleted user: ${userRecord.email}`);
      } catch (err) {
        console.error(`Error deleting user ${userRecord.email}:`, err);
        results.push({ email: userRecord.email, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${successCount} accounts, ${failCount} failed`,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-delete-accounts:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
