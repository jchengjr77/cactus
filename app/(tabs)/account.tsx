import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet,  TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/Colors";
import MyText from "@/components/MyText";
import MyTextInput from "@/components/MyTextInput";
import MyHeading from "@/components/MyHeading";
import MyBoldText from "@/components/MyBoldText";
import MySemiBoldText from "@/components/MySemiBoldText";

export default function AccountScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userAvatarColor, setUserAvatarColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [stats, setStats] = useState({
    groupCount: 0,
    updateCount: 0,
    consistency: 0,
    points: 0,
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_color')
        .eq('uuid', user.id)
        .single();

      if (data && !error) {
        setUserName(data.name || "");
        setUserEmail(data.email || "");
        setUserAvatarColor(data.avatar_color || null);
        setUserId(data.id);
        // Fetch stats after getting user ID
        await fetchStats(data.id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (userIdParam: number) => {
    try {
      // Fetch group count - count groups where user is in members array
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, members')
        .contains('members', [userIdParam.toString()]);

      const groupCount = groupsData?.length || 0;

      // Fetch update count
      const { data: updatesData, error: updatesError } = await supabase
        .from('updates')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userIdParam);

      const updateCount = updatesData?.length || 0;

      // Calculate points (1 point per update)
      const points = updateCount;

      // Calculate consistency (placeholder for now - can be enhanced later)
      const consistency = updateCount > 0 ? Math.min(100, Math.round((updateCount / (groupCount * 7)) * 100)) : 0;

      setStats({
        groupCount,
        updateCount,
        consistency,
        points,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogoutPress = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    router.replace("/(auth)/login");
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MyHeading style={styles.title}>account</MyHeading>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A7C59" />
          </View>
        ) : (
          <>
            <View style={styles.profileSection}>
              <View style={[styles.avatarLarge, { backgroundColor: userAvatarColor || '#E0E0E0' }]}>
                <MySemiBoldText style={styles.avatarLargeText}>{userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || "U"}</MySemiBoldText>
              </View>
              <MyBoldText style={styles.userName}>{userName || "user name"}</MyBoldText>
              <MyText style={styles.userEmail}>{userEmail || "user@example.com"}</MyText>
            </View>

            <View style={styles.section}>
              <MySemiBoldText style={styles.sectionTitle}>stats</MySemiBoldText>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <MyBoldText style={styles.statValue}>{stats.groupCount}</MyBoldText>
                  <MyText style={styles.statLabel}>groups</MyText>
                </View>
                <View style={styles.statCard}>
                  <MyBoldText style={styles.statValue}>{stats.updateCount}</MyBoldText>
                  <MyText style={styles.statLabel}>updates</MyText>
                </View>
                <View style={styles.statCard}>
                  <MyBoldText style={styles.statValue}>{stats.consistency}%</MyBoldText>
                  <MyText style={styles.statLabel}>consistency</MyText>
                </View>
                <View style={styles.statCard}>
                  <MyBoldText style={styles.statValue}>{stats.points}</MyBoldText>
                  <MyText style={styles.statLabel}>points</MyText>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <MySemiBoldText style={styles.sectionTitle}>settings</MySemiBoldText>
              <TouchableOpacity style={[styles.menuItem, styles.menuItemDisabled]} disabled>
                <MyText style={[styles.menuItemText, styles.menuItemTextDisabled]}>edit profile</MyText>
                <MyText style={[styles.menuItemArrow, styles.menuItemArrowDisabled]}>›</MyText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, styles.menuItemDisabled]} disabled>
                <MyText style={[styles.menuItemText, styles.menuItemTextDisabled]}>privacy</MyText>
                <MyText style={[styles.menuItemArrow, styles.menuItemArrowDisabled]}>›</MyText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
              <MySemiBoldText style={styles.logoutButtonText}>log out</MySemiBoldText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelLogout}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <MySemiBoldText style={styles.modalTitle}>log out of your account?</MySemiBoldText>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={handleCancelLogout}>
                <MySemiBoldText style={styles.modalButtonCancelText}>cancel</MySemiBoldText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleConfirmLogout}>
                <MySemiBoldText style={styles.modalButtonConfirmText}>log out</MySemiBoldText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  title: {
    fontSize: 34,
    color: Colors.brandGreen,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    gap: 32,
  },
  profileSection: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: {
    fontSize: 32,
    color: "#666666",
  },
  userName: {
    fontSize: 20,
    color: Colors.black,
    marginTop: 8,
  },
  userEmail: {
    fontSize: 14,
    color: "#666666",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.black,
  },
  menuItemTextDisabled: {
    color: "#999999",
  },
  menuItemArrow: {
    fontSize: 24,
    color: "#999999",
  },
  menuItemArrowDisabled: {
    color: "#CCCCCC",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    color: Colors.brandGreen,
  },
  statLabel: {
    fontSize: 12,
    color: "#666666",
  },
  logoutButton: {
    height: 48,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    color: "#EF4444",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    color: Colors.black,
  },
  modalText: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButtonCancel: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancelText: {
    fontSize: 16,
    color: Colors.black,
  },
  modalButtonConfirm: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonConfirmText: {
    fontSize: 16,
    color: "#EF4444",
  },
});
