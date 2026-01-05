-- ===========================================
-- LOCAL AI VISIBILITY SCAN DATABASE SCHEMA
-- ===========================================

-- Create enum types
CREATE TYPE local_ai_model AS ENUM ('openai', 'gemini', 'perplexity');
CREATE TYPE local_scan_status AS ENUM ('created', 'running', 'completed', 'failed');

-- ===========================================
-- TABLE 1: local_ai_scans (main scan record)
-- ===========================================
CREATE TABLE public.local_ai_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_email TEXT,
  business_name TEXT NOT NULL,
  business_website TEXT,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  status local_scan_status NOT NULL DEFAULT 'created',
  raw_score NUMERIC NOT NULL DEFAULT 0,
  max_raw_score NUMERIC NOT NULL DEFAULT 54,
  normalized_score INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT 'Not Mentioned',
  top_competitors JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for local_ai_scans
CREATE INDEX idx_local_ai_scans_user_id ON public.local_ai_scans(user_id);
CREATE INDEX idx_local_ai_scans_status ON public.local_ai_scans(status);
CREATE INDEX idx_local_ai_scans_created_at ON public.local_ai_scans(created_at DESC);
CREATE INDEX idx_local_ai_scans_lead_email ON public.local_ai_scans(lead_email) WHERE lead_email IS NOT NULL;

-- ===========================================
-- TABLE 2: local_ai_scan_prompts
-- ===========================================
CREATE TABLE public.local_ai_scan_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.local_ai_scans(id) ON DELETE CASCADE,
  prompt_index INTEGER NOT NULL CHECK (prompt_index >= 1 AND prompt_index <= 6),
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scan_id, prompt_index)
);

-- Indexes for local_ai_scan_prompts
CREATE INDEX idx_local_ai_scan_prompts_scan_id ON public.local_ai_scan_prompts(scan_id);

-- ===========================================
-- TABLE 3: local_ai_scan_runs
-- ===========================================
CREATE TABLE public.local_ai_scan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.local_ai_scans(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.local_ai_scan_prompts(id) ON DELETE CASCADE,
  model local_ai_model NOT NULL,
  response_text TEXT,
  extracted_business_mentioned BOOLEAN NOT NULL DEFAULT false,
  extracted_recommended BOOLEAN NOT NULL DEFAULT false,
  extracted_position INTEGER,
  base_points NUMERIC NOT NULL DEFAULT 0,
  position_bonus NUMERIC NOT NULL DEFAULT 0,
  total_points NUMERIC NOT NULL DEFAULT 0,
  competitor_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prompt_id, model)
);

-- Indexes for local_ai_scan_runs
CREATE INDEX idx_local_ai_scan_runs_scan_id ON public.local_ai_scan_runs(scan_id);
CREATE INDEX idx_local_ai_scan_runs_prompt_id ON public.local_ai_scan_runs(prompt_id);

-- ===========================================
-- TABLE 4: local_ai_scan_competitors (aggregated)
-- ===========================================
CREATE TABLE public.local_ai_scan_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.local_ai_scans(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  mention_count INTEGER NOT NULL DEFAULT 0,
  recommended_count INTEGER NOT NULL DEFAULT 0,
  avg_position NUMERIC,
  UNIQUE(scan_id, competitor_name)
);

-- Indexes for local_ai_scan_competitors
CREATE INDEX idx_local_ai_scan_competitors_scan_id ON public.local_ai_scan_competitors(scan_id);

-- ===========================================
-- TRIGGER: Auto-update updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_local_ai_scans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_local_ai_scans_updated_at
  BEFORE UPDATE ON public.local_ai_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_local_ai_scans_updated_at();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.local_ai_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_ai_scan_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_ai_scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_ai_scan_competitors ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- POLICIES: local_ai_scans
-- ===========================================

-- Service role has full access
CREATE POLICY "local_ai_scans_service_all" ON public.local_ai_scans
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can view their own scans
CREATE POLICY "local_ai_scans_select_own" ON public.local_ai_scans
  FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Authenticated users can insert their own scans
CREATE POLICY "local_ai_scans_insert_own" ON public.local_ai_scans
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ===========================================
-- POLICIES: local_ai_scan_prompts
-- ===========================================

-- Service role has full access
CREATE POLICY "local_ai_scan_prompts_service_all" ON public.local_ai_scan_prompts
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can view prompts for their scans
CREATE POLICY "local_ai_scan_prompts_select_own" ON public.local_ai_scan_prompts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.local_ai_scans s
      WHERE s.id = local_ai_scan_prompts.scan_id
      AND s.user_id = auth.uid()
    )
  );

-- ===========================================
-- POLICIES: local_ai_scan_runs
-- ===========================================

-- Service role has full access
CREATE POLICY "local_ai_scan_runs_service_all" ON public.local_ai_scan_runs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can view runs for their scans
CREATE POLICY "local_ai_scan_runs_select_own" ON public.local_ai_scan_runs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.local_ai_scans s
      WHERE s.id = local_ai_scan_runs.scan_id
      AND s.user_id = auth.uid()
    )
  );

-- ===========================================
-- POLICIES: local_ai_scan_competitors
-- ===========================================

-- Service role has full access
CREATE POLICY "local_ai_scan_competitors_service_all" ON public.local_ai_scan_competitors
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can view competitors for their scans
CREATE POLICY "local_ai_scan_competitors_select_own" ON public.local_ai_scan_competitors
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.local_ai_scans s
      WHERE s.id = local_ai_scan_competitors.scan_id
      AND s.user_id = auth.uid()
    )
  );