import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AccountScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [stats, setStats] = useState({
    groupCount: 0,
    updateCount: 0,
    consistency: 0,
    totalTab: 0,
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
        .select('id, name, email')
        .eq('uuid', user.id)
        .single();

      if (data && !error) {
        setUserName(data.name || "");
        setUserEmail(data.email || "");
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

      // Fetch total penalties (tab)
      const { data: penaltiesData, error: penaltiesError } = await supabase
        .from('penalties')
        .select('stake_amount')
        .eq('user', userIdParam);

      const totalTab = penaltiesData?.reduce((sum, penalty) => sum + (penalty.stake_amount || 0), 0) || 0;

      // Calculate consistency (placeholder for now - can be enhanced later)
      const consistency = updateCount > 0 ? Math.min(100, Math.round((updateCount / (groupCount * 7)) * 100)) : 0;

      setStats({
        groupCount,
        updateCount,
        consistency,
        totalTab,
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
        <Text style={styles.title}>account</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A7C59" />
          </View>
        ) : (
          <>
            <View style={styles.profileSection}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || "U"}</Text>
              </View>
              <Text style={styles.userName}>{userName || "user name"}</Text>
              <Text style={styles.userEmail}>{userEmail || "user@example.com"}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.groupCount}</Text>
                  <Text style={styles.statLabel}>groups</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.updateCount}</Text>
                  <Text style={styles.statLabel}>updates</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.consistency}%</Text>
                  <Text style={styles.statLabel}>consistency</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>${stats.totalTab}</Text>
                  <Text style={styles.statLabel}>total tab</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>settings</Text>
              <TouchableOpacity style={[styles.menuItem, styles.menuItemDisabled]} disabled>
                <Text style={[styles.menuItemText, styles.menuItemTextDisabled]}>edit profile</Text>
                <Text style={[styles.menuItemArrow, styles.menuItemArrowDisabled]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, styles.menuItemDisabled]} disabled>
                <Text style={[styles.menuItemText, styles.menuItemTextDisabled]}>privacy</Text>
                <Text style={[styles.menuItemArrow, styles.menuItemArrowDisabled]}>›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
              <Text style={styles.logoutButtonText}>log out</Text>
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
            <Text style={styles.modalTitle}>log out of your account?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={handleCancelLogout}>
                <Text style={styles.modalButtonCancelText}>cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleConfirmLogout}>
                <Text style={styles.modalButtonConfirmText}>log out</Text>
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000000",
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
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: "600",
    color: "#666666",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
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
    fontWeight: "600",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    fontSize: 16,
    color: "#000000",
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
    fontWeight: "600",
    color: "#4A7C59",
  },
  statLabel: {
    fontSize: 12,
    color: "#666666",
  },
  logoutButton: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  modalButtonConfirm: {
    flex: 1,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});
