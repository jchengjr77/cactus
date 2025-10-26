# Push Notifications Implementation Summary

## ✅ What Has Been Implemented

### 1. Automatic Window Management
The `check-update-reminders` Edge Function now handles **two tasks** every hour:

1. **Send Reminders** (1 hour before deadline):
   - Checks all active groups
   - For groups with windows closing in ~1 hour (±5 minutes)
   - Identifies members who haven't posted yet
   - Sends push notifications + creates in-app notifications

2. **Advance Windows** (after deadline passes):
   - Checks all active groups
   - For groups where `updates_due` has passed
   - Automatically advances `updates_due` to next deadline: `old_deadline + cadence_hrs`
   - Logs all window advancements

### 2. Initial Window Setup
When a group becomes active (all invites accepted), the system now:
- Rounds current time to nearest hour (< 30 min rounds down, ≥ 30 min rounds up)
- Sets `updates_due` to `rounded_time + cadence_hrs`
- This happens in `app/notification/group_invite.tsx:111-130`

**Examples**:

**Example 1**: Group with 24h cadence becomes active at 2:10 PM Monday
- Rounds to: 2:00 PM (< 30 min, rounds down)
- Initial `updates_due`: Tuesday 2:00 PM
- After Tuesday 2:00 PM passes: `updates_due` → Wednesday 2:00 PM

**Example 2**: Group with 24h cadence becomes active at 2:43 PM Monday
- Rounds to: 3:00 PM (≥ 30 min, rounds up)
- Initial `updates_due`: Tuesday 3:00 PM
- After Tuesday 3:00 PM passes: `updates_due` → Wednesday 3:00 PM

### 3. Complete Flow Example

**Day 1 - Monday 2:17 PM**: Group becomes active
- Current time rounded to: 2:00 PM (< 30 min)
- System sets `updates_due = Tuesday 2:00 PM`

**Day 2 - Tuesday 1:00 PM**: Hourly cron runs
- Detects window closing in 1 hour
- Checks who posted between Monday 2 PM - Tuesday 2 PM
- Sends reminders to members who haven't posted

**Day 2 - Tuesday 2:00 PM**: Window closes

**Day 2 - Tuesday 3:00 PM**: Hourly cron runs
- Detects `updates_due` (Tue 2 PM) has passed
- Advances to next window: `updates_due = Wednesday 2:00 PM`

**Day 3 - Wednesday 1:00 PM**: Process repeats
- Sends reminders for window closing in 1 hour
- And so on...

## 📁 Files Modified

### Frontend
1. **types/database.ts**
   - Added `push_token: string | null` to User interface
   - Added `'update_reminder'` to NotificationType

2. **lib/pushNotifications.ts** (NEW)
   - `registerForPushNotificationsAsync()` - Gets Expo push token
   - `savePushToken()` - Saves to database
   - `removePushToken()` - Removes on logout

3. **contexts/AuthContext.tsx**
   - Auto-registers for push notifications on login
   - Removes token on logout

4. **app/notification/group_invite.tsx**
   - Sets initial `updates_due` when group becomes active (line 111-116)

5. **app.json**
   - Added Expo project ID configuration

### Backend
1. **supabase/functions/send-push-notification/index.ts** (NEW)
   - Sends push notifications via Expo Push API
   - Accepts array of user IDs

2. **supabase/functions/check-update-reminders/index.ts** (NEW)
   - Part 1: Sends reminders 1 hour before deadline
   - Part 2: Advances `updates_due` after deadline passes
   - Runs hourly via cron job

3. **supabase/migrations/add_push_notifications.sql** (NEW)
   - Adds `push_token` column to users table
   - Sets up hourly cron job

### Documentation
1. **PUSH_NOTIFICATIONS_SETUP.md** (NEW)
   - Complete setup guide
   - Testing instructions
   - Troubleshooting

2. **scripts/test-notifications.sh** (NEW)
   - Interactive testing script

## 🚀 Deployment Steps

### 1. Database Migration
Run in Supabase SQL Editor:
```sql
-- Add push_token column
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token);
```

### 2. Set Up Cron Job
Replace `YOUR_PROJECT_REF` with your actual project reference, then run:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'check-update-reminders-hourly',
  '0 * * * *',
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

### 3. Deploy Edge Functions
```bash
supabase functions deploy send-push-notification
supabase functions deploy check-update-reminders
```

### 4. Update Expo Project ID (if needed)
The project ID in `app.json` is currently set to: `clutisavqqhkfgknfixo`

If this is not correct:
1. Check your project at https://expo.dev
2. Update the `projectId` in `app.json` line 13

## 🧪 Testing

### Test on Physical Device
1. Log in to the app
2. Accept notification permissions
3. Check database: `SELECT id, name, push_token FROM users WHERE push_token IS NOT NULL;`

### Test Push Notifications
```bash
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
./scripts/test-notifications.sh
```

### Manually Trigger Cron Job
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-update-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

## 📊 Monitoring

### Check Cron Job Status
```sql
SELECT * FROM cron.job WHERE jobname = 'check-update-reminders-hourly';
```

### View Function Logs
Go to: Supabase Dashboard → Edge Functions → check-update-reminders → Logs

### Check Recent Notifications
```sql
SELECT * FROM notifications
WHERE notification_type = 'update_reminder'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Group Windows
```sql
SELECT
  id,
  name,
  cadence_hrs,
  updates_due,
  is_active,
  CASE
    WHEN updates_due IS NULL THEN 'No deadline set'
    WHEN updates_due < NOW() THEN 'Window closed (will advance on next cron run)'
    WHEN updates_due < NOW() + INTERVAL '1 hour' THEN 'Closing soon (reminders will be sent)'
    ELSE 'Window open'
  END as status
FROM groups
WHERE is_active = true;
```

## ⚠️ Important Notes

1. **Physical Devices Only**: Push notifications don't work reliably on emulators

2. **Timing Precision**: The system checks every hour, so:
   - Reminders sent when deadline is 1 hour ± 5 minutes away
   - Windows advanced shortly after they close (within 1 hour)

3. **No Manual Setup Needed**: Once a group becomes active, the system handles everything automatically

4. **Cron Runs Hourly**: The function runs at :00 of every hour (1:00, 2:00, 3:00, etc.)

## 🔄 What Happens Automatically

### When User Logs In
✅ Requests notification permissions
✅ Gets push token
✅ Saves to database

### When Group Becomes Active
✅ Sets initial `updates_due`

### Every Hour (Cron Job)
✅ Checks for windows closing in ~1 hour
✅ Sends reminders to members who haven't posted
✅ Creates in-app notifications
✅ Advances closed windows to next deadline

### When User Logs Out
✅ Removes push token from database

## 🎯 Future Enhancements

Potential improvements for later:
- [ ] Send notification when window opens
- [ ] Send "missed update" notification after window closes
- [ ] Add notification for new comments/reactions
- [ ] Allow users to customize notification preferences
- [ ] Add "streak" notifications for consistent posting
- [ ] Implement notification action handlers (deep linking)
- [ ] Add scheduled notifications for specific times (e.g., 9 AM daily)

## 📞 Support

For issues:
1. Check function logs in Supabase dashboard
2. Verify cron job is running: `SELECT * FROM cron.job;`
3. Test manually with `scripts/test-notifications.sh`
4. Review PUSH_NOTIFICATIONS_SETUP.md for detailed troubleshooting

---

**Status**: ✅ Ready for deployment
**Last Updated**: 2025-10-26
