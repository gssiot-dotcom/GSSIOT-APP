import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthProvider";
import { can, permissions } from "@/src/auth/permissions";
import { AppScreen } from "@/src/components/AppScreen";
import { StateView } from "@/src/components/StateView";
import { Surface } from "@/src/components/Surface";
import { appRepository } from "@/src/data/appRepository";
import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";
import type { CanonicalNodeType, FaultFilterNodeRecord, MonitoringNodeState, MonitoringStatus } from "@/src/types/domain";

type LoadState = "error" | "loading" | "ready";

const nodeTypeLabels = {
  angle_node: "nodeAngle",
  door_node: "nodeDoor",
  gangform_node: "nodeGangform",
} as const;

export default function NodeDetailScreen() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ buildingId?: string; nodeId?: string; nodeType?: string }>();
  const buildingId = firstParam(params.buildingId);
  const nodeId = firstParam(params.nodeId);
  const nodeType = toNodeType(firstParam(params.nodeType));
  const [nodeState, setNodeState] = useState<MonitoringNodeState>();
  const [filter, setFilter] = useState<FaultFilterNodeRecord>();
  const [buildingTitle, setBuildingTitle] = useState("");
  const [planImageUri, setPlanImageUri] = useState<string>();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session || !buildingId || !nodeId || !nodeType || !can(session, permissions.monitoringView)) return;
    let active = true;
    setLoadState("loading");
    void Promise.all([
      appRepository.getNodeTypeMonitoring(session, buildingId, nodeType),
      can(session, permissions.alarmLevelsView)
        ? appRepository.getFaultFilters(session, buildingId).catch(() => undefined)
        : Promise.resolve(undefined),
      can(session, permissions.buildingPlansView)
        ? appRepository.getBuildingPlanImage(session, buildingId).catch(() => undefined)
        : Promise.resolve(undefined),
    ]).then(([response, filters, planUri]) => {
      if (!active) return;
      const nextState = response.states.find((item) => item.nodeId === nodeId);
      if (!nextState) {
        setLoadState("error");
        return;
      }
      const nextFilter = filters?.gateways
        .find((item) => item.gateway.id === nextState.gateway.id)
        ?.nodeTypes.find((item) => item.nodeType.id === response.nodeType.id)
        ?.nodes.find((item) => item.nodeId === nextState.nodeId);
      setBuildingTitle(response.building.title);
      setFilter(nextFilter);
      setNodeState(nextState);
      setPlanImageUri(planUri);
      setLoadState("ready");
    }).catch(() => { if (active) setLoadState("error"); });
    return () => { active = false; };
  }, [buildingId, nodeId, nodeType, reloadKey, session]);

  if (!session) return <Redirect href="/login" />;
  if (!can(session, permissions.monitoringView)) return <AppScreen showHeading={false} title={t("nodeDetail")}><StateView title={t("forbidden")} /></AppScreen>;
  if (!buildingId || !nodeId || !nodeType) return <AppScreen showHeading={false} title={t("nodeDetail")}><StateView title={t("nodeNotFound")} /></AppScreen>;

  return (
    <AppScreen showHeading={false} title={t("nodeDetail")}>
      {loadState === "loading" ? <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.meta}>{t("loading")}</Text></View> : null}
      {loadState === "error" ? <Surface><StateView message={t("retryHelp")} title={t("nodeNotFound")} /><Pressable onPress={() => setReloadKey((value) => value + 1)} style={styles.retry}><Text style={styles.retryText}>{t("retry")}</Text></Pressable></Surface> : null}
      {loadState === "ready" && nodeState ? <NodeDetailContent buildingTitle={buildingTitle} filter={filter} locale={locale} nodeType={nodeType} onOpenGraph={() => router.push({ pathname: "/node-graph", params: { buildingId, nodeId, nodeNumber: nodeState.node.number, nodeType } })} planImageUri={planImageUri} preview={Boolean(session.preview)} showPlan={can(session, permissions.buildingPlansView)} state={nodeState} t={t} /> : null}
    </AppScreen>
  );
}

