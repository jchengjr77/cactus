import { Colors } from "@/constants/Colors";
import { groupEmojis } from "@/constants/emojis";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabase';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import EmojiPicker from "rn-emoji-keyboard";

type CadenceOption = { label: string; hours: number };
type StakeOption = { emoji: string; name: string; amount: number };

const cadenceOptions: CadenceOption[] = [
	{ label: "12h", hours: 12 },
	{ label: "daily", hours: 24 },
	{ label: "3d", hours: 72 },
	{ label: "weekly", hours: 168 },
];

const stakeOptions: StakeOption[] = [
	{ emoji: "☕", name: "Coffee", amount: 5 },
	{ emoji: "🍻", name: "Drinks", amount: 10 },
	{ emoji: "🥪", name: "Lunch", amount: 20 },
	{ emoji: "🍱", name: "Dinner", amount: 50 },
];

type Member = {
	email: string;
	displayName: string;
	userId?: number;
};

export default function CreateGroupScreen() {
	const router = useRouter();
	const { user } = useAuth();
	const [groupName, setGroupName] = useState("")
	const [groupEmoji, setGroupEmoji] = useState(groupEmojis[Math.floor(Math.random() * groupEmojis.length)])
	const [emailInput, setEmailInput] = useState("")
	const [members, setMembers] = useState<Member[]>([])
	const [cadence, setCadence] = useState(24)
	const [stakeAmount, setStakeAmount] = useState(5)
	const [stakeName, setStakeName] = useState("Coffee")
	const [creating, setCreating] = useState(false)
	const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
	const [showSuccess, setShowSuccess] = useState(false)
	const [emailError, setEmailError] = useState("")

	// Add current user to members list on mount
	useEffect(() => {
		const loadCurrentUser = async () => {
			if (user?.email) {
				const { data: userData, error } = await supabase
					.from('users')
					.select('id, name, email')
					.eq('email', user.email)
					.single();

				if (userData) {
					const currentUserMember: Member = {
						email: userData.email,
						displayName: userData.name,
						userId: userData.id,
					};
					setMembers([currentUserMember]);
				}
			}
		};

		loadCurrentUser();
	}, [user]);

	const canCreate = groupName !== "" && groupEmoji !== "" && members.length > 0 && cadence > 0 && stakeAmount > 0

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
			setEmailError("no cactus account found for this email");
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

	const handleRemoveMember = (email: string) => {
		setMembers(members.filter(m => m.email !== email));
	};

	const handleCreate = async () => {
		setCreating(true);

		// Get current user's ID
		const { data: currentUserData } = await supabase
			.from('users')
			.select('id')
			.eq('email', user?.email)
			.single();

		if (!currentUserData) {
			setCreating(false);
			return;
		}

		// Get invited emails (excluding creator)
		const invitedMembers = members.filter(m => m.userId !== currentUserData.id);
		const invitedEmails = invitedMembers.map(m => m.email);

		// Only add the creator to the members array, add others to emails_invited
		const { data, error } = await supabase
			.from('groups')
			.insert([
				{
					is_active: false,
					name: groupName,
					cadence_hrs: cadence,
					stake: stakeAmount,
					stake_name: stakeName,
					emoji_icon: groupEmoji,
					members: [currentUserData.id],
					emails_invited: invitedEmails
				},
			])
			.select();

		if (!error && data && data.length > 0) {
			const createdGroup = data[0];

			// Create notifications for invited users
			if (invitedMembers.length > 0) {
				const notifications = invitedMembers.map(member => ({
					notification_type: 'group_invite',
					user: member.userId,
					data: {
						group_id: createdGroup.id,
						group_name: createdGroup.name,
						group_emoji: createdGroup.emoji_icon,
						invited_by: currentUserData.id
					}
				}));

				await supabase
					.from('notifications')
					.insert(notifications);
			}

			setShowSuccess(true);
		}

		setCreating(false);
	}

	if (showSuccess) {
		return <View style={styles.container}>
			<View style={styles.successContainer}>
				<Text style={styles.successEmoji}>{groupEmoji}</Text>
				<Text style={styles.successTitle}>{groupName}</Text>
				<Text style={styles.successMessage}>
					has been created.
				</Text>
				<Text style={styles.successMessage}>
					Members have been sent an invitation.
				</Text>
				<TouchableOpacity
					style={styles.successButton}
					onPress={() => router.back()}
				>
					<Text style={styles.successButtonText}>done</Text>
				</TouchableOpacity>
			</View>
		</View>
	}

	return <View style={styles.container}>
		<View style={styles.header}>
			<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
				<Text style={styles.backButtonText}>‹ back</Text>
			</TouchableOpacity>
			<View style={styles.titleRow}>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>
						new group
					</Text>
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

			{/* Invite Members */}
			<View style={styles.fieldContainer}>
				<Text style={styles.label}>invite members</Text>
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
						{members.map((member, index) => (
							<View key={index} style={styles.emailBadge}>
								<Text style={styles.emailBadgeText}>{member.displayName}</Text>
								{member.email !== user?.email && (
									<TouchableOpacity onPress={() => handleRemoveMember(member.email)}>
										<Text style={styles.emailBadgeRemove}>×</Text>
									</TouchableOpacity>
								)}
							</View>
						))}
					</View>
				)}
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

			{/* Stakes Selector */}
			<View style={styles.fieldContainer}>
				<Text style={styles.label}>stakes</Text>
				<View style={styles.optionRow}>
					{stakeOptions.map((option) => (
						<TouchableOpacity
							key={option.amount}
							style={[
								styles.stakeBadge,
								stakeAmount === option.amount && styles.stakeBadgeSelected
							]}
							onPress={() => {
								setStakeAmount(option.amount);
								setStakeName(option.name);
							}}
						>
							<Text style={styles.stakeEmoji}>{option.emoji}</Text>
							<Text style={[
								styles.stakeBadgeText,
								stakeAmount === option.amount && styles.stakeBadgeTextSelected
							]}>
								${option.amount}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<TouchableOpacity
				style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
				onPress={handleCreate}
				disabled={!canCreate}
			>
				<Text style={[styles.createButtonText, !canCreate && styles.createButtonTextDisabled]}>
					{creating ? "creating..." : "create group"}
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
	// Option Row (for cadence and stakes)
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
	// Stakes Options
	stakeBadge: {
		flex: 1,
		flexDirection: "column",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: "#F5F5F5",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#F5F5F5",
		gap: 4,
	},
	stakeBadgeSelected: {
		backgroundColor: Colors.brandGreen,
		borderColor: Colors.brandGreen,
	},
	stakeEmoji: {
		fontSize: 24,
	},
	stakeBadgeText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#666666",
	},
	stakeBadgeTextSelected: {
		color: Colors.background,
		fontWeight: "600",
	},
	// Create Button
	createButton: {
		height: 48,
		backgroundColor: Colors.brandGreen,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 8,
	},
	createButtonDisabled: {
		backgroundColor: Colors.lightGrey,
	},
	createButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: Colors.background,
	},
	createButtonTextDisabled: {
		color: "#999999",
	},
	// Success Screen
	successContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
		gap: 24,
	},
	successEmoji: {
		fontSize: 80,
	},
	successTitle: {
		fontSize: 32,
		fontWeight: "700",
		color: Colors.brandGreen,
		textAlign: "center",
		marginBottom: -12,
	},
	successMessage: {
		fontSize: 16,
		color: "#666666",
		textAlign: "center",
		lineHeight: 24,
		maxWidth: 300,
	},
	successButton: {
		height: 48,
		backgroundColor: Colors.brandGreen,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 48,
		marginTop: 16,
	},
	successButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: Colors.background,
	},
})