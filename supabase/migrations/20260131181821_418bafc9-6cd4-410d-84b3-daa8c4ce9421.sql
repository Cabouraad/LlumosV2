-- Create audit_crawl_state table for resumable crawling
CREATE TABLE public.audit_crawl_state (
  audit_id uuid PRIMARY KEY REFERENCES public.audits(id) ON DELETE CASCADE,
  queue jsonb NOT NULL DEFAULT '[]'::jsonb,
  seen_hashes text[] NOT NULL DEFAULT '{}',
  crawled_count int NOT NULL DEFAULT 0,
  crawl_limit int NOT NULL DEFAULT 100,
  allow_subdomains boolean NOT NULL DEFAULT false,
  robots_rules jsonb,
  last_cursor timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_crawl_state ENABLE ROW LEVEL SECURITY;

-- Policy for public read by audit_id
CREATE POLICY "Anyone can read crawl state by audit_id"
  ON public.audit_crawl_state
  FOR SELECT
  USING (true);

-- Policy for service role insert/update (edge functions)
CREATE POLICY "Service role can manage crawl state"
  ON public.audit_crawl_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add crawl_limit column to audits table if it doesn't exist
ALTER TABLE public.audits 
  ADD COLUMN IF NOT EXISTS crawl_limit int DEFAULT 100;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_audit_crawl_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audit_crawl_state_updated_at
  BEFORE UPDATE ON public.audit_crawl_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audit_crawl_state_updated_at();