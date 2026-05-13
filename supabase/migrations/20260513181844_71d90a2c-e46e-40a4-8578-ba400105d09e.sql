CREATE OR REPLACE FUNCTION public.delete_brand_cascade(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id
  FROM public.brands
  WHERE id = p_brand_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Brand not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.org_id = v_org_id
      AND u.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this brand';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.brand_delete_prompt_ids (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  TRUNCATE TABLE pg_temp.brand_delete_prompt_ids;

  INSERT INTO pg_temp.brand_delete_prompt_ids (id)
  SELECT p.id
  FROM public.prompts p
  WHERE p.brand_id = p_brand_id;

  UPDATE public.content_studio_items csi
  SET prompt_id = NULL
  WHERE csi.prompt_id IN (SELECT id FROM pg_temp.brand_delete_prompt_ids);

  DELETE FROM public.visibility_optimizations vo
  WHERE vo.prompt_id IN (SELECT id FROM pg_temp.brand_delete_prompt_ids);

  DELETE FROM public.optimizations_v2 ov
  WHERE ov.brand_id = p_brand_id
     OR ov.prompt_id IN (SELECT id FROM pg_temp.brand_delete_prompt_ids);

  DELETE FROM public.llumos_scores ls
  WHERE ls.brand_id = p_brand_id
     OR ls.prompt_id IN (SELECT id FROM pg_temp.brand_delete_prompt_ids);

  DELETE FROM public.prompt_provider_responses ppr
  WHERE ppr.brand_id = p_brand_id
     OR ppr.prompt_id IN (SELECT id FROM pg_temp.brand_delete_prompt_ids);

  DELETE FROM public.recommendations WHERE brand_id = p_brand_id;
  DELETE FROM public.prompt_suggestions WHERE brand_id = p_brand_id;
  DELETE FROM public.suggested_prompts WHERE brand_id = p_brand_id;
  DELETE FROM public.ai_sources WHERE brand_id = p_brand_id;
  DELETE FROM public.brand_candidates WHERE brand_id = p_brand_id;
  DELETE FROM public.brand_catalog WHERE brand_id = p_brand_id;
  DELETE FROM public.cms_connections WHERE brand_id = p_brand_id;
  DELETE FROM public.report_email_preferences WHERE brand_id = p_brand_id;
  DELETE FROM public.weekly_reports WHERE brand_id = p_brand_id;
  DELETE FROM public.reports WHERE brand_id = p_brand_id;

  DELETE FROM public.prompts
  WHERE id IN (SELECT id FROM pg_temp.brand_delete_prompt_ids);

  DELETE FROM public.brands
  WHERE id = p_brand_id;
END;
$$;