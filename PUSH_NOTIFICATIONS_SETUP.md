# Push Notifications Setup Guide

This guide explains how to set up push notifications for update reminders in the Cactus app.

## Overview

The push notification system reminds group members to post updates 1 hour before their update window closes. It consists of:

1. **Frontend**: Registers device push tokens when users log in
2. **Backend Edge Functions**:
   - `send-push-notification`: Sends push notifications via Expo
   - `check-update-reminders`: Checks for closing windows and sends reminders
3. **Database**: Stores user push tokens in the `users` table
4. **Cron Job**: Runs hourly to check for closing windows

## Setup Steps

### 1. Database Migration

Add the `push_token` column to the `users` table:

```sql
-- Add push_token column to users table
ALTER TABLE users
ADD COLUMN push_token TEXT;

-- Add index for performance
CREATE INDEX idx_users_push_token ON users(push_token);
```

Run this in your Supabase SQL Editor.

### 2. Get Expo Project ID

The Expo project ID is currently hardcoded in `lib/pushNotifications.ts:52`:

```typescript
projectId: '8c926a16-c58f-4d9a-b79f-e0bf9e95e72e'
```

To get your actual Expo project ID:
1. Go to https://expo.dev
2. Sign in and select your project
3. Copy the project ID from the URL or project settings
4. Update the `projectId` in `lib/pushNotifications.ts`

### 3. Deploy Edge Functions

Deploy the two Edge Functions to Supabase:

```bash
# Deploy the send-push-notification function
supabase functions deploy send-push-notification

# Deploy the check-update-reminders function
supabase functions deploy check-update-reminders
```

### 4. Set Up Cron Job

You need to configure a cron job to run the `check-update-reminders` function hourly.

#### Option A: Using Supabase pg_cron (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every hour
SELECT cron.schedule(
  'check-update-reminders-hourly',
  '0 * * * *', -- Run at the start of every hour
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
```

**Important**: Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

To find your project reference:
1. Go to your Supabase dashboard
2. Look at the URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`
3. Or check Settings > API > Project URL

#### Option B: Using External Cron Service

Alternatively, use a service like:
- GitHub Actions (with scheduled workflows)
- Vercel Cron Jobs
- Railway Cron
- Any cron service that can make HTTP requests

Configure it to POST to:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-update-reminders
```

With header:
```
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

### 5. Test the Setup

#### Test Push Notification Registration

1. Log in to the app on a physical device (emulators don't support push notifications well)
2. Grant notification permissions when prompted
3. Check the `users` table - your user should have a `push_token` value

#### Test the Send Function Manually

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_ids": [YOUR_USER_ID],
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {
      "type": "test"
    }
  }'
```

#### Test the Reminder Check Function

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-update-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

This will check all groups and send reminders if any windows are closing in ~1 hour.

### 6. Update Window Logic

The reminder system relies on the `updates_due` field in the `groups` table. This field should contain the timestamp when the current update window closes.

**Automatic Window Advancement**: The `check-update-reminders` function automatically advances the `updates_due` field when a window closes. Every hour when it runs, it:
1. Sends reminders for windows closing in ~1 hour
2. Checks if any windows have closed (current time >= updates_due)
3. Advances those windows to the next deadline (updates_due + cadence_hrs)

#### Initial Setup: Automatic on Group Activation

When a group becomes active (all invites accepted), `updates_due` is automatically set:

1. **Current time is rounded to nearest hour**:
   - If minutes < 30: rounds down (e.g., 2:10 PM → 2:00 PM)
   - If minutes ≥ 30: rounds up (e.g., 2:43 PM → 3:00 PM)

2. **First deadline is calculated**:
   - `updates_due = rounded_time + cadence_hrs`

**Examples**:
- Group activated at 2:10 PM with 24h cadence
  - Rounds to 2:00 PM → updates_due = next day 2:00 PM
- Group activated at 2:43 PM with 24h cadence
  - Rounds to 3:00 PM → updates_due = next day 3:00 PM

After the initial setup, the cron job automatically keeps advancing it as windows close.

## How It Works

### Flow

1. **User Login**:
   - App requests notification permissions
   - Gets Expo push token from device
   - Saves token to `users.push_token`

2. **Hourly Check** (via cron):
   - `check-update-reminders` function runs
   - Checks all active groups
   - For each group, checks if `updates_due` is in ~1 hour
   - Queries which members posted updates in the current window
   - Identifies members who haven't posted yet

3. **Send Reminders**:
   - Calls `send-push-notification` with user IDs
   - Function fetches push tokens from database
   - Sends notifications via Expo Push API
   - Creates in-app notifications in the `notifications` table

4. **Advance Closed Windows**:
   - Function checks if any windows have passed their deadline
   - For closed windows, sets `updates_due` to next deadline (old deadline + cadence_hrs)
   - Logs all window advancements

5. **User Receives Notification**:
   - Push notification appears on device
   - User can tap to open app
   - In-app notification also visible in notifications tab

### Timing Logic

- **Update Window**: From `(updates_due - cadence_hrs)` to `updates_due`
- **Reminder**: Sent when `updates_due` is approximately 1 hour away (within 5-minute tolerance)
- **User Check**: Queries updates with `created_at >= window_start AND created_at < updates_due`

## Troubleshooting

### Push Notifications Not Received

1. **Check token is saved**: Query `users` table for `push_token`
2. **Test on physical device**: Emulators are unreliable for push notifications
3. **Check Expo dashboard**: View push notification receipts at https://expo.dev
4. **Check function logs**: View Supabase function logs in dashboard

### Reminders Not Sending

1. **Check `updates_due` is set**: Groups need this field populated
2. **Check cron is running**: Look for function invocation logs
3. **Check timing**: Function looks for windows closing in 1 hour (±5 min)
4. **Check group is active**: Only `is_active: true` groups are processed

### Database Queries

```sql
-- Check users with push tokens
SELECT id, name, push_token FROM users WHERE push_token IS NOT NULL;

-- Check groups with update windows
SELECT id, name, cadence_hrs, updates_due, is_active FROM groups;

-- Check recent notifications
SELECT * FROM notifications
WHERE notification_type = 'update_reminder'
ORDER BY created_at DESC
LIMIT 10;
```

## Environment Variables Required

The Edge Functions need these environment variables (automatically available in Supabase):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin access

## Security Notes

- Push tokens are stored securely in the database
- Service role key gives admin access - keep it secret
- Edge Functions use service role for cross-user operations
- Users can only see their own notifications via RLS policies

## Next Steps

After setup, you may want to:
1. Add a settings screen for notification preferences
2. Implement notification action handlers (tap to open group)
3. Add different notification types (new comments, reactions, etc.)
4. Create a notification history/archive
5. Add sound/vibration customization

## Files Modified/Created

### Frontend
- `types/database.ts` - Added `push_token` to User, added `update_reminder` type
- `lib/pushNotifications.ts` - Push notification utilities (NEW)
- `contexts/AuthContext.tsx` - Token registration on login

### Backend
- `supabase/functions/send-push-notification/index.ts` (NEW)
- `supabase/functions/check-update-reminders/index.ts` (NEW)

### Documentation
- `PUSH_NOTIFICATIONS_SETUP.md` (NEW)
