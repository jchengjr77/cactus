import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting cleanup of old media files...');

    // Calculate the cutoff date (1 week ago)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    console.log(`Deleting media from updates created before: ${oneWeekAgo.toISOString()}`);

    // Get all updates older than 1 week that have media
    const { data: oldUpdates, error: fetchError } = await supabase
      .from('updates')
      .select('id, created_at, media, parent_group_id')
      .lt('created_at', oneWeekAgo.toISOString())
      .not('media', 'is', null);

    if (fetchError) {
      console.error('Error fetching old updates:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch old updates' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!oldUpdates || oldUpdates.length === 0) {
      console.log('No old media to clean up');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No old media to clean up',
          updates_processed: 0,
          files_deleted: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${oldUpdates.length} updates with media to clean up`);

    let totalFilesDeleted = 0;
    let totalFilesErrored = 0;
    const updatesProcessed: number[] = [];

    for (const update of oldUpdates) {
      try {
        // Skip if media is null or empty
        if (!update.media || !Array.isArray(update.media) || update.media.length === 0) {
          continue;
        }

        console.log(`Processing update ${update.id} with ${update.media.length} media files`);

        // Delete each media file from storage
        for (const mediaPath of update.media) {
          try {
            // Media paths are stored as: {group_id}/{unique_id}.{ext}
            const { error: deleteError } = await supabase.storage
              .from('updates_media')
              .remove([mediaPath]);

            if (deleteError) {
              console.error(`Error deleting file ${mediaPath}:`, deleteError);
              totalFilesErrored++;
            } else {
              console.log(`Deleted file: ${mediaPath}`);
              totalFilesDeleted++;
            }
          } catch (fileError) {
            console.error(`Exception deleting file ${mediaPath}:`, fileError);
            totalFilesErrored++;
          }
        }

        // Clear the media array in the database
        const { error: updateError } = await supabase
          .from('updates')
          .update({ media: [] })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error clearing media array for update ${update.id}:`, updateError);
        } else {
          updatesProcessed.push(update.id);
          console.log(`Cleared media array for update ${update.id}`);
        }
      } catch (updateError) {
        console.error(`Error processing update ${update.id}:`, updateError);
      }
    }

    const summary = {
      success: true,
      message: 'Media cleanup completed',
      cutoff_date: oneWeekAgo.toISOString(),
      updates_found: oldUpdates.length,
      updates_processed: updatesProcessed.length,
      files_deleted: totalFilesDeleted,
      files_errored: totalFilesErrored,
      processed_update_ids: updatesProcessed,
    };

    console.log('Cleanup summary:', summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in cleanup-old-media function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
