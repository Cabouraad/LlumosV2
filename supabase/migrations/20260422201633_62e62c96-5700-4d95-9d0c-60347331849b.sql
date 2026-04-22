UPDATE public.visibility_report_requests
SET metadata = jsonb_set(
  jsonb_set(COALESCE(metadata, '{}'::jsonb), '{emailSent}', 'false'::jsonb),
  '{reportGeneratedAt}',
  'null'::jsonb
)
WHERE id = 'f8487256-7798-4410-9dc7-6bf0a4faea27';