-- Migration: Assign legacy competitors (brand_id = NULL) to primary brands
-- This preserves historical data while enabling proper brand isolation

-- Step 1: Update brand_catalog entries that have NULL brand_id
-- Assign them to the org's primary brand
UPDATE brand_catalog bc
SET brand_id = (
  SELECT b.id 
  FROM brands b 
  WHERE b.org_id = bc.org_id 
    AND b.is_primary = true 
  LIMIT 1
)
WHERE bc.brand_id IS NULL
  AND bc.is_org_brand = false
  AND EXISTS (
    SELECT 1 FROM brands b 
    WHERE b.org_id = bc.org_id 
      AND b.is_primary = true
  );

-- Step 2: For orgs without a primary brand, assign to the first brand created
UPDATE brand_catalog bc
SET brand_id = (
  SELECT b.id 
  FROM brands b 
  WHERE b.org_id = bc.org_id 
  ORDER BY b.created_at ASC 
  LIMIT 1
)
WHERE bc.brand_id IS NULL
  AND bc.is_org_brand = false
  AND EXISTS (
    SELECT 1 FROM brands b 
    WHERE b.org_id = bc.org_id
  );

-- Add comment explaining the migration
COMMENT ON COLUMN brand_catalog.brand_id IS 'References the brand this competitor is associated with. Previously NULL for legacy data, now required for brand isolation.';