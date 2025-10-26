# Push Notification Flow Diagram

## Timeline Example: 24-Hour Cadence Group

```
Monday 2:00 PM - Group Activated
│
├─ System sets: updates_due = Tuesday 2:00 PM
│
│
Tuesday 1:00 PM - Cron Job Runs
│
├─ Detects: Window closing in 1 hour
├─ Queries: Updates created between Mon 2PM - Tue 2PM
├─ Identifies: Members who haven't posted
└─ Sends: Push notifications + in-app notifications
│
│
Tuesday 2:00 PM - Window Closes
│
│
Tuesday 3:00 PM - Cron Job Runs
│
├─ Detects: updates_due (Tue 2PM) has passed
├─ Advances: updates_due = Wednesday 2:00 PM
└─ Logs: Window advancement
│
│
Wednesday 1:00 PM - Cron Job Runs
│
├─ Detects: Window closing in 1 hour
├─ Queries: Updates created between Tue 2PM - Wed 2PM
└─ Sends: Reminders to members who haven't posted
│
│
Wednesday 2:00 PM - Window Closes
│
│
Wednesday 3:00 PM - Cron Job Runs
│
├─ Advances: updates_due = Thursday 2:00 PM
│
... Process continues ...
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   iPhone     │  │   Android    │  │   iPhone     │          │
│  │              │  │              │  │              │          │
│  │ Push Token A │  │ Push Token B │  │ Push Token C │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │ (on login)       │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CACTUS APP (Frontend)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  lib/pushNotifications.ts                                 │  │
│  │  - registerForPushNotificationsAsync()                    │  │
│  │  - savePushToken(userId, token)                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ Save to DB
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  users table                                              │  │
│  │  ┌────┬───────┬──────────────────────────────────────┐   │  │
│  │  │ id │ name  │ push_token                           │   │  │
│  │  ├────┼───────┼──────────────────────────────────────┤   │  │
│  │  │ 1  │ Alice │ ExponentPushToken[xxx...A]           │   │  │
│  │  │ 2  │ Bob   │ ExponentPushToken[xxx...B]           │   │  │
│  │  │ 3  │ Carol │ ExponentPushToken[xxx...C]           │   │  │
│  │  └────┴───────┴──────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  groups table                                             │  │
│  │  ┌────┬───────┬─────────────┬──────────────────────────┐ │  │
│  │  │ id │ name  │ cadence_hrs │ updates_due              │ │  │
│  │  ├────┼───────┼─────────────┼──────────────────────────┤ │  │
│  │  │ 1  │ Team  │ 24          │ 2025-10-27T14:00:00Z     │ │  │
│  │  │ 2  │ Fam   │ 168         │ 2025-11-02T14:00:00Z     │ │  │
│  │  └────┴───────┴─────────────┴──────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ pg_cron triggers every hour
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION (Cron Job)                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  check-update-reminders                                   │  │
│  │                                                            │  │
│  │  PART 1: Send Reminders                                   │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 1. Get all active groups                            │  │  │
│  │  │ 2. For each group:                                  │  │  │
│  │  │    - Check if updates_due in ~1 hour (±5 min)      │  │  │
│  │  │    - Query updates in current window               │  │  │
│  │  │    - Find members who haven't posted               │  │  │
│  │  │    - Call send-push-notification function          │  │  │
│  │  │    - Create in-app notifications                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  PART 2: Advance Windows                                  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 1. For each group:                                  │  │  │
│  │  │    - Check if updates_due has passed               │  │  │
│  │  │    - Calculate next: old + cadence_hrs             │  │  │
│  │  │    - Update updates_due in database                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────┬───────────────────────────────┘  │
└────────────────────────────────┼───────────────────────────────┘
                               │
                               │ Calls
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  send-push-notification                                   │  │
│  │                                                            │  │
│  │  1. Receives: user_ids, title, body, data                │  │
│  │  2. Queries: push_tokens from users table                │  │
│  │  3. Prepares: Expo push notification messages            │  │
│  │  4. Sends to: Expo Push API                              │  │
│  └───────────────────────────┬───────────────────────────────┘  │
└────────────────────────────────┼───────────────────────────────┘
                               │
                               │ POST request
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPO PUSH SERVICE                             │
│                                                                  │
│              https://exp.host/--/api/v2/push/send               │
│                                                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ Delivers to devices
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      USER DEVICES                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   iPhone     │  │   Android    │  │   iPhone     │          │
│  │              │  │              │  │              │          │
│  │ 🔔 Reminder  │  │ 🔔 Reminder  │  │              │          │
│  │ "Update due  │  │ "Update due  │  │ (already     │          │
│  │  in 1 hour"  │  │  in 1 hour"  │  │  posted)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Detail

### 1. User Login Flow
```
User Opens App
    │
    ▼
App Requests Permission
    │
    ▼
