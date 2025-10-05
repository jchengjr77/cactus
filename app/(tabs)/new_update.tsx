import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function NewUpdateScreen() {
  const [updateText, setUpdateText] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const handlePost = () => {
    // TODO: Implement post logic
    console.log("Posting update:", updateText);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>new update</Text>
        <TouchableOpacity
          style={[styles.postButton, !updateText && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!updateText}
        >
          <Text style={[styles.postButtonText, !updateText && styles.postButtonTextDisabled]}>
            post
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.groupSelector}>
          <Text style={styles.label}>select group</Text>
          <View style={styles.groupPlaceholder}>
            <Text style={styles.groupPlaceholderText}>tap to select a group</Text>
          </View>
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

        <View style={styles.mediaOptions}>
          <TouchableOpacity style={styles.mediaButton}>
            <Text style={styles.mediaButtonText}>📷 photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Text style={styles.mediaButtonText}>🎤 voice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Text style={styles.mediaButtonText}>🎥 video</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#5A8F6A",
    borderRadius: 8,
  },
  postButtonDisabled: {
    backgroundColor: "#E0E0E0",
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
  groupSelector: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  groupPlaceholder: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#F5F5F5",
  },
  groupPlaceholderText: {
    fontSize: 16,
    color: "#999999",
  },
  updateInput: {
    gap: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    minHeight: 150,
  },
  mediaOptions: {
    flexDirection: "row",
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  mediaButtonText: {
    fontSize: 14,
    color: "#000000",
  },
});
