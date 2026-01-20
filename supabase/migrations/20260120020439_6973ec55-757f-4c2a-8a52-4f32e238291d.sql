
-- Create cron job to sync HubSpot submissions every 5 minutes
SELECT cron.schedule(
  'sync-hubspot-submissions',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cgocsffxqyhojtyzniyz.supabase.co/functions/v1/sync-hubspot-submissions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_secret()
    ),
    body := jsonb_build_object('trigger_source', 'pg_cron')
  );
  $$
);
