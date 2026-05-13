CREATE INDEX IF NOT EXISTS idx_ppr_prompt_provider_runat
ON public.prompt_provider_responses (prompt_id, provider, run_at DESC)
WHERE status IN ('success','completed');