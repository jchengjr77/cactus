import { supabase } from "@/lib/supabase";
import { Update } from "@/types/database";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function FeedScreen() {
  const router = useRouter();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);

      // Fetch updates with user and group information
      // Note: You'll need to create an 'updates' table in Supabase with columns:
      // id, created_at, user_id, group_id, content, media_url, media_type
      const { data, error } = await supabase
        .from('updates')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching updates:', error);
        return;
      }

      // Transform the data to match our Update type
      const transformedUpdates: Update[] = (data || []).map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        user_id: item.user_id,
        group_id: item.group_id,
        content: item.content,
        media_url: item.media_url,
        media_type: item.media_type,
        user_name: item.users?.name || 'Unknown',
        group_name: item.groups?.name || 'Unknown',
      }));

      setUpdates(transformedUpdates);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUpdate = ({ item }: { item: Update }) => (
    <TouchableOpacity
      style={styles.updateCard}
      onPress={() => router.push(`/board/${item.group_id}`)}
    >
      <View style={styles.updateRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.user_name?.[0]?.toUpperCase() || "U"}</Text>
        </View>
        <View style={styles.updateContentWrapper}>
          <View style={styles.updateHeader}>
            <View style={styles.userRow}>
              <Text style={styles.userName}>
                <Text style={styles.userNameBold}>{item.user_name}</Text>
                <Text style={styles.userNameNormal}> in </Text>
                <Text style={styles.groupNameBold}>{item.group_name}</Text>
              </Text>
            </View>
            <Text style={styles.timestamp}>{formatTimeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.updateContent}>{item.content}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>cactus</Text>
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
        <Text style={styles.title}>cactus</Text>
      </View>

      <FlatList
        data={updates}
        renderItem={renderUpdate}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={updates.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchUpdates}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <TouchableOpacity
              style={styles.createGroupButton}
              onPress={() => router.push("/(tabs)/groups")}
            >
              <Text style={styles.createGroupButtonText}>+ create a group</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
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
    color: "#4A7C59",
  },
  listContent: {
    paddingVertical: 8,
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
  createGroupButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
  },
  createGroupButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999999",
  },
  updateCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  updateRow: {
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  },
  updateContentWrapper: {
    flex: 1,
    gap: 8,
  },
  updateHeader: {
    gap: 2,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontSize: 15,
    color: "#000000",
  },
  userNameBold: {
    fontWeight: "600",
  },
  userNameNormal: {
    fontWeight: "400",
  },
  groupNameBold: {
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 13,
    color: "#999999",
  },
  updateContent: {
    fontSize: 15,
    lineHeight: 22,
    color: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
