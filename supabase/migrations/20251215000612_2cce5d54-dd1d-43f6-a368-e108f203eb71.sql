
-- Migration: Reassign competitors to correct brands based on prompt response data
-- This fixes the incorrect assignment from the previous legacy migration

-- Step 1: Create a temp table mapping competitors to their correct brand_id
-- based on which brand's prompts actually detected them
WITH competitor_brand_mapping AS (
  SELECT DISTINCT 
    ppr.org_id,
    p.brand_id,
    jsonb_array_elements_text(ppr.competitors_json) as competitor_name
  FROM prompt_provider_responses ppr
  JOIN prompts p ON ppr.prompt_id = p.id
  WHERE ppr.competitors_json IS NOT NULL
    AND jsonb_array_length(ppr.competitors_json) > 0
    AND p.brand_id IS NOT NULL
    AND ppr.status IN ('success', 'completed')
),
-- Get the most common brand for each competitor (in case detected by multiple brands)
competitor_primary_brand AS (
  SELECT 
    org_id,
    competitor_name,
    brand_id,
    COUNT(*) as detection_count,
    ROW_NUMBER() OVER (
      PARTITION BY org_id, LOWER(TRIM(competitor_name))
      ORDER BY COUNT(*) DESC
    ) as rn
  FROM competitor_brand_mapping
  GROUP BY org_id, competitor_name, brand_id
)
-- Update brand_catalog with correct brand assignments
UPDATE brand_catalog bc
SET brand_id = cpb.brand_id
FROM competitor_primary_brand cpb
WHERE bc.org_id = cpb.org_id
  AND LOWER(TRIM(bc.name)) = LOWER(TRIM(cpb.competitor_name))
  AND cpb.rn = 1  -- Use the brand with most detections
  AND bc.is_org_brand = false
  AND (bc.brand_id IS NULL OR bc.brand_id != cpb.brand_id);

-- Step 2: For competitors in a multi-brand org that don't match any prompt response,
-- they may be legacy or orphaned - leave them on their current brand assignment
-- (this preserves the migration's fallback behavior for truly legacy data)
