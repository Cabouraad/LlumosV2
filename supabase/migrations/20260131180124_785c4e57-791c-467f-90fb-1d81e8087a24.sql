-- Create audits table
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  brand_name TEXT,
  business_type TEXT,
  overall_score INTEGER,
  module_scores JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create audit_pages table
CREATE TABLE public.audit_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status INTEGER,
  title TEXT,
  h1 TEXT,
  meta_description TEXT,
  canonical TEXT,
  has_schema BOOLEAN DEFAULT false,
  schema_types TEXT[],
  word_count INTEGER DEFAULT 0,
  image_count INTEGER DEFAULT 0,
  images_with_alt INTEGER DEFAULT 0,
  headings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit_checks table
CREATE TABLE public.audit_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'fail')),
  score INTEGER NOT NULL DEFAULT 0,
  evidence JSONB DEFAULT '{}',
  why TEXT,
  fix TEXT,
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
  effort TEXT CHECK (effort IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_audits_user_id ON public.audits(user_id);
CREATE INDEX idx_audits_domain ON public.audits(domain);
CREATE INDEX idx_audits_created_at ON public.audits(created_at DESC);
CREATE INDEX idx_audit_pages_audit_id ON public.audit_pages(audit_id);
CREATE INDEX idx_audit_checks_audit_id ON public.audit_checks(audit_id);
CREATE INDEX idx_audit_checks_module ON public.audit_checks(module);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audits (allow public reads for lead capture, auth users see their own)
CREATE POLICY "Anyone can view audits by id"
  ON public.audits FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create audits"
  ON public.audits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own audits"
  ON public.audits FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for audit_pages
CREATE POLICY "Anyone can view audit_pages"
  ON public.audit_pages FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert audit_pages"
  ON public.audit_pages FOR INSERT
  WITH CHECK (true);

-- RLS Policies for audit_checks
CREATE POLICY "Anyone can view audit_checks"
  ON public.audit_checks FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert audit_checks"
  ON public.audit_checks FOR INSERT
  WITH CHECK (true);