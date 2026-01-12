-- Fix the UPDATE policy to include WITH CHECK clause
DROP POLICY IF EXISTS optimizations_v2_update ON public.optimizations_v2;

CREATE POLICY "optimizations_v2_update" ON public.optimizations_v2
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM users u
  WHERE u.id = auth.uid() AND u.org_id = optimizations_v2.org_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users u
  WHERE u.id = auth.uid() AND u.org_id = optimizations_v2.org_id
));