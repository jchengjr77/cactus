import { supabase } from "@/lib/supabase";
import { Group, Update } from "@/types/database";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet,  TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/Colors";
import Reactions from "@/components/Reactions";
import MyText from "@/components/MyText";
import MyTextInput from "@/components/MyTextInput";
import MyHeading from "@/components/MyHeading";
import MyBoldText from "@/components/MyBoldText";
import MySemiBoldText from "@/components/MySemiBoldText";

interface UpdateWithUser extends Update {
  user_name: string;
  user_avatar_color?: string | null;
}

const PAGE_SIZE = 20;

export default function GroupBoardScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [updates, setUpdates] = useState<UpdateWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<number | null>(null);
  const [authors, setAuthors] = useState<{ id: number; name: string }[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (id) {
      fetchGroupData();
      fetchUpdates(true);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchUpdates(true);
    }
  }, [selectedAuthor]);

  // Refetch group data when screen comes into focus (e.g., returning from settings)
  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchGroupData();
      }
    }, [id])
  );

  const fetchGroupData = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching group:', error);
        return;
      }

      setGroup(data);

      // Fetch author names - members array contains user IDs as strings
      if (data && data.members.length > 0) {
        // Convert string IDs to numbers
        const memberIds = data.members.map((id: string) => parseInt(id, 10));

        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', memberIds);

        if (usersData && !usersError) {
          setAuthors(usersData);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchUpdates = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = refresh ? 0 : offset;

      let query = supabase
        .from('updates')
        .select('*, users!inner(name, avatar_color)')
        .eq('parent_group_id', id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (selectedAuthor !== null) {
        query = query.eq('author', selectedAuthor);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching updates:', error);
        return;
      }

      const transformedUpdates: UpdateWithUser[] = (data || []).map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        user_id: item.author,
        group_id: item.parent_group_id,
        content: item.content,
        read_by: item.read_by || [],
        comments: item.comments || [],
        reactions: item.reactions || [],
        media_url: item.media_url,
        media_type: item.media_type,
        user_name: item.users?.name || 'Unknown',
        user_avatar_color: item.users?.avatar_color || null,
        comment_count: (item.comments || []).length,
      }));

      // Check if there's more data to load
      setHasMore(transformedUpdates.length === PAGE_SIZE);

      if (refresh) {
        setUpdates(transformedUpdates);
        setOffset(PAGE_SIZE);
      } else {
        // Append to existing updates
        setUpdates(prev => [...prev, ...transformedUpdates]);
        setOffset(currentOffset + PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUpdates(false);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4A7C59" />
      </View>
    );
  };

  const renderUpdate = ({ item }: { item: UpdateWithUser }) => (
    <TouchableOpacity
      style={styles.updateCard}
      onPress={() => router.push(`/update/${item.id}`)}
    >
      <View style={styles.updateRow}>
        <View style={[styles.avatar, { backgroundColor: item.user_avatar_color || '#E0E0E0' }]}>
          <MyText style={styles.avatarText}>{item.user_name?.[0]?.toUpperCase() || "U"}</MyText>
        </View>
        <View style={styles.updateContentWrapper}>
          <View style={styles.updateHeader}>
            <MyText style={styles.userName}>{item.user_name}</MyText>
            <MyText style={styles.timestamp}>{formatTimeAgo(item.created_at)}</MyText>
          </View>
          <MyText style={styles.updateContent}>{item.content}</MyText>
          <View style={styles.bottomRow}>
            <View onStartShouldSetResponder={() => true} style={styles.reactionsWrapper}>
              <Reactions
                reactionIds={item.reactions}
                updateId={item.id}
                groupPoints={group?.points || 0}
                onReactionAdded={() => fetchUpdates(true)}
              />
            </View>
            {item.comment_count !== undefined && (
              <MyText style={styles.commentCount}>
                {item.comment_count} {item.comment_count === 1 ? 'comment' : 'comments'}
              </MyText>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !group) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A7C59" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MyText style={styles.backButtonText}>←</MyText>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <MyHeading style={styles.title}>
              {group?.emoji_icon ? `${group.emoji_icon} ` : ''}{group?.name || 'Group'}
            </MyHeading>
            {group && !group.is_active && (
              <View style={styles.inactiveBadge}>
                <MyText style={styles.inactiveBadgeText}>inactive</MyText>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push(`/group/settings?id=${id}`)}>
            <MaterialIcons name="settings" size={24} color="#666666" />
          </TouchableOpacity>
        </View>
        {group && (
          <View style={styles.groupInfo}>
            <View style={styles.infoItem}>
              <MyText style={styles.infoLabel}>Updates</MyText>
              <MyText style={styles.infoValue}>
                {group.cadence_hrs < 24
                  ? `Every ${group.cadence_hrs}h`
                  : group.cadence_hrs === 24
                  ? "Daily"
                  : group.cadence_hrs === 168
                  ? "Weekly"
                  : `Every ${Math.floor(group.cadence_hrs / 24)}d`}
              </MyText>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <MyText style={styles.infoLabel}>Points</MyText>
              <MyText style={styles.infoValue}>
                <MyText style={styles.pointsAmount}>{group.points || 0}</MyText>
              </MyText>
            </View>
          </View>
        )}
      </View>

      {authors.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedAuthor === null && styles.filterChipActive]}
            onPress={() => setSelectedAuthor(null)}
          >
            <MySemiBoldText style={[styles.filterChipText, selectedAuthor === null && styles.filterChipTextActive]}>
              All
            </MySemiBoldText>
          </TouchableOpacity>
          {authors.map((author) => (
            <TouchableOpacity
              key={author.id}
              style={[styles.filterChip, selectedAuthor === author.id && styles.filterChipActive]}
              onPress={() => setSelectedAuthor(author.id)}
            >
              <MySemiBoldText style={[styles.filterChipText, selectedAuthor === author.id && styles.filterChipTextActive]}>
                {author.name}
              </MySemiBoldText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={updates}
        renderItem={renderUpdate}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={updates.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => fetchUpdates(true)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MyBoldText style={styles.emptyStateText}>no updates yet</MyBoldText>
            <MyText style={styles.emptyStateSubtext}>be the first to post an update</MyText>
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
  settingsButton: {
    padding: 8,
  },
  groupInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.black,
  },
  pointsAmount: {
    color: Colors.brandGreen,
  },
  infoDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.lightGrey,
  },
  filterBar: {
    maxHeight: 60,
  },
  filterBarContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: Colors.brandGreen,
    borderColor: Colors.brandGreen,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
  },
  filterChipTextActive: {
    color: Colors.background,
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
  emptyStateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#999999",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#CCCCCC",
    textAlign: "center",
  },
  updateCard: {
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  updateRow: {
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.black,
  },
  timestamp: {
    fontSize: 13,
    color: "#999999",
  },
  updateContent: {
    fontSize: 18,
    lineHeight: 26,
    color: Colors.black,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 2,
    gap: 8,
  },
  reactionsWrapper: {
    flex: 1,
    minWidth: 0,
  },
  commentCount: {
    fontSize: 13,
    color: "#999999",
    flexShrink: 0,
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
