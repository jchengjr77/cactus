import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Comment, Update } from "@/types/database";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import Gallery from 'react-native-awesome-gallery';
import Reactions from "@/components/Reactions";
import { MaterialIcons } from '@expo/vector-icons';
import MyText from "@/components/MyText";
import MyTextInput from "@/components/MyTextInput";
import MyHeading from "@/components/MyHeading";
import MyBoldText from "@/components/MyBoldText";
import MySemiBoldText from "@/components/MySemiBoldText";

// Component that manages gallery for an update
function PhotoGallery({
	photoPaths,
	onImagePress
}: {
	photoPaths: string[];
	onImagePress: (images: string[], index: number) => void;
}) {
	const [imageUrls, setImageUrls] = useState<(string | null)[]>(
		new Array(photoPaths.length).fill(null)
	);

	useEffect(() => {
		loadAllImages();
	}, [photoPaths]);

	const loadAllImages = async () => {
		const urls = await Promise.all(
			photoPaths.map(async (photoPath) => {
				// Check if image is already in cache
				if (imageCache.has(photoPath)) {
					return imageCache.get(photoPath)!;
				}

				try {
					const { data, error } = await supabase.storage
						.from('updates_media')
						.download(photoPath);

					if (error || !data) {
						console.error('Error downloading photo:', error);
						return null;
					}

					const imageUrl = await new Promise<string | null>((resolve) => {
						const reader = new FileReader();
						reader.onloadend = () => resolve(reader.result as string);
						reader.onerror = () => resolve(null);
						reader.readAsDataURL(data);
					});

					// Store in cache if successfully loaded
					if (imageUrl) {
						imageCache.set(photoPath, imageUrl);
					}

					return imageUrl;
				} catch (error) {
					console.error('Error loading photo:', error);
					return null;
				}
			})
		);
		setImageUrls(urls);
	};

	const handleImagePress = (index: number) => {
		const loadedImages = imageUrls.filter((url): url is string => url !== null);
		if (loadedImages.length > 0) {
			onImagePress(loadedImages, index);
		}
	};

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			style={styles.photosContainer}
		>
			{photoPaths.map((photoPath, index) => {
				const imageUrl = imageUrls[index];

				if (imageUrl === null) {
					// Still loading this specific image
					return (
						<View
							key={index}
							style={[styles.photoThumbnail, { justifyContent: 'center', alignItems: 'center', marginRight: 12 }]}
						>
							<ActivityIndicator size="small" color={Colors.brandGreen} />
						</View>
					);
				}

				return (
					<TouchableOpacity
						key={index}
						onPress={() => handleImagePress(index)}
						activeOpacity={0.9}
						style={{ marginRight: 12 }}
					>
						<Image
							source={{ uri: imageUrl }}
							style={styles.photoThumbnail}
							resizeMode="cover"
						/>
					</TouchableOpacity>
				);
			})}
		</ScrollView>
	);
}

interface UpdateWithUser extends Update {
	user_name: string;
	user_avatar_color?: string | null;
	group_name?: string;
	group_emoji?: string;
}

interface CommentWithUser extends Comment {
	user_name: string;
	user_avatar_color?: string | null;
}

const PAGE_SIZE = 20;

// Image cache to store loaded images
const imageCache = new Map<string, string>();

