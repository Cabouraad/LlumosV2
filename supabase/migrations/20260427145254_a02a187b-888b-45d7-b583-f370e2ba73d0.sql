UPDATE public.visibility_report_requests
SET status = 'pending',
    metadata = (COALESCE(metadata, '{}'::jsonb) - 'emailSent' - 'reportGeneratedAt') || jsonb_build_object('forceRegen', true, 'regenReason', 'year-sanitizer-fix')
WHERE email = 'chris.abouraad@smbteam.com' AND domain = 'smithelaw.com';