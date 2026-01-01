import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * AES-256-GCM decryption for CMS passwords
 * Uses Web Crypto API for secure decryption
 * This function is for internal use only (server-to-server)
 */

async function getDecryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get('CMS_ENCRYPTION_KEY');
  if (!keyHex) {
    throw new Error('CMS_ENCRYPTION_KEY not configured');
  }
  
  // Convert hex string to bytes
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  if (keyBytes.length !== 32) {
    throw new Error('CMS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
  
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function decrypt(encryptedValue: string): Promise<string> {
  // Check if value is encrypted (has prefix)
  if (!encryptedValue.startsWith('enc:')) {
    // Return as-is for backwards compatibility with unencrypted values
    console.log('[cms-decrypt] Value not encrypted, returning as-is');
    return encryptedValue;
  }
  
  const key = await getDecryptionKey();
  
  // Remove prefix and decode base64
  const base64Data = encryptedValue.slice(4);
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // This is an internal function - verify it's called from another edge function
    // or by an authenticated user with valid JWT
    const authHeader = req.headers.get('Authorization');
    const internalSecret = req.headers.get('x-internal-secret');
    
    // Allow internal calls with service key or cron secret
    const cronSecret = Deno.env.get('CRON_SECRET');
    const isInternalCall = internalSecret === cronSecret;
    
    if (!isInternalCall) {
      // Verify user auth for direct calls
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
    }

    const { encrypted } = await req.json();
    
    if (!encrypted || typeof encrypted !== 'string') {
      return new Response(JSON.stringify({ error: 'Encrypted value is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[cms-decrypt] Decrypting value');
    
    const decrypted = await decrypt(encrypted);
    
    return new Response(JSON.stringify({ decrypted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[cms-decrypt] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Decryption failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
