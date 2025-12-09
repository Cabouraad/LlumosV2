-- Drop the old 3-arg version and recreate with search_path
DROP FUNCTION IF EXISTS public.get_citation_trends(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_citation_trends(p_org_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 20)
RETURNS TABLE(citation_url text, trend_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH citation_daily AS (
    SELECT 
      c.citation_url,
      DATE(ppr.run_at) as date,
      COUNT(*) as daily_citations,
      AVG(ppr.org_brand_prominence) as avg_visibility
    FROM prompt_provider_responses ppr
    CROSS JOIN LATERAL jsonb_array_elements(ppr.citations_json) c(citation)
    WHERE ppr.org_id = p_org_id
      AND ppr.run_at >= NOW() - (p_days || ' days')::INTERVAL
      AND ppr.status = 'completed'
      AND c.citation_url IS NOT NULL
    GROUP BY c.citation_url, DATE(ppr.run_at)
  ),
  top_citations AS (
    SELECT citation_url
    FROM citation_daily
    GROUP BY citation_url
    ORDER BY SUM(daily_citations) DESC
    LIMIT p_limit
  )
  SELECT 
    cd.citation_url,
    jsonb_build_object(
      'dates', jsonb_agg(cd.date ORDER BY cd.date),
      'citation_counts', jsonb_agg(cd.daily_citations ORDER BY cd.date),
      'visibility_scores', jsonb_agg(ROUND(cd.avg_visibility::numeric, 1) ORDER BY cd.date)
    ) as trend_data
  FROM citation_daily cd
  WHERE cd.citation_url IN (SELECT citation_url FROM top_citations)
  GROUP BY cd.citation_url;
END;
$function$;

-- Fix get_org_competitor_summary_v2 
DROP FUNCTION IF EXISTS public.get_org_competitor_summary_v2(uuid, integer, integer, integer, text[], uuid);

CREATE OR REPLACE FUNCTION public.get_org_competitor_summary_v2(p_org_id uuid DEFAULT NULL::uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_providers text[] DEFAULT NULL::text[], p_brand_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(competitor_name text, total_mentions bigint, distinct_prompts bigint, first_seen timestamp with time zone, last_seen timestamp with time zone, avg_score numeric, share_pct numeric, trend_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_org_id uuid;
  v_limit int;
  v_offset int;
BEGIN
  IF p_org_id IS NULL THEN
    SELECT u.org_id INTO v_org_id
    FROM users u
    WHERE u.id = auth.uid();
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'User not found or has no org_id';
    END IF;
  ELSE
    v_org_id := p_org_id;
  END IF;

  v_limit := LEAST(COALESCE(p_limit, 50), 50);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  WITH filtered_responses AS (
    SELECT
      ppr.id,
      ppr.org_id,
      ppr.competitors_json,
      ppr.run_at,
      ppr.prompt_id,
      ppr.provider,
      ppr.score
    FROM prompt_provider_responses ppr
    INNER JOIN prompts p ON p.id = ppr.prompt_id
    WHERE ppr.org_id = v_org_id
      AND ppr.status IN ('completed', 'success')
      AND ppr.run_at >= (CURRENT_TIMESTAMP - (p_days || ' days')::interval)
      AND (p_providers IS NULL OR ppr.provider = ANY(p_providers))
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
      AND ppr.competitors_json IS NOT NULL
      AND jsonb_array_length(ppr.competitors_json) > 0
  ),
  expanded AS (
    SELECT
      fr.id,
      fr.org_id,
      fr.run_at,
      fr.prompt_id,
      fr.score,
      LOWER(TRIM(
        COALESCE(
          competitor_element.value->>'name',
          TRIM(BOTH '"' FROM competitor_element.value::text)
        )
      )) AS competitor_name_lower
    FROM filtered_responses fr
    CROSS JOIN LATERAL jsonb_array_elements(fr.competitors_json) AS competitor_element
  ),
  valid_expanded AS (
    SELECT e.*
    FROM expanded e
    WHERE e.competitor_name_lower IN (
      SELECT LOWER(TRIM(bc.name)) FROM brand_catalog bc
      WHERE bc.org_id = v_org_id 
        AND bc.is_org_brand = false
        AND (p_brand_id IS NULL OR bc.brand_id = p_brand_id OR bc.brand_id IS NULL)
      UNION
      SELECT LOWER(TRIM(v)) FROM brand_catalog bc,
        LATERAL jsonb_array_elements_text(bc.variants_json) v
      WHERE bc.org_id = v_org_id 
        AND bc.is_org_brand = false
        AND (p_brand_id IS NULL OR bc.brand_id = p_brand_id OR bc.brand_id IS NULL)
    )
    AND e.competitor_name_lower NOT IN (
      SELECT LOWER(TRIM(oce.competitor_name))
      FROM org_competitor_exclusions oce
      WHERE oce.org_id = v_org_id
    )
  ),
  aggregated AS (
    SELECT
      e.competitor_name_lower AS competitor_key,
      COUNT(*)::bigint AS total_mentions,
      COUNT(DISTINCT e.prompt_id)::bigint AS distinct_prompts,
      MIN(e.run_at) AS first_seen,
      MAX(e.run_at) AS last_seen,
      AVG(e.score)::numeric AS avg_score
    FROM valid_expanded e
    GROUP BY e.competitor_name_lower
  ),
  totals AS (
    SELECT SUM(agg.total_mentions)::numeric AS grand_total
    FROM aggregated agg
  ),
  with_trend AS (
    SELECT
      e.competitor_name_lower AS competitor_key,
      CASE
        WHEN COUNT(CASE WHEN e.run_at >= (CURRENT_TIMESTAMP - interval '7 days') THEN 1 END) > 0
         AND COUNT(CASE WHEN e.run_at < (CURRENT_TIMESTAMP - interval '7 days') THEN 1 END) > 0
        THEN
          ((COUNT(CASE WHEN e.run_at >= (CURRENT_TIMESTAMP - interval '7 days') THEN 1 END)::numeric /
            NULLIF(COUNT(CASE WHEN e.run_at < (CURRENT_TIMESTAMP - interval '7 days') THEN 1 END)::numeric, 0)) - 1) * 100
        ELSE 0
      END AS trend_score
    FROM valid_expanded e
    GROUP BY e.competitor_name_lower
  )
  SELECT
    COALESCE(
      (
        SELECT bc.name FROM brand_catalog bc
        WHERE bc.org_id = v_org_id 
          AND bc.is_org_brand = false
          AND LOWER(TRIM(bc.name)) = agg.competitor_key
          AND (p_brand_id IS NULL OR bc.brand_id = p_brand_id OR bc.brand_id IS NULL)
        LIMIT 1
      ),
      INITCAP(agg.competitor_key)
    ) AS competitor_name,
    agg.total_mentions,
    agg.distinct_prompts,
    agg.first_seen,
    agg.last_seen,
    agg.avg_score,
    CASE
      WHEN tot.grand_total > 0 THEN ((agg.total_mentions::numeric / tot.grand_total) * 100)
      ELSE 0
    END AS share_pct,
    COALESCE(wt.trend_score, 0)::numeric AS trend_score
  FROM aggregated agg
  CROSS JOIN totals tot
  LEFT JOIN with_trend wt ON wt.competitor_key = agg.competitor_key
  WHERE agg.total_mentions > 0
  ORDER BY agg.total_mentions DESC, agg.last_seen DESC
  LIMIT v_limit OFFSET v_offset;
END;
$function$;