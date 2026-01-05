-- Add caching columns to local_ai_scans
ALTER TABLE public.local_ai_scans
ADD COLUMN IF NOT EXISTS input_fingerprint text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS cache_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

-- Create index for efficient cache lookups
CREATE INDEX IF NOT EXISTS idx_local_ai_scans_fingerprint_cache 
ON public.local_ai_scans(input_fingerprint, cache_expires_at DESC)
WHERE input_fingerprint != '' AND status = 'completed';