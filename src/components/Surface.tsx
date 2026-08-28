import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/src/theme/tokens";

export function Surface({ children, title }: PropsWithChildren<{ title?: string }>) {
  return (
    <View style={styles.surface}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  title: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
});
