// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface UpdatePayload {
	user_id: number;
	group_id: number;
	text: string;
	photo_urls?: string[];
}

console.info("post-update function started");

Deno.serve(async (req: Request) => {
	try {
		// Create Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
		const supabase = createClient(supabaseUrl, supabaseKey);

		// Parse request payload
		const { user_id, group_id, text, photo_urls }: UpdatePayload = await req.json();

		// Validate input (photo_urls are optional)
		if (!user_id || !group_id || !text) {
			return new Response(
				JSON.stringify({
					error: "Missing required fields: user_id, group_id, or text",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Insert new update into updates table with media URLs if provided
		const { data: newUpdate, error: insertError } = await supabase
			.from("updates")
			.insert([
				{
					author: user_id,
					parent_group_id: group_id,
					content: text,
					media: photo_urls && photo_urls.length > 0 ? photo_urls : [],
				},
			])
			.select()
			.single();

		if (insertError || !newUpdate) {
			console.error("Error adding Update:", insertError);
			return new Response(
				JSON.stringify({
					error: "Failed to create update",
					details: insertError?.message,
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
				update: newUpdate,
				message: "Update added successfully",
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
