UPDATE visibility_report_requests
SET status = 'pending',
    metadata = COALESCE(metadata, '{}'::jsonb)
              - 'processingStartedAt'
              - 'backgroundTriggeredAt'
              - 'generationStartedAt'
              - 'reportGeneratedAt'
              - 'emailSent'
              - 'emailSentAt'
              - 'reportData'
              - 'errorMessage'
              - 'lastError'
WHERE email = 'chris.abouraad@smbteam.com'
  AND created_at = '2026-04-23 17:04:57.341954+00';