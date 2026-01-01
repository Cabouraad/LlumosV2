import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * AES-256-GCM encryption for CMS passwords
 * Uses Web Crypto API for secure encryption
 */

async function getEncryptionKey(): Promise<CryptoKey> {
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
    ['encrypt']
  );
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encode plaintext to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return base64 encoded string with prefix to identify encrypted values
  return 'enc:' + btoa(String.fromCharCode(...combined));
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

    const { password } = await req.json();
    
    if (!password || typeof password !== 'string') {
      return new Response(JSON.stringify({ error: 'Password is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[cms-encrypt] Encrypting password for user:', user.id);
    
    const encrypted = await encrypt(password);
    
    return new Response(JSON.stringify({ encrypted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[cms-encrypt] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Encryption failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
