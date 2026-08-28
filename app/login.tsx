import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError } from "@/src/api/http";
import { useAuth } from "@/src/auth/AuthProvider";
import { previewRoleOptions } from "@/src/auth/permissions";
import { runtimeConfig } from "@/src/config/runtime";
import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";
import type { AuthContext } from "@/src/types/auth";

export default function LoginScreen() {
  const { login, preview, state } = useAuth();
  const { t } = useI18n();
  const [context, setContext] = useState<AuthContext>("company-user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roles = useMemo(() => previewRoleOptions.filter((role) => role.context === context), [context]);

  if (state.status === "authenticated") return <Redirect href="/(tabs)" />;

  async function handleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      await login(context, email, password);
    } catch (caught) {
      if (!(caught instanceof ApiError)) setError(t("loginFailed"));
      else if (caught.status === 0) setError(t("connectionError"));
      else if (caught.status === 401) setError(`${t("invalidCredentials")} (HTTP 401)`);
      else if (caught.status === 403) setError(`${t("loginDenied")} (HTTP 403)`);
      else setError(`${t("loginFailed")} (HTTP ${caught.status})`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
      style={styles.flex}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.root}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image resizeMode="contain" source={require("../assets/images/Gss-logo-blue.png")} style={styles.logo} />
          <Text style={styles.appName}>{t("appName")}</Text>
          <Text style={styles.help}>{t("loginHelp")}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.segmented}>
            {(["company-user", "gss-admin"] as const).map((value) => (
              <Pressable key={value} onPress={() => setContext(value)} style={[styles.segment, context === value && styles.segmentActive]}>
                <Text style={[styles.segmentText, context === value && styles.segmentTextActive]}>
                  {t(value === "company-user" ? "companyLogin" : "gssLogin")}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t("email")}</Text>
            <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} style={styles.input} value={email} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t("password")}</Text>
            <TextInput onChangeText={setPassword} secureTextEntry style={styles.input} value={password} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={[styles.primaryButtonShell, (!email || !password || submitting) && styles.disabled]}>
            <Pressable
              android_ripple={{ color: "rgba(255, 255, 255, 0.22)" }}
              disabled={!email || !password || submitting}
              onPress={handleLogin}
              style={styles.primaryButton}
            >
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{t("login")}</Text>}
            </Pressable>
          </View>
        </View>
        {runtimeConfig.demoMode ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeading}>
              <MaterialCommunityIcons color={colors.primary} name="flask-outline" size={20} />
              <View style={styles.flex}>
                <Text style={styles.previewTitle}>{t("preview")}</Text>
                <Text style={styles.previewHelp}>{t("previewHelp")}</Text>
              </View>
            </View>
            <View style={styles.roleGrid}>
              {roles.map((role) => <Pressable key={role.key} onPress={() => preview(role.key)} style={styles.roleButton}><Text style={styles.roleButtonText}>{role.name}</Text></Pressable>)}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  appName: { color: colors.foreground, fontSize: 28, fontWeight: "800" },
  brand: { alignItems: "center", gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  disabled: { opacity: 0.62 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  field: { gap: spacing.xs },
  flex: { flex: 1 },
  help: { color: colors.muted, fontSize: 13, lineHeight: 19, maxWidth: 320, textAlign: "center" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.foreground, fontSize: 16, minHeight: 48, paddingHorizontal: spacing.md },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  logo: { height: 64, width: 170 },
  previewCard: { backgroundColor: colors.primarySoft, borderColor: "#B6DFF0", borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  previewHeading: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  previewHelp: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  previewTitle: { color: colors.foreground, fontSize: 15, fontWeight: "800" },
  primaryButton: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 50 },
  primaryButtonShell: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderRadius: radius.sm,
    borderWidth: 1,
    elevation: 2,
    minHeight: 50,
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  roleButton: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  roleButtonText: { color: colors.foreground, fontSize: 12, fontWeight: "700" },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  root: { backgroundColor: colors.background, flexGrow: 1, gap: spacing.lg, justifyContent: "center", padding: spacing.lg },
  segment: { alignItems: "center", borderRadius: radius.sm, flex: 1, padding: spacing.sm },
  segmentActive: { backgroundColor: colors.primary },
  segmented: { backgroundColor: colors.background, borderRadius: radius.sm, flexDirection: "row", padding: 3 },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  segmentTextActive: { color: "#FFFFFF" },
});
