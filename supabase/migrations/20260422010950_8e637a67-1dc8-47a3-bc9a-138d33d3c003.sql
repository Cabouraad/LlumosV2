CREATE OR REPLACE FUNCTION public.get_latest_prompt_provider_responses(
  p_org_id uuid,
  p_brand_id uuid DEFAULT NULL,
  p_slim boolean DEFAULT false,
  p_lookback_days integer DEFAULT 30
)
 RETURNS TABLE(
   id uuid,
   prompt_id uuid,
   provider text,
   model text,
   status text,
   run_at timestamp with time zone,
   raw_ai_response text,
   error text,
   metadata jsonb,
   score numeric,
   org_brand_present boolean,
   org_brand_prominence integer,
   competitors_count integer,
   competitors_json jsonb,
   brands_json jsonb,
   citations_json jsonb,
   token_in integer,
   token_out integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH scoped_responses AS (
    SELECT
      ppr.id,
      ppr.prompt_id,
      CASE
        WHEN ppr.provider = 'perplexity_ai' THEN 'perplexity'
        WHEN ppr.provider = 'google_aio' THEN 'google_ai_overview'
        ELSE ppr.provider
      END AS normalized_provider,
      ppr.model,
      ppr.status,
      ppr.run_at,
      ppr.raw_ai_response,
      ppr.error AS error_text,
      ppr.metadata,
      ppr.score,
      ppr.org_brand_present,
      ppr.org_brand_prominence,
      COALESCE(jsonb_array_length(ppr.competitors_json), 0) AS competitors_count,
      ppr.competitors_json,
      ppr.brands_json,
      ppr.citations_json,
      ppr.token_in,
      ppr.token_out
    FROM prompt_provider_responses ppr
    INNER JOIN prompts p ON p.id = ppr.prompt_id
    WHERE p.org_id = p_org_id
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
      AND ppr.run_at >= (NOW() - (p_lookback_days || ' days')::interval)
      AND ppr.provider IS NOT NULL
      AND ppr.status IN ('success', 'completed')
  ),
  latest AS (
    SELECT DISTINCT ON (sr.prompt_id, sr.normalized_provider) sr.*
    FROM scoped_responses sr
    ORDER BY sr.prompt_id, sr.normalized_provider, sr.run_at DESC
  )
  SELECT
    l.id,
    l.prompt_id,
    l.normalized_provider AS provider,
    l.model,
    l.status,
    l.run_at,
    CASE WHEN p_slim THEN NULL ELSE l.raw_ai_response END AS raw_ai_response,
    l.error_text AS error,
    l.metadata,
    l.score,
    l.org_brand_present,
    l.org_brand_prominence,
    l.competitors_count,
    CASE WHEN p_slim THEN '[]'::jsonb ELSE l.competitors_json END AS competitors_json,
    CASE WHEN p_slim THEN '[]'::jsonb ELSE l.brands_json END AS brands_json,
    CASE WHEN p_slim THEN '[]'::jsonb ELSE l.citations_json END AS citations_json,
    l.token_in,
    l.token_out
  FROM latest l
  ORDER BY l.run_at DESC;
END;
$function$;