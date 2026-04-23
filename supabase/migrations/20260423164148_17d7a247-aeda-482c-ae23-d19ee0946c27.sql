-- Reset stuck visibility_report_requests rows from the recent batch back to 'pending'
-- so the processor (with the new self-dedupe fix) can retry them.
UPDATE public.visibility_report_requests
SET status = 'pending',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('resetReason','self-dedupe-fix','resetAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
WHERE email = 'chris.abouraad@smbteam.com'
  AND status = 'processing'
  AND created_at > now() - interval '1 hour'
  AND (metadata->>'emailSent') IS DISTINCT FROM 'true';