UPDATE public.visibility_report_requests
SET metadata = (metadata - 'reportGeneratedAt' - 'emailSent') || jsonb_build_object('manualRerun', 'audit_validation_2026_04_21'),
    status = 'pending'
WHERE id = 'dccdc075-fa93-47e0-a067-45408a405d46';