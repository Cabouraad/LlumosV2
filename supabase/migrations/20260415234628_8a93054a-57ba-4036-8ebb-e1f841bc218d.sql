UPDATE public.visibility_report_requests
SET 
  status = 'error',
  metadata = jsonb_build_object(
    'errorAt', now()::text,
    'errorMessage', 'Invalid domain format - cleaned by admin',
    'skippedByProcessor', true
  )
WHERE status = 'pending'
  AND domain !~ '^[a-z0-9]+([\\-\\.]{1}[a-z0-9]+)*\\.[a-z]{2,}$';