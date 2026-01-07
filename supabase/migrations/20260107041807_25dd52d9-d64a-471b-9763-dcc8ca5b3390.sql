-- Add scoring columns to prompt_suggestions
ALTER TABLE public.prompt_suggestions
ADD COLUMN IF NOT EXISTS scoring_version integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS scored_at timestamptz;

-- Add index for efficient queries on scored prompts
CREATE INDEX IF NOT EXISTS idx_prompt_suggestions_scored_at ON public.prompt_suggestions(scored_at);

-- Add comment to document the scoring_version field
COMMENT ON COLUMN public.prompt_suggestions.scoring_version IS 'Version of the scoring algorithm used (for re-scoring support)';