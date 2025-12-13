-- Drop existing function overloads first
DROP FUNCTION IF EXISTS public.get_citation_health_dashboard(uuid, integer);
DROP FUNCTION IF EXISTS public.get_citation_health_dashboard(uuid, integer, uuid);
DROP FUNCTION IF EXISTS public.get_citation_performance_insights(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_citation_performance_insights(uuid, integer, integer, uuid);
DROP FUNCTION IF EXISTS public.get_citation_trends(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_citation_trends(uuid, integer, integer, uuid);
DROP FUNCTION IF EXISTS public.get_citation_recommendations(uuid, integer);
DROP FUNCTION IF EXISTS public.get_citation_recommendations(uuid, integer, uuid);

-- Create get_citation_health_dashboard with brand filtering and fixed JSON path
CREATE OR REPLACE FUNCTION public.get_citation_health_dashboard(
  p_org_id uuid, 
  p_days integer DEFAULT 30,
  p_brand_id uuid DEFAULT NULL
)
RETURNS TABLE(
  health_score integer, 
  total_citations integer, 
  avg_visibility_score numeric, 
  market_share_pct numeric, 
  week_over_week_change numeric, 
  total_own_citations integer, 
  total_competitor_citations integer, 
  trending_up boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_citations INTEGER := 0;
  v_previous_citations INTEGER := 0;
  v_total_all_citations INTEGER;
  v_total_own INTEGER := 0;
  v_total_competitor INTEGER := 0;
  v_avg_visibility NUMERIC := 0;
  v_org_domains text[];
  v_health INTEGER;
  v_market_share NUMERIC := 0;
  v_wow_change NUMERIC := 0;
  v_trending boolean;
BEGIN
  -- Get organization domains for "own domain" detection
  v_org_domains := public.org_domain_set(p_org_id);

  -- Get current period metrics
  WITH brand_filtered_responses AS (
    SELECT ppr.*
    FROM prompt_provider_responses ppr
    WHERE ppr.org_id = p_org_id
      AND ppr.run_at >= NOW() - (p_days || ' days')::INTERVAL
      AND ppr.status IN ('completed', 'success')
      AND ppr.citations_json IS NOT NULL
      AND jsonb_array_length(COALESCE(ppr.citations_json->'citations', '[]'::jsonb)) > 0
      AND (p_brand_id IS NULL OR EXISTS (
        SELECT 1 FROM prompts pm 
        WHERE pm.id = ppr.prompt_id AND pm.brand_id = p_brand_id
      ))
  ),
  citations_expanded AS (
    SELECT
      bfr.id,
      bfr.org_brand_prominence,
      cite.value->>'url' as citation_url,
      cite.value->>'domain' as citation_domain,
      EXISTS (
        SELECT 1 FROM unnest(v_org_domains) od
        WHERE LOWER(cite.value->>'domain') LIKE '%' || LOWER(od) || '%'
      ) as is_own_domain
    FROM brand_filtered_responses bfr
    CROSS JOIN LATERAL jsonb_array_elements(bfr.citations_json->'citations') AS cite
    WHERE cite.value->>'url' IS NOT NULL
  )
  SELECT 
    COUNT(DISTINCT CASE WHEN ce.is_own_domain THEN ce.citation_url END),
    COUNT(DISTINCT CASE WHEN NOT ce.is_own_domain THEN ce.citation_url END),
    AVG(CASE WHEN ce.is_own_domain THEN ce.org_brand_prominence END),
    COUNT(DISTINCT ce.citation_url)
  INTO 
    v_total_own,
    v_total_competitor,
    v_avg_visibility,
    v_current_citations
  FROM citations_expanded ce;

  -- Get previous period for comparison
  WITH brand_filtered_prev AS (
    SELECT ppr.*
    FROM prompt_provider_responses ppr
    WHERE ppr.org_id = p_org_id
      AND ppr.run_at >= NOW() - (p_days * 2 || ' days')::INTERVAL
      AND ppr.run_at < NOW() - (p_days || ' days')::INTERVAL
      AND ppr.status IN ('completed', 'success')
      AND ppr.citations_json IS NOT NULL
      AND jsonb_array_length(COALESCE(ppr.citations_json->'citations', '[]'::jsonb)) > 0
      AND (p_brand_id IS NULL OR EXISTS (
        SELECT 1 FROM prompts pm 
        WHERE pm.id = ppr.prompt_id AND pm.brand_id = p_brand_id
      ))
  )
  SELECT COUNT(DISTINCT cite.value->>'url')
  INTO v_previous_citations
  FROM brand_filtered_prev bfp
  CROSS JOIN LATERAL jsonb_array_elements(bfp.citations_json->'citations') AS cite
  WHERE cite.value->>'url' IS NOT NULL;

  -- Calculate week over week change
  IF v_previous_citations > 0 THEN
    v_wow_change := ((v_current_citations::NUMERIC - v_previous_citations::NUMERIC) / v_previous_citations::NUMERIC) * 100;
  ELSE
    v_wow_change := 0;
  END IF;

  -- Calculate market share
  v_total_all_citations := COALESCE(v_total_own, 0) + COALESCE(v_total_competitor, 0);
  IF v_total_all_citations > 0 THEN
    v_market_share := (COALESCE(v_total_own, 0)::NUMERIC / v_total_all_citations::NUMERIC) * 100;
  ELSE
    v_market_share := 0;
  END IF;

  -- Calculate health score (0-100)
  v_health := LEAST(100, GREATEST(0, 
    (COALESCE(v_avg_visibility, 0) * 4)::INTEGER +
    (v_market_share * 0.3)::INTEGER +
    (CASE 
      WHEN v_wow_change > 20 THEN 30
      WHEN v_wow_change > 10 THEN 25
      WHEN v_wow_change > 0 THEN 20
      WHEN v_wow_change > -10 THEN 15
      ELSE 10
    END)
  ));

  v_trending := v_wow_change > 0;

  RETURN QUERY SELECT 
    v_health,
    v_current_citations,
    COALESCE(v_avg_visibility, 0),
    v_market_share,
    v_wow_change,
    COALESCE(v_total_own, 0),
    COALESCE(v_total_competitor, 0),
    v_trending;
END;
$function$;

-- Create get_citation_performance_insights with brand filtering
CREATE OR REPLACE FUNCTION public.get_citation_performance_insights(
  p_org_id uuid DEFAULT NULL::uuid, 
  p_days integer DEFAULT 30, 
  p_limit integer DEFAULT 50,
  p_brand_id uuid DEFAULT NULL
)
RETURNS TABLE(
  citation_url text, 
  citation_domain text, 
  citation_title text, 
  content_type text, 
  total_mentions bigint, 
  unique_prompts bigint, 
  avg_brand_visibility_score numeric, 
  brand_present_rate numeric, 
  first_cited timestamp with time zone, 
  last_cited timestamp with time zone, 
  is_own_domain boolean, 
  providers jsonb, 
  prompt_contexts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_org_domains text[];
BEGIN
  -- Resolve org_id
  IF p_org_id IS NULL THEN
    SELECT u.org_id INTO v_org_id FROM users u WHERE u.id = auth.uid();
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'User not found or has no org_id';
    END IF;
  ELSE
    v_org_id := p_org_id;
  END IF;

  -- Get organization domains
  v_org_domains := public.org_domain_set(v_org_id);

  RETURN QUERY
  WITH citations_expanded AS (
    SELECT
      ppr.id as response_id,
      ppr.prompt_id,
      ppr.provider,
      ppr.score,
      ppr.org_brand_present,
      ppr.run_at,
      cite.value->>'url' as url,
      cite.value->>'domain' as domain,
      cite.value->>'title' as title,
      COALESCE(cite.value->>'source_type', 'page') as source_type
    FROM prompt_provider_responses ppr
    CROSS JOIN LATERAL jsonb_array_elements(ppr.citations_json->'citations') AS cite
    WHERE ppr.org_id = v_org_id
      AND ppr.status IN ('completed', 'success')
      AND ppr.run_at >= (CURRENT_TIMESTAMP - (p_days || ' days')::interval)
      AND ppr.citations_json IS NOT NULL
      AND jsonb_array_length(COALESCE(ppr.citations_json->'citations', '[]'::jsonb)) > 0
      -- Brand filter: filter by prompt's brand_id
      AND (p_brand_id IS NULL OR EXISTS (
        SELECT 1 FROM prompts pm 
        WHERE pm.id = ppr.prompt_id AND pm.brand_id = p_brand_id
      ))
  ),
  citation_stats AS (
    SELECT
      ce.url,
      ce.domain,
      MAX(ce.title) as title,
      MAX(ce.source_type) as content_type,
      COUNT(*) as mentions,
      COUNT(DISTINCT ce.prompt_id) as unique_prompts,
      AVG(ce.score) as avg_score,
      SUM(CASE WHEN ce.org_brand_present THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100 as brand_rate,
      MIN(ce.run_at) as first_cited,
      MAX(ce.run_at) as last_cited,
      EXISTS (
        SELECT 1 FROM unnest(v_org_domains) od
        WHERE LOWER(ce.domain) LIKE '%' || LOWER(od) || '%'
      ) as is_own,
      jsonb_agg(DISTINCT ce.provider) as providers,
      jsonb_agg(DISTINCT jsonb_build_object(
        'prompt_id', ce.prompt_id,
        'score', ce.score,
        'brand_present', ce.org_brand_present
      )) as contexts
    FROM citations_expanded ce
    WHERE ce.url IS NOT NULL
    GROUP BY ce.url, ce.domain
  )
  SELECT
    cs.url,
    cs.domain,
    cs.title,
    cs.content_type,
    cs.mentions,
    cs.unique_prompts,
    ROUND(cs.avg_score, 2) as avg_brand_visibility_score,
    ROUND(COALESCE(cs.brand_rate, 0), 1) as brand_present_rate,
    cs.first_cited,
    cs.last_cited,
    cs.is_own,
    cs.providers,
    cs.contexts
  FROM citation_stats cs
  ORDER BY cs.mentions DESC, cs.avg_score DESC
  LIMIT p_limit;
END;
$function$;

-- Create get_citation_trends with brand filtering
CREATE OR REPLACE FUNCTION public.get_citation_trends(
  p_org_id uuid, 
  p_days integer DEFAULT 30, 
  p_limit integer DEFAULT 50,
  p_brand_id uuid DEFAULT NULL
)
RETURNS TABLE(
  citation_url text,
  trend_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH daily_citations AS (
    SELECT
      cite.value->>'url' as url,
      DATE(ppr.run_at) as citation_date,
      COUNT(*) as daily_count,
      AVG(ppr.score) as daily_visibility
    FROM prompt_provider_responses ppr
    CROSS JOIN LATERAL jsonb_array_elements(ppr.citations_json->'citations') AS cite
    WHERE ppr.org_id = p_org_id
      AND ppr.status IN ('completed', 'success')
      AND ppr.run_at >= (CURRENT_TIMESTAMP - (p_days || ' days')::interval)
      AND ppr.citations_json IS NOT NULL
      AND jsonb_array_length(COALESCE(ppr.citations_json->'citations', '[]'::jsonb)) > 0
      AND cite.value->>'url' IS NOT NULL
      -- Brand filter
      AND (p_brand_id IS NULL OR EXISTS (
        SELECT 1 FROM prompts pm 
        WHERE pm.id = ppr.prompt_id AND pm.brand_id = p_brand_id
      ))
    GROUP BY cite.value->>'url', DATE(ppr.run_at)
  ),
  top_urls AS (
    SELECT url, SUM(daily_count) as total
    FROM daily_citations
    GROUP BY url
    ORDER BY total DESC
    LIMIT p_limit
  )
  SELECT
    dc.url,
    jsonb_build_object(
      'dates', jsonb_agg(dc.citation_date ORDER BY dc.citation_date),
      'citation_counts', jsonb_agg(dc.daily_count ORDER BY dc.citation_date),
      'visibility_scores', jsonb_agg(ROUND(dc.daily_visibility::numeric, 1) ORDER BY dc.citation_date)
    ) as trend_data
  FROM daily_citations dc
  INNER JOIN top_urls tu ON dc.url = tu.url
  GROUP BY dc.url;
END;
$function$;

-- Create get_citation_recommendations with brand filtering
CREATE OR REPLACE FUNCTION public.get_citation_recommendations(
  p_org_id uuid, 
  p_days integer DEFAULT 30,
  p_brand_id uuid DEFAULT NULL
)
RETURNS TABLE(
  recommendation_type text,
  title text,
  description text,
  priority integer,
  difficulty text,
  expected_impact text,
  data_support jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_domains text[];
  v_own_citations integer;
  v_competitor_citations integer;
  v_avg_visibility numeric;
BEGIN
  -- Get org domains
  v_org_domains := public.org_domain_set(p_org_id);

  -- Get basic metrics with brand filter
  WITH brand_responses AS (
    SELECT ppr.*
    FROM prompt_provider_responses ppr
    WHERE ppr.org_id = p_org_id
      AND ppr.run_at >= NOW() - (p_days || ' days')::INTERVAL
      AND ppr.status IN ('completed', 'success')
      AND ppr.citations_json IS NOT NULL
      AND jsonb_array_length(COALESCE(ppr.citations_json->'citations', '[]'::jsonb)) > 0
      AND (p_brand_id IS NULL OR EXISTS (
        SELECT 1 FROM prompts pm 
        WHERE pm.id = ppr.prompt_id AND pm.brand_id = p_brand_id
      ))
  ),
  citation_metrics AS (
    SELECT
      COUNT(DISTINCT CASE 
        WHEN EXISTS (SELECT 1 FROM unnest(v_org_domains) od WHERE LOWER(cite.value->>'domain') LIKE '%' || LOWER(od) || '%')
        THEN cite.value->>'url' 
      END) as own_count,
      COUNT(DISTINCT CASE 
        WHEN NOT EXISTS (SELECT 1 FROM unnest(v_org_domains) od WHERE LOWER(cite.value->>'domain') LIKE '%' || LOWER(od) || '%')
        THEN cite.value->>'url' 
      END) as competitor_count,
      AVG(br.score) as avg_vis
    FROM brand_responses br
    CROSS JOIN LATERAL jsonb_array_elements(br.citations_json->'citations') AS cite
  )
  SELECT own_count, competitor_count, avg_vis
  INTO v_own_citations, v_competitor_citations, v_avg_visibility
  FROM citation_metrics;

  -- Generate recommendations based on metrics
  RETURN QUERY
  SELECT
    'visibility'::text as recommendation_type,
    'Improve AI Visibility'::text as title,
    'Focus on creating content that answers common AI queries'::text as description,
    1 as priority,
    'Medium'::text as difficulty,
    'High'::text as expected_impact,
    jsonb_build_object(
      'own_citations', COALESCE(v_own_citations, 0),
      'competitor_citations', COALESCE(v_competitor_citations, 0),
      'avg_visibility', COALESCE(v_avg_visibility, 0)
    ) as data_support;
END;
$function$;