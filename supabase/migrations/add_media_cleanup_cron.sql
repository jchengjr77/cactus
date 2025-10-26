-- Migration: Add Weekly Media Cleanup Cron Job
-- Description: Sets up a cron job to delete media files older than 1 week every Sunday at 2 AM

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: You'll need to manually update the URL below with your project reference
-- Find it at: https://app.supabase.com/project/YOUR_PROJECT_REF

-- Schedule the cleanup-old-media function to run every Sunday at 2:00 AM
-- Cron format: minute hour day-of-month month day-of-week
-- '0 2 * * 0' = At 2:00 AM on Sunday
-- IMPORTANT: Replace YOUR_PROJECT_REF with your actual Supabase project reference before running
SELECT cron.schedule(
  'cleanup-old-media-weekly',
  '0 2 * * 0', -- Every Sunday at 2:00 AM
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-old-media',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- View scheduled jobs
-- Run this to verify the cron job was created:
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-old-media-weekly';

-- To remove the cron job (if needed):
-- SELECT cron.unschedule('cleanup-old-media-weekly');

-- To run the cleanup manually:
-- SELECT net.http_post(
--   url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-old-media',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--   ),
--   body := '{}'::jsonb
-- );
