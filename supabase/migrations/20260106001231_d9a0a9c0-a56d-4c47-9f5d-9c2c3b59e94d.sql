-- Local AI Authority Feature Tables
-- Step A: Create new tables for local AI authority scoring

-- 1) local_profiles - Business profile for local AI tracking
CREATE TABLE public.local_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  domain text,
  primary_location jsonb NOT NULL DEFAULT '{}',
  service_radius_miles int NOT NULL DEFAULT 15,
  neighborhoods text[],
  categories text[] NOT NULL DEFAULT '{}',
  brand_synonyms text[],
  competitor_overrides jsonb,
  gbp_url text,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) local_prompt_templates - Prompt templates for different layers
CREATE TABLE public.local_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.local_profiles(id) ON DELETE CASCADE,
  layer text NOT NULL CHECK (layer IN ('geo_cluster', 'implicit', 'radius_neighborhood', 'problem_intent')),
  prompt_text text NOT NULL,
  intent_tag text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) local_authority_runs - Scan run tracking (named differently to avoid conflict with existing local_ai_scan_runs)
CREATE TABLE public.local_authority_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.local_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'complete', 'failed')),
  models_used text[] NOT NULL DEFAULT '{}',
  started_at timestamptz,
  finished_at timestamptz,
  error_count int NOT NULL DEFAULT 0,
  quality_flags jsonb,
  cache_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) local_authority_results - Individual prompt results
CREATE TABLE public.local_authority_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.local_authority_runs(id) ON DELETE CASCADE,
  layer text NOT NULL,
  prompt_text text NOT NULL,
  model text NOT NULL,
  raw_response text,
  citations jsonb,
  extracted jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5) local_authority_scores - Aggregated scores per run
CREATE TABLE public.local_authority_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.local_authority_runs(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.local_profiles(id) ON DELETE CASCADE,
  score_total int NOT NULL DEFAULT 0 CHECK (score_total >= 0 AND score_total <= 100),
  score_geo int NOT NULL DEFAULT 0 CHECK (score_geo >= 0 AND score_geo <= 25),
  score_implicit int NOT NULL DEFAULT 0 CHECK (score_implicit >= 0 AND score_implicit <= 25),
  score_association int NOT NULL DEFAULT 0 CHECK (score_association >= 0 AND score_association <= 25),
  score_sov int NOT NULL DEFAULT 0 CHECK (score_sov >= 0 AND score_sov <= 25),
  breakdown jsonb NOT NULL DEFAULT '{}',
  recommendations jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_local_profiles_user_id ON public.local_profiles(user_id);
CREATE INDEX idx_local_profiles_org_id ON public.local_profiles(org_id);
CREATE INDEX idx_local_prompt_templates_profile_id ON public.local_prompt_templates(profile_id);
CREATE INDEX idx_local_authority_runs_profile_id ON public.local_authority_runs(profile_id);
CREATE INDEX idx_local_authority_runs_user_id ON public.local_authority_runs(user_id);
CREATE INDEX idx_local_authority_runs_status ON public.local_authority_runs(status);
CREATE INDEX idx_local_authority_results_run_id ON public.local_authority_results(run_id);
CREATE INDEX idx_local_authority_scores_run_id ON public.local_authority_scores(run_id);
CREATE INDEX idx_local_authority_scores_profile_id ON public.local_authority_scores(profile_id);

-- Enable RLS on all tables
ALTER TABLE public.local_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_authority_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_authority_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_authority_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for local_profiles
CREATE POLICY "Users can view their own local profiles"
  ON public.local_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own local profiles"
  ON public.local_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own local profiles"
  ON public.local_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own local profiles"
  ON public.local_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for local_prompt_templates (via profile ownership)
CREATE POLICY "Users can view templates for their profiles"
  ON public.local_prompt_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.local_profiles
    WHERE local_profiles.id = local_prompt_templates.profile_id
    AND local_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert templates for their profiles"
  ON public.local_prompt_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.local_profiles
    WHERE local_profiles.id = local_prompt_templates.profile_id
    AND local_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update templates for their profiles"
  ON public.local_prompt_templates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.local_profiles
    WHERE local_profiles.id = local_prompt_templates.profile_id
    AND local_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete templates for their profiles"
  ON public.local_prompt_templates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.local_profiles
    WHERE local_profiles.id = local_prompt_templates.profile_id
    AND local_profiles.user_id = auth.uid()
  ));

-- RLS Policies for local_authority_runs
CREATE POLICY "Users can view their own authority runs"
  ON public.local_authority_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own authority runs"
  ON public.local_authority_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own authority runs"
  ON public.local_authority_runs FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for local_authority_results (via run ownership)
CREATE POLICY "Users can view results for their runs"
  ON public.local_authority_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.local_authority_runs
    WHERE local_authority_runs.id = local_authority_results.run_id
    AND local_authority_runs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert results for their runs"
  ON public.local_authority_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.local_authority_runs
    WHERE local_authority_runs.id = local_authority_results.run_id
    AND local_authority_runs.user_id = auth.uid()
  ));

-- RLS Policies for local_authority_scores (via profile ownership)
CREATE POLICY "Users can view scores for their profiles"
  ON public.local_authority_scores FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.local_profiles
    WHERE local_profiles.id = local_authority_scores.profile_id
    AND local_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert scores for their profiles"
  ON public.local_authority_scores FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.local_profiles
    WHERE local_profiles.id = local_authority_scores.profile_id
    AND local_profiles.user_id = auth.uid()
  ));

-- Trigger for updated_at on local_profiles
CREATE TRIGGER update_local_profiles_updated_at
  BEFORE UPDATE ON public.local_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();