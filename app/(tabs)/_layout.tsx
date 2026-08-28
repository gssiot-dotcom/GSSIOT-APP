import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/auth/AuthProvider";
import { can, permissions } from "@/src/auth/permissions";
import { useI18n } from "@/src/i18n";
import { colors } from "@/src/theme/tokens";

export default function TabsLayout() {
  const { session, state } = useAuth();
  const { t } = useI18n();
  if (state.status === "booting") return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: styles.label, tabBarStyle: styles.bar }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="view-dashboard-outline" size={size} />, title: t("home") }} />
      <Tabs.Screen name="monitoring" options={{ href: can(session, permissions.monitoringView) ? undefined : null, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="access-point" size={size} />, title: t("monitoring") }} />
      <Tabs.Screen name="alarms" options={{ href: can(session, permissions.alarmsView) ? undefined : null, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="alert-outline" size={size} />, title: t("alarms") }} />
      <Tabs.Screen name="notifications" options={{ href: can(session, permissions.notificationsView) ? undefined : null, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="bell-outline" size={size} />, title: t("notifications") }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="account-outline" size={size} />, title: t("profile") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 66, paddingBottom: 8, paddingTop: 7 },
  label: { fontSize: 11, fontWeight: "700" },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
});
