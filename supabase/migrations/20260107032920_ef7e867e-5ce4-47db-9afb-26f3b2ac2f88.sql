-- Create prompt_variants table for storing LLM-specific phrasing variants
CREATE TABLE public.prompt_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  base_prompt_id UUID NOT NULL,
  model TEXT NOT NULL CHECK (model IN ('chatgpt', 'gemini', 'perplexity')),
  variant_text TEXT NOT NULL,
  variant_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_base_prompt_model UNIQUE (base_prompt_id, model)
);

-- Create indexes
CREATE INDEX idx_prompt_variants_org_id ON public.prompt_variants(org_id);
CREATE INDEX idx_prompt_variants_base_prompt_id ON public.prompt_variants(base_prompt_id);
CREATE INDEX idx_prompt_variants_variant_hash ON public.prompt_variants(variant_hash);

-- Enable RLS
ALTER TABLE public.prompt_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view prompt variants for their org"
  ON public.prompt_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.org_id = prompt_variants.org_id
    )
  );

CREATE POLICY "Users can insert prompt variants for their org"
  ON public.prompt_variants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.org_id = prompt_variants.org_id
    )
  );