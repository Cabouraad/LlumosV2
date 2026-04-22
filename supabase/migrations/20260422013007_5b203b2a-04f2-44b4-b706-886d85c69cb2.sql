CREATE OR REPLACE FUNCTION public.get_unified_dashboard_data(p_org_id uuid, p_brand_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  org_exists boolean;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_window_start date := v_today - INTERVAL '6 days';
BEGIN
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_org_id) INTO org_exists;

  IF NOT org_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found',
      'prompts', '[]'::jsonb,
      'responses', '[]'::jsonb,
      'chartData', '[]'::jsonb,
      'presenceDaily', '[]'::jsonb,
      'metrics', jsonb_build_object(
        'avgScore', 0, 'overallScore', 0, 'trend', 0,
        'totalRuns', 0, 'recentRunsCount', 0,
        'promptCount', 0, 'activePrompts', 0, 'inactivePrompts', 0
      )
    );
  END IF;

  WITH prompt_data AS (
    SELECT p.id, p.text, p.active, p.created_at, p.brand_id
    FROM prompts p
    WHERE p.org_id = p_org_id
      AND p.active = true
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
    ORDER BY p.created_at DESC
    LIMIT 200
  ),
  agg30 AS (
    SELECT
      r.id, r.run_at, r.score, r.org_brand_present, r.competitors_json
    FROM prompt_provider_responses r
    INNER JOIN prompts p ON p.id = r.prompt_id
    WHERE r.org_id = p_org_id
      AND r.status IN ('success', 'completed')
      AND r.run_at >= NOW() - INTERVAL '30 days'
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
  ),
  recent_responses AS (
    SELECT
      r.id, r.prompt_id, r.provider, r.model, r.score,
      r.org_brand_present, r.org_brand_prominence, r.competitors_count,
      r.run_at, r.status
    FROM prompt_provider_responses r
    INNER JOIN prompts p ON p.id = r.prompt_id
    WHERE r.org_id = p_org_id
      AND r.status IN ('success', 'completed')
      AND r.run_at >= NOW() - INTERVAL '30 days'
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
    ORDER BY r.run_at DESC
    LIMIT 50
  ),
  chart_data AS (
    SELECT
      DATE(run_at) AS date,
      ROUND(AVG(score)::numeric, 1) AS score,
      COUNT(*) AS runs
    FROM agg30
    GROUP BY DATE(run_at)
    ORDER BY DATE(run_at) ASC
  ),
  -- 7-day window: per-day totals & org presence (one row per response)
  day_totals AS (
    SELECT
      DATE(run_at) AS day,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE org_brand_present) AS present
    FROM agg30
    WHERE run_at::date >= v_window_start
    GROUP BY DATE(run_at)
  ),
  -- 7-day window: distinct (day, response, competitor) tuples
  day_competitor_hits AS (
    SELECT
      DATE(a.run_at) AS day,
      LOWER(TRIM(c.name)) AS comp_lower,
      COUNT(DISTINCT a.id) AS hits
    FROM agg30 a
    CROSS JOIN LATERAL (
      SELECT DISTINCT jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(a.competitors_json) = 'array'
             THEN a.competitors_json ELSE '[]'::jsonb END
      ) AS name
    ) c
    WHERE a.run_at::date >= v_window_start
      AND c.name IS NOT NULL
      AND LENGTH(TRIM(c.name)) > 0
    GROUP BY DATE(a.run_at), LOWER(TRIM(c.name))
  ),
  day_competitor_map AS (
    SELECT day, jsonb_object_agg(comp_lower, hits) AS competitor_presence
    FROM day_competitor_hits
    GROUP BY day
  ),
  presence_rows AS (
    SELECT
      dt.day,
      dt.total,
      dt.present,
      COALESCE(dcm.competitor_presence, '{}'::jsonb) AS competitor_presence
    FROM day_totals dt
    LEFT JOIN day_competitor_map dcm ON dcm.day = dt.day
  ),
  metrics_7d AS (
    SELECT
      COALESCE(ROUND(AVG(score)::numeric, 1), 0) AS avg_7d,
      COUNT(*) AS runs_7d
    FROM agg30
    WHERE run_at >= NOW() - INTERVAL '7 days'
  ),
  metrics_prev7 AS (
    SELECT COALESCE(ROUND(AVG(score)::numeric, 1), 0) AS avg_prev
    FROM agg30
    WHERE run_at >= NOW() - INTERVAL '14 days'
      AND run_at <  NOW() - INTERVAL '7 days'
  ),
  metrics_30d AS (
    SELECT COUNT(*) AS runs_30d FROM agg30
  ),
  active_prompt_count AS (
    SELECT COUNT(*) AS cnt FROM prompts p
    WHERE p.org_id = p_org_id AND p.active = true
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
  ),
  inactive_prompt_count AS (
    SELECT COUNT(*) AS cnt FROM prompts p
    WHERE p.org_id = p_org_id AND p.active = false
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
  )
  SELECT jsonb_build_object(
    'success', true,
    'prompts', COALESCE((SELECT jsonb_agg(row_to_json(pd)) FROM prompt_data pd), '[]'::jsonb),
    'responses', COALESCE((SELECT jsonb_agg(row_to_json(rr)) FROM recent_responses rr), '[]'::jsonb),
    'chartData', COALESCE((SELECT jsonb_agg(row_to_json(cd)) FROM chart_data cd), '[]'::jsonb),
    'presenceDaily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', pr.day,
        'total', pr.total,
        'present', pr.present,
        'competitorPresence', pr.competitor_presence
      ) ORDER BY pr.day)
      FROM presence_rows pr
    ), '[]'::jsonb),
    'metrics', jsonb_build_object(
      'avgScore', (SELECT avg_7d FROM metrics_7d),
      'overallScore', (SELECT avg_7d FROM metrics_7d),
      'trend', CASE
        WHEN (SELECT avg_prev FROM metrics_prev7) > 0
          THEN ROUND((((SELECT avg_7d FROM metrics_7d) - (SELECT avg_prev FROM metrics_prev7))
                      / (SELECT avg_prev FROM metrics_prev7) * 100)::numeric, 1)
        ELSE 0
      END,
      'totalRuns', (SELECT runs_30d FROM metrics_30d),
      'recentRunsCount', (SELECT runs_7d FROM metrics_7d),
      'activePrompts', (SELECT cnt FROM active_prompt_count),
      'inactivePrompts', (SELECT cnt FROM inactive_prompt_count),
      'promptCount', (SELECT cnt FROM active_prompt_count)
    ),
    'timestamp', NOW()
  ) INTO result;

  RETURN result;
END;
$function$;