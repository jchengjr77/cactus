-- Migration: Add Push Notification Support
-- Description: Adds push_token column to users table and sets up cron job for update reminders

-- Add push_token column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for performance when querying by push_token
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token);

-- Add comment to document the column
COMMENT ON COLUMN users.push_token IS 'Expo push notification token for sending push notifications to user devices';

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: You'll need to manually update the URL below with your project reference
-- Find it at: https://app.supabase.com/project/YOUR_PROJECT_REF

-- Schedule the check-update-reminders function to run every hour
-- IMPORTANT: Replace YOUR_PROJECT_REF with your actual Supabase project reference before running
SELECT cron.schedule(
  'check-update-reminders-hourly',
  '0 * * * *', -- Run at the start of every hour (e.g., 1:00, 2:00, 3:00, etc.)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-update-reminders',
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
-- SELECT * FROM cron.job;

-- To remove the cron job (if needed):
-- SELECT cron.unschedule('check-update-reminders-hourly');
