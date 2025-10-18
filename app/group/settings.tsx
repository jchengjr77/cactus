import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import EmojiPicker from "rn-emoji-keyboard";
import MyText from "@/components/MyText";
import MyTextInput from "@/components/MyTextInput";
import MyHeading from "@/components/MyHeading";
import MyBoldText from "@/components/MyBoldText";
import MySemiBoldText from "@/components/MySemiBoldText";

type CadenceOption = { label: string; hours: number };

const cadenceOptions: CadenceOption[] = [
	{ label: "12h", hours: 12 },
	{ label: "daily", hours: 24 },
	{ label: "3d", hours: 72 },
	{ label: "weekly", hours: 168 },
];

type Member = {
	email: string;
	displayName: string;
	userId: number;
};

export default function GroupSettingsScreen() {
	const router = useRouter();
	const { user } = useAuth();
	const { id } = useLocalSearchParams();
	const [groupName, setGroupName] = useState("");
	const [groupEmoji, setGroupEmoji] = useState("🌵");
	const [emailInput, setEmailInput] = useState("");
	const [members, setMembers] = useState<Member[]>([]);
	const [cadence, setCadence] = useState(24);
	const [loading, setLoading] = useState(true);
	const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
	const [emailError, setEmailError] = useState("");
	const [currentUserId, setCurrentUserId] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadGroupData();
	}, [id]);

	const loadGroupData = async () => {
		try {
			setLoading(true);

			// Get current user ID
			if (user?.email) {
				const { data: userData } = await supabase
					.from('users')
					.select('id')
					.eq('email', user.email)
					.single();

				if (userData) {
					setCurrentUserId(userData.id);
				}
			}

			// Fetch group data
			const { data: groupData, error: groupError } = await supabase
				.from('groups')
				.select('*')
				.eq('id', id)
				.single();

			if (groupError || !groupData) {
				console.error('Error fetching group:', groupError);
				return;
			}

			setGroupName(groupData.name);
			setGroupEmoji(groupData.emoji_icon || "🌵");
			setCadence(groupData.cadence_hrs);

			// Fetch member details
			if (groupData.members && groupData.members.length > 0) {
				const { data: usersData } = await supabase
					.from('users')
					.select('id, name, email')
					.in('id', groupData.members);

				if (usersData) {
					const membersList: Member[] = usersData.map(u => ({
						email: u.email,
						displayName: u.name,
						userId: u.id,
					}));
					setMembers(membersList);
				}
			}
		} catch (error) {
			console.error('Error:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleAddEmail = async () => {
		const trimmedEmail = emailInput.trim();
		setEmailError("");

		if (!trimmedEmail || !trimmedEmail.includes("@")) {
			return;
		}

		if (members.find(m => m.email === trimmedEmail)) {
			setEmailError("user already added");
			return;
		}

		// Look up user in database
		const { data: user, error } = await supabase
			.from('users')
			.select('id, name, email')
			.eq('email', trimmedEmail)
			.single();

		if (!user) {
			setEmailError("no account found for this email");
			return;
		}

		const newMember: Member = {
			email: user.email,
			displayName: user.name,
			userId: user.id,
		};

		setMembers([...members, newMember]);
		setEmailInput("");
	};

	const handleRemoveMember = (userId: number) => {
		// Don't allow removing yourself
		if (userId === currentUserId) {
			return;
		}
		setMembers(members.filter(m => m.userId !== userId));
	};

	const handleLeaveGroup = async () => {
		if (!currentUserId) {
			console.error('No current user ID');
			return;
		}

		try {
			// Get current group data
			const { data: currentGroupData, error: fetchError } = await supabase
				.from('groups')
				.select('members')
				.eq('id', id)
				.single();

			if (fetchError) {
				console.error('Error fetching group data:', fetchError);
				return;
			}

			if (!currentGroupData) {
				console.error('No group data found');
				return;
			}

			// Remove current user from members
			const updatedMembers = currentGroupData.members.filter((memberId : number) => memberId !== currentUserId);

			// If this is the last member, delete the group instead
			if (updatedMembers.length === 0) {
				const { error: deleteError } = await supabase
					.from('groups')
					.delete()
					.eq('id', id);

				if (deleteError) {
					console.error('Error deleting group:', deleteError);
					return;
				}
			} else {
				// Update group with remaining members
				const { error: updateError } = await supabase
					.from('groups')
					.update({ members: updatedMembers })
					.eq('id', id);

				if (updateError) {
					console.error('Error updating group:', updateError);
					return;
				}
			}

			// Navigate to groups list
			router.replace('/(tabs)/groups');
		} catch (error) {
			console.error('Error in handleLeaveGroup:', error);
		}
	};

	const handleSave = async () => {
		try {
			setIsSaving(true);

			// Get current group data to compare
			const { data: currentGroupData } = await supabase
				.from('groups')
				.select('members, emails_invited')
				.eq('id', id)
				.single();

			if (!currentGroupData) return;

			const memberIds = members.map(m => m.userId);
			const currentMembers = currentGroupData.members || [];
			const currentEmailsInvited = currentGroupData.emails_invited || [];

			// Find newly added members
			const newMemberIds = memberIds.filter(id => !currentMembers.includes(id));

			// Get emails of newly added members
			const newlyInvitedEmails: string[] = [];
			for (const memberId of newMemberIds) {
				const member = members.find(m => m.userId === memberId);
				if (member) {
					newlyInvitedEmails.push(member.email);
				}
			}

			// Update emails_invited to include new invites
			const updatedEmailsInvited = [...currentEmailsInvited, ...newlyInvitedEmails];

			// Update group
			const { error } = await supabase
				.from('groups')
				.update({
					name: groupName,
					emoji_icon: groupEmoji,
					cadence_hrs: cadence,
					members: memberIds,
					emails_invited: updatedEmailsInvited,
				})
				.eq('id', id);

			if (error) {
				console.error('Error updating group:', error);
				return;
			}

			// Send notifications to newly invited users
			if (newMemberIds.length > 0 && currentUserId) {
				const { data: groupData } = await supabase
					.from('groups')
					.select('name, emoji_icon')
					.eq('id', id)
					.single();

				const notifications = newMemberIds.map(memberId => ({
					notification_type: 'group_invite',
					user: memberId,
					data: {
						group_id: id,
						group_name: groupData?.name || groupName,
						group_emoji: groupData?.emoji_icon || groupEmoji,
						invited_by: currentUserId,
					}
				}));

				await supabase
					.from('notifications')
					.insert(notifications);
			}

			// Navigate back after successful save
			router.back();
		} catch (error) {
			console.error('Error:', error);
		} finally {
			setIsSaving(false);
		}
	};

	if (loading) {
		return (
			<View style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.brandGreen} />
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<MySemiBoldText style={styles.backButtonText}>←</MySemiBoldText>
				</TouchableOpacity>
				<View style={styles.titleRow}>
					<View style={styles.titleContainer}>
						<MyHeading style={styles.title}>group settings</MyHeading>
					</View>
				</View>
			</View>
			<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
				{/* Group Name and Emoji Row */}
				<View style={styles.fieldContainer}>
					<MySemiBoldText style={styles.label}>group name</MySemiBoldText>
					<View style={styles.nameEmojiRow}>
						<TouchableOpacity
							style={styles.emojiSelector}
							onPress={() => setIsEmojiPickerOpen(true)}
						>
							<MyText style={styles.emojiText}>{groupEmoji}</MyText>
						</TouchableOpacity>
						<MyTextInput
							style={styles.nameInput}
							value={groupName}
							onChangeText={setGroupName}
							placeholder="My Group"
							placeholderTextColor="#999"
						/>
					</View>
				</View>

				{/* Cadence Selector */}
				<View style={styles.fieldContainer}>
					<MySemiBoldText style={styles.label}>cadence</MySemiBoldText>
					<View style={styles.optionRow}>
						{cadenceOptions.map((option) => (
							<TouchableOpacity
								key={option.hours}
								style={[
									styles.optionBadge,
									cadence === option.hours && styles.optionBadgeSelected
								]}
								onPress={() => setCadence(option.hours)}
							>
								<MySemiBoldText style={[
									styles.optionBadgeText,
									cadence === option.hours && styles.optionBadgeTextSelected
								]}>
									{option.label}
								</MySemiBoldText>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Manage Members */}
				<View style={styles.fieldContainer}>
					<MySemiBoldText style={styles.label}>manage members</MySemiBoldText>
					<MyTextInput
						style={styles.emailInput}
						value={emailInput}
						onChangeText={(text) => {
							setEmailInput(text);
							setEmailError("");
						}}
						placeholder="email@example.com"
						placeholderTextColor="#999"
						keyboardType="email-address"
						autoCapitalize="none"
						onSubmitEditing={handleAddEmail}
						returnKeyType="done"
					/>
					{emailError !== "" && (
						<MyText style={styles.errorText}>{emailError}</MyText>
					)}
					{members.length > 0 && (
						<View style={styles.emailBadgeContainer}>
							{members.map((member) => (
								<View key={member.userId} style={styles.emailBadge}>
									<MyText style={styles.emailBadgeText}>{member.displayName}</MyText>
									{member.userId !== currentUserId && (
										<TouchableOpacity onPress={() => handleRemoveMember(member.userId)}>
											<MyText style={styles.emailBadgeRemove}>×</MyText>
										</TouchableOpacity>
									)}
								</View>
							))}
						</View>
					)}
				</View>

				{/* Save Button */}
				<TouchableOpacity
					style={styles.saveButton}
					onPress={handleSave}
					disabled={isSaving}
				>
					<MySemiBoldText style={styles.saveButtonText}>
						{isSaving ? 'saving...' : 'save changes'}
					</MySemiBoldText>
				</TouchableOpacity>

				{/* Leave Group */}
				<TouchableOpacity
					onPress={handleLeaveGroup}
					style={styles.leaveGroupContainer}
				>
					<MySemiBoldText style={styles.leaveGroupText}>
						leave group
					</MySemiBoldText>
				</TouchableOpacity>
			</ScrollView>

			<EmojiPicker
				onEmojiSelected={(emoji) => {
					setGroupEmoji(emoji.emoji);
				}}
				open={isEmojiPickerOpen}
				onClose={() => setIsEmojiPickerOpen(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	header: {
		paddingHorizontal: 24,
		paddingTop: 60,
		paddingBottom: 16,
	},
	backButton: {
		marginBottom: 8,
	},
	backButtonText: {
		fontSize: 16,
		color: Colors.brandGreen,
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
	},
	titleContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		flexWrap: "wrap",
	},
	title: {
		fontSize: 34,
		color: Colors.brandGreen,
	},
	saveButton: {
		height: 48,
		backgroundColor: Colors.brandGreen,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 16,
	},
	saveButtonText: {
		fontSize: 16,
		color: Colors.background,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: 24,
		gap: 24,
	},
	label: {
		fontSize: 14,
		color: Colors.black,
		marginBottom: 8,
	},
	// Group Name and Emoji Row
	nameEmojiRow: {
		flexDirection: "row",
		gap: 12,
		alignItems: "center",
	},
	emojiSelector: {
		width: 54,
		aspectRatio: 1,
		borderWidth: 1,
		borderColor: Colors.lightGrey,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.background,
	},
	emojiText: {
		fontSize: 28,
	},
	nameInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: Colors.lightGrey,
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: Colors.black,
		backgroundColor: Colors.background,
	},
	// Field Container
	fieldContainer: {
		gap: 8,
	},
	// Email Input
	emailInput: {
		borderWidth: 1,
		borderColor: Colors.lightGrey,
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: Colors.black,
		backgroundColor: Colors.background,
	},
	errorText: {
		fontSize: 12,
		color: "#DC2626",
		marginTop: 4,
	},
	emailBadgeContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 8,
	},
	emailBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#F5F5F5",
		borderRadius: 8,
		paddingVertical: 8,
		paddingLeft: 12,
		paddingRight: 8,
		gap: 8,
	},
	emailBadgeText: {
		fontSize: 14,
		color: Colors.black,
	},
	emailBadgeRemove: {
		fontSize: 20,
		color: "#999999",
		paddingHorizontal: 4,
	},
	// Option Row (for cadence)
	optionRow: {
		flexDirection: "row",
		gap: 8,
	},
	// Cadence Options
	optionBadge: {
		flex: 1,
		paddingHorizontal: 8,
		paddingVertical: 10,
		backgroundColor: "#F5F5F5",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#F5F5F5",
		alignItems: "center",
		justifyContent: "center",
	},
	optionBadgeSelected: {
		backgroundColor: Colors.brandGreen,
		borderColor: Colors.brandGreen,
	},
	optionBadgeText: {
		fontSize: 14,
		color: "#666666",
	},
	optionBadgeTextSelected: {
		color: Colors.background,
	},
	// Leave Group
	leaveGroupContainer: {
		alignItems: "center",
		justifyContent: "center",
		marginTop: 24,
		paddingVertical: 12,
	},
	leaveGroupText: {
		fontSize: 16,
		color: "#DC2626",
	},
});
