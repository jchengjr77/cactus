import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: "deadline",
    title: "update due soon",
    message: "college crew update due in 2 hours",
    time: "2h",
    unread: true,
  },
  {
    id: 2,
    type: "update",
    title: "new update",
    message: "Sarah posted to family",
    time: "5h",
    unread: true,
  },
  {
    id: 3,
    type: "charge",
    title: "penalty charged",
    message: "Missed update in roommates - $5 coffee added to tab",
    time: "1d",
    unread: false,
  },
  {
    id: 4,
    type: "update",
    title: "new update",
    message: "Mike posted to college crew",
    time: "2d",
    unread: false,
  },
];

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>notifications</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {MOCK_NOTIFICATIONS.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[styles.notificationCard, notification.unread && styles.notificationUnread]}
          >
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
            </View>
            {notification.unread && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    gap: 12,
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
  },
  notificationUnread: {
    backgroundColor: "#F5F9F7",
    borderColor: "#5A8F6A",
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
    fontWeight: "600",
    color: "#000000",
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5A8F6A",
    marginTop: 4,
  },
});
