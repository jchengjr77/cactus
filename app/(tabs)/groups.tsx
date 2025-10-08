import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Group } from "@/types/database";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface GroupWithMembers extends Group {
  memberNames?: string[];
}

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchCurrentUser();
    }
  }, [user]);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchGroups();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (data && !error) {
        setCurrentUserId(data.id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchGroups = async () => {
    if (currentUserId === null) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching groups:', error);
        return;
      }

      // Filter groups where current user is a member
      const userGroups = (data || []).filter(group =>
        group.members && group.members.includes(currentUserId)
      );

      // Fetch member names for each group
      const groupsWithMembers = await Promise.all(
        userGroups.map(async (group) => {
          const memberIds = group.members || [];

          if (memberIds.length === 0) {
            return { ...group, memberNames: [] };
          }

          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name')
            .in('id', memberIds);

          const memberNames = usersData?.map(u => u.name) || [];
          return { ...group, memberNames };
        })
      );

      setGroups(groupsWithMembers);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderGroup = ({ item }: { item: GroupWithMembers }) => {
    const memberNames = item.memberNames || [];
    const displayMembers = memberNames.slice(0, 4);
    const remainingCount = memberNames.length - 4;

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => router.push(`/group/${item.id}`)}
      >
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>
            {item.emoji_icon ? `${item.emoji_icon} ` : ''}{item.name}
          </Text>
          {!item.is_active ? (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>inactive</Text>
            </View>
          ) : (
            <Text style={styles.pointsDisplay}>
              <Text style={styles.pointsAmount}>{item.points || 0}</Text>
              <Text style={styles.pointsLabel}> pts</Text>
            </Text>
          )}
        </View>

        <View style={styles.groupDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Updates</Text>
            <Text style={styles.detailValue}>
              {item.cadence_hrs < 24
                ? `Every ${item.cadence_hrs}h`
                : item.cadence_hrs === 24
                ? "Daily"
                : item.cadence_hrs === 168
                ? "Weekly"
                : `Every ${Math.floor(item.cadence_hrs / 24)}d`}
            </Text>
          </View>

          <View style={styles.membersRow}>
            <Text style={styles.detailLabel}>Members</Text>
            <View style={styles.memberBadges}>
              {displayMembers.map((name, index) => (
                <View key={index} style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>{name}</Text>
                </View>
              ))}
              {remainingCount > 0 && (
                <View style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>+{remainingCount} more</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreateCard = () => (
    <TouchableOpacity
      style={styles.createCard}
      onPress={() => router.push("/group/create_group")}
    >
      <View style={styles.createCardContent}>
        <Text style={styles.createCardText}>+ new group</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>groups</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A7C59" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>groups</Text>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchGroups}
        ListFooterComponent={renderCreateCard}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>no groups yet</Text>
            <Text style={styles.emptyStateSubtext}>create your first group to get started</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: Colors.black,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.brandGreen,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.background,
  },
  listContent: {
    padding: 24,
    gap: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999999",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#CCCCCC",
    textAlign: "center",
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  groupCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupName: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.black,
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 12,
    color: "#666666",
  },
  groupDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666666",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
  },
  pointsDisplay: {
    fontSize: 16,
    fontWeight: "600",
  },
  pointsAmount: {
    color: Colors.brandGreen,
  },
  pointsLabel: {
    color: "#999999",
    fontSize: 14,
  },
  membersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  memberBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    justifyContent: "flex-end",
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
  },
  memberBadgeText: {
    fontSize: 12,
    color: "#666666",
  },
  createCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  createCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createCardIcon: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.brandGreen,
  },
  createCardText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.brandGreen,
  },
});