User Grants Permission
    │
    ▼
Get Expo Push Token
    │
    ▼
Save to Database
(users.push_token)
```

### 2. Group Activation Flow
```
Last Member Accepts Invite
    │
    ▼
emails_invited becomes empty
    │
    ▼
is_active = true
    │
    ▼
Round current time to nearest hour
(< 30 min → round down, ≥ 30 min → round up)
    │
    ▼
Set updates_due = rounded_time + cadence_hrs
```

### 3. Hourly Cron Job Flow
```
Cron Triggers at :00
    │
    ├─── PART 1: Check for Upcoming Deadlines
    │    │
    │    ├─ Group 1: updates_due in 1 hour?
    │    │   YES → Check who posted → Send reminders
    │    │   NO  → Skip
    │    │
    │    ├─ Group 2: updates_due in 1 hour?
    │    │   NO  → Skip
    │    │
    │    └─ Group 3: updates_due in 1 hour?
    │        YES → Check who posted → Send reminders
    │
    └─── PART 2: Advance Closed Windows
         │
         ├─ Group 1: updates_due passed?
         │   NO  → Skip
         │
         ├─ Group 2: updates_due passed?
         │   YES → Advance to next deadline
         │
         └─ Group 3: updates_due passed?
             NO  → Skip
```

### 4. Notification Delivery Flow
```
check-update-reminders finds members who haven't posted
    │
    ▼
Calls send-push-notification with user IDs
    │
    ▼
send-push-notification queries push_tokens
    │
    ▼
Formats messages for Expo
    │
    ▼
Posts to Expo Push API
    │
    ▼
Expo delivers to devices
    │
    ▼
User sees notification
    │
    ▼
User taps notification
    │
    ▼
App opens to group/update screen
```

## Timing Examples

### Example 1: Daily Updates (24h cadence)
```
Group Activated: Monday 9:17 AM
Rounded Time: 9:00 AM (17 min < 30, rounds down)
First Deadline: Tuesday 9:00 AM

Timeline:
- Mon  9:17 AM: Group activated (rounds to 9:00 AM)
                updates_due = Tue 9:00 AM
- Tue  8:00 AM: Reminders sent (1 hour before)
- Tue  9:00 AM: Window closes
- Tue 10:00 AM: Cron advances → updates_due = Wed 9:00 AM
- Wed  8:00 AM: Reminders sent
- Wed  9:00 AM: Window closes
- Wed 10:00 AM: Cron advances → updates_due = Thu 9:00 AM
```

### Example 2: Weekly Updates (168h cadence)
```
Group Activated: Monday 2:43 PM
Rounded Time: 3:00 PM (43 min ≥ 30, rounds up)
First Deadline: Next Monday 3:00 PM

Timeline:
- Mon  2:43 PM (Week 1): Group activated (rounds to 3:00 PM)
                         updates_due = Mon 3:00 PM (Week 2)
- Mon  2:00 PM (Week 2): Reminders sent (1 hour before)
- Mon  3:00 PM (Week 2): Window closes
- Mon  4:00 PM (Week 2): Cron advances → updates_due = Mon 3:00 PM (Week 3)
- Mon  2:00 PM (Week 3): Reminders sent
```

### Example 3: 12-Hour Updates
```
Group Activated: Monday 8:52 AM
Rounded Time: 9:00 AM (52 min ≥ 30, rounds up)
First Deadline: Monday 9:00 PM

Timeline:
- Mon 8:52 AM: Group activated (rounds to 9:00 AM)
               updates_due = Mon 9:00 PM
- Mon 8:00 PM: Reminders sent (1 hour before)
- Mon 9:00 PM: Window closes
- Mon 10:00 PM: Cron advances → updates_due = Tue 9:00 AM
- Tue 8:00 AM: Reminders sent
- Tue 9:00 AM: Window closes
- Tue 10:00 AM: Cron advances → updates_due = Tue 9:00 PM
```

## Key Timing Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Cron Schedule | `0 * * * *` | Runs at start of every hour |
| Reminder Window | ±5 minutes | Sends reminder if deadline in 55-65 minutes |
| Window Advance | Immediate | Advances on first cron run after deadline |
| Max Delay | ~1 hour | Between window close and advance |

## Error Handling

```
┌─────────────────────────────────────────┐
│  Notification Send Failed               │
├─────────────────────────────────────────┤
│  - Push token invalid/expired           │
│  - User uninstalled app                 │
│  - Expo API error                       │
│                                         │
│  Result:                                │
│  - Error logged to function logs        │
│  - In-app notification still created    │
│  - Other users still receive            │
│  - Cron continues to next group         │
└─────────────────────────────────────────┘
```

---

**Visual Key:**
- `│` = Process flow
- `├─` = Branch point
- `▼` = Direction of flow
- `[ ]` = Data/state
- `→` = Transformation
