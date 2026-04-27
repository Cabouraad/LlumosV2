UPDATE public.visibility_report_requests
SET status = 'pending',
    metadata = COALESCE(metadata, '{}'::jsonb) - 'emailSent' || jsonb_build_object('regenReason', 'pdf-layout-and-competitor-dedup-v3')
WHERE id = '6a5be43c-aa99-460c-b3d3-594fa062bc72';