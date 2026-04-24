UPDATE public.visibility_report_requests
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('emailSent', false, 'rerunReason', 'manual rerun requested', 'rerunResetAt', now()::text)
WHERE email = 'chris.abouraad@smbteam.com'
  AND domain = 'commonsenselawyer.com';