import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthProvider";
import { can, permissions } from "@/src/auth/permissions";
import { AppScreen } from "@/src/components/AppScreen";
import { StateView } from "@/src/components/StateView";
import { appRepository } from "@/src/data/appRepository";
import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";
import type { NotificationItem } from "@/src/types/domain";

export default function NotificationsScreen() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>();
  const [error, setError] = useState(false);
  const [marking, setMarking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session || !can(session, permissions.notificationsView)) return;
    let active = true;
    setError(false);
    setItems(undefined);
    void appRepository.getNotifications(session).then((value) => { if (active) setItems(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [reloadKey, session]);

  if (!can(session, permissions.notificationsView)) return <AppScreen title={t("notifications")}><StateView title={t("forbidden")} /></AppScreen>;
  if (!session) return null;

  async function markAllRead() {
    setMarking(true);
    try {
      await appRepository.markAllNotificationsRead(session!);
      setItems((current) => current?.map((item) => ({ ...item, read: true })));
    } catch { setError(true); } finally { setMarking(false); }
  }

  const hasUnread = items?.some((item) => !item.read);
  return (
    <AppScreen right={hasUnread ? <Pressable disabled={marking} onPress={() => void markAllRead()}><Text style={styles.action}>{marking ? t("loading") : t("allRead")}</Text></Pressable> : undefined} subtitle={session.preview ? t("developmentPreview") : t("serverScopedData")} title={t("notifications")}>
      {!items && !error ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.meta}>{t("loading")}</Text></View> : null}
      {error ? <View style={styles.errorBox}><StateView message={t("retryHelp")} title={t("loadError")} /><Pressable onPress={() => setReloadKey((value) => value + 1)} style={styles.retry}><Text style={styles.retryText}>{t("retry")}</Text></Pressable></View> : null}
      {items?.length === 0 ? <StateView title={t("notificationEmpty")} /> : null}
      {items?.map((notification) => (
        <View key={notification.id} style={[styles.card, !notification.read && styles.unread]}>
          <View style={styles.row}><Text style={styles.title}>{notification.title}</Text>{!notification.read ? <View style={styles.dot} /> : null}</View>
          <Text style={styles.message}>{notification.message}</Text>
          <Text style={styles.date}>{new Date(notification.createdAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")}</Text>
        </View>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  action: { color: colors.primary, fontSize: 13, fontWeight: "800", paddingVertical: spacing.sm }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, date: { color: colors.muted, fontSize: 11 }, dot: { backgroundColor: colors.primary, borderRadius: radius.pill, height: 8, width: 8 }, errorBox: { gap: spacing.sm }, loading: { alignItems: "center", gap: spacing.sm, padding: spacing.lg }, message: { color: colors.muted, fontSize: 13, lineHeight: 20 }, meta: { color: colors.muted, fontSize: 13 }, retry: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm }, retryText: { color: colors.primary, fontWeight: "800" }, row: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }, title: { color: colors.foreground, flex: 1, fontSize: 15, fontWeight: "800" }, unread: { borderColor: colors.primary },
});
