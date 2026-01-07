-- Create prompt_suggestions table for caching intent-driven prompts
CREATE TABLE public.prompt_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  context_id UUID, -- references prompt_intelligence_context when available
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'building', 'error')),
  prompt_hash TEXT NOT NULL,
  generation_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  llm_model TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint for caching (using COALESCE for nullable brand_id)
CREATE UNIQUE INDEX idx_prompt_suggestions_cache 
ON public.prompt_suggestions(org_id, COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid), version, prompt_hash);

-- Create indexes for common queries
CREATE INDEX idx_prompt_suggestions_org_brand ON public.prompt_suggestions(org_id, brand_id);
CREATE INDEX idx_prompt_suggestions_status ON public.prompt_suggestions(status);
CREATE INDEX idx_prompt_suggestions_context ON public.prompt_suggestions(context_id) WHERE context_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.prompt_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own organization's data
CREATE POLICY "Users can view their organization prompt suggestions"
ON public.prompt_suggestions
FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert prompt suggestions for their organization"
ON public.prompt_suggestions
FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their organization prompt suggestions"
ON public.prompt_suggestions
FOR UPDATE
USING (
  org_id IN (
    SELECT org_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their organization prompt suggestions"
ON public.prompt_suggestions
FOR DELETE
USING (
  org_id IN (
    SELECT org_id FROM public.users WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_prompt_suggestions_updated_at
BEFORE UPDATE ON public.prompt_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.prompt_suggestions IS 'Caches intent-driven prompt suggestions generated from Prompt Intelligence Context';