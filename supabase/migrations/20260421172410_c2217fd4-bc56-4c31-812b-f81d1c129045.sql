-- 1) Reports table
CREATE TABLE IF NOT EXISTS public.visibility_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NULL,
  domain TEXT NOT NULL,
  brand_name TEXT NULL,
  recipient_email TEXT NOT NULL,
  recipient_first_name TEXT NULL,
  overall_score INTEGER NOT NULL DEFAULT 0,
  prompts_run INTEGER NOT NULL DEFAULT 0,
  providers_queried INTEGER NOT NULL DEFAULT 0,
  pdf_url TEXT NULL,
  pdf_storage_path TEXT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'lead_magnet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visibility_reports_domain ON public.visibility_reports (lower(domain));
CREATE INDEX IF NOT EXISTS idx_visibility_reports_org_id ON public.visibility_reports (org_id);
CREATE INDEX IF NOT EXISTS idx_visibility_reports_created_at ON public.visibility_reports (created_at DESC);

ALTER TABLE public.visibility_reports ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role manages visibility reports"
  ON public.visibility_reports
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Org members can view reports for their org OR for any domain matching one of their org's brand domains
CREATE POLICY "Org members can view their visibility reports"
  ON public.visibility_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.org_id = visibility_reports.org_id
          OR EXISTS (
            SELECT 1 FROM public.brands b
            WHERE b.org_id = u.org_id
              AND lower(b.domain) = lower(visibility_reports.domain)
          )
        )
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_visibility_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visibility_reports_updated_at ON public.visibility_reports;
CREATE TRIGGER trg_visibility_reports_updated_at
BEFORE UPDATE ON public.visibility_reports
FOR EACH ROW EXECUTE FUNCTION public.set_visibility_reports_updated_at();

-- 2) Storage bucket for PDFs (public so the link in email + UI works)
INSERT INTO storage.buckets (id, name, public)
VALUES ('visibility-reports', 'visibility-reports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read of bucket
CREATE POLICY "Public can read visibility report PDFs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'visibility-reports');

-- Service role can manage
CREATE POLICY "Service role manages visibility report PDFs"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'visibility-reports' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'visibility-reports' AND auth.role() = 'service_role');