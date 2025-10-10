// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface ReactionPayload {
  user_id: number;
  update_id: number;
  reaction: string;
}

console.info("add-reaction function started");

Deno.serve(async (req: Request) => {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request payload
    const { user_id, update_id, reaction }: ReactionPayload = await req.json();

    // Validate input
    if (!user_id || !update_id || !reaction) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: user_id, update_id, or reaction",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has already reacted with this emoji
    const { data: existingReaction, error: checkError } = await supabase
      .from("reactions")
      .select("id")
      .eq("user", user_id)
      .eq("update", update_id)
      .eq("reaction", reaction)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing reaction:", checkError);
      return new Response(
        JSON.stringify({
          error: "Failed to check existing reactions",
          details: checkError?.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (existingReaction) {
      return new Response(
        JSON.stringify({
          error: "User has already reacted with this emoji",
          message: "Duplicate reaction not allowed",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Insert new reaction into reactions table
    const { data: newReaction, error: insertError } = await supabase
      .from("reactions")
      .insert([
        {
          user: user_id,
          update: update_id,
          reaction: reaction,
        },
      ])
      .select()
      .single();

    if (insertError || !newReaction) {
      console.error("Error inserting reaction:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to create reaction",
          details: insertError?.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get current update's reactions array
    const { data: currentUpdate, error: fetchError } = await supabase
      .from("updates")
      .select("reactions")
      .eq("id", update_id)
      .single();

    if (fetchError || !currentUpdate) {
      console.error("Error fetching update:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch update",
          details: fetchError?.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Add new reaction ID to the update's reactions array
    const updatedReactions = [...(currentUpdate.reactions || []), newReaction.id];

    const { error: updateError } = await supabase
      .from("updates")
      .update({ reactions: updatedReactions })
      .eq("id", update_id);

    if (updateError) {
      console.error("Error updating update's reactions array:", updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to update reactions array",
          details: updateError?.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        reaction: newReaction,
        message: "Reaction added successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Connection": "keep-alive" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
