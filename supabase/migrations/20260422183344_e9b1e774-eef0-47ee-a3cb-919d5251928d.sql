UPDATE public.visibility_report_requests
SET status = 'pending',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'resetReason', 'timeout_during_generation',
      'resetAt', now()::text
    )
WHERE id = 'f8487256-7798-4410-9dc7-6bf0a4faea27'
  AND status = 'processing';