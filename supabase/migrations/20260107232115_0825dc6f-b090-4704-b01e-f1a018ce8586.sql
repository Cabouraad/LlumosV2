CREATE OR REPLACE FUNCTION public.get_super_admin_dashboard()
RETURNS TABLE(
  org_id uuid,
  org_name text,
  org_domain text,
  subscription_tier text,
  is_subscribed boolean,
  stripe_customer_id text,
  prompts_count bigint,
  created_at timestamptz,
  last_login_at timestamptz,
  owner_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_email text;
  allowed_email constant text := 'abouraa.chri@gmail.com';
BEGIN
  -- Get the current user's email from the JWT
  current_user_email := auth.jwt() ->> 'email';
  
  -- Only allow the specific admin email
  IF current_user_email IS NULL OR current_user_email != allowed_email THEN
    RAISE EXCEPTION 'Access denied: unauthorized user';
  END IF;
  
  -- Return admin dashboard data
  RETURN QUERY
  SELECT 
    o.id as org_id,
    o.name as org_name,
    o.domain as org_domain,
    COALESCE(o.subscription_tier, 'free') as subscription_tier,
    COALESCE(s.subscribed, false) as is_subscribed,
    s.stripe_customer_id,
    (SELECT COUNT(*) FROM prompts p WHERE p.org_id = o.id) as prompts_count,
    o.created_at,
    (
      SELECT MAX(au.last_sign_in_at) 
      FROM public.users u2
      JOIN auth.users au ON au.id = u2.id
      WHERE u2.org_id = o.id
    ) as last_login_at,
    (
      SELECT u3.email 
      FROM public.users u3 
      WHERE u3.org_id = o.id AND u3.role = 'owner' 
      LIMIT 1
    ) as owner_email
  FROM organizations o
  LEFT JOIN public.users u ON u.org_id = o.id AND u.role = 'owner'
  LEFT JOIN subscribers s ON s.user_id = u.id
  GROUP BY o.id, o.name, o.domain, o.subscription_tier, o.created_at, s.subscribed, s.stripe_customer_id
  ORDER BY o.created_at DESC;
END;
$$;