-- Fix #1: Update auto_populate_brand_catalog trigger to set brand_id from the prompt
-- This ensures new competitors are associated with the correct brand

CREATE OR REPLACE FUNCTION public.auto_populate_brand_catalog()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  competitor_name text;
  existing_id uuid;
  current_competitor_count INT;
  v_prompt_brand_id uuid;
BEGIN
  -- Only process successful responses with competitors
  IF NEW.status IN ('success', 'completed') AND NEW.competitors_json IS NOT NULL AND jsonb_array_length(NEW.competitors_json) > 0 THEN
    
    -- Get the brand_id from the associated prompt (CRITICAL for multi-brand isolation)
    -- Prefer NEW.brand_id if set, otherwise get from the prompt
    v_prompt_brand_id := COALESCE(
      NEW.brand_id,
      (SELECT p.brand_id FROM prompts p WHERE p.id = NEW.prompt_id)
    );
    
    -- Get current competitor count for this org AND brand (brand-specific limit)
    SELECT COUNT(*) INTO current_competitor_count
    FROM brand_catalog
    WHERE org_id = NEW.org_id 
      AND is_org_brand = false
      AND (
        (v_prompt_brand_id IS NULL AND brand_id IS NULL) OR
        (brand_id = v_prompt_brand_id)
      );
    
    -- Loop through each competitor in the JSON array
    FOR competitor_name IN 
      SELECT jsonb_array_elements_text(NEW.competitors_json)
    LOOP
      -- Skip invalid names
      IF LENGTH(TRIM(competitor_name)) < 3 OR competitor_name ~ '^[0-9]+$' THEN
        CONTINUE;
      END IF;
      
      -- Check if exists for this org AND brand (brand-specific lookup)
      SELECT id INTO existing_id
      FROM brand_catalog
      WHERE org_id = NEW.org_id 
        AND LOWER(TRIM(name)) = LOWER(TRIM(competitor_name))
        AND (
          (v_prompt_brand_id IS NULL AND brand_id IS NULL) OR
          (brand_id = v_prompt_brand_id)
        );
      
      IF existing_id IS NOT NULL THEN
        -- Update existing competitor (always allowed)
        UPDATE brand_catalog
        SET 
          last_seen_at = NEW.run_at,
          total_appearances = total_appearances + 1,
          average_score = (average_score + NEW.score) / 2
        WHERE id = existing_id
          AND is_org_brand = false;
      ELSE
        -- Only insert new competitor if under limit (50 per brand)
        IF current_competitor_count < 50 THEN
          BEGIN
            INSERT INTO brand_catalog (
              org_id,
              brand_id,  -- CRITICAL: Set brand_id for multi-brand isolation
              name,
              is_org_brand,
              variants_json,
              first_detected_at,
              last_seen_at,
              total_appearances,
              average_score
            ) VALUES (
              NEW.org_id,
              v_prompt_brand_id,  -- Associate with the prompt's brand
              competitor_name,
              false,
              '[]'::jsonb,
              NEW.run_at,
              NEW.run_at,
              1,
              NEW.score
            );
            current_competitor_count := current_competitor_count + 1;
          EXCEPTION WHEN OTHERS THEN
            -- Silently skip if insert fails (e.g., due to unique constraint)
            RAISE NOTICE 'Skipped adding competitor % due to: %', competitor_name, SQLERRM;
          END;
        ELSE
          -- Log when limit is reached but don't fail
          RAISE NOTICE 'Competitor limit reached (50), skipping new competitor: %', competitor_name;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Always return NEW to allow the prompt_provider_responses insert to succeed
  RETURN NEW;
END;
$function$;

-- Fix #2: Update get_competitor_trends to use STRICT brand filtering (no NULL fallback)
CREATE OR REPLACE FUNCTION public.get_competitor_trends(
  p_org_id uuid, 
  p_interval text DEFAULT 'week'::text, 
  p_days integer DEFAULT 90, 
  p_limit integer DEFAULT 5, 
  p_brand_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(period_start timestamp with time zone, competitor_name text, mentions_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_interval text;
  v_days integer;
  v_limit integer;
BEGIN
  -- Validate and normalize inputs
  v_interval := CASE 
    WHEN lower(p_interval) IN ('week', 'month') THEN lower(p_interval)
    ELSE 'week'
  END;
  
  v_days := LEAST(GREATEST(COALESCE(p_days, 90), 7), 365);
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10);
  
  RETURN QUERY
  WITH expanded_competitors AS (
    SELECT 
      date_trunc(v_interval, ppr.run_at) as period,
      lower(trim(jsonb_array_elements_text(ppr.competitors_json))) as competitor
    FROM prompt_provider_responses ppr
    INNER JOIN prompts p ON p.id = ppr.prompt_id
    WHERE ppr.org_id = p_org_id
      AND ppr.status IN ('completed', 'success')
      AND ppr.run_at >= now() - (v_days || ' days')::interval
      -- STRICT BRAND FILTERING: Use prompt's brand_id, no NULL fallback when brand specified
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
      AND ppr.competitors_json IS NOT NULL
      AND jsonb_array_length(ppr.competitors_json) > 0
  ),
  competitor_totals AS (
    SELECT 
      competitor,
      COUNT(*) as total_mentions
    FROM expanded_competitors
    GROUP BY competitor
    ORDER BY total_mentions DESC
    LIMIT v_limit
  ),
  top_competitors AS (
    SELECT competitor FROM competitor_totals
  )
  SELECT 
    ec.period as period_start,
    ec.competitor as competitor_name,
    COUNT(*)::bigint as mentions_count
  FROM expanded_competitors ec
  WHERE ec.competitor IN (SELECT competitor FROM top_competitors)
  GROUP BY ec.period, ec.competitor
  ORDER BY ec.period ASC, mentions_count DESC;
END;
$function$;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.auto_populate_brand_catalog() IS 
'Trigger function to auto-populate brand_catalog from prompt responses. 
Fixed to properly set brand_id for multi-brand isolation (Dec 2025).';

COMMENT ON FUNCTION public.get_competitor_trends(uuid, text, integer, integer, uuid) IS 
'Returns competitor mention trends over time. 
Fixed to use STRICT brand filtering via prompt.brand_id (Dec 2025).';