export default function UpdateDetailsScreen() {
	const router = useRouter();
	const { user } = useAuth();
	const { id } = useLocalSearchParams();
	const [update, setUpdate] = useState<UpdateWithUser | null>(null);
	const [comments, setComments] = useState<CommentWithUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [offset, setOffset] = useState(0);
	const [commentInput, setCommentInput] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<number | null>(null);
	const [groupPoints, setGroupPoints] = useState<number>(0);
	const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
	const [galleryImages, setGalleryImages] = useState<string[]>([]);
	const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
	const [isEditModalVisible, setIsEditModalVisible] = useState(false);
	const [editedContent, setEditedContent] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	useEffect(() => {
		if (user?.email) {
			fetchCurrentUser();
		}
	}, [user]);

	useEffect(() => {
		if (id) {
			fetchUpdate();
			fetchComments(true);
		}
	}, [id]);

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

	const fetchUpdate = async () => {
		try {
			const { data, error } = await supabase
				.from("updates")
				.select("*, users!inner(name, avatar_color), groups!parent_group_id(name, emoji_icon, points)")
				.eq("id", id)
				.single();

			if (error) {
				console.error("Error fetching update:", error);
				return;
			}

			if (data) {
				const transformedUpdate: UpdateWithUser = {
					id: data.id,
					created_at: data.created_at,
					user_id: data.author,
					group_id: data.parent_group_id,
					content: data.content,
					read_by: data.read_by || [],
					comments: data.comments || [],
					reactions: data.reactions || [],
					media_url: data.media_url,
					media_type: data.media_type,
					media: data.media || [],
					user_name: data.users?.name || "Unknown",
					user_avatar_color: data.users?.avatar_color || null,
					group_name: data.groups?.name || "Group",
					group_emoji: data.groups?.emoji_icon || null,
				};
				setUpdate(transformedUpdate);
				setGroupPoints(data.groups?.points || 0);
			}
		} catch (error) {
			console.error("Error:", error);
		}
	};

	const fetchComments = async (refresh: boolean = false) => {
		try {
			if (refresh) {
				setLoading(true);
				setOffset(0);
				setHasMore(true);
			} else {
				setLoadingMore(true);
			}

			const currentOffset = refresh ? 0 : offset;

			const { data, error } = await supabase
				.from("comments")
				.select("*, users!inner(name, avatar_color)")
				.eq("update", id)
				.order("created_at", { ascending: true })
				.range(currentOffset, currentOffset + PAGE_SIZE - 1);

			if (error) {
				console.error("Error fetching comments:", error);
				return;
			}

			const transformedComments: CommentWithUser[] = (data || []).map(
				(item: any) => ({
					id: item.id,
					created_at: item.created_at,
					content: item.content,
					update: item.update,
					user: item.user,
					user_name: item.users?.name || "Unknown",
					user_avatar_color: item.users?.avatar_color || null,
				})
			);

			setHasMore(transformedComments.length === PAGE_SIZE);

			if (refresh) {
				setComments(transformedComments);
				setOffset(PAGE_SIZE);
			} else {
				setComments((prev) => [...prev, ...transformedComments]);
				setOffset(currentOffset + PAGE_SIZE);
			}
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	};

	const handleLoadMore = () => {
		if (!loadingMore && hasMore) {
			fetchComments(false);
		}
	};

	const handleEditUpdate = () => {
		if (!update) return;
		setEditedContent(update.content);
		setIsEditModalVisible(true);
	};

	const handleSaveEdit = async () => {
		if (!editedContent.trim() || isSaving) return;

		setIsSaving(true);

		try {
			const { error } = await supabase
				.from("updates")
				.update({ content: editedContent.trim() })
				.eq("id", id);

			if (error) {
				console.error("Error updating content:", error);
				Alert.alert("Error", "Failed to update. Please try again.");
				return;
			}

			// Update local state
			if (update) {
				setUpdate({ ...update, content: editedContent.trim() });
			}

			setIsEditModalVisible(false);
		} catch (error) {
			console.error("Error:", error);
			Alert.alert("Error", "Failed to update. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteUpdate = async () => {
		if (isDeleting) return;

		setIsDeleting(true);
		setShowDeleteConfirm(false);

		try {
			// First, delete all reactions associated with this update
			if (update?.reactions && update.reactions.length > 0) {
				const { error: reactionsError } = await supabase
					.from("reactions")
					.delete()
					.in("id", update.reactions);

				if (reactionsError) {
					console.error("Error deleting reactions:", reactionsError);
					Alert.alert("Error", "Failed to delete. Please try again.");
					setIsDeleting(false);
					return;
				}
			}

			// Then, delete all comments associated with this update
			if (update?.comments && update.comments.length > 0) {
				const { error: commentsError } = await supabase
					.from("comments")
					.delete()
					.in("id", update.comments);

				if (commentsError) {
					console.error("Error deleting comments:", commentsError);
					Alert.alert("Error", "Failed to delete. Please try again.");
					setIsDeleting(false);
					return;
				}
			}

			// Finally, delete the update itself
			const { error } = await supabase
				.from("updates")
				.delete()
				.eq("id", id);

			if (error) {
				console.error("Error deleting update:", error);
				Alert.alert("Error", "Failed to delete. Please try again.");
				return;
			}

			// Navigate back to feed
			router.replace("/(tabs)");
		} catch (error) {
			console.error("Error:", error);
			Alert.alert("Error", "Failed to delete. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleSubmitComment = async () => {
		if (!commentInput.trim() || !currentUserId || submitting) return;

		setSubmitting(true);

		try {
			// Insert the comment and get the created comment data
			const { data: newComment, error: commentError } = await supabase
				.from("comments")
				.insert([
					{
						content: commentInput.trim(),
						update: id,
						user: currentUserId,
					},
				])
				.select()
				.single();

			if (commentError || !newComment) {
				console.error("Error submitting comment:", commentError);
				return;
			}

			// Get the current update's comments array
			const { data: currentUpdate, error: fetchError } = await supabase
				.from("updates")
				.select("comments")
				.eq("id", id)
				.single();

			if (fetchError || !currentUpdate) {
				console.error("Error fetching update:", fetchError);
				return;
			}

			// Add the new comment ID to the update's comments array
			const updatedComments = [...(currentUpdate.comments || []), newComment.id];

			const { error: updateError } = await supabase
				.from("updates")
				.update({ comments: updatedComments })
				.eq("id", id);

			if (updateError) {
				console.error("Error updating update's comments array:", updateError);
				return;
			}

			setCommentInput("");
			// Refresh comments to show the new one
			fetchComments(true);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setSubmitting(false);
		}
	};

	const renderFooter = () => {
		if (!loadingMore) return null;
		return (
			<View style={styles.footerLoader}>
				<ActivityIndicator size="small" color={Colors.brandGreen} />
			</View>
		);
	};

	const renderComment = ({ item }: { item: CommentWithUser }) => (
		<View style={styles.commentCard}>
			<View style={styles.commentRow}>
				<View
					style={[
						styles.avatar,
						{ backgroundColor: item.user_avatar_color || "#E0E0E0" },
					]}
				>
					<MyText style={styles.avatarText}>
						{item.user_name?.[0]?.toUpperCase() || "U"}
					</MyText>
				</View>
				<View style={styles.commentContentWrapper}>
					<View style={styles.commentHeader}>
						<MyBoldText style={styles.userName}>{item.user_name}</MyBoldText>
						<MyText style={styles.timestamp}>{formatTimeAgo(item.created_at)}</MyText>
					</View>
					<MyText style={styles.commentContent}>{item.content}</MyText>
				</View>
			</View>
		</View>
	);

	if (loading || !update) {
		return (
			<View style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.brandGreen} />
				</View>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
		>
			<View style={styles.header}>
				<View style={styles.headerTop}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
						<MySemiBoldText style={styles.backButtonText}>←</MySemiBoldText>
					</TouchableOpacity>
					{update.group_id && (
						<TouchableOpacity
							style={styles.groupNameButton}
							onPress={() => router.replace(`/group/${update.group_id}`)}
						>
							<MyBoldText style={styles.groupNameText}>
								{update.group_emoji ? `${update.group_emoji} ` : ''}{update.group_name}
							</MyBoldText>
						</TouchableOpacity>
					)}
				</View>
			</View>

			<Modal
				visible={selectedPhoto !== null}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setSelectedPhoto(null)}
			>
				<View style={styles.modalContainer}>
					<TouchableOpacity
						style={styles.closeButton}
						onPress={() => setSelectedPhoto(null)}
					>
						<MyText style={styles.closeButtonText}>✕</MyText>
					</TouchableOpacity>
					{selectedPhoto && galleryImages.length > 0 && (
						<Gallery
							data={galleryImages}
							initialIndex={galleryInitialIndex}
							onSwipeToClose={() => setSelectedPhoto(null)}
							onTap={() => setSelectedPhoto(null)}
						/>
					)}
				</View>
			</Modal>

			{/* Edit Modal */}
			<Modal
				visible={isEditModalVisible}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setIsEditModalVisible(false)}
			>
				<Pressable
					style={styles.modalOverlay}
					onPress={() => setIsEditModalVisible(false)}
				>
					<Pressable
						style={styles.editModalContent}
						onPress={(e) => e.stopPropagation()}
					>
						<MyBoldText style={styles.modalTitle}>edit update</MyBoldText>
						<MyTextInput
							style={styles.editTextArea}
							value={editedContent}
							onChangeText={(text) => {
								if (text.length <= 300) {
									setEditedContent(text);
								}
							}}
							placeholder="what's happening?"
							placeholderTextColor="#999"
							multiline
							textAlignVertical="top"
							maxLength={300}
						/>
						<MyText style={styles.charCount}>{editedContent.length}/300</MyText>
						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => setIsEditModalVisible(false)}
							>
								<MySemiBoldText style={styles.cancelButtonText}>cancel</MySemiBoldText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.saveButton, (!editedContent.trim() || isSaving) && styles.saveButtonDisabled]}
								onPress={handleSaveEdit}
								disabled={!editedContent.trim() || isSaving}
							>
								<MySemiBoldText style={[styles.saveButtonText, (!editedContent.trim() || isSaving) && styles.saveButtonTextDisabled]}>
									{isSaving ? "saving..." : "save"}
								</MySemiBoldText>
							</TouchableOpacity>
						</View>
					</Pressable>
				</Pressable>
			</Modal>

			{/* Delete Confirmation Modal */}
			<Modal
				visible={showDeleteConfirm}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setShowDeleteConfirm(false)}
			>
				<Pressable
					style={styles.modalOverlay}
					onPress={() => setShowDeleteConfirm(false)}
				>
					<Pressable
						style={styles.deleteModalContent}
						onPress={(e) => e.stopPropagation()}
					>
						<MyBoldText style={styles.modalTitle}>delete update?</MyBoldText>
						<MyText style={styles.deleteWarning}>
							this action cannot be undone
						</MyText>
						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => setShowDeleteConfirm(false)}
							>
								<MySemiBoldText style={styles.cancelButtonText}>cancel</MySemiBoldText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
								onPress={handleDeleteUpdate}
								disabled={isDeleting}
							>
								<MySemiBoldText style={[styles.deleteButtonText, isDeleting && styles.deleteButtonTextDisabled]}>
									{isDeleting ? "deleting..." : "delete"}
								</MySemiBoldText>
							</TouchableOpacity>
						</View>
					</Pressable>
				</Pressable>
			</Modal>

			<FlatList
				data={comments}
				renderItem={renderComment}
				keyExtractor={(item) => item.id.toString()}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={renderFooter}
				ListHeaderComponent={
					<>
						<View style={styles.updateSection}>
							<View style={styles.updateCard}>
								<View style={styles.updateRow}>
									<View
										style={[
											styles.avatar,
											{ backgroundColor: update.user_avatar_color || "#E0E0E0" },
										]}
									>
										<MyText style={styles.avatarText}>
											{update.user_name?.[0]?.toUpperCase() || "U"}
										</MyText>
									</View>
									<View style={styles.updateContentWrapper}>
										<View style={styles.updateHeader}>
											<MyBoldText style={styles.userName}>{update.user_name}</MyBoldText>
											<MyText style={styles.timestamp}>
												{formatTimeAgo(update.created_at)}
											</MyText>
										</View>
										<MyText style={styles.updateContent}>{update.content}</MyText>
										{update.media && update.media.length > 0 && (
											<PhotoGallery
												photoPaths={update.media}
												onImagePress={(images, index) => {
													setGalleryImages(images);
													setGalleryInitialIndex(index);
													setSelectedPhoto(images[0]); // Just to trigger modal open
												}}
											/>
										)}
										<View style={styles.bottomSection}>
											<View style={styles.reactionsContainer}>
												<Reactions
													reactionIds={update.reactions}
													updateId={update.id}
													groupPoints={groupPoints}
												/>
											</View>
											{currentUserId === update.user_id && (
												<View style={styles.actionButtons}>
													<TouchableOpacity
														style={styles.iconButton}
														onPress={handleEditUpdate}
													>
														<MaterialIcons name="edit" size={20} color={Colors.brandGreen} />
													</TouchableOpacity>
													<TouchableOpacity
														style={styles.iconButton}
														onPress={() => setShowDeleteConfirm(true)}
													>
														<MaterialIcons name="delete" size={20} color="#DC2626" />
													</TouchableOpacity>
												</View>
											)}
										</View>
									</View>
								</View>
							</View>
						</View>
						<View style={styles.divider} />
					</>
				}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<MySemiBoldText style={styles.emptyStateText}>no comments yet</MySemiBoldText>
						<MyText style={styles.emptyStateSubtext}>say what you wanna say</MyText>
					</View>
				}
			/>

			<View style={styles.commentInputContainer}>
				<MyTextInput
					style={styles.commentInput}
					value={commentInput}
					onChangeText={setCommentInput}
					placeholder="Add a comment..."
					placeholderTextColor="#999"
					multiline
					maxLength={500}
				/>
				<TouchableOpacity
					style={[
						styles.submitButton,
						(!commentInput.trim() || submitting) && styles.submitButtonDisabled,
					]}
					onPress={handleSubmitComment}
					disabled={!commentInput.trim() || submitting}
				>
					<MySemiBoldText
						style={[
							styles.submitButtonText,
							(!commentInput.trim() || submitting) &&
								styles.submitButtonTextDisabled,
						]}
					>
						{submitting ? "..." : "post"}
					</MySemiBoldText>
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	);
}

