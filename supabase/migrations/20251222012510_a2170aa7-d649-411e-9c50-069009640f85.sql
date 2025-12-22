-- Add brand_id to brand_candidates for multi-brand isolation
ALTER TABLE public.brand_candidates 
ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

-- Create index for efficient brand-filtered queries
CREATE INDEX IF NOT EXISTS idx_brand_candidates_brand_id ON public.brand_candidates(brand_id);

-- Fix approve_brand_candidate to set brand_id when adding to catalog
CREATE OR REPLACE FUNCTION public.approve_brand_candidate(
  p_candidate_id uuid, 
  p_candidate_name text,
  p_brand_id uuid DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_org_id uuid;
  candidate_org_id uuid;
  candidate_brand_id uuid;
  current_count integer;
BEGIN
  -- Get the authenticated user's org_id
  SELECT u.org_id INTO user_org_id
  FROM users u 
  WHERE u.id = auth.uid();
  
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not authenticated';
  END IF;
  
  -- Get the candidate's org_id and brand_id
  SELECT org_id, brand_id INTO candidate_org_id, candidate_brand_id
  FROM brand_candidates
  WHERE id = p_candidate_id;
  
  -- Security check
  IF candidate_org_id != user_org_id THEN
    RAISE EXCEPTION 'Access denied: Can only approve own organization candidates';
  END IF;
  
  -- Use provided brand_id, fallback to candidate's brand_id
  candidate_brand_id := COALESCE(p_brand_id, candidate_brand_id);
  
  -- Check current competitor count (per brand if brand_id specified)
  SELECT COUNT(*) INTO current_count
  FROM brand_catalog
  WHERE org_id = user_org_id 
    AND is_org_brand = false
    AND (
      (candidate_brand_id IS NULL AND brand_id IS NULL) OR
      (brand_id = candidate_brand_id)
    );
  
  -- Only add if under limit (50 per brand)
  IF current_count < 50 THEN
    -- Add to brand_catalog with brand_id for isolation
    INSERT INTO brand_catalog (
      org_id,
      brand_id,  -- Set brand_id for multi-brand isolation
      name,
      is_org_brand,
      variants_json,
      first_detected_at,
      last_seen_at,
      total_appearances,
      average_score
    ) VALUES (
      user_org_id,
      candidate_brand_id,
      p_candidate_name,
      false,
      '[]'::jsonb,
      now(),
      now(),
      1,
      5.0
    )
    ON CONFLICT (org_id, name) DO NOTHING;
  END IF;
  
  -- Update candidate status regardless
  UPDATE brand_candidates 
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_candidate_id;
END;
$function$;

-- Fix get_brand_candidates_for_org to support brand filtering
CREATE OR REPLACE FUNCTION public.get_brand_candidates_for_org(p_brand_id uuid DEFAULT NULL)
 RETURNS TABLE(id uuid, candidate_name text, detection_count integer, first_detected_at timestamp with time zone, last_detected_at timestamp with time zone, status text, brand_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_org_id uuid;
BEGIN
  -- Get the authenticated user's org_id
  SELECT u.org_id INTO user_org_id
  FROM users u 
  WHERE u.id = auth.uid();
  
  IF user_org_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    bc.id,
    bc.candidate_name,
    bc.detection_count,
    bc.first_detected_at,
    bc.last_detected_at,
    bc.status,
    bc.brand_id
  FROM brand_candidates bc
  WHERE bc.org_id = user_org_id
    AND bc.status = 'pending'
    -- Brand filtering: when brand specified, show only that brand's candidates
    -- When no brand specified, show all pending candidates
    AND (p_brand_id IS NULL OR bc.brand_id = p_brand_id OR bc.brand_id IS NULL)
  ORDER BY bc.detection_count DESC;
END;
$function$;

-- Add comments
COMMENT ON COLUMN public.brand_candidates.brand_id IS 'Associates candidate with specific brand for multi-brand isolation';
COMMENT ON FUNCTION public.approve_brand_candidate(uuid, text, uuid) IS 'Approves a brand candidate and adds to catalog with brand_id isolation';
COMMENT ON FUNCTION public.get_brand_candidates_for_org(uuid) IS 'Returns pending brand candidates, optionally filtered by brand_id';