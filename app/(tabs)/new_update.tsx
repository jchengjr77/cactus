import MyHeading from "@/components/MyHeading";
import MySemiBoldText from "@/components/MySemiBoldText";
import MyText from "@/components/MyText";
import MyTextInput from "@/components/MyTextInput";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Group } from "@/types/database";
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { v4 as uuidv4 } from 'uuid';

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
  const [selectedPhotos, setSelectedPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);

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

  const pickImages = async () => {
    if (selectedPhotos.length >= 5) {
      Alert.alert("Maximum photos", "You can only attach up to 5 photos per update.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - selectedPhotos.length,
    });

    if (!result.canceled && result.assets) {
      setSelectedPhotos(prev => [...prev, ...result.assets].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!updateText.trim() || !selectedGroup || currentUserId === null) {
      return;
    }

    try {
      setPosting(true);

      // Upload photos to storage first if any are selected
      const filePaths: string[] = [];

      for (const asset of selectedPhotos) {
        // Generate unique filename
        const uid = asset.assetId || uuidv4();
        const fileExt = asset.uri.split('.').pop() || 'jpg';
        const fileName = `${selectedGroup.id}/${uid}.${fileExt}`;

        // Create FormData for React Native file upload
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: asset.type === 'image' ? `image/${fileExt}` : 'image/jpeg',
          name: fileName,
        } as any);

        // Check if file already exists
        const { data: existingFile } = await supabase.storage
          .from('updates_media')
          .list(selectedGroup.id.toString(), {
            search: `${uid}.${fileExt}`
          });

        if (existingFile && existingFile.length > 0) {
          // File already exists, skip upload and use existing path
          filePaths.push(fileName);
        } else {
          // File doesn't exist, upload it
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('updates_media')
            .upload(fileName, formData);

          if (uploadError) {
            console.error('Error uploading photo:', uploadError);
            Alert.alert("Error", "Failed to upload photos. Please try again.");
            return;
          }

          if (uploadData?.path) {
            filePaths.push(uploadData.path);
          }
        }
      }

      // Call edge function with photo URLs
      const { data, error } = await supabase.functions.invoke('post-update', {
        body: {
          user_id: currentUserId,
          group_id: selectedGroup.id,
          text: updateText.trim(),
          photo_urls: filePaths.length > 0 ? filePaths : undefined,
        }
      });

      if (error) {
        Alert.alert("Error", "Failed to post update. Please try again.");
        console.error('Error posting update:', error);
        return;
      }

      if (data?.error) {
        Alert.alert("Error", data.error);
        console.error('Error posting update:', data.error);
        return;
      }

      // Clear form
      setUpdateText("");
      setSelectedGroup(null);
      setSelectedPhotos([]);

      // Navigate to home feed and trigger refresh
      router.push({
        pathname: "/(tabs)",
        params: { refresh: Date.now().toString() }
      });
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
          <MyHeading style={styles.title}>new update</MyHeading>
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
        <MyHeading style={styles.title}>new update</MyHeading>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.groupSelector}>
          <MySemiBoldText style={styles.label}>select group</MySemiBoldText>
          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <MyText style={styles.emptyStateText}>you're not in any active groups yet</MyText>
              <TouchableOpacity
                style={styles.createGroupButton}
                onPress={() => router.push("/(tabs)/groups")}
              >
                <MySemiBoldText style={styles.createGroupButtonText}>+ create a group</MySemiBoldText>
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
                  <MySemiBoldText style={styles.groupCardName}>{group.name}</MySemiBoldText>
                  <MyText style={styles.groupCardEmoji}>{group.emoji_icon || '📁'}</MyText>
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
                        <MySemiBoldText style={styles.stackedAvatarText}>
                          {member.name[0]?.toUpperCase() || 'U'}
                        </MySemiBoldText>
                      </View>
                    ))}
                    {(group.memberData || []).length > 4 && (
                      <View style={[styles.stackedAvatar, styles.moreAvatar, { marginLeft: -8 }]}>
                        <MySemiBoldText style={styles.moreAvatarText}>
                          +{(group.memberData || []).length - 4}
                        </MySemiBoldText>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.updateInput}>
          <View style={styles.labelRow}>
            <MySemiBoldText style={styles.label}>your update</MySemiBoldText>
            <MyText style={[styles.charCount, updateText.length > 300 && styles.charCountError]}>
              {updateText.length}/300
            </MyText>
          </View>
          <MyTextInput
            style={styles.textArea}
            value={updateText}
            onChangeText={(text) => {
              if (text.length <= 300) {
                setUpdateText(text);
              }
            }}
            placeholder="what's happening?"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            maxLength={300}
          />
        </View>

        <View style={styles.photoSection}>
          {
            selectedPhotos.length > 0 && (
              <View style={styles.photoHeader}>
                <MySemiBoldText style={styles.label}>photos</MySemiBoldText>
                {selectedPhotos.length > 0 && (
                  <MyText style={styles.photoCount}>{selectedPhotos.length}/5</MyText>
                )}
              </View>
            )
          }

          {selectedPhotos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
              {selectedPhotos.map((photoAsset, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photoAsset.uri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <MaterialIcons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {selectedPhotos.length < 5 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
              <MaterialIcons name="add-photo-alternate" size={24} color={Colors.brandGreen} />
              <MySemiBoldText style={styles.addPhotoText}>
                {selectedPhotos.length === 0 ? 'add pics' : 'add more pics'}
              </MySemiBoldText>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          <MySemiBoldText style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>
            {posting ? "posting..." : "post"}
          </MySemiBoldText>
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
    color: Colors.brandGreen,
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
    color: "#666666",
  },
  moreAvatar: {
    backgroundColor: Colors.lightGrey,
  },
  moreAvatarText: {
    fontSize: 9,
    color: "#666666",
  },
  updateInput: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontSize: 13,
    color: "#999999",
  },
  charCountError: {
    color: "#DC2626",
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.black,
    backgroundColor: Colors.background,
    minHeight: 80,
    maxHeight: 200,
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
    color: Colors.brandGreen,
  },
  photoSection: {
    gap: 12,
  },
  photoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoCount: {
    fontSize: 13,
    color: "#999999",
  },
  photoList: {
    flexDirection: "row",
  },
  photoContainer: {
    position: "relative",
    marginRight: 12,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: Colors.lightGrey,
  },
  removePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
    borderStyle: "dashed",
  },
  addPhotoText: {
    fontSize: 15,
    color: Colors.brandGreen,
  },
});
