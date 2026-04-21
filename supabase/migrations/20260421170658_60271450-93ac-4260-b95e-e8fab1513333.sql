-- Allow 'claude' as a valid provider name
ALTER TABLE public.llm_providers DROP CONSTRAINT IF EXISTS llm_providers_name_check;
ALTER TABLE public.llm_providers ADD CONSTRAINT llm_providers_name_check
  CHECK (name = ANY (ARRAY['openai'::text, 'perplexity'::text, 'gemini'::text, 'google_ai_overview'::text, 'claude'::text]));

-- Insert claude provider
INSERT INTO public.llm_providers (name, enabled)
VALUES ('claude', true)
ON CONFLICT (name) DO UPDATE SET enabled = true;