function NodeDetailContent({ buildingTitle, filter, locale, nodeType, onOpenGraph, planImageUri, preview, showPlan, state, t }: { buildingTitle: string; filter?: FaultFilterNodeRecord; locale: string; nodeType: CanonicalNodeType; onOpenGraph: () => void; planImageUri?: string; preview: boolean; showPlan: boolean; state: MonitoringNodeState; t: ReturnType<typeof useI18n>["t"] }) {
  const visual = nodeVisualState(state, t);
  const excluded = filter?.desiredEnabled ?? state.faultFiltered;
  const online = state.status !== "offline";
  const metrics = "doorState" in state.values
    ? [
        { label: t("doorStatus"), value: state.values.doorState === "open" ? t("doorOpen") : t("doorClosed") },
        { label: t("batteryLevel"), value: `${state.values.batteryLevel ?? "-"}%` },
      ]
    : [
        { label: "X", value: formatAngle(state.values.angleX) },
        { label: "Y", value: formatAngle(state.values.angleY) },
      ];

  return (
    <>
      <View style={styles.pageHeading}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{t(nodeTypeLabels[nodeType])}</Text>
          <Text style={styles.pageTitle}>{t("nodeNumber")} {state.node.number}</Text>
          <Text style={styles.meta}>{buildingTitle}</Text>
        </View>
        <View style={styles.headingActions}>
          <View style={[styles.statusChip, { backgroundColor: `${visual.color}18` }]}><Text style={[styles.statusChipText, { color: visual.color }]}>{visual.label}</Text></View>
          <View style={styles.headingInfoRow}>
            <InfoChip color={online ? colors.caution : colors.offline} icon={online ? "wifi" : "wifi-off"} label={online ? t("online") : t("offline")} />
            <InfoChip color={excluded ? colors.offline : colors.primaryDark} icon={excluded ? "bell-off-outline" : "bell-outline"} label={t(excluded ? "alarmOff" : "alarmOn")} />
          </View>
        </View>
      </View>

      <View style={[styles.detailCard, { borderTopColor: visual.color }]}> 
        {showPlan ? (
          <View style={styles.planPanel}>
            <View style={styles.planTitleRow}><View style={styles.planTitleLabelRow}><MaterialCommunityIcons color={colors.primary} name="floor-plan" size={20} /><Text style={styles.sectionLabel}>{t("buildingPlan")}</Text></View>{nodeType !== "door_node" ? <Pressable onPress={onOpenGraph} style={styles.graphActionButton}><Text numberOfLines={1} style={styles.graphActionButtonText}>{t("viewGraph")}</Text></Pressable> : null}</View>
            {preview ? <DemoBuildingPlan activeNode={state.node.number} buildingTitle={buildingTitle} /> : planImageUri ? <Image resizeMode="contain" source={{ uri: planImageUri }} style={styles.planImage} /> : <View style={styles.planEmpty}><MaterialCommunityIcons color={colors.muted} name="image-off-outline" size={30} /><Text style={styles.meta}>{t("noPlanImage")}</Text></View>}
          </View>
        ) : nodeType !== "door_node" ? <View style={styles.detailActionRow}><Pressable onPress={onOpenGraph} style={styles.graphActionButton}><Text numberOfLines={1} style={styles.graphActionButtonText}>{t("viewGraph")}</Text></Pressable></View> : null}

        <View style={styles.sensorPanel}>
          <Text style={styles.sectionLabel}>{t("sensorState")}</Text>
          <View style={styles.metricRow}>
            {metrics.map((metric) => <View key={metric.label} style={styles.metricCard}><Text style={styles.metricLabel}>{metric.label}</Text><Text numberOfLines={1} style={styles.metricValue}>{metric.value}</Text></View>)}
          </View>
        </View>

        <View style={styles.infoRow}>
          <InfoBox icon="access-point" label={t("gateway")} value={state.gateway.serialNumber} />
          <InfoBox icon={online ? "check-network-outline" : "network-off-outline"} label={t("communicationStatus")} value={online ? t("online") : t("offline")} />
        </View>

        <View style={styles.infoRow}>
          <InfoBox icon="map-marker-outline" label={t("location")} value={state.node.installedLocation ?? t("notAvailable")} />
          <InfoBox icon="clock-outline" label={t("lastReceived")} value={new Date(state.lastSeenAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")} />
        </View>
      </View>
    </>
  );
}

function DemoBuildingPlan({ activeNode, buildingTitle }: { activeNode: string; buildingTitle: string }) {
  const nodeNumbers = ["101", "102", "103", "104", "105", "106", "107", "108", "109"];
  return (
    <View style={styles.demoPlan}>
      <View style={styles.demoPlanHeader}><Text numberOfLines={1} style={styles.demoPlanTitle}>{buildingTitle}</Text><Text style={styles.demoPlanMeta}>GATE 2</Text></View>
      <View style={styles.demoPlanPathHorizontal} />
      <View style={styles.demoPlanPathVertical} />
      <View style={styles.demoNodeGrid}>
        {nodeNumbers.map((number) => <View key={number} style={[styles.demoNode, number === activeNode && styles.demoNodeActive]}><Text style={[styles.demoNodeText, number === activeNode && styles.demoNodeTextActive]}>{number}</Text></View>)}
      </View>
      <Text style={styles.demoGateLabel}>GATE 1</Text>
    </View>
  );
}

function InfoChip({ color, icon, label }: { color: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string }) {
  return <View style={[styles.infoChip, { backgroundColor: `${color}14`, borderColor: `${color}35` }]}><MaterialCommunityIcons color={color} name={icon} size={14} /><Text numberOfLines={1} style={[styles.infoChipText, { color }]}>{label}</Text></View>;
}

function InfoBox({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; value: string }) {
  return <View style={styles.infoBox}><View style={styles.infoLabelRow}><MaterialCommunityIcons color={colors.muted} name={icon} size={15} /><Text numberOfLines={1} style={styles.infoLabel}>{label}</Text></View><Text numberOfLines={2} style={styles.infoValue}>{value}</Text></View>;
}

function firstParam(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function toNodeType(value: string | undefined): CanonicalNodeType | undefined { return value === "door_node" || value === "angle_node" || value === "gangform_node" ? value : undefined; }
function statusColor(status: MonitoringStatus) { return status === "unconfigured" ? colors.offline : colors[status]; }
function tStatus(status: MonitoringStatus, t: ReturnType<typeof useI18n>["t"]) { return status === "unconfigured" ? t("unconfigured") : t(status); }
function formatAngle(value: number) { const formatted = value.toFixed(1); return `${value > 0 ? "+" : ""}${formatted}°`; }
function nodeVisualState(state: MonitoringNodeState, t: ReturnType<typeof useI18n>["t"]) {
  if (!("doorState" in state.values)) return { color: statusColor(state.status), label: tStatus(state.status, t) };
  if (state.status === "offline" || state.status === "unconfigured") return { color: statusColor(state.status), label: tStatus(state.status, t) };
  return state.values.doorState === "open" ? { color: colors.danger, label: t("doorOpen") } : { color: colors.primaryDark, label: t("doorClosed") };
}

const styles = StyleSheet.create({
  detailActionRow: { alignItems: "flex-end" },
  detailCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderTopWidth: 5, borderWidth: 1, gap: spacing.sm, padding: 15 },
  graphActionButton: { alignItems: "center", alignSelf: "center", backgroundColor: colors.primaryDark, borderColor: colors.primaryDark, borderRadius: radius.sm, borderWidth: 1, height: 32, justifyContent: "center", paddingHorizontal: 12 },
  graphActionButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800", textAlign: "center" },
  demoGateLabel: { bottom: 8, color: colors.muted, fontSize: 9, fontWeight: "700", left: 12, position: "absolute" },
  demoNode: { alignItems: "center", backgroundColor: colors.surface, borderColor: "#A66A34", borderRadius: radius.pill, borderWidth: 1.5, height: 28, justifyContent: "center", width: 28 },
  demoNodeActive: { backgroundColor: "#F4D37A", borderColor: "#8D641D" },
  demoNodeGrid: { alignContent: "center", alignItems: "center", flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 9, justifyContent: "center", paddingHorizontal: 40, paddingVertical: 12 },
  demoNodeText: { color: colors.foreground, fontSize: 9, fontWeight: "800" },
  demoNodeTextActive: { color: "#704B0D" },
  demoPlan: { backgroundColor: "#FFFEFA", borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, height: 180, overflow: "hidden", position: "relative" },
  demoPlanHeader: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.sm, paddingVertical: 7 },
  demoPlanMeta: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  demoPlanPathHorizontal: { backgroundColor: "#79518E", height: 3, left: "23%", position: "absolute", right: "10%", top: 80 },
  demoPlanPathVertical: { backgroundColor: "#79518E", bottom: 14, position: "absolute", right: "10%", top: 80, width: 3 },
  demoPlanTitle: { color: colors.foreground, flex: 1, fontSize: 11, fontWeight: "800" },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  flex: { flex: 1 },
  headingActions: { alignItems: "flex-end", gap: 6, maxWidth: "68%" },
  headingInfoRow: { flexDirection: "row", gap: 5 },
  infoBox: { backgroundColor: colors.background, borderRadius: radius.md, flex: 1, gap: 6, minWidth: 0, padding: 13 },
  infoChip: { alignItems: "center", borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: 3, paddingHorizontal: 7, paddingVertical: 5 },
  infoChipText: { fontSize: 9, fontWeight: "800" },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  infoLabelRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  infoRow: { flexDirection: "row", gap: spacing.sm },
  infoValue: { color: colors.foreground, fontSize: 15, fontWeight: "800", lineHeight: 19 },
  loading: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  metricCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: 5, padding: 12 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  metricRow: { flexDirection: "row", gap: spacing.sm },
  metricValue: { color: colors.foreground, fontSize: 24, fontWeight: "800" },
  pageHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  pageTitle: { color: colors.foreground, fontSize: 25, fontWeight: "800" },
  planEmpty: { alignItems: "center", gap: 6, justifyContent: "center", minHeight: 145 },
  planImage: { backgroundColor: colors.surface, borderRadius: radius.sm, height: 185, width: "100%" },
  planPanel: { backgroundColor: colors.background, borderRadius: radius.md, gap: 7, padding: 9 },
  planTitleLabelRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  planTitleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  retry: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm },
  retryText: { color: colors.primary, fontWeight: "800" },
  sectionLabel: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  sensorPanel: { backgroundColor: colors.background, borderRadius: radius.md, gap: 8, padding: 12 },
  statusChip: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  statusChipText: { fontSize: 10, fontWeight: "800" },
});
