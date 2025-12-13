-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_citation_performance_insights(INT, INT, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_content_type_performance(INT, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_citation_competitive_insights(INT, UUID, UUID);

-- Recreate get_citation_performance_insights with proper citation extraction
CREATE OR REPLACE FUNCTION public.get_citation_performance_insights(
  p_days INT DEFAULT 30,
  p_limit INT DEFAULT 100,
  p_org_id UUID DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  citation_url TEXT,
  citation_domain TEXT,
  citation_title TEXT,
  content_type TEXT,
  total_mentions BIGINT,
  unique_prompts BIGINT,
  avg_brand_visibility_score NUMERIC,
  brand_present_rate NUMERIC,
  is_own_domain BOOLEAN,
  providers TEXT[],
  first_cited TIMESTAMPTZ,
  last_cited TIMESTAMPTZ,
  prompt_contexts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_domains TEXT[];
BEGIN
  -- Get org_id from current user if not provided
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
  WITH extracted_citations AS (
    SELECT
      cite.value->>'url' AS c_url,
      cite.value->>'domain' AS c_domain,
      cite.value->>'title' AS c_title,
      COALESCE(cite.value->>'source_type', 'page') AS c_type,
      ppr.score AS response_score,
      ppr.org_brand_present,
      ppr.provider,
      ppr.prompt_id,
      ppr.run_at,
      p.text AS prompt_text
    FROM prompt_provider_responses ppr
    INNER JOIN prompts p ON p.id = ppr.prompt_id
    CROSS JOIN LATERAL jsonb_array_elements(ppr.citations_json->'citations') AS cite
    WHERE ppr.org_id = v_org_id
      AND ppr.status IN ('completed', 'success')
      AND ppr.run_at >= NOW() - (p_days || ' days')::INTERVAL
      AND ppr.citations_json IS NOT NULL
      AND ppr.citations_json->'citations' IS NOT NULL
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
  ),
  aggregated AS (
    SELECT
      ec.c_url,
      ec.c_domain,
      MAX(ec.c_title) AS c_title,
      MAX(ec.c_type) AS c_type,
      COUNT(*) AS mentions,
      COUNT(DISTINCT ec.prompt_id) AS prompts_count,
      AVG(ec.response_score) AS avg_score,
      (COUNT(*) FILTER (WHERE ec.org_brand_present)::NUMERIC / NULLIF(COUNT(*), 0) * 100) AS presence_rate,
      EXISTS (
        SELECT 1 FROM unnest(v_org_domains) od 
        WHERE LOWER(ec.c_domain) LIKE '%' || LOWER(od) || '%'
      ) AS own_domain,
      ARRAY_AGG(DISTINCT ec.provider) AS provider_list,
      MIN(ec.run_at) AS first_cite,
      MAX(ec.run_at) AS last_cite,
      jsonb_agg(DISTINCT jsonb_build_object('prompt_id', ec.prompt_id, 'text', LEFT(ec.prompt_text, 100))) AS prompt_ctx
    FROM extracted_citations ec
    WHERE ec.c_url IS NOT NULL AND ec.c_domain IS NOT NULL
    GROUP BY ec.c_url, ec.c_domain
  )
  SELECT
    a.c_url,
    a.c_domain,
    a.c_title,
    a.c_type,
    a.mentions,
    a.prompts_count,
    ROUND(a.avg_score, 2),
    ROUND(a.presence_rate, 2),
    a.own_domain,
    a.provider_list,
    a.first_cite,
    a.last_cite,
    a.prompt_ctx
  FROM aggregated a
  ORDER BY a.mentions DESC
  LIMIT p_limit;
END;
$$;

-- Recreate get_content_type_performance
CREATE OR REPLACE FUNCTION public.get_content_type_performance(
  p_days INT DEFAULT 30,
  p_org_id UUID DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  content_category TEXT,
  total_citations BIGINT,
  avg_brand_visibility NUMERIC,
  unique_domains BIGINT,
  own_content_count BIGINT,
  competitor_content_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_domains TEXT[];
BEGIN
  IF p_org_id IS NULL THEN
    SELECT u.org_id INTO v_org_id FROM users u WHERE u.id = auth.uid();
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'User not found or has no org_id';
    END IF;
  ELSE
    v_org_id := p_org_id;
  END IF;

  v_org_domains := public.org_domain_set(v_org_id);

  RETURN QUERY
  WITH extracted_citations AS (
    SELECT
      cite.value->>'domain' AS c_domain,
      COALESCE(cite.value->>'source_type', 'page') AS c_type,
      ppr.score,
      EXISTS (
        SELECT 1 FROM unnest(v_org_domains) od 
        WHERE LOWER(cite.value->>'domain') LIKE '%' || LOWER(od) || '%'
      ) AS is_own
    FROM prompt_provider_responses ppr
    INNER JOIN prompts p ON p.id = ppr.prompt_id
    CROSS JOIN LATERAL jsonb_array_elements(ppr.citations_json->'citations') AS cite
    WHERE ppr.org_id = v_org_id
      AND ppr.status IN ('completed', 'success')
      AND ppr.run_at >= NOW() - (p_days || ' days')::INTERVAL
      AND ppr.citations_json IS NOT NULL
      AND ppr.citations_json->'citations' IS NOT NULL
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
  )
  SELECT
    INITCAP(ec.c_type) AS content_category,
    COUNT(*) AS total_citations,
    ROUND(AVG(ec.score), 2) AS avg_brand_visibility,
    COUNT(DISTINCT ec.c_domain) AS unique_domains,
    COUNT(*) FILTER (WHERE ec.is_own) AS own_content_count,
    COUNT(*) FILTER (WHERE NOT ec.is_own) AS competitor_content_count
  FROM extracted_citations ec
  WHERE ec.c_domain IS NOT NULL
  GROUP BY ec.c_type
  ORDER BY total_citations DESC;
END;
$$;

-- Recreate get_citation_competitive_insights
CREATE OR REPLACE FUNCTION public.get_citation_competitive_insights(
  p_days INT DEFAULT 30,
  p_org_id UUID DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  domain TEXT,
  domain_type TEXT,
  total_citations BIGINT,
  content_types JSONB,
  avg_impact_score NUMERIC,
  citation_trend TEXT,
  top_cited_pages JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_domains TEXT[];
BEGIN
  IF p_org_id IS NULL THEN
    SELECT u.org_id INTO v_org_id FROM users u WHERE u.id = auth.uid();
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'User not found or has no org_id';
    END IF;
  ELSE
    v_org_id := p_org_id;
  END IF;

  v_org_domains := public.org_domain_set(v_org_id);

  RETURN QUERY
  WITH extracted_citations AS (
    SELECT
      cite.value->>'domain' AS c_domain,
      cite.value->>'url' AS c_url,
      cite.value->>'title' AS c_title,
      COALESCE(cite.value->>'source_type', 'page') AS c_type,
      ppr.score,
      ppr.run_at,
      CASE
        WHEN ppr.run_at >= (NOW() - interval '7 days') THEN 'recent'
        ELSE 'older'
      END AS time_period
    FROM prompt_provider_responses ppr
    INNER JOIN prompts p ON p.id = ppr.prompt_id
    CROSS JOIN LATERAL jsonb_array_elements(ppr.citations_json->'citations') AS cite
    WHERE ppr.org_id = v_org_id
      AND ppr.status IN ('completed', 'success')
      AND ppr.run_at >= NOW() - (p_days || ' days')::INTERVAL
      AND ppr.citations_json IS NOT NULL
      AND ppr.citations_json->'citations' IS NOT NULL
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
  ),
  domain_aggregates AS (
    SELECT
      ec.c_domain,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM unnest(v_org_domains) od 
          WHERE LOWER(ec.c_domain) LIKE '%' || LOWER(od) || '%'
        ) THEN 'Your Content'
        WHEN public.is_competitor_domain(v_org_id, ec.c_domain) THEN 'Competitor'
        ELSE 'Third Party'
      END AS d_type,
      COUNT(*) AS cite_count,
      jsonb_object_agg(DISTINCT ec.c_type, 1) AS types,
      AVG(ec.score) AS avg_score,
      CASE
        WHEN COUNT(*) FILTER (WHERE ec.time_period = 'recent')::NUMERIC / NULLIF(COUNT(*), 0) > 0.6 THEN 'Growing'
        WHEN COUNT(*) FILTER (WHERE ec.time_period = 'recent')::NUMERIC / NULLIF(COUNT(*), 0) < 0.4 THEN 'Declining'
        ELSE 'Stable'
      END AS trend,
      jsonb_agg(DISTINCT jsonb_build_object('url', ec.c_url, 'title', COALESCE(ec.c_title, ec.c_domain))) AS pages
    FROM extracted_citations ec
    WHERE ec.c_domain IS NOT NULL
    GROUP BY ec.c_domain
  )
  SELECT
    da.c_domain,
    da.d_type,
    da.cite_count,
    da.types,
    ROUND(da.avg_score, 2),
    da.trend,
    da.pages
  FROM domain_aggregates da
  ORDER BY da.cite_count DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_citation_performance_insights(INT, INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_type_performance(INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_citation_competitive_insights(INT, UUID, UUID) TO authenticated;