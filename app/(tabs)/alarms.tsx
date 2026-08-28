import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthProvider";
import { can, permissions } from "@/src/auth/permissions";
import { AppScreen } from "@/src/components/AppScreen";
import { StateView } from "@/src/components/StateView";
import { appRepository } from "@/src/data/appRepository";
import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";
import type { AlarmItem } from "@/src/types/domain";

export default function AlarmsScreen() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const [items, setItems] = useState<AlarmItem[]>();
  const [error, setError] = useState(false);
  const [mutatingId, setMutatingId] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session || !can(session, permissions.alarmsView)) return;
    let active = true;
    setError(false);
    setItems(undefined);
    void appRepository.getAlarms(session).then((value) => { if (active) setItems(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [reloadKey, session]);

  if (!can(session, permissions.alarmsView)) return <AppScreen title={t("alarms")}><StateView title={t("forbidden")} /></AppScreen>;
  if (!session) return null;

  async function acknowledge(item: AlarmItem) {
    setMutatingId(item.id);
    try {
      const updated = await appRepository.acknowledgeAlarm(session!, item.id);
      setItems((current) => current?.map((value) => value.id === item.id ? updated : value));
    } catch { setError(true); } finally { setMutatingId(undefined); }
  }

  return (
    <AppScreen eyebrow={session.preview ? t("developmentPreview") : t("readOnly")} subtitle={t("serverScopedData")} title={t("alarms")}>
      {!items && !error ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.meta}>{t("loading")}</Text></View> : null}
      {error ? <View style={styles.errorBox}><StateView message={t("retryHelp")} title={t("loadError")} /><Pressable onPress={() => setReloadKey((value) => value + 1)} style={styles.retry}><Text style={styles.retryText}>{t("retry")}</Text></Pressable></View> : null}
      {items?.length === 0 ? <StateView title={t("alarmEmpty")} /> : null}
      {items?.map((alarm) => (
        <View key={alarm.id} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: `${colors[alarm.severity]}18` }]}><Text style={[styles.badgeText, { color: colors[alarm.severity] }]}>{t(alarm.severity)}</Text></View>
            <Text style={styles.date}>{new Date(alarm.occurredAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")}</Text>
          </View>
          <Text style={styles.title}>{alarm.nodeName}</Text>
          <Text style={styles.meta}>{alarm.buildingName} · {t(alarm.status === "open" ? "alarmOpen" : alarm.status === "acknowledged" ? "alarmAcknowledged" : "alarmResolved")}</Text>
          {can(session, permissions.alarmsAcknowledge) && alarm.status === "open" ? (
            <Pressable disabled={Boolean(mutatingId)} onPress={() => void acknowledge(alarm)} style={styles.action}>{mutatingId === alarm.id ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.actionText}>{t("acknowledge")}</Text>}</Pressable>
          ) : null}
        </View>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, marginTop: spacing.xs, minHeight: 42, padding: spacing.sm }, actionText: { color: colors.primary, fontSize: 13, fontWeight: "800" }, badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 }, badgeText: { fontSize: 12, fontWeight: "800" }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, date: { color: colors.muted, fontSize: 11 }, errorBox: { gap: spacing.sm }, loading: { alignItems: "center", gap: spacing.sm, padding: spacing.lg }, meta: { color: colors.muted, fontSize: 13 }, retry: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm }, retryText: { color: colors.primary, fontWeight: "800" }, row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, title: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
});
