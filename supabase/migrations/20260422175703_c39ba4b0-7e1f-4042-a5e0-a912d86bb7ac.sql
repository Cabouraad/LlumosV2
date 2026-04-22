-- Drop the old single-argument overload that conflicts with the new brand-scoped version
DROP FUNCTION IF EXISTS public.get_latest_prompt_provider_responses(uuid);