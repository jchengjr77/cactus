import { Update } from "@/types/database";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";

// Mock data for now - will be replaced with actual Supabase data
const MOCK_UPDATES: Update[] = [
  {
    id: 1,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    user_id: "user1",
    group_id: 1,
    content: "Just finished a great hike in the mountains! The weather was perfect.",
    user_name: "Sarah",
    group_name: "College Crew",
  },
  {
    id: 2,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    user_id: "user2",
    group_id: 2,
    content: "Made mom's famous lasagna recipe tonight. Turned out amazing! 🍝",
    user_name: "Mike",
    group_name: "Family",
  },
  {
    id: 3,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    user_id: "user3",
    group_id: 1,
    content: "Started reading that book you recommended. Already hooked!",
    user_name: "Alex",
    group_name: "College Crew",
  },
  {
    id: 4,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    user_id: "user4",
    group_id: 3,
    content: "Finally cleaned the apartment. Feels like a new place!",
    user_name: "Jordan",
    group_name: "Roommates",
  },
  {
    id: 5,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    user_id: "user5",
    group_id: 2,
    content: "Work presentation went really well today. Big relief!",
    user_name: "Taylor",
    group_name: "Family",
  },
];

export default function FeedScreen() {
  const router = useRouter();
  const [updates] = useState<Update[]>(MOCK_UPDATES);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>cactus</Text>
      </View>

      <FlatList
        data={updates}
        renderItem={renderUpdate}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    color: "#5A8F6A",
  },
  listContent: {
    paddingVertical: 8,
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
});
