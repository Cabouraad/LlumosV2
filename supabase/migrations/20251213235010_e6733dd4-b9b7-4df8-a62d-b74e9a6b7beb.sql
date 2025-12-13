-- Add share_token columns to reports table for Phase 1 shareable reports feature
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster share token lookups
CREATE INDEX IF NOT EXISTS idx_reports_share_token ON public.reports(share_token) WHERE share_token IS NOT NULL;

-- Allow public access to reports with valid share token (for viewing shared reports)
CREATE POLICY "Allow public access to reports with valid share token"
ON public.reports
FOR SELECT
USING (
  share_token IS NOT NULL 
  AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
);

COMMENT ON COLUMN public.reports.share_token IS 'Unique token for public sharing of reports';
COMMENT ON COLUMN public.reports.share_token_expires_at IS 'Expiration timestamp for the share token';