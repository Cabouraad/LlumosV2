UPDATE visibility_report_requests
SET metadata = metadata - 'emailSent' - 'reportGeneratedAt' || jsonb_build_object('manualRerunAt', now()::text),
    status = 'pending'
WHERE email = 'chris.abouraad@smbteam.com'
  AND domain = 'smbteam.com'
  AND metadata->>'reportGeneratedAt' > (now() - interval '24 hours')::text;