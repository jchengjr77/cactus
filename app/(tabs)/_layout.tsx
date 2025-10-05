import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#5A8F6A",
        tabBarInactiveTintColor: "#999999",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E0E0E0",
          height: 80,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home-variant" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="magnify" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="new_update"
        options={{
          tabBarIcon: ({ color }) => (
            <View style={styles.newUpdateIcon}>
              <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="bell" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="account-circle" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  newUpdateIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#5A8F6A",
    alignItems: "center",
    justifyContent: "center",
  },
});
