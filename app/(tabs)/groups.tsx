import { Group } from "@/types/database";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
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

      setGroups(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => router.push(`/board/${item.id}`)}
    >
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{item.name}</Text>
        {!item.is_active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>inactive</Text>
          </View>
        )}
      </View>

      <View style={styles.groupDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>cadence</Text>
          <Text style={styles.detailValue}>
            {item.cadence_hrs < 24
              ? `${item.cadence_hrs}h`
              : item.cadence_hrs === 24
              ? "daily"
              : item.cadence_hrs === 168
              ? "weekly"
              : `${Math.floor(item.cadence_hrs / 24)}d`}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>stake</Text>
          <Text style={styles.detailValue}>
            ${item.stake} {item.stake_name || ""}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>members</Text>
          <Text style={styles.detailValue}>{item.members.length}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCreateButton = () => (
    <TouchableOpacity
      style={styles.createButton}
      onPress={() => router.push("/create_board")}
    >
      <View style={styles.createButtonContent}>
        <Text style={styles.createButtonIcon}>+</Text>
        <Text style={styles.createButtonText}>create new group</Text>
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
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push("/create_board")}
        >
          <Text style={styles.headerButtonText}>+ new</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={groups.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchGroups}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>no groups yet</Text>
            <Text style={styles.emptyStateSubtext}>create your first group to get started</Text>
            {renderCreateButton()}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#4A7C59",
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
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
    color: "#000000",
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
    color: "#000000",
  },
  createButton: {
    marginTop: 16,
  },
  createButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#4A7C59",
    borderRadius: 12,
    gap: 8,
  },
  createButtonIcon: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
