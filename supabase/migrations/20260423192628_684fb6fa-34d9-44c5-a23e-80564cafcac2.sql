UPDATE visibility_report_requests
SET status = 'error',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cleared_stuck_lock_at', now()::text)
WHERE id = '9241b817-5a35-4556-a0e0-a0e49fad21d1';