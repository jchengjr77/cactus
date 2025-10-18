import { View,  StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/types/database";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import MyText from "@/components/MyText";
import MyTextInput from "@/components/MyTextInput";
import MyHeading from "@/components/MyHeading";
import MyBoldText from "@/components/MyBoldText";
import MySemiBoldText from "@/components/MySemiBoldText";

const PAGE_SIZE = 20;

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchNotifications(true);
  }, [user]);

  const fetchNotifications = async (refresh: boolean = false) => {
    if (!user?.email) return;

    try {
      if (refresh) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = refresh ? 0 : offset;

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!userData) return;

      // Fetch notifications for this user
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user', userData.id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      const fetchedNotifications = data || [];

      // Check if there's more data to load
      setHasMore(fetchedNotifications.length === PAGE_SIZE);

      if (refresh) {
        setNotifications(fetchedNotifications);
        setOffset(PAGE_SIZE);
      } else {
        // Append to existing notifications
        setNotifications(prev => [...prev, ...fetchedNotifications]);
        setOffset(currentOffset + PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now.getTime() - notifTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.notification_type) {
      case 'group_invite':
        return {
          title: 'group invitation',
          message: `You've been invited to join ${notification.data.group_emoji} ${notification.data.group_name}`
        };
      default:
        return {
          title: notification.notification_type.replace(/_/g, ' '),
          message: 'New notification'
        };
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark notification as opened
    await supabase
      .from('notifications')
      .update({ opened: true })
      .eq('id', notification.id);

    // Update local state
    setNotifications(prevNotifications =>
      prevNotifications.map(n =>
        n.id === notification.id ? { ...n, opened: true } : n
      )
    );

    // Navigate based on notification type
    if (notification.notification_type === 'group_invite') {
      router.push(`/notification/group_invite?id=${notification.id}`);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(false);
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

  const renderNotification = ({ item }: { item: Notification }) => {
    const { title, message } = getNotificationText(item);
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.notificationCard,
          !item.opened && styles.notificationUnread
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <MyBoldText style={styles.notificationTitle}>{title}</MyBoldText>
            <View style={styles.timestampContainer}>
              <MyText style={styles.notificationTime}>{formatTime(item.created_at)}</MyText>
              {!item.opened && <View style={styles.unreadDot} />}
            </View>
          </View>
          <MyText style={styles.notificationMessage}>{message}</MyText>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MyHeading style={styles.title}>notifications</MyHeading>
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
        <MyHeading style={styles.title}>notifications</MyHeading>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={notifications.length === 0 ? styles.emptyListContent : styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => fetchNotifications(true)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MyText style={styles.emptyStateText}>don't worry, i'm sure something'll pop up</MyText>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 34,
    color: Colors.brandGreen,
  },
  contentContainer: {
    padding: 24,
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    gap: 12,
    position: "relative",
  },
  notificationUnread: {
    backgroundColor: "#FFF5E6",
    borderColor: Colors.highlight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.highlight,
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationTitle: {
    fontSize: 14,
    color: "#000000",
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999999",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999999",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
