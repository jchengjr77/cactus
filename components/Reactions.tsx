import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Reaction } from "@/types/database";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

interface ReactionsProps {
	reactionIds: number[];
	updateId: number;
	groupPoints: number;
	onReactionAdded?: () => void;
}

interface GroupedReaction {
	emoji: string;
	count: number;
	userIds: number[];
}

const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥"];

export default function Reactions({
	reactionIds,
	updateId,
	groupPoints,
	onReactionAdded,
}: ReactionsProps) {
	const { user } = useAuth();
	const [reactions, setReactions] = useState<Reaction[]>([]);
	const [groupedReactions, setGroupedReactions] = useState<GroupedReaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [adding, setAdding] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<number | null>(null);
	const [showPicker, setShowPicker] = useState(false);
	const [availableReactions, setAvailableReactions] = useState<string[]>(DEFAULT_REACTIONS);

	useEffect(() => {
		if (user?.email) {
			fetchCurrentUser();
		}
	}, [user]);

	useEffect(() => {
		if (reactionIds.length > 0) {
			fetchReactions();
		} else {
			setReactions([]);
			setGroupedReactions([]);
			setLoading(false);
		}
	}, [reactionIds]);

	useEffect(() => {
		// Group reactions by emoji
		const grouped: { [key: string]: GroupedReaction } = {};

		reactions.forEach((reaction) => {
			if (!grouped[reaction.reaction]) {
				grouped[reaction.reaction] = {
					emoji: reaction.reaction,
					count: 0,
					userIds: [],
				};
			}
			grouped[reaction.reaction].count++;
			grouped[reaction.reaction].userIds.push(reaction.user);
		});

		setGroupedReactions(Object.values(grouped));
	}, [reactions]);

	useEffect(() => {
		fetchAvailableReactions();
	}, [groupPoints]);

	useEffect(() => {
		// Fetch reactions when modal opens to ensure latest data
		if (showPicker) {
			fetchAvailableReactions();
		}
	}, [showPicker]);

	const fetchCurrentUser = async () => {
		if (!user?.email) return;

		try {
			const { data } = await supabase
				.from("users")
				.select("id")
				.eq("email", user.email)
				.single();

			if (data) {
				setCurrentUserId(data.id);
			}
		} catch (error) {
			console.error("Error fetching current user:", error);
		}
	};

	const fetchReactions = async () => {
		try {
			setLoading(true);

			const { data, error } = await supabase
				.from("reactions")
				.select("*")
				.in("id", reactionIds);

			if (error) {
				console.error("Error fetching reactions:", error);
				return;
			}

			setReactions(data || []);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchAvailableReactions = async () => {
		try {
			const { data, error } = await supabase
				.from("reaction_packs")
				.select("*")
				.lte("unlock_threshold", groupPoints)
				.order("unlock_threshold", { ascending: true });

			if (error) {
				console.error("Error fetching reaction packs:", error);
				return;
			}

			// Combine all available reactions from unlocked packs
			const allReactions = new Set<string>();
			(data || []).forEach((pack) => {
				pack.reactions.forEach((emoji: string) => allReactions.add(emoji));
			});

			setAvailableReactions(Array.from(allReactions));
		} catch (error) {
			console.error("Error:", error);
		}
	};

	const handleAddReaction = async (emoji: string) => {
		if (!currentUserId || adding) return;

		// Check if user already has this reaction
		const existingReaction = reactions.find(
			r => r.user === currentUserId && r.reaction === emoji
		);

		if (existingReaction) {
			// Remove the reaction
			await handleRemoveReaction(existingReaction.id);
			return;
		}

		setAdding(true);
		setShowPicker(false);

		try {
			const { data, error } = await supabase.functions.invoke("add-reaction", {
				body: {
					user_id: currentUserId,
					update_id: updateId,
					reaction: emoji,
				},
			});

			if (error) {
				console.error("Error adding reaction:", error);
				return;
			}

			// Check if this was a duplicate reaction (server returns error message in data)
			if (data?.error || data?.message?.includes("Duplicate")) {
				// User already has this reaction, silently ignore
				return;
			}

			// If reaction was successfully added, fetch updated reactions
			if (data?.reaction) {
				// Add the new reaction to the local state immediately
				const newReaction: Reaction = {
					id: data.reaction.id,
					created_at: data.reaction.created_at,
					user: currentUserId,
					update: updateId,
					reaction: emoji,
				};

				setReactions(prev => [...prev, newReaction]);

				// Optionally notify parent (for updating counts, etc.)
				if (onReactionAdded) {
					onReactionAdded();
				}
			}
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setAdding(false);
		}
	};

	const handleRemoveReaction = async (reactionId: number) => {
		if (!currentUserId || adding) return;

		setAdding(true);

		try {
			// First, get the current reactions array from the update
			const { data: updateData, error: fetchError } = await supabase
				.from("updates")
				.select("reactions")
				.eq("id", updateId)
				.single();

			if (fetchError) {
				console.error("Error fetching update:", fetchError);
				return;
			}

			// Remove the reaction ID from the reactions array
			const updatedReactions = (updateData?.reactions || []).filter(
				(id: number) => id !== reactionId
			);

			// Update the update's reactions array
			const { error: updateError } = await supabase
				.from("updates")
				.update({ reactions: updatedReactions })
				.eq("id", updateId);

			if (updateError) {
				console.error("Error updating update reactions:", updateError);
				return;
			}

			// Delete the reaction from the reactions table
			const { error: deleteError } = await supabase
				.from("reactions")
				.delete()
				.eq("id", reactionId);

			if (deleteError) {
				console.error("Error deleting reaction:", deleteError);
				return;
			}

			// Remove the reaction from local state immediately
			setReactions(prev => prev.filter(r => r.id !== reactionId));

			// Optionally notify parent
			if (onReactionAdded) {
				onReactionAdded();
			}
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setAdding(false);
		}
	};

	const hasUserReacted = (userIds: number[]) => {
		return currentUserId ? userIds.includes(currentUserId) : false;
	};

	if (loading && reactionIds.length > 0) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color={Colors.brandGreen} />
			</View>
		);
	}

	// Calculate modal width based on number of emojis
	const calculateModalWidth = () => {
		const emojiCount = availableReactions.length;
		const emojisPerRow = Math.min(emojiCount, 6);
		const emojiSize = 44;
		const gap = 8;
		const padding = 16 * 2;

		// Width = (number of emojis * size) + (gaps between emojis) + padding
		const width = (emojisPerRow * emojiSize) + ((emojisPerRow - 1) * gap) + padding;
		return width;
	};

	return (
		<View style={styles.container}>
			<View style={styles.reactionsContainer}>
				{groupedReactions.map((grouped, index) => (
					<TouchableOpacity
						key={`${grouped.emoji}-${index}`}
						style={[
							styles.reactionBubble,
							hasUserReacted(grouped.userIds) && styles.reactionBubbleActive,
						]}
						onPress={() => handleAddReaction(grouped.emoji)}
					>
						<Text style={styles.reactionEmoji}>{grouped.emoji}</Text>
						<Text
							style={[
								styles.reactionCount,
								hasUserReacted(grouped.userIds) && styles.reactionCountActive,
							]}
						>
							{grouped.count}
						</Text>
					</TouchableOpacity>
				))}

				<TouchableOpacity
					style={styles.addReactionButton}
					onPress={() => setShowPicker(true)}
					disabled={adding}
				>
					{adding ? (
						<ActivityIndicator size="small" color="#999999" />
					) : (
						<Text style={styles.addReactionText}>+</Text>
					)}
				</TouchableOpacity>
			</View>

			<Modal
				visible={showPicker}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setShowPicker(false)}
			>
				<Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
					<Pressable
						style={[styles.modalContent, { width: calculateModalWidth() }]}
						onPress={(e) => e.stopPropagation()}
					>
						<ScrollView
							contentContainerStyle={styles.reactionPickerGrid}
							showsVerticalScrollIndicator={false}
						>
							{availableReactions.map((emoji, index) => (
								<TouchableOpacity
									key={`picker-${emoji}-${index}`}
									style={styles.pickerEmoji}
									onPress={() => handleAddReaction(emoji)}
									disabled={adding}
								>
									<Text style={styles.pickerEmojiText}>{emoji}</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</Pressable>
				</Pressable>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		padding: 8,
	},
	reactionsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 4,
		alignItems: "center",
	},
	reactionBubble: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
		backgroundColor: "#F5F5F5",
		borderWidth: 1,
		borderColor: "#E0E0E0",
		gap: 3,
	},
	reactionBubbleActive: {
		backgroundColor: "#E8F5E9",
		borderColor: Colors.brandGreen,
	},
	reactionEmoji: {
		fontSize: 14,
	},
	reactionCount: {
		fontSize: 11,
		fontWeight: "600",
		color: "#666666",
	},
	reactionCountActive: {
		color: Colors.brandGreen,
	},
	addReactionButton: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "#F5F5F5",
		borderWidth: 1,
		borderColor: "#E0E0E0",
		alignItems: "center",
		justifyContent: "center",
	},
	addReactionText: {
		fontSize: 16,
		color: "#999999",
		fontWeight: "600",
		lineHeight: 16,
		textAlign: "center",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		backgroundColor: "#FFFFFF",
		borderRadius: 16,
		padding: 16,
		maxHeight: "75%",
	},
	reactionPickerGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	pickerEmoji: {
		width: 44,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#F5F5F5",
		borderRadius: 8,
	},
	pickerEmojiText: {
		fontSize: 24,
	},
});
