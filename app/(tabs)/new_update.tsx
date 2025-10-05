import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Group } from "@/types/database";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface GroupMember {
  id: number;
  name: string;
  avatar_color: string | null;
}

interface GroupWithMembers extends Group {
  memberData?: GroupMember[];
}

export default function NewUpdateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [updateText, setUpdateText] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchCurrentUser();
    }
  }, [user]);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchUserGroups();
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

  const fetchUserGroups = async () => {
    if (currentUserId === null) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .contains('members', [currentUserId.toString()])
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching groups:', error);
        return;
      }

      // Fetch member data for each group
      const groupsWithMembers = await Promise.all(
        (data || []).map(async (group) => {
          const memberIds = group.members.map((id: string) => parseInt(id, 10));

          const { data: membersData } = await supabase
            .from('users')
            .select('id, name, avatar_color')
            .in('id', memberIds);

          return {
            ...group,
            memberData: membersData || []
          };
        })
      );

      setGroups(groupsWithMembers);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!updateText.trim() || !selectedGroup || currentUserId === null) return;

    try {
      setPosting(true);

      const { error } = await supabase
        .from('updates')
        .insert([
          {
            content: updateText.trim(),
            author: currentUserId,
            parent_group_id: selectedGroup.id,
            read_by: [],
          }
        ]);

      if (error) {
        Alert.alert("Error", "Failed to post update. Please try again.");
        console.error('Error posting update:', error);
        return;
      }

      // Clear form
      setUpdateText("");
      setSelectedGroup(null);

      // Navigate to home feed
      router.push("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Failed to post update. Please try again.");
      console.error('Error:', error);
    } finally {
      setPosting(false);
    }
  };

  const canPost = updateText.trim() !== "" && selectedGroup !== null && !posting;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>new update</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brandGreen} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>new update</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.groupSelector}>
          <Text style={styles.label}>select group</Text>
          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>you're not in any active groups yet</Text>
              <TouchableOpacity
                style={styles.createGroupButton}
                onPress={() => router.push("/(tabs)/groups")}
              >
                <Text style={styles.createGroupButtonText}>+ create a group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.groupGrid}>
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupCard,
                    selectedGroup?.id === group.id && styles.groupCardSelected
                  ]}
                  onPress={() => setSelectedGroup(group)}
                >
                  <Text style={styles.groupCardName}>{group.name}</Text>
                  <Text style={styles.groupCardEmoji}>{group.emoji_icon || '📁'}</Text>
                  <View style={styles.avatarStack}>
                    {(group.memberData || []).slice(0, 4).map((member, index) => (
                      <View
                        key={member.id}
                        style={[
                          styles.stackedAvatar,
                          {
                            backgroundColor: member.avatar_color || '#E0E0E0',
                            marginLeft: index > 0 ? -8 : 0,
                            zIndex: 4 - index
                          }
                        ]}
                      >
                        <Text style={styles.stackedAvatarText}>
                          {member.name[0]?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                    ))}
                    {(group.memberData || []).length > 4 && (
                      <View style={[styles.stackedAvatar, styles.moreAvatar, { marginLeft: -8 }]}>
                        <Text style={styles.moreAvatarText}>
                          +{(group.memberData || []).length - 4}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.updateInput}>
          <Text style={styles.label}>your update</Text>
          <TextInput
            style={styles.textArea}
            value={updateText}
            onChangeText={setUpdateText}
            placeholder="what's happening?"
            placeholderTextColor="#999"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>
            {posting ? "posting..." : "post"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  postButton: {
    height: 48,
    backgroundColor: Colors.brandGreen,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  postButtonDisabled: {
    backgroundColor: Colors.lightGrey,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.background,
  },
  postButtonTextDisabled: {
    color: "#999999",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  groupSelector: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
  },
  groupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  groupCard: {
    width: "31%",
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: Colors.lightGrey,
    borderRadius: 16,
    padding: 12,
    backgroundColor: Colors.background,
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupCardSelected: {
    borderColor: Colors.brandGreen,
    backgroundColor: "#F5F9F0",
  },
  groupCardName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.black,
    textAlign: "center",
  },
  groupCardEmoji: {
    fontSize: 40,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stackedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
  },
  stackedAvatarText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666666",
  },
  moreAvatar: {
    backgroundColor: Colors.lightGrey,
  },
  moreAvatarText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#666666",
  },
  updateInput: {
    gap: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.black,
    backgroundColor: Colors.background,
    minHeight: 150,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
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
    color: Colors.brandGreen,
  },
});
