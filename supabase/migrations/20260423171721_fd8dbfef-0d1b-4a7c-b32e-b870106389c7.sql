UPDATE visibility_report_requests
SET status = 'pending',
    metadata = metadata - 'processingStartedAt' - 'backgroundTriggeredAt'
WHERE email = 'chris.abouraad@smbteam.com'
  AND status = 'processing'
  AND created_at >= now() - interval '30 minutes';