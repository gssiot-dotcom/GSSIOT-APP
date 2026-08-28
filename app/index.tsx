import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/auth/AuthProvider";
import { colors } from "@/src/theme/tokens";

export default function IndexScreen() {
  const { state } = useAuth();
  if (state.status === "booting") {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  return <Redirect href={state.status === "authenticated" ? "/(tabs)" : "/login"} />;
}

const styles = StyleSheet.create({ loading: { alignItems: "center", flex: 1, justifyContent: "center" } });
