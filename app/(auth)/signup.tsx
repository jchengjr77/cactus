import { useAuth } from "@/contexts/AuthContext";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/Colors";
import MyText from "@/components/MyText";
import MyTextInput from "@/components/MyTextInput";
import MyHeading from "@/components/MyHeading";
import MySemiBoldText from "@/components/MySemiBoldText";

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showVerificationScreen, setShowVerificationScreen] = useState(false);

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      Alert.alert("Signup Failed", error.message);
      return;
    }

    setShowVerificationScreen(true);
  };

  const isFormValid =
    name.trim() !== "" &&
    email.trim() !== "" &&
    password.trim() !== "" &&
    confirmPassword.trim() !== "";

  if (showVerificationScreen) {
    return (
      <View style={styles.container}>
        <View style={styles.verificationContainer}>
          <MyHeading style={styles.logo}>welcome</MyHeading>
          <MyText style={styles.verificationText}>
            Click the verification link in your email to log in.
          </MyText>
          <TouchableOpacity
            style={styles.verificationButton}
            onPress={() => router.replace("/(auth)/login")}
          >
            <MySemiBoldText style={styles.buttonText}>return to login</MySemiBoldText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <MyHeading style={styles.logo}>sign up</MyHeading>
            <MyText style={styles.tagline}>your people are waiting!</MyText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <MyText style={styles.label}>name</MyText>
              <MyTextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="your name"
                placeholderTextColor="#999"
                autoComplete="name"
              />
            </View>

            <View style={styles.inputGroup}>
              <MyText style={styles.label}>email</MyText>
              <MyTextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#999"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <MyText style={styles.label}>password</MyText>
              <MyTextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <MyText style={styles.label}>confirm password</MyText>
              <MyTextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || !isFormValid) && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading || !isFormValid}
            >
              <MySemiBoldText style={styles.buttonText}>{loading ? "creating account..." : "join cactus"}</MySemiBoldText>
            </TouchableOpacity>

            <View style={styles.footer}>
              <MyText style={styles.footerText}>Already have an account? </MyText>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <MySemiBoldText style={styles.link}>Log in</MySemiBoldText>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: "center",
  },
  header: {
    marginBottom: 48,
    alignItems: "center",
  },
  logo: {
    fontSize: 40,
    fontWeight: "700",
    color: Colors.brandGreen,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#666666",
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.black,
    backgroundColor: Colors.background,
  },
  button: {
    height: 48,
    backgroundColor: Colors.brandGreen,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.background,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#666666",
  },
  link: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.brandGreen,
    textDecorationLine: "underline",
  },
  verificationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  verificationText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },
  verificationEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
    textAlign: "center",
  },
  verificationButton: {
    height: 48,
    backgroundColor: Colors.brandGreen,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 32,
  },
});
