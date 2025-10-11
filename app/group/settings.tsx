import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import EmojiPicker from "rn-emoji-keyboard";

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

	useEffect(() => {
		loadGroupData();
	}, [id]);

	// Auto-save when component unmounts (user backs out)
	useEffect(() => {
		return () => {
			// Save changes when unmounting
			if (groupName && groupEmoji && members.length > 0 && cadence > 0) {
				handleSave();
			}
		};
	}, [groupName, groupEmoji, members, cadence]);

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
		if (!currentUserId) return;

		try {
			// Get current group data
			const { data: currentGroupData } = await supabase
				.from('groups')
				.select('members')
				.eq('id', id)
				.single();

			if (!currentGroupData) return;

			// Remove current user from members
			const updatedMembers = currentGroupData.members.filter((memberId : number) => memberId !== currentUserId);

			// Update group
			const { error } = await supabase
				.from('groups')
				.update({ members: updatedMembers })
				.eq('id', id);

			if (error) {
				console.error('Error leaving group:', error);
				return;
			}

			// Navigate to groups list
			router.replace('/(tabs)/groups');
		} catch (error) {
			console.error('Error:', error);
		}
	};

	const handleSave = async () => {
		try {
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
		} catch (error) {
			console.error('Error:', error);
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
					<Text style={styles.backButtonText}>←</Text>
				</TouchableOpacity>
				<View style={styles.titleRow}>
					<View style={styles.titleContainer}>
						<Text style={styles.title}>group settings</Text>
					</View>
				</View>
			</View>
			<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
				{/* Group Name and Emoji Row */}
				<View style={styles.fieldContainer}>
					<Text style={styles.label}>group name</Text>
					<View style={styles.nameEmojiRow}>
						<TouchableOpacity
							style={styles.emojiSelector}
							onPress={() => setIsEmojiPickerOpen(true)}
						>
							<Text style={styles.emojiText}>{groupEmoji}</Text>
						</TouchableOpacity>
						<TextInput
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
					<Text style={styles.label}>cadence</Text>
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
								<Text style={[
									styles.optionBadgeText,
									cadence === option.hours && styles.optionBadgeTextSelected
								]}>
									{option.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Manage Members */}
				<View style={styles.fieldContainer}>
					<Text style={styles.label}>manage members</Text>
					<TextInput
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
						<Text style={styles.errorText}>{emailError}</Text>
					)}
					{members.length > 0 && (
						<View style={styles.emailBadgeContainer}>
							{members.map((member) => (
								<View key={member.userId} style={styles.emailBadge}>
									<Text style={styles.emailBadgeText}>{member.displayName}</Text>
									{member.userId !== currentUserId && (
										<TouchableOpacity onPress={() => handleRemoveMember(member.userId)}>
											<Text style={styles.emailBadgeRemove}>×</Text>
										</TouchableOpacity>
									)}
								</View>
							))}
						</View>
					)}
				</View>

				<TouchableOpacity
					style={styles.leaveButton}
					onPress={handleLeaveGroup}
				>
					<Text style={styles.leaveButtonText}>
						leave group
					</Text>
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
		fontWeight: "600",
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
		fontWeight: "700",
		color: Colors.brandGreen,
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
		fontWeight: "500",
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
		fontWeight: "600",
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
		fontWeight: "500",
		color: "#666666",
	},
	optionBadgeTextSelected: {
		color: Colors.background,
		fontWeight: "600",
	},
	// Leave Button
	leaveButton: {
		height: 48,
		backgroundColor: Colors.background,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#DC2626",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 16,
	},
	leaveButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#DC2626",
	},
});
