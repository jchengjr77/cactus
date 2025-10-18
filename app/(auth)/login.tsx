import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import MyText from "@/components/MyText";
import MyTextInput from "@/components/MyTextInput";
import MyHeading from "@/components/MyHeading";
import MySemiBoldText from "@/components/MySemiBoldText";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert("Login Failed", error.message);
      return;
    }

    // Navigation will happen automatically via auth state change
    router.replace("/(tabs)");
  };

  const isFormValid = email.trim() !== "" && password.trim() !== "";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <MyHeading style={styles.logo}>cactus</MyHeading>
          <MyText style={styles.tagline}>water your friendships</MyText>
        </View>

        <View style={styles.form}>
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

          <TouchableOpacity
            style={[styles.button, (loading || !isFormValid) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || !isFormValid}
          >
            <MySemiBoldText style={styles.buttonText}>{loading ? "logging in..." : "log in"}</MySemiBoldText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <MyText style={styles.footerText}>Don't have an account? </MyText>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <MySemiBoldText style={styles.link}>Sign up</MySemiBoldText>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
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
    gap: 24,
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
});
