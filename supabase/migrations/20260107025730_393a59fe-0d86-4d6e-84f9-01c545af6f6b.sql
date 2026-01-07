-- Add suggestion_type column to prompt_suggestions table
ALTER TABLE public.prompt_suggestions 
ADD COLUMN IF NOT EXISTS suggestion_type text NOT NULL DEFAULT 'core_intent';

-- Add check constraint for allowed values
ALTER TABLE public.prompt_suggestions
ADD CONSTRAINT prompt_suggestions_suggestion_type_check 
CHECK (suggestion_type IN ('core_intent', 'competitive'));

-- Drop old unique constraint if exists and create new one including suggestion_type
-- First, find and drop any existing unique constraints on these columns
DROP INDEX IF EXISTS prompt_suggestions_unique_hash;
DROP INDEX IF EXISTS prompt_suggestions_org_suggestion_type_hash_idx;

-- Create new unique index including suggestion_type
CREATE UNIQUE INDEX prompt_suggestions_org_suggestion_type_hash_idx 
ON public.prompt_suggestions (org_id, suggestion_type, prompt_hash);