UPDATE public.visibility_report_requests
SET status = 'pending',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{retryReason}',
      '"manual_reset_after_timeout"'::jsonb
    )
WHERE id = 'dccdc075-fa93-47e0-a067-45408a405d46';