UPDATE visibility_report_requests
SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{emailSent}', 'false'::jsonb)
WHERE email = 'chris.abouraad@smbteam.com'
  AND domain = 'smbteam.com'
  AND created_at > now() - interval '2 days';