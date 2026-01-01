import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  contentStudioItemId: string;
  cmsConnectionId: string;
  scheduledAt?: string; // ISO string for scheduling
  postStatus?: 'draft' | 'publish';
  postType?: 'post' | 'page';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: PublishRequest = await req.json();
    const { contentStudioItemId, cmsConnectionId, scheduledAt, postStatus = 'draft', postType = 'post' } = body;

    console.log('[wordpress-publish] Request:', { contentStudioItemId, cmsConnectionId, scheduledAt, postStatus });

    // Get user's org
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.org_id) {
      throw new Error('User organization not found');
    }

    const orgId = userData.org_id;

    // Get the CMS connection
    const { data: cmsConnection, error: cmsError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('id', cmsConnectionId)
      .eq('org_id', orgId)
      .single();

    if (cmsError || !cmsConnection) {
      throw new Error('CMS connection not found');
    }

    // Get the content studio item
    const { data: contentItem, error: contentError } = await supabase
      .from('content_studio_items')
      .select('*')
      .eq('id', contentStudioItemId)
      .eq('org_id', orgId)
      .single();

    if (contentError || !contentItem) {
      throw new Error('Content item not found');
    }

    // If scheduling for the future, create a scheduled publication record
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate > new Date()) {
        const { data: scheduled, error: scheduleError } = await supabase
          .from('scheduled_publications')
          .insert({
            org_id: orgId,
            content_studio_item_id: contentStudioItemId,
            cms_connection_id: cmsConnectionId,
            scheduled_at: scheduledAt,
            status: 'scheduled',
            post_type: postType,
            post_status: postStatus,
          })
          .select()
          .single();

        if (scheduleError) {
          throw new Error(`Failed to schedule publication: ${scheduleError.message}`);
        }

        console.log('[wordpress-publish] Scheduled for:', scheduledAt);
        return new Response(JSON.stringify({
          success: true,
          scheduled: true,
          scheduledAt,
          publicationId: scheduled.id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Publish immediately to WordPress
    const result = await publishToWordPress(cmsConnection, contentItem, postStatus, postType);

    // Update content item status to completed
    await supabase
      .from('content_studio_items')
      .update({ status: 'completed' })
      .eq('id', contentStudioItemId);

    // Update CMS connection last connected
    await supabase
      .from('cms_connections')
      .update({ last_connected_at: new Date().toISOString() })
      .eq('id', cmsConnectionId);

    console.log('[wordpress-publish] Published successfully:', result);

    return new Response(JSON.stringify({
      success: true,
      wordpressPostId: result.id,
      postUrl: result.link,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[wordpress-publish] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function decryptPassword(encryptedPassword: string): Promise<string> {
  // Check if value is encrypted (has prefix)
  if (!encryptedPassword.startsWith('enc:')) {
    // Return as-is for backwards compatibility with unencrypted values
    console.log('[wordpress-publish] Password not encrypted (legacy), using as-is');
    return encryptedPassword;
  }
  
  const keyHex = Deno.env.get('CMS_ENCRYPTION_KEY');
  if (!keyHex) {
    throw new Error('CMS_ENCRYPTION_KEY not configured');
  }
  
  // Convert hex string to bytes
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Remove prefix and decode base64
  const base64Data = encryptedPassword.slice(4);
  const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

async function publishToWordPress(
  connection: any,
  content: any,
  status: string,
  postType: string
): Promise<{ id: string; link: string }> {
  const { site_url, username, app_password_encrypted } = connection;
  
  // Decrypt the password
  const decryptedPassword = await decryptPassword(app_password_encrypted);
  console.log('[wordpress-publish] Password decrypted successfully');
  
  // Build HTML content from outline
  let htmlContent = '';
  
  // Add outline sections
  if (content.outline?.sections) {
    for (const section of content.outline.sections) {
      htmlContent += `<h2>${section.heading}</h2>\n`;
      if (section.points?.length > 0) {
        htmlContent += '<ul>\n';
        for (const point of section.points) {
          htmlContent += `<li>${point}</li>\n`;
        }
        htmlContent += '</ul>\n';
      }
    }
  }

  // Add FAQs
  if (content.faqs?.length > 0) {
    htmlContent += '<h2>Frequently Asked Questions</h2>\n';
    for (const faq of content.faqs) {
      htmlContent += `<h3>${faq.question}</h3>\n`;
      htmlContent += `<p>${faq.answer_notes}</p>\n`;
    }
  }

  // WordPress REST API endpoint
  const apiUrl = `${site_url.replace(/\/$/, '')}/wp-json/wp/v2/${postType}s`;
  
  const credentials = btoa(`${username}:${decryptedPassword}`);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      title: content.outline?.title || content.topic_key,
      content: htmlContent,
      status: status,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[wordpress-publish] WordPress API error:', errorText);
    throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return { id: result.id?.toString() || '', link: result.link || '' };
}
