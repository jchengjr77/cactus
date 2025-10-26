import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting update reminder check...');

    // Get all active groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .eq('is_active', true);

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch groups' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${groups?.length || 0} active groups`);

    const remindersSent = [];
    const windowsAdvanced = [];

    for (const group of groups || []) {
      try {
        // Calculate when the current update window closes
        // updates_due is when the next window opens, so current window closes at updates_due
        if (!group.updates_due) {
          console.log(`Group ${group.id} has no updates_due set, skipping`);
          continue;
        }

        const updatesDue = new Date(group.updates_due);
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // Check if the window closes in approximately 1 hour (within 5 minute window)
        const timeDiff = Math.abs(updatesDue.getTime() - oneHourFromNow.getTime());
        const fiveMinutes = 5 * 60 * 1000;

        if (timeDiff > fiveMinutes) {
          console.log(
            `Group ${group.id} window not closing in ~1 hour (closes at ${updatesDue.toISOString()}), skipping`
          );
          continue;
        }

        console.log(`Group ${group.id} window closing in ~1 hour, checking for users who haven't posted`);

        // Get all updates for this group in the current window
        // Current window started at: updates_due - cadence_hrs
        const windowStart = new Date(updatesDue.getTime() - group.cadence_hrs * 60 * 60 * 1000);

        const { data: updates, error: updatesError } = await supabase
          .from('updates')
          .select('author')
          .eq('parent_group_id', group.id)
          .gte('created_at', windowStart.toISOString())
          .lt('created_at', updatesDue.toISOString());

        if (updatesError) {
          console.error(`Error fetching updates for group ${group.id}:`, updatesError);
          continue;
        }

        // Get list of users who have already posted in this window
        const usersWhoPosted = new Set(updates?.map((u) => u.author) || []);

        // Find members who haven't posted yet
        const membersWhoHaventPosted = group.members.filter(
          (memberId: number) => !usersWhoPosted.has(memberId)
        );

        if (membersWhoHaventPosted.length === 0) {
          console.log(`All members of group ${group.id} have posted, no reminders needed`);
          continue;
        }

        console.log(
          `Group ${group.id}: ${membersWhoHaventPosted.length} members haven't posted yet`
        );

        // Send push notification to members who haven't posted
        const notificationPayload = {
          user_ids: membersWhoHaventPosted,
          title: `${group.emoji_icon || '🌵'} update reminder for ${group.name}`,
          body: `Updates are due in an hour! Don't forget to post.`,
          data: {
            type: 'update_reminder',
            group_id: group.id,
            group_name: group.name,
            closes_at: updatesDue.toISOString(),
          },
        };

        // Call the send-push-notification function
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(notificationPayload),
        });

        if (!pushResponse.ok) {
          console.error(
            `Failed to send push notifications for group ${group.id}:`,
            await pushResponse.text()
          );
          continue;
        }

        const pushResult = await pushResponse.json();
        console.log(
          `Sent ${pushResult.sent || 0} push notifications for group ${group.id}`
        );

        // Create in-app notifications for these users
        const inAppNotifications = membersWhoHaventPosted.map((userId: number) => ({
          notification_type: 'update_reminder',
          user: userId,
          opened: false,
          data: {
            group_id: group.id,
            group_name: group.name,
            group_emoji: group.emoji_icon,
            closes_at: updatesDue.toISOString(),
          },
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(inAppNotifications);

        if (notifError) {
          console.error(
            `Error creating in-app notifications for group ${group.id}:`,
            notifError
          );
        } else {
          console.log(
            `Created ${inAppNotifications.length} in-app notifications for group ${group.id}`
          );
        }

        remindersSent.push({
          group_id: group.id,
          group_name: group.name,
          users_notified: membersWhoHaventPosted.length,
          push_sent: pushResult.sent || 0,
        });
      } catch (error) {
        console.error(`Error processing group ${group.id}:`, error);
      }
    }

    // PART 2: Advance update windows for groups whose deadline has passed
    console.log('\nChecking for groups with closed windows to advance...');

    for (const group of groups || []) {
      try {
        if (!group.updates_due) {
          continue;
        }

        const updatesDue = new Date(group.updates_due);
        const now = new Date();

        // If the deadline has passed, advance to the next window
        if (now >= updatesDue) {
          const nextUpdatesDue = new Date(updatesDue.getTime() + group.cadence_hrs * 60 * 60 * 1000);

          console.log(
            `Group ${group.id} (${group.name}) window closed at ${updatesDue.toISOString()}, advancing to ${nextUpdatesDue.toISOString()}`
          );

          const { error: updateError } = await supabase
            .from('groups')
            .update({ updates_due: nextUpdatesDue.toISOString() })
            .eq('id', group.id);

          if (updateError) {
            console.error(`Error updating updates_due for group ${group.id}:`, updateError);
          } else {
            console.log(`Successfully advanced window for group ${group.id}`);
            windowsAdvanced.push({
              group_id: group.id,
              group_name: group.name,
              old_deadline: updatesDue.toISOString(),
              new_deadline: nextUpdatesDue.toISOString(),
            });
          }
        }
      } catch (error) {
        console.error(`Error advancing window for group ${group.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Update reminder check and window advancement completed',
        groups_checked: groups?.length || 0,
        reminders_sent: remindersSent,
        windows_advanced: windowsAdvanced,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-update-reminders function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
