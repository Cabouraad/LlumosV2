-- Fix search_path for all functions missing it (security hardening)
-- This prevents search_path injection attacks without changing functionality

-- 1. calculate_brand_prominence_from_response
CREATE OR REPLACE FUNCTION public.calculate_brand_prominence_from_response(p_raw_response text, p_org_brands text[])
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  brand_text text;
  brand_index integer;
  earliest_position numeric := 1.0;
  response_length integer;
  prominence_score integer;
BEGIN
  IF p_raw_response IS NULL OR array_length(p_org_brands, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  
  response_length := length(p_raw_response);
  IF response_length = 0 THEN
    RETURN NULL;
  END IF;
  
  FOREACH brand_text IN ARRAY p_org_brands
  LOOP
    brand_index := position(lower(brand_text) in lower(p_raw_response));
    IF brand_index > 0 THEN
      earliest_position := LEAST(earliest_position, brand_index::numeric / response_length::numeric);
    END IF;
  END LOOP;
  
  IF earliest_position = 1.0 THEN
    RETURN NULL;
  END IF;
  
  CASE
    WHEN earliest_position <= 0.1 THEN prominence_score := 1;
    WHEN earliest_position <= 0.2 THEN prominence_score := 2;
    WHEN earliest_position <= 0.35 THEN prominence_score := 3;
    WHEN earliest_position <= 0.5 THEN prominence_score := 4;
    WHEN earliest_position <= 0.65 THEN prominence_score := 5;
    WHEN earliest_position <= 0.75 THEN prominence_score := 6;
    WHEN earliest_position <= 0.85 THEN prominence_score := 7;
    ELSE prominence_score := 8;
  END CASE;
  
  RETURN prominence_score;
END;
$function$;

-- 2. domain_root
CREATE OR REPLACE FUNCTION public.domain_root(p_domain text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  RETURN regexp_replace(lower(p_domain), '^www\.', '');
END;
$function$;

-- 3. handle_updated_at (common trigger function)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_llumos_scores_updated_at
CREATE OR REPLACE FUNCTION public.update_llumos_scores_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. update_optimizations_v2_updated_at
CREATE OR REPLACE FUNCTION public.update_optimizations_v2_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 6. update_report_templates_updated_at
CREATE OR REPLACE FUNCTION public.update_report_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 7. update_tracked_keywords_updated_at
CREATE OR REPLACE FUNCTION public.update_tracked_keywords_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 8. update_visibility_optimizations_updated_at
CREATE OR REPLACE FUNCTION public.update_visibility_optimizations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 9. detect_visibility_drops (security definer function)
CREATE OR REPLACE FUNCTION public.detect_visibility_drops(p_org_id uuid DEFAULT NULL::uuid, p_days integer DEFAULT 7, p_threshold numeric DEFAULT 20)
RETURNS TABLE(org_id uuid, user_id uuid, keyword_id uuid, keyword text, brand_name text, prompt_text text, previous_score numeric, current_score numeric, previous_rank integer, current_rank integer, previous_status text, current_status text, competitor_name text, share_loss numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH latest_scans AS (
    SELECT 
      sh.keyword_id,
      sh.score,
      sh.rank,
      sh.competitor_name as comp_name,
      sh.created_at,
      ROW_NUMBER() OVER (PARTITION BY sh.keyword_id ORDER BY sh.created_at DESC) as rn
    FROM scan_history sh
    WHERE sh.created_at > NOW() - (p_days || ' days')::interval
  ),
  comparison AS (
    SELECT
      tk.id as kw_id,
      tk.org_id as tk_org_id,
      tk.user_id as tk_user_id,
      tk.keyword as tk_keyword,
      o.name as org_name,
      curr.score as curr_score,
      prev.score as prev_score,
      curr.rank as curr_rank,
      prev.rank as prev_rank,
      curr.comp_name,
      CASE WHEN prev.score > 0 THEN ((prev.score - curr.score) / prev.score) * 100 ELSE 0 END as drop_pct
    FROM tracked_keywords tk
    JOIN organizations o ON o.id = tk.org_id
    LEFT JOIN latest_scans curr ON curr.keyword_id = tk.id AND curr.rn = 1
    LEFT JOIN latest_scans prev ON prev.keyword_id = tk.id AND prev.rn = 2
    WHERE tk.is_active = true
      AND (p_org_id IS NULL OR tk.org_id = p_org_id)
      AND curr.score IS NOT NULL
      AND prev.score IS NOT NULL
      AND curr.score < prev.score
  )
  SELECT 
    c.tk_org_id,
    c.tk_user_id,
    c.kw_id,
    c.tk_keyword,
    c.org_name,
    c.tk_keyword,
    c.prev_score,
    c.curr_score,
    c.prev_rank,
    c.curr_rank,
    CASE 
      WHEN c.prev_rank = 1 THEN 'Recommended First'
      WHEN c.prev_rank <= 3 THEN 'Top 3'
      ELSE 'Mentioned'
    END,
    CASE 
      WHEN c.curr_rank = 1 THEN 'Recommended First'
      WHEN c.curr_rank <= 3 THEN 'Top 3'
      WHEN c.curr_rank IS NULL THEN 'Not Mentioned'
      ELSE 'Mentioned briefly'
    END,
    c.comp_name,
    c.drop_pct
  FROM comparison c
  WHERE c.drop_pct >= p_threshold;
END;
$function$;

-- 10. get_citation_trends (need to check current definition first)
-- Get existing overloaded versions and update them

-- 11. get_org_competitor_summary_v2 (also need to preserve signature)

-- Add security comments for documentation
COMMENT ON FUNCTION public.calculate_brand_prominence_from_response IS 'Calculates brand prominence score from AI response. search_path set for security.';
COMMENT ON FUNCTION public.domain_root IS 'Extracts root domain by removing www prefix. search_path set for security.';
COMMENT ON FUNCTION public.handle_updated_at IS 'Generic trigger to update updated_at timestamp. search_path set for security.';
COMMENT ON FUNCTION public.detect_visibility_drops IS 'Detects visibility score drops for alerting. Security definer with search_path set.';