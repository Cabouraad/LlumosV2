UPDATE visibility_report_requests
SET status='pending',
    processed_at=NULL,
    metadata = (COALESCE(metadata,'{}'::jsonb) - 'emailSent' - 'reportGeneratedAt')
               || '{"companyName":"Allmand Law","resetReason":"fix_self_as_competitor"}'::jsonb
WHERE id='103919b0-e045-48f5-b284-75dee594c468';