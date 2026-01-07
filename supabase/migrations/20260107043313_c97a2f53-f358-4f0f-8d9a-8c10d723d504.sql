-- Add optimization guidance columns to prompt_suggestions
ALTER TABLE public.prompt_suggestions 
ADD COLUMN IF NOT EXISTS guidance_version integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS guidance_generated_at timestamptz;

-- Add index for guidance generation tracking
CREATE INDEX IF NOT EXISTS idx_prompt_suggestions_guidance_generated_at 
ON public.prompt_suggestions(guidance_generated_at);

-- Add comment for documentation
COMMENT ON COLUMN public.prompt_suggestions.guidance_version IS 'Version of optimization guidance logic used';