import { MaterialIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      fetchUserName();
    }
  }, [user]);

  const fetchUserName = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('name')
      .eq('uuid', user.id)
      .single();

    if (data && !error) {
      setUserName(data.name || "");
    }
  };

  const getUserInitial = () => {
    if (userName) {
      return userName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7C59" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4A7C59",
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
            <MaterialIcons name="home-filled" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="groups" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="new_update"
        options={{
          tabBarIcon: ({ color }) => (
            <View style={styles.newUpdateIcon}>
              <MaterialIcons name="create" size={20} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="notifications" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.accountIcon}>
              <Text style={styles.accountIconText}>
                {getUserInitial()}
              </Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  newUpdateIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#4A7C59",
    alignItems: "center",
    justifyContent: "center",
  },
  accountIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  accountIconText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
  },
});
