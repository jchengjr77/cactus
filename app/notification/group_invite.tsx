import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Notification } from "@/types/database";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GroupInviteScreen() {
	const router = useRouter();
	const { user } = useAuth();
	const { id } = useLocalSearchParams();
	const [notification, setNotification] = useState<Notification | null>(null);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [isAlreadyMember, setIsAlreadyMember] = useState(false);

	useEffect(() => {
		fetchNotification();
	}, [id]);

	const fetchNotification = async () => {
		try {
			const { data, error } = await supabase
				.from('notifications')
				.select('*')
				.eq('id', id)
				.single();

			if (error) {
				console.error('Error fetching notification:', error);
				return;
			}

			setNotification(data);

			// Check if user is already a member of the group
			if (data && user?.email) {
				const { data: userData } = await supabase
					.from('users')
					.select('id')
					.eq('email', user.email)
					.single();

				if (userData) {
					const { data: groupData } = await supabase
						.from('groups')
						.select('members')
						.eq('id', data.data.group_id)
						.single();

					if (groupData && groupData.members.includes(userData.id)) {
						setIsAlreadyMember(true);
					}
				}
			}
		} catch (error) {
			console.error('Error:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleAccept = async () => {
		if (!notification || !user?.email) return;

		setProcessing(true);

		try {
			// Get current user ID
			const { data: userData } = await supabase
				.from('users')
				.select('id')
				.eq('email', user.email)
				.single();

			if (!userData) return;

			// Get current group data
			const { data: groupData } = await supabase
				.from('groups')
				.select('members, emails_invited')
				.eq('id', notification.data.group_id)
				.single();

			if (!groupData) return;

			// Add user to group members if not already there
			const currentMembers = groupData.members || [];
			const currentEmailsInvited = groupData.emails_invited || [];

			if (!currentMembers.includes(userData.id)) {
				// Remove user's email from emails_invited and add to members
				const updatedEmailsInvited = currentEmailsInvited.filter(email => email !== user.email);

				// Mark group as active if all invited users have accepted
				const isActive = updatedEmailsInvited.length === 0;

				const { error: updateError } = await supabase
					.from('groups')
					.update({
						members: [...currentMembers, userData.id],
						emails_invited: updatedEmailsInvited,
						is_active: isActive
					})
					.eq('id', notification.data.group_id);

				if (updateError) {
					console.error('Error updating group members:', updateError);
					return;
				}
			}

			// Navigate to groups page, then to the specific group
			router.replace('/(tabs)/groups');
			// Use setTimeout to ensure the groups page is loaded before navigating to the group
			setTimeout(() => {
				router.push(`/group/${notification.data.group_id}`);
			}, 100);
		} catch (error) {
			console.error('Error accepting invitation:', error);
		} finally {
			setProcessing(false);
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

	if (!notification) {
		return (
			<View style={styles.container}>
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>Invitation not found</Text>
					<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
						<Text style={styles.backButtonText}>Go back</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
					<Text style={styles.backButtonHeaderText}>‹ back</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.content}>
				<Text style={styles.emoji}>{notification.data.group_emoji}</Text>
				<Text style={styles.title}>group invitation</Text>
				<Text style={styles.message}>
					You've been invited to join <Text style={styles.groupName}>{notification.data.group_name}</Text>
				</Text>

				<View style={styles.actions}>
					<TouchableOpacity
						style={[
							styles.button,
							styles.acceptButton,
							isAlreadyMember && styles.acceptButtonDisabled
						]}
						onPress={handleAccept}
						disabled={processing || isAlreadyMember}
					>
						<Text style={[
							styles.acceptButtonText,
							isAlreadyMember && styles.acceptButtonTextDisabled
						]}>
							{isAlreadyMember ? "already joined" : processing ? "accepting..." : "accept"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
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
	backButtonHeader: {
		marginBottom: 8,
	},
	backButtonHeaderText: {
		fontSize: 16,
		color: Colors.brandGreen,
		fontWeight: "600",
	},
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
		gap: 24,
	},
	emoji: {
		fontSize: 80,
	},
	title: {
		fontSize: 28,
		fontWeight: "700",
		color: Colors.black,
		textAlign: "center",
	},
	message: {
		fontSize: 16,
		color: "#666666",
		textAlign: "center",
		lineHeight: 24,
		maxWidth: 300,
	},
	groupName: {
		fontWeight: "600",
		color: Colors.brandGreen,
	},
	actions: {
		width: "100%",
		gap: 12,
		marginTop: 16,
	},
	button: {
		height: 48,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	acceptButton: {
		backgroundColor: Colors.brandGreen,
	},
	acceptButtonDisabled: {
		backgroundColor: Colors.lightGrey,
	},
	acceptButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: Colors.background,
	},
	acceptButtonTextDisabled: {
		color: "#999999",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: 24,
		padding: 24,
	},
	errorText: {
		fontSize: 18,
		color: "#666666",
	},
	backButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		backgroundColor: Colors.brandGreen,
		borderRadius: 8,
	},
	backButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: Colors.background,
	},
});