function formatTimeAgo(dateString: string): string {
	const now = Date.now();
	const past = new Date(dateString).getTime();
	const diff = now - past;

	const minutes = Math.floor(diff / (1000 * 60));
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	return "just now";
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		paddingHorizontal: 24,
		paddingTop: 60,
		paddingBottom: 16,
	},
	headerTop: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	backButton: {
		padding: 4,
	},
	backButtonText: {
		fontSize: 16,
		color: Colors.brandGreen,
	},
	groupNameButton: {
		flex: 1,
		alignItems: 'flex-end',
	},
	groupNameText: {
		fontSize: 17,
		color: Colors.black,
		borderWidth: 1,
		borderColor: Colors.lightGrey,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	bottomSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 2,
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	iconButton: {
		padding: 4,
	},
	title: {
		fontSize: 17,
		color: Colors.black,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	listContent: {
		paddingBottom: 16,
	},
	updateSection: {
		paddingTop: 8,
	},
	updateCard: {
		backgroundColor: Colors.background,
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	updateRow: {
		flexDirection: "row",
		gap: 12,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarText: {
		fontSize: 16,
		color: "#666666",
	},
	updateContentWrapper: {
		flex: 1,
		gap: 8,
	},
	updateHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	userName: {
		fontSize: 15,
		color: Colors.black,
	},
	timestamp: {
		fontSize: 13,
		color: "#999999",
	},
	updateContent: {
		fontSize: 25,
		lineHeight: 30,
		color: Colors.black,
	},
	reactionsContainer: {
		flex: 1,
	},
	divider: {
		height: 1,
		backgroundColor: Colors.lightGrey,
	},
	commentCard: {
		backgroundColor: Colors.background,
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.lightGrey,
	},
	commentRow: {
		flexDirection: "row",
		gap: 12,
	},
	commentContentWrapper: {
		flex: 1,
		gap: 4,
	},
	commentHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	commentContent: {
		fontSize: 14,
		lineHeight: 20,
		color: Colors.black,
	},
	emptyState: {
		paddingVertical: 48,
		paddingHorizontal: 32,
		alignItems: "center",
	},
	emptyStateText: {
		fontSize: 16,
		color: "#999999",
		marginBottom: 4,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: "#CCCCCC",
		textAlign: "center",
	},
	footerLoader: {
		paddingVertical: 20,
		alignItems: "center",
	},
	commentInputContainer: {
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: 24,
		paddingTop: 12,
		paddingBottom: 32,
		borderTopWidth: 1,
		borderTopColor: Colors.lightGrey,
		backgroundColor: Colors.background,
		gap: 12,
	},
	commentInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: Colors.lightGrey,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
		fontSize: 15,
		color: Colors.black,
		maxHeight: 100,
	},
	submitButton: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		backgroundColor: Colors.brandGreen,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	submitButtonDisabled: {
		backgroundColor: Colors.lightGrey,
	},
	submitButtonText: {
		fontSize: 15,
		color: Colors.background,
	},
	submitButtonTextDisabled: {
		color: "#999999",
	},
	photosContainer: {
		marginTop: 12,
		marginBottom: 8,
	},
	photoThumbnail: {
		width: 100,
		height: 100,
		borderRadius: 12,
		backgroundColor: Colors.lightGrey,
	},
	modalContainer: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	closeButton: {
		position: 'absolute',
		top: 50,
		right: 20,
		zIndex: 10,
		backgroundColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 20,
		width: 40,
		height: 40,
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeButtonText: {
		color: '#000',
		fontSize: 24,
		fontWeight: '300',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	editModalContent: {
		backgroundColor: Colors.background,
		borderRadius: 16,
		padding: 24,
		width: "85%",
		maxWidth: 400,
		gap: 12,
	},
	deleteModalContent: {
		backgroundColor: Colors.background,
		borderRadius: 16,
		padding: 24,
		width: "85%",
		maxWidth: 400,
		gap: 16,
	},
	modalTitle: {
		fontSize: 20,
		color: Colors.black,
	},
	editTextArea: {
		borderWidth: 1,
		borderColor: Colors.lightGrey,
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: Colors.black,
		backgroundColor: Colors.background,
		minHeight: 120,
		maxHeight: 200,
		textAlignVertical: "top",
	},
	charCount: {
		fontSize: 13,
		color: "#999999",
		textAlign: "right",
	},
	deleteWarning: {
		fontSize: 15,
		color: "#666666",
		lineHeight: 22,
	},
	modalButtons: {
		flexDirection: "row",
		gap: 12,
		marginTop: 8,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: Colors.lightGrey,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelButtonText: {
		fontSize: 16,
		color: Colors.black,
	},
	saveButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: Colors.brandGreen,
		alignItems: "center",
		justifyContent: "center",
	},
	saveButtonDisabled: {
		backgroundColor: Colors.lightGrey,
	},
	saveButtonText: {
		fontSize: 16,
		color: Colors.background,
	},
	saveButtonTextDisabled: {
		color: "#999999",
	},
	deleteButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: "#DC2626",
		alignItems: "center",
		justifyContent: "center",
	},
	deleteButtonDisabled: {
		backgroundColor: "#FCA5A5",
	},
	deleteButtonText: {
		fontSize: 16,
		color: Colors.background,
	},
	deleteButtonTextDisabled: {
		color: "#FFFFFF",
		opacity: 0.7,
	},
});
