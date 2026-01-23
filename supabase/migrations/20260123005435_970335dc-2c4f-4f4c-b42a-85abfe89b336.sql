-- Fix the user record that has NULL values in required string columns
UPDATE auth.users
SET 
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change_token_current = '',
  phone_change_token = '',
  reauthentication_token = ''
WHERE email = 'alex@nursehub.com';