import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/theme/tokens";

export function StateView({ message, title }: { message?: string; title: string }) {
  return (
    <View style={styles.root}>
      <MaterialCommunityIcons color={colors.muted} name="database-off-outline" size={34} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  message: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  root: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  title: { color: colors.foreground, fontSize: 16, fontWeight: "700", textAlign: "center" },
});
