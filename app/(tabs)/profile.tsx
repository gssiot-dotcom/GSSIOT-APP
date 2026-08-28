import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthProvider";
import { AppScreen } from "@/src/components/AppScreen";
import { Surface } from "@/src/components/Surface";
import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";

export default function ProfileScreen() {
  const { session } = useAuth();
  const { locale, setLocale, t } = useI18n();
  if (!session) return null;

  return (
    <AppScreen subtitle={session.user.email} title={t("profile")}>
      <Surface>
        <Text style={styles.name}>{session.user.name}</Text>
        <Row label={t("role")} value={session.user.role?.name ?? "-"} />
        <Row label={t("scope")} value={session.user.company?.name ?? "GSS"} />
      </Surface>
      <Surface title={t("language")}>
        <View style={styles.languageRow}>
          {(["ko", "en"] as const).map((value) => (
            <Pressable key={value} onPress={() => setLocale(value)} style={[styles.language, locale === value && styles.languageActive]}>
              <Text style={[styles.languageText, locale === value && styles.languageTextActive]}>{value === "ko" ? "한국어" : "English"}</Text>
            </Pressable>
          ))}
        </View>
      </Surface>
    </AppScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 13 },
  language: { alignItems: "center", borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flex: 1, padding: spacing.sm },
  languageActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  languageRow: { flexDirection: "row", gap: spacing.sm },
  languageText: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  languageTextActive: { color: "#FFFFFF" },
  name: { color: colors.foreground, fontSize: 20, fontWeight: "800" },
  row: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm },
  value: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
});
