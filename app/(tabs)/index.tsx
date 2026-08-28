import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthProvider";
import { can, permissions } from "@/src/auth/permissions";
import { landingFor } from "@/src/auth/landing";
import { AppScreen } from "@/src/components/AppScreen";
import { StateView } from "@/src/components/StateView";
import { Surface } from "@/src/components/Surface";
import { appRepository } from "@/src/data/appRepository";
import { previewAlarms, previewSummary } from "@/src/data/preview";
import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";
import type { AlarmItem, DashboardSummary, Severity } from "@/src/types/domain";

const severityOrder: Severity[] = ["danger", "warning", "caution", "offline", "safe"];

export default function HomeScreen() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [summary, setSummary] = useState<DashboardSummary>();
  const [alarms, setAlarms] = useState<AlarmItem[]>();
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session || session.preview || !can(session, permissions.dashboardView)) return;
    let active = true;
    setError(false);
    setSummary(undefined);
    setAlarms(undefined);
    const dashboard = appRepository.getDashboardSummary(session);
    const recentAlarms = can(session, permissions.alarmsView)
      ? appRepository.getAlarms(session)
      : Promise.resolve([]);
    void Promise.all([dashboard, recentAlarms]).then(([nextSummary, nextAlarms]) => {
      if (!active) return;
      setSummary(nextSummary);
      setAlarms(nextAlarms.slice(0, 5));
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [reloadKey, session]);

  if (!session) return null;
  const landing = landingFor(session);
  const titleKey = landing === "devices" ? "devices" : landing === "reports" ? "reports" : landing === "alarms" ? "alarms" : landing === "welcome" ? "home" : "monitoring";
  const displayedSummary = session.preview ? previewSummary : summary?.severityDistribution;
  const displayedAlarms = session.preview ? previewAlarms : alarms ?? [];
  const hasDashboard = can(session, permissions.dashboardView);

  return (
    <AppScreen eyebrow={session.preview ? t("developmentPreview") : session.user.company?.name ?? "GSS"} subtitle={`${session.user.role?.name ?? "-"} · ${session.preview ? t("readOnly") : t("serverScopedData")}`} title={`${t("welcome")}, ${session.user.name}`}>
      {hasDashboard ? (
        <>
          {!session.preview && !summary && !error ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.rowMeta}>{t("loading")}</Text></View> : null}
          {error ? <View style={styles.errorBox}><StateView message={t("retryHelp")} title={t("loadError")} /><Pressable onPress={() => setReloadKey((value) => value + 1)} style={styles.retry}><Text style={styles.retryText}>{t("retry")}</Text></Pressable></View> : null}
          {displayedSummary ? (
            <Surface title={t("statusSummary")}>
              <View style={styles.metrics}>
                {severityOrder.map((severity) => (
                  <View key={severity} style={styles.metric}>
                    <View style={[styles.dot, { backgroundColor: colors[severity] }]} />
                    <Text style={styles.metricLabel}>{t(severity)}</Text>
                    <Text style={styles.metricValue}>{displayedSummary[severity] ?? 0}</Text>
                  </View>
                ))}
              </View>
            </Surface>
          ) : null}
          {(session.preview || can(session, permissions.alarmsView)) && (session.preview || summary) ? (
            <Surface title={t("recentAlarms")}>
              {displayedAlarms.length === 0 ? <StateView title={t("alarmEmpty")} /> : displayedAlarms.map((alarm) => (
                <View key={alarm.id} style={styles.alarmRow}>
                  <MaterialCommunityIcons color={colors[alarm.severity]} name="alert-circle-outline" size={22} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{alarm.nodeName}</Text>
                    <Text style={styles.rowMeta}>{alarm.buildingName}</Text>
                  </View>
                  <Text style={[styles.severity, { color: colors[alarm.severity] }]}>{t(alarm.severity)}</Text>
                </View>
              ))}
            </Surface>
          ) : null}
        </>
      ) : (
        <Surface><StateView message={t("readOnly")} title={t(titleKey)} /></Surface>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  alarmRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm },
  dot: { borderRadius: radius.pill, height: 9, width: 9 },
  errorBox: { gap: spacing.sm },
  loading: { alignItems: "center", gap: spacing.sm, padding: spacing.lg },
  metric: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.sm, flexBasis: "30%", flexGrow: 1, gap: 3, minWidth: 88, padding: spacing.sm },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricValue: { color: colors.foreground, fontSize: 22, fontWeight: "800" },
  rowBody: { flex: 1 },
  rowMeta: { color: colors.muted, fontSize: 12 },
  rowTitle: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  retry: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm },
  retryText: { color: colors.primary, fontWeight: "800" },
  severity: { fontSize: 12, fontWeight: "800" },
});
