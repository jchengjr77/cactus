import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Update } from "@/types/database";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reactions from "@/components/Reactions";

const PAGE_SIZE = 20;

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [initialUnreadIds, setInitialUnreadIds] = useState<Set<number>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasGroups, setHasGroups] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCurrentUser();
    }
  }, [user]);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchUpdates(true);
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('uuid', user.id)
        .single();

      if (data && !error) {
        setCurrentUserId(data.id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUpdates = async (refresh: boolean = false) => {
    if (currentUserId === null) return;

    try {
      if (refresh) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = refresh ? 0 : offset;

      // First, get groups where user is a member
      const { data: userGroups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .contains('members', [currentUserId]);

      if (groupsError) {
        console.error('Error fetching user groups:', groupsError);
        return;
      }

      const groupIds = (userGroups || []).map(g => g.id);

      // Track if user has groups
      setHasGroups(groupIds.length > 0);

      // If user is not a member of any groups, return empty
      if (groupIds.length === 0) {
        setUpdates([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // Fetch updates only from groups where user is a member
      const { data, error } = await supabase
        .from('updates')
        .select(`
          *,
          users!author(name, avatar_color),
          groups!parent_group_id(name, emoji_icon, points)
        `)
        .in('parent_group_id', groupIds)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching updates:', error);
        return;
      }

      // Transform the data to match our Update type
      const transformedUpdates: Update[] = (data || []).map((item: any) => ({
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
        group_name: item.groups?.name || 'Unknown',
        group_emoji: item.groups?.emoji_icon || null,
        group_points: item.groups?.points || 0,
        comment_count: (item.comments || []).length,
      }));

      // Check if there's more data to load
      setHasMore(transformedUpdates.length === PAGE_SIZE);

      if (refresh) {
        // Store IDs of initially unread updates
        const unreadIds = new Set(
          transformedUpdates
            .filter(update => !update.read_by.includes(currentUserId))
            .map(update => update.id)
        );
        setInitialUnreadIds(unreadIds);

        setUpdates(transformedUpdates);
        setOffset(PAGE_SIZE);

        // Mark all updates as read in the database (but keep UI showing them as unread)
        await markAllAsRead(transformedUpdates);
      } else {
        // Append to existing updates
        setUpdates(prev => [...prev, ...transformedUpdates]);
        setOffset(currentOffset + PAGE_SIZE);

        // Mark new updates as read
        await markAllAsRead(transformedUpdates);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markAllAsRead = async (updates: Update[]) => {
    if (currentUserId === null) return;

    try {
      // Find updates that haven't been read by current user
      const unreadUpdates = updates.filter(update => !update.read_by.includes(currentUserId));

      // Mark each unread update as read in database only
      for (const update of unreadUpdates) {
        const updatedReadBy = [...update.read_by, currentUserId];

        await supabase
          .from('updates')
          .update({ read_by: updatedReadBy })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error marking updates as read:', error);
    }
  };

  const isUnread = (update: Update): boolean => {
    return initialUnreadIds.has(update.id);
  };

  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0];
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

  const renderUpdate = ({ item }: { item: Update }) => (
    <TouchableOpacity
      style={styles.updateCard}
      onPress={() => router.push(`/update/${item.id}`)}
    >
      {isUnread(item) && <View style={styles.unreadDot} />}
      <View style={styles.updateRow}>
        <View style={[styles.avatar, { backgroundColor: item.user_avatar_color || '#E0E0E0' }]}>
          <Text style={styles.avatarText}>{item.user_name?.[0]?.toUpperCase() || "U"}</Text>
        </View>
        <View style={styles.updateContentWrapper}>
          <View style={styles.updateHeader}>
            <Text style={styles.userName}>
              <Text style={styles.userNameBold}>{getFirstName(item.user_name || 'Unknown')}</Text>
              <Text style={styles.userNameNormal}> in </Text>
              <Text style={styles.groupNameBold}>
                {item.group_emoji ? `${item.group_emoji} ` : ''}{item.group_name}
              </Text>
            </Text>
            <Text style={styles.timestamp}>{formatTimeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.updateContent}>{item.content}</Text>
          <View style={styles.bottomRow}>
            <View onStartShouldSetResponder={() => true} style={styles.reactionsWrapper}>
              <Reactions
                reactionIds={item.reactions}
                updateId={item.id}
                groupPoints={item.group_points || 0}
                onReactionAdded={() => fetchUpdates(true)}
              />
            </View>
            {item.comment_count !== undefined && (
              <Text style={styles.commentCount}>
                {item.comment_count} {item.comment_count === 1 ? 'comment' : 'comments'}
              </Text>
            )}
          </View>
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
        onRefresh={() => fetchUpdates(true)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {hasGroups ? (
              <Text style={styles.emptyStateText}>all quiet on the western front</Text>
            ) : (
              <TouchableOpacity
                style={styles.createGroupButton}
                onPress={() => router.push("/(tabs)/groups")}
              >
                <Text style={styles.createGroupButtonText}>+ create a group</Text>
              </TouchableOpacity>
            )}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: Colors.brandGreen,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  createGroupButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
  },
  createGroupButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999999",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999999",
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
    color: Colors.black,
    flex: 1,
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
  unreadDot: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.highlight,
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
