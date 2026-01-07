-- Update check constraint to include 'local_geo' suggestion type
ALTER TABLE prompt_suggestions
DROP CONSTRAINT IF EXISTS prompt_suggestions_suggestion_type_check;

ALTER TABLE prompt_suggestions
ADD CONSTRAINT prompt_suggestions_suggestion_type_check
CHECK (suggestion_type IN ('core_intent', 'competitive', 'local_geo'));