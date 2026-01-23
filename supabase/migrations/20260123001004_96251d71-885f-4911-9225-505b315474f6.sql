-- Create user with specified credentials
-- Note: This creates the user in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'alex@nursehub.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  'authenticated',
  'authenticated'
);

-- Grant Growth subscription to this user
INSERT INTO subscribers (
  user_id,
  email,
  stripe_customer_id,
  subscribed,
  subscription_tier,
  subscription_end,
  payment_collected,
  metadata,
  updated_at
) 
SELECT 
  id,
  'alex@nursehub.com',
  'manual_bypass',
  true,
  'growth',
  (now() + interval '1 year'),
  true,
  jsonb_build_object(
    'source', 'bypass',
    'set_at', now(),
    'by', 'admin_grant',
    'plan', 'GROWTH',
    'status', 'active'
  ),
  now()
FROM auth.users 
WHERE email = 'alex@nursehub.com';