-- Requires pg_cron + pg_net enabled.
-- Replace <YOUR_APP_URL> and <PUSH_DISPATCH_SECRET>.

select cron.schedule(
  'push-dispatch-every-minute',
  '* * * * *',
  $$
  select
    net.http_post(
      url := '<YOUR_APP_URL>/api/push/dispatch',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-push-dispatch-secret', '<PUSH_DISPATCH_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
