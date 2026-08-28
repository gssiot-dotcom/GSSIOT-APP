import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type PropsWithChildren, type ReactNode, useCallback, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/AuthProvider";
import { useI18n } from "@/src/i18n";
import { colors, spacing } from "@/src/theme/tokens";

type Props = PropsWithChildren<{
  eyebrow?: string;
  onBack?: () => void;
  right?: ReactNode;
  scroll?: boolean;
  showHeading?: boolean;
  subtitle?: string;
  title: string;
}>;

export function AppScreen({ children, eyebrow, onBack, right, scroll = true, showHeading = true, subtitle, title }: Props) {
  const { logout } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!onBack) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]));

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(t("logout"), t("logoutConfirm"), [
      { style: "cancel", text: t("no") },
      { onPress: () => void handleLogout(), style: "destructive", text: t("yes") },
    ]);
  };

  const content = (
    <View style={styles.content}>
      {showHeading ? <View style={styles.headerRow}>
        <View style={styles.heading}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View> : null}
      {children}
    </View>
  );

  return (
    <View style={styles.safe}>
      <StatusBar backgroundColor={colors.primary} style="light" />
      <View style={[styles.topBar, { paddingTop: insets.top }]}> 
        <Pressable accessibilityLabel={t("back")} hitSlop={8} onPress={handleBack} style={({ pressed }) => [styles.topBarButton, pressed && styles.buttonPressed]}>
          <MaterialCommunityIcons color={colors.surface} name="arrow-left" size={25} />
        </Pressable>

        <View pointerEvents="none" style={[styles.logoWrap, { paddingTop: insets.top }]}> 
          <Image resizeMode="contain" source={require("../../assets/images/white_logo.png")} style={styles.logo} />
        </View>

        <Pressable accessibilityLabel={t("logout")} disabled={loggingOut} hitSlop={8} onPress={confirmLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}>
          {loggingOut ? <ActivityIndicator color={colors.surface} size="small" /> : <MaterialCommunityIcons color={colors.surface} name="logout" size={25} />}
        </Pressable>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom }]}> 
        {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { backgroundColor: colors.background, flex: 1 },
  buttonPressed: { opacity: 0.65 },
  content: { flex: 1, gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  heading: { flex: 1, gap: spacing.xs },
  logo: { height: 30, width: 82 },
  logoWrap: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  logoutButton: { alignItems: "flex-end", justifyContent: "center", minHeight: 48, minWidth: 86 },
  safe: { backgroundColor: colors.primary, flex: 1 },
  scroll: { flexGrow: 1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  title: { color: colors.foreground, fontSize: 27, fontWeight: "800" },
  topBar: { alignItems: "center", backgroundColor: colors.primary, flexDirection: "row", justifyContent: "space-between", minHeight: 78, paddingHorizontal: spacing.md },
  topBarButton: { alignItems: "flex-start", justifyContent: "center", minHeight: 48, minWidth: 86 },
});
