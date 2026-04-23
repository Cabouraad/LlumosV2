UPDATE public.visibility_report_requests
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('emailSent', false, 'rerunReason', 'wrong geography (DC instead of Hollywood FL)', 'rerunResetAt', now()::text)
WHERE email = 'chris.abouraad@smbteam.com'
  AND domain = 'cohenandcohenlaw.com';