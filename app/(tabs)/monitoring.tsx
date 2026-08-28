import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { io } from "socket.io-client";

import { refreshSession } from "@/src/api/http";
import { useAuth } from "@/src/auth/AuthProvider";
import { can, permissions } from "@/src/auth/permissions";
import { AppScreen } from "@/src/components/AppScreen";
import { StateView } from "@/src/components/StateView";
import { Surface } from "@/src/components/Surface";
import { runtimeConfig } from "@/src/config/runtime";
import { appRepository } from "@/src/data/appRepository";
import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";
import type { AuthSession } from "@/src/types/auth";
import type {
  BuildingFaultFiltersResponse,
  BuildingAlarmLevelConfiguration,
  BuildingAlarmLevelsResponse,
  CanonicalNodeType,
  FaultFilterNodeRecord,
  MonitoringBuildingOverview,
  MonitoringNodeState,
  MonitoringNodeStateEvent,
  MonitoringNodeTypeResponse,
  MonitoringScopeOptions,
  MonitoringStatus,
} from "@/src/types/domain";

const nodeTypes = {
  door_node: { image: require("../../assets/images/scaffoldnode_img.png"), label: "nodeDoor" as const, serviceLabel: "doorNodeService" as const },
  angle_node: { image: require("../../assets/images/anglenode_img.png"), label: "nodeAngle" as const, serviceLabel: "angleNodeService" as const },
  gangform_node: { image: require("../../assets/images/verticalnode_img.png"), label: "nodeGangform" as const, serviceLabel: "gangformNodeService" as const },
};

type LoadState = "idle" | "loading" | "error";
type RealtimeState = "connected" | "offline" | "reconnecting";
type NodeViewMode = "card" | "detail";
type NodeStatusFilter = "all" | "caution" | "closed" | "danger" | "offline" | "open" | "safe" | "warning";
type NodeFilterMenu = "gateway" | "status" | null;
type NodeFilterOption = { count: number; label: string; value: string };

export default function MonitoringScreen() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const [scope, setScope] = useState<MonitoringScopeOptions>();
  const [companyId, setCompanyId] = useState<string>();
  const [areaId, setAreaId] = useState<string>();
  const [buildingId, setBuildingId] = useState<string>();
  const [overview, setOverview] = useState<MonitoringBuildingOverview>();
  const [buildingRealImage, setBuildingRealImage] = useState<string>();
  const [nodeResponse, setNodeResponse] = useState<MonitoringNodeTypeResponse>();
  const [faultFilters, setFaultFilters] = useState<BuildingFaultFiltersResponse>();
  const [alarmLevels, setAlarmLevels] = useState<BuildingAlarmLevelsResponse>();
  const [filterError, setFilterError] = useState(false);
  const [savingNodeId, setSavingNodeId] = useState<string>();
  const [nodeViewMode, setNodeViewMode] = useState<NodeViewMode>("detail");
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<NodeStatusFilter>("all");
  const [filterMenu, setFilterMenu] = useState<NodeFilterMenu>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [reloadKey, setReloadKey] = useState(0);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("offline");
  const realtimeNodeType = nodeResponse?.nodeType.key;

  useEffect(() => {
    if (!session || !can(session, permissions.monitoringView)) return;
    let active = true;
    setLoadState("loading");
    void appRepository.getMonitoringScope(session).then((value) => {
      if (!active) return;
      setScope(value);
      setCompanyId(session.context === "company-user" ? session.user.companyId ?? value.companies[0]?.id : undefined);
      setAreaId(undefined);
      setBuildingId(undefined);
      setOverview(undefined);
      setBuildingRealImage(undefined);
      setNodeResponse(undefined);
      setFaultFilters(undefined);
      setAlarmLevels(undefined);
      setFilterError(false);
      setLoadState("idle");
    }).catch(() => { if (active) setLoadState("error"); });
    return () => { active = false; };
  }, [reloadKey, session]);

  useEffect(() => {
    if (!session || !buildingId) {
      setOverview(undefined);
      setBuildingRealImage(undefined);
      return;
    }
    let active = true;
    setLoadState("loading");
    setBuildingRealImage(undefined);
    const photo = can(session, permissions.buildingPlansView)
      ? appRepository.getBuildingRealImage(session, buildingId).catch(() => undefined)
      : Promise.resolve(undefined);
    void Promise.all([appRepository.getBuildingMonitoring(session, buildingId), photo]).then(([value, imageUri]) => {
      if (!active) return;
      setOverview(value);
      setBuildingRealImage(imageUri);
      setLoadState("idle");
    }).catch(() => { if (active) setLoadState("error"); });
    return () => { active = false; };
  }, [buildingId, session]);

  useEffect(() => {
    if (!session || session.preview || !buildingId || !realtimeNodeType || !runtimeConfig.socketBaseUrl) {
      setRealtimeState("offline");
      return;
    }
    const nodeType = realtimeNodeType;
    const socket = io(runtimeConfig.socketBaseUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      timeout: 10_000,
      transports: ["polling", "websocket"],
      upgrade: true,
      withCredentials: true,
    });
    let active = true;
    let refreshAttempted = false;
    setRealtimeState("reconnecting");
    socket.on("connect", () => {
      socket.emit("monitoring:join", { buildingId, nodeType }, (ack: { ok: boolean }) => {
        if (!active) return;
        if (!ack.ok) {
          setRealtimeState("offline");
          return;
        }
        refreshAttempted = false;
        setRealtimeState("connected");
        void appRepository.getNodeTypeMonitoring(session, buildingId, nodeType).then((latest) => {
          if (active) setNodeResponse(latest);
        }).catch(() => undefined);
      });
    });
    socket.io.on("reconnect_attempt", () => setRealtimeState("reconnecting"));
    socket.on("connect_error", () => {
      if (!active) return;
      setRealtimeState("offline");
      if (refreshAttempted) return;
      refreshAttempted = true;
      void refreshSession().then(() => {
        if (!active) return;
        setRealtimeState("reconnecting");
        socket.connect();
      }).catch(() => undefined);
    });
    socket.on("disconnect", () => setRealtimeState("offline"));
    socket.on("monitoring:node-state", (event: MonitoringNodeStateEvent) => {
      if (event.buildingId !== buildingId || event.nodeType !== nodeType) return;
      setNodeResponse((current) => {
        if (!current) return current;
        const index = current.states.findIndex((item) => item.nodeId === event.state.nodeId);
        if (index < 0) return { ...current, states: [event.state, ...current.states] };
        const previous = current.states[index]!;
        const previousLastSeenAt = new Date(previous.lastSeenAt).getTime();
        const nextLastSeenAt = new Date(event.state.lastSeenAt).getTime();
        const previousUpdatedAt = new Date(previous.updatedAt).getTime();
        const nextUpdatedAt = new Date(event.state.updatedAt).getTime();
        if (
          nextLastSeenAt < previousLastSeenAt ||
          (nextLastSeenAt === previousLastSeenAt && nextUpdatedAt < previousUpdatedAt)
        ) return current;
        const states = [...current.states];
        states[index] = event.state;
        return { ...current, states };
      });
    });
    return () => {
      active = false;
      socket.emit("monitoring:leave", { buildingId, nodeType });
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [buildingId, realtimeNodeType, session]);

  const selectedCompany = scope?.companies.find((item) => item.id === companyId) ?? session?.user.company ?? undefined;
  const visibleAreas = useMemo(() => scope?.areas.filter((item) => !companyId || item.companyId === companyId) ?? [], [companyId, scope]);
  const visibleBuildings = useMemo(() => scope?.buildings.filter((item) => (!companyId || item.companyId === companyId) && (!areaId || item.areaId === areaId)) ?? [], [areaId, companyId, scope]);
  const selectedArea = scope?.areas.find((item) => item.id === areaId);
  const gatewayOptions = useMemo<NodeFilterOption[]>(() => {
    const gateways = new Map<string, { count: number; label: string }>();
    for (const state of nodeResponse?.states ?? []) {
      const current = gateways.get(state.gateway.id);
      gateways.set(state.gateway.id, { count: (current?.count ?? 0) + 1, label: state.gateway.serialNumber });
    }
    return [{ count: nodeResponse?.states.length ?? 0, label: t("allGateways"), value: "all" }, ...[...gateways.entries()].map(([value, item]) => ({ ...item, value }))];
  }, [nodeResponse, t]);
  const statusOptions = useMemo<NodeFilterOption[]>(() => {
    const options: { label: string; value: NodeStatusFilter }[] = nodeResponse?.nodeType.key === "door_node"
      ? [{ label: t("allStatuses"), value: "all" }, { label: t("doorClosed"), value: "closed" }, { label: t("doorOpen"), value: "open" }, { label: t("offline"), value: "offline" }]
      : [{ label: t("allStatuses"), value: "all" }, { label: t("safe"), value: "safe" }, { label: t("caution"), value: "caution" }, { label: t("warning"), value: "warning" }, { label: t("danger"), value: "danger" }, { label: t("offline"), value: "offline" }];
    return options.map((option) => ({ ...option, count: (nodeResponse?.states ?? []).filter((state) => matchesStatusFilter(state, option.value)).length }));
  }, [nodeResponse, t]);
  const filteredNodeStates = useMemo(() => (nodeResponse?.states ?? []).filter((state) => (gatewayFilter === "all" || state.gateway.id === gatewayFilter) && matchesStatusFilter(state, statusFilter)), [gatewayFilter, nodeResponse, statusFilter]);
  const selectedGatewayLabel = gatewayOptions.find((option) => option.value === gatewayFilter)?.label ?? t("allGateways");
  const selectedStatusLabel = statusOptions.find((option) => option.value === statusFilter)?.label ?? t("allStatuses");
  const monitoringHeaderTitle = session?.context === "gss-admin"
    ? nodeResponse ? t(nodeTypes[nodeResponse.nodeType.key].label) : overview?.building.title ?? selectedArea?.name ?? selectedCompany?.name ?? t("selectCompany")
    : selectedCompany?.name ?? t("company");

  if (!can(session, permissions.monitoringView)) return <AppScreen title={t("monitoring")}><StateView title={t("forbidden")} /></AppScreen>;
  if (!session) return null;

  async function openNodeType(nodeType: CanonicalNodeType) {
    if (!buildingId) return;
    setLoadState("loading");
    setFilterError(false);
    setGatewayFilter("all");
    setStatusFilter("all");
    setFilterMenu(null);
    try {
      const [nodes, filters, levels] = await Promise.all([
        appRepository.getNodeTypeMonitoring(session!, buildingId, nodeType),
        can(session, permissions.alarmLevelsView)
          ? appRepository.getFaultFilters(session!, buildingId)
          : Promise.resolve(undefined),
        can(session, permissions.alarmLevelsView)
          ? appRepository.getAlarmLevels(session!, buildingId).catch(() => undefined)
          : Promise.resolve(undefined),
      ]);
      setNodeResponse(nodes);
      setFaultFilters(filters);
      setAlarmLevels(levels);
      setLoadState("idle");
    } catch { setLoadState("error"); }
  }

  async function toggleFaultFilter(state: MonitoringNodeState, filter: FaultFilterNodeRecord | undefined) {
    if (!buildingId || !nodeResponse || !can(session, permissions.alarmLevelsManage)) return;
    const group = faultFilters?.gateways.find((item) => item.gateway.id === state.gateway.id);
    const nodeType = group?.nodeTypes.find((item) => item.nodeType.id === nodeResponse.nodeType.id);
    if (!group || !nodeType) return;
    const selected = nodeType.nodes
      .filter((item) => item.desiredEnabled && item.nodeId !== state.nodeId)
      .map((item) => item.nodeId);
    if (!filter?.desiredEnabled) selected.push(state.nodeId);
    setSavingNodeId(state.nodeId);
    setFilterError(false);
    try {
      setFaultFilters(await appRepository.updateFaultFilter(session!, buildingId, {
        gatewayId: state.gateway.id,
        nodeIds: selected,
        nodeTypeId: nodeResponse.nodeType.id,
      }));
    } catch {
      setFilterError(true);
    } finally {
      setSavingNodeId(undefined);
    }
  }

  function resetToScope(level: "company" | "area" | "building") {
    setNodeResponse(undefined);
    setFaultFilters(undefined);
    setAlarmLevels(undefined);
    setFilterError(false);
    setGatewayFilter("all");
    setStatusFilter("all");
    setFilterMenu(null);
    if (level === "building") return;
    setOverview(undefined);
    setBuildingId(undefined);
    if (level === "area") return;
    setAreaId(undefined);
    if (session?.context === "gss-admin") setCompanyId(undefined);
  }

  function returnToSelectedCompany() {
    setNodeResponse(undefined);
    setFaultFilters(undefined);
    setAlarmLevels(undefined);
    setFilterError(false);
    setGatewayFilter("all");
    setStatusFilter("all");
    setFilterMenu(null);
    setOverview(undefined);
    setBuildingId(undefined);
    setAreaId(undefined);
  }

  function openNodeDetail(state: MonitoringNodeState) {
    if (!buildingId || !nodeResponse) return;
    router.push({ pathname: "/node-detail", params: { buildingId, nodeId: state.nodeId, nodeType: nodeResponse.nodeType.key } });
  }

  function handleMonitoringBack() {
    if (nodeResponse) {
      resetToScope("building");
      return;
    }
    if (overview || buildingId) {
      if (areaId) resetToScope("area");
      else returnToSelectedCompany();
      return;
    }
    if (areaId) {
      returnToSelectedCompany();
      return;
    }
    if (session?.context === "gss-admin" && companyId) {
      resetToScope("company");
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <AppScreen eyebrow={session.preview ? t("developmentPreview") : t("readOnly")} onBack={handleMonitoringBack} showHeading={false} subtitle={session.user.role?.name ?? "-"} title={t("monitoring")}>
      {overview && !nodeResponse ? (
        <View pointerEvents="none" style={styles.nodeTypePageBackground}>
          {session.preview ? (
            <Image resizeMode="cover" source={require("../../assets/images/login-bg.png")} style={styles.nodeTypeBackgroundImage} />
          ) : buildingRealImage ? (
            <Image resizeMode="cover" source={{ uri: buildingRealImage }} style={styles.nodeTypeBackgroundImage} />
          ) : (
            <View style={styles.nodeTypeBackgroundFallback} />
          )}
          <View style={styles.nodeTypeBackgroundOverlay} />
        </View>
      ) : null}
      {scope ? (
        <Surface>
          <View style={styles.scopeHeader}>
            <MaterialCommunityIcons color={colors.primary} name="shield-account-outline" size={22} />
            <View style={styles.flex}>
              <Text style={styles.scopeTitle}>{monitoringHeaderTitle}</Text>
              <Text style={styles.meta}>{t("accessibleScope")} · {scope.areas.length} {t("sitesUnit")} · {scope.buildings.length} {t("buildingsUnit")}</Text>
            </View>
          </View>
          <View style={styles.breadcrumbs}>
            {session.context === "gss-admin" ? (
              <>
                {companyId ? <Crumb label={t("selectCompany")} onPress={() => resetToScope("company")} /> : <Text style={styles.crumbCurrent}>{t("selectCompany")}</Text>}
                {selectedCompany ? areaId || overview ? <Crumb label={selectedCompany.name} onPress={returnToSelectedCompany} /> : <Text style={styles.crumbCurrent}>{selectedCompany.name}</Text> : null}
                {selectedArea ? overview ? <Crumb label={selectedArea.name} onPress={() => resetToScope("area")} /> : <Text style={styles.crumbCurrent}>{selectedArea.name}</Text> : null}
                {overview ? nodeResponse ? <Crumb label={overview.building.title} onPress={() => resetToScope("building")} /> : <Text style={styles.crumbCurrent}>{overview.building.title}</Text> : null}
                {nodeResponse ? <Text style={styles.crumbCurrent}>{t(nodeTypes[nodeResponse.nodeType.key].label)}</Text> : null}
              </>
            ) : (
              <>
                <Crumb label={selectedCompany?.name ?? t("company")} onPress={() => resetToScope("company")} />
                {selectedArea ? <Crumb label={selectedArea.name} onPress={() => resetToScope("area")} /> : null}
                {overview ? <Crumb label={overview.building.title} onPress={() => resetToScope("building")} /> : null}
                {nodeResponse ? <Text style={styles.crumbCurrent}>{t(nodeTypes[nodeResponse.nodeType.key].label)}</Text> : null}
              </>
            )}
          </View>
        </Surface>
      ) : null}

      {loadState === "loading" ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.meta}>{t("loading")}</Text></View> : null}
      {loadState === "error" ? <Surface><StateView message={t("retryHelp")} title={t("loadError")} /><Pressable onPress={() => setReloadKey((value) => value + 1)} style={styles.retry}><Text style={styles.retryText}>{t("retry")}</Text></Pressable></Surface> : null}
      {filterError ? <Surface><StateView message={t("alarmFilterUpdateFailed")} title={t("loadError")} /></Surface> : null}

      {loadState !== "error" && nodeResponse ? (
        <View style={styles.grid}>
          {nodeResponse.nodeType.key !== "door_node" ? (
            <AlarmLevelSummary
              configuration={alarmLevels?.configurations.find((item) => item.nodeTypeId === nodeResponse.nodeType.id)}
              inactiveCount={nodeResponse.states.filter((item) => item.status === "offline" || item.status === "unconfigured").length}
              t={t}
            />
          ) : null}
          <NodeFilters gatewayLabel={selectedGatewayLabel} onGateway={() => setFilterMenu("gateway")} onStatus={() => setFilterMenu("status")} statusLabel={selectedStatusLabel} t={t} />
          <View style={styles.nodeToolbar}>
            <View style={[styles.realtime, styles.flex]}>
              <View style={[styles.statusDot, { backgroundColor: realtimeState === "connected" ? colors.caution : realtimeState === "reconnecting" ? colors.warning : colors.offline }]} />
              <Text style={styles.meta}>{t(realtimeState === "connected" ? "realtimeConnected" : realtimeState === "reconnecting" ? "realtimeReconnecting" : "realtimeOffline")}</Text>
            </View>
            <View style={styles.viewToggle}>
              <ViewModeButton active={nodeViewMode === "detail"} icon="format-list-bulleted" label={t("detailView")} onPress={() => setNodeViewMode("detail")} />
              <ViewModeButton active={nodeViewMode === "card"} icon="view-grid-outline" label={t("cardView")} onPress={() => setNodeViewMode("card")} />
            </View>
          </View>
          {filteredNodeStates.length ? nodeViewMode === "detail" ? filteredNodeStates.map((state) => {
            const filter = faultFilters?.gateways
              .find((item) => item.gateway.id === state.gateway.id)
              ?.nodeTypes.find((item) => item.nodeType.id === nodeResponse.nodeType.id)
              ?.nodes.find((item) => item.nodeId === state.nodeId);
            return (
              <NodeCard
                canManage={can(session, permissions.alarmLevelsManage)}
                filter={filter}
                key={state.nodeId}
                locale={locale}
                onOpen={() => openNodeDetail(state)}
                onToggle={() => void toggleFaultFilter(state, filter)}
                saving={savingNodeId === state.nodeId}
                state={state}
                t={t}
              />
            );
          }) : (
            <View style={[styles.compactGrid, styles.compactGridLeft]}>
              {filteredNodeStates.map((state) => {
                const filter = faultFilters?.gateways
                  .find((item) => item.gateway.id === state.gateway.id)
                  ?.nodeTypes.find((item) => item.nodeType.id === nodeResponse.nodeType.id)
                  ?.nodes.find((item) => item.nodeId === state.nodeId);
                return <CompactNodeCard excluded={filter?.desiredEnabled ?? state.faultFiltered} key={state.nodeId} onOpen={() => openNodeDetail(state)} state={state} t={t} />;
              })}
            </View>
          ) : <StateView message={t("changeNodeFilters")} title={t("filteredNodesEmpty")} />}
        </View>
      ) : loadState !== "error" && overview ? (
        <View style={[styles.nodeTypeSelection, { minHeight: Math.max(520, windowHeight - 270) }]}>
          <View style={styles.nodeTypeCardStack}>
            {(["door_node", "angle_node", "gangform_node"] as const).map((key) => {
              return (
                <Pressable accessibilityLabel={t(nodeTypes[key].serviceLabel)} accessibilityRole="button" key={key} onPress={() => void openNodeType(key)} style={styles.nodeTypePressWrapper}>
                  <View style={styles.nodeTypeCardShell}>
                    <View pointerEvents="none" style={styles.nodeTypeCardTint} />
                    <View style={styles.nodeTypeCardRow}>
                      <View style={styles.nodeTypeImageFrame}><Image resizeMode="contain" source={nodeTypes[key].image} style={styles.image} /></View>
                      <View style={styles.nodeTypeCardContent}>
                        <Text numberOfLines={1} style={styles.nodeTypeCardTitle}>{t(nodeTypes[key].serviceLabel)}</Text>
                        <Text numberOfLines={2} style={styles.nodeTypeCardDescription}>{t(`${key}Description`)}</Text>
                      </View>
                      <View style={styles.nodeTypeArrow}><MaterialCommunityIcons color={colors.surface} name="arrow-right" size={20} /></View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : loadState !== "error" && scope ? (
        <Hierarchy
          areaId={areaId}
          companyId={companyId}
          isAdmin={session.context === "gss-admin"}
          onArea={(id) => setAreaId(id)}
          onBuilding={(id) => { setNodeResponse(undefined); setBuildingId(id); }}
          onCompany={(id) => { setCompanyId(id); setAreaId(undefined); }}
          session={session}
          scope={scope}
          t={t}
          visibleAreas={visibleAreas}
          visibleBuildings={visibleBuildings}
        />
      ) : null}
      <NodeFilterModal onClose={() => setFilterMenu(null)} onSelect={(value) => { setGatewayFilter(value); setFilterMenu(null); }} options={gatewayOptions} selected={gatewayFilter} title={t("filterByGateway")} visible={filterMenu === "gateway"} />
      <NodeFilterModal onClose={() => setFilterMenu(null)} onSelect={(value) => { setStatusFilter(value as NodeStatusFilter); setFilterMenu(null); }} options={statusOptions} selected={statusFilter} title={t("filterByStatus")} visible={filterMenu === "status"} />
    </AppScreen>
  );
}

function NodeFilters({ gatewayLabel, onGateway, onStatus, statusLabel, t }: { gatewayLabel: string; onGateway: () => void; onStatus: () => void; statusLabel: string; t: ReturnType<typeof useI18n>["t"] }) {
  return <View style={styles.nodeFilters}><FilterSelectButton icon="router-wireless" label={t("filterByGateway")} onPress={onGateway} value={gatewayLabel} /><FilterSelectButton icon="filter-variant" label={t("filterByStatus")} onPress={onStatus} value={statusLabel} /></View>;
}

function FilterSelectButton({ icon, label, onPress, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; onPress: () => void; value: string }) {
  const gateway = icon === "router-wireless";
  return <Pressable accessibilityLabel={`${label}: ${value}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.filterSelectButton, gateway ? styles.gatewayFilterButton : styles.statusFilterButton, pressed && styles.pressed]}><View style={styles.filterSelectContent}><MaterialCommunityIcons color={colors.primary} name={icon} size={18} /><Text numberOfLines={1} style={[styles.filterSelectValue, gateway ? styles.gatewayFilterText : styles.statusFilterText]}>{value}</Text><MaterialCommunityIcons color={colors.muted} name="chevron-down" size={20} /></View></Pressable>;
}

function NodeFilterModal({ onClose, onSelect, options, selected, title, visible }: { onClose: () => void; onSelect: (value: string) => void; options: NodeFilterOption[]; selected: string; title: string; visible: boolean }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.filterModalOverlay}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.filterModalCard}>
          <View style={styles.filterModalHeader}><Text style={styles.filterModalTitle}>{title}</Text><Pressable accessibilityLabel={title} onPress={onClose} style={styles.filterModalClose}><MaterialCommunityIcons color={colors.muted} name="close" size={21} /></Pressable></View>
          <View style={styles.filterOptionList}>{options.map((option) => { const active = option.value === selected; return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={option.value} onPress={() => onSelect(option.value)} style={({ pressed }) => [styles.filterOption, active && styles.filterOptionActive, pressed && styles.pressed]}><Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>{option.label}</Text><View style={styles.filterOptionMeta}><Text style={[styles.filterOptionCount, active && styles.filterOptionTextActive]}>{option.count}</Text>{active ? <MaterialCommunityIcons color={colors.primaryDark} name="check" size={19} /> : null}</View></Pressable>; })}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Hierarchy({ areaId, companyId, isAdmin, onArea, onBuilding, onCompany, session, scope, t, visibleAreas, visibleBuildings }: {
  areaId?: string; companyId?: string; isAdmin: boolean; onArea: (id: string) => void; onBuilding: (id: string) => void; onCompany: (id: string) => void; session: AuthSession; scope: MonitoringScopeOptions; t: ReturnType<typeof useI18n>["t"]; visibleAreas: MonitoringScopeOptions["areas"]; visibleBuildings: MonitoringScopeOptions["buildings"];
}) {
  if (isAdmin && !companyId) return <ResourceGrid icon="domain" items={scope.companies.map((item) => ({ id: item.id, meta: `${scope.areas.filter((area) => area.companyId === item.id).length} ${t("sitesUnit")}`, title: item.name }))} onPress={onCompany} title={t("selectCompany")} />;
  if (visibleAreas.length && !areaId) return <ResourceGrid icon="map-marker-radius-outline" items={visibleAreas.map((item) => ({ id: item.id, meta: `${visibleBuildings.filter((building) => building.areaId === item.id).length} ${t("buildingsUnit")}`, title: item.name }))} onPress={onArea} title={t("sites")} />;
  if (visibleBuildings.length) return <BuildingSelectionCards buildings={visibleBuildings} onPress={onBuilding} scope={scope} session={session} t={t} />;
  return <Surface><StateView title={t("monitoringEmpty")} /></Surface>;
}

type BuildingCardData = {
  imageUri?: string;
  overview?: MonitoringBuildingOverview;
};

function BuildingSelectionCards({ buildings, onPress, scope, session, t }: {
  buildings: MonitoringScopeOptions["buildings"];
  onPress: (id: string) => void;
  scope: MonitoringScopeOptions;
  session: AuthSession;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const [cardData, setCardData] = useState<Record<string, BuildingCardData>>({});

  useEffect(() => {
    let active = true;
    setCardData({});
    void Promise.all(buildings.map(async (building) => {
      const [overviewResult, imageResult] = await Promise.allSettled([
        appRepository.getBuildingMonitoring(session, building.id),
        can(session, permissions.buildingPlansView)
          ? appRepository.getBuildingRealImage(session, building.id)
          : Promise.resolve(undefined),
      ]);
      return {
        id: building.id,
        value: {
          imageUri: imageResult.status === "fulfilled" ? imageResult.value : undefined,
          overview: overviewResult.status === "fulfilled" ? overviewResult.value : undefined,
        },
      };
    })).then((results) => {
      if (!active) return;
      setCardData(Object.fromEntries(results.map((result) => [result.id, result.value])));
    });
    return () => { active = false; };
  }, [buildings, session]);

  return (
    <View style={styles.hierarchySection}>
      <View style={styles.resourceSectionHeader}>
        <View style={styles.resourceSectionTitleGroup}>
          <View style={[styles.resourceSectionIcon, styles.buildingSectionIcon]}>
            <MaterialCommunityIcons color="#5267B7" name="office-building-outline" size={19} />
          </View>
          <Text style={styles.sectionTitle}>{t("buildings")}</Text>
        </View>
        <View style={styles.resourceCountBadge}><Text style={styles.resourceCountText}>{buildings.length}</Text></View>
      </View>

      <View style={styles.buildingCardList}>
        {buildings.map((building) => {
          const data = cardData[building.id];
          const areaName = scope.areas.find((area) => area.id === building.areaId)?.name;
          const count = (nodeType: CanonicalNodeType) => data?.overview?.nodeTypes.find((item) => item.nodeType.key === nodeType)?.count;
          const doorCount = count("door_node");
          const angleCount = count("angle_node");
          const gangformCount = count("gangform_node");
          const totalCount = data?.overview ? data.overview.nodeTypes.reduce((sum, item) => sum + item.count, 0) : undefined;
          const metrics = [
            { key: "total", label: t("totalNodes"), value: totalCount },
            { key: "door", label: t("nodeDoor"), value: doorCount },
            { key: "angle", label: t("nodeAngle"), value: angleCount },
            { key: "gangform", label: t("nodeGangform"), value: gangformCount },
          ];
          const hasImage = session.preview || Boolean(data?.imageUri);

          return (
            <View key={building.id} style={styles.buildingCardShell}>
              <Pressable
                accessibilityLabel={`${building.title}, ${t("openMonitoring")}`}
                accessibilityRole="button"
                onPress={() => onPress(building.id)}
                style={({ pressed }) => [styles.buildingCard, pressed && styles.resourceCardPressed]}
              >
              <View style={styles.buildingHero}>
                {!data ? (
                  <View style={styles.buildingHeroFallback}>
                    <ActivityIndicator color={colors.surface} />
                    <Text style={styles.buildingHeroFallbackText}>{t("loading")}</Text>
                  </View>
                ) : hasImage ? (
                  <Image
                    resizeMode="cover"
                    source={session.preview ? require("../../assets/images/login-bg.png") : { uri: data!.imageUri! }}
                    style={styles.buildingHeroImage}
                  />
                ) : (
                  <View style={styles.buildingHeroFallback}>
                    <MaterialCommunityIcons color={colors.surface} name="image-off-outline" size={30} />
                    <Text style={styles.buildingHeroFallbackText}>{t("buildingPhotoUnavailable")}</Text>
                  </View>
                )}
                <View style={styles.buildingHeroOverlay} />
                <View style={styles.buildingHeroText}>
                  <Text numberOfLines={2} style={styles.buildingHeroTitle}>{building.title}</Text>
                  {areaName ? <Text numberOfLines={1} style={styles.buildingHeroSubtitle}>{areaName}</Text> : null}
                </View>
                <View style={styles.buildingOpenButton}>
                  <MaterialCommunityIcons color={colors.foreground} name="chevron-right" size={28} />
                </View>
              </View>
              <View style={styles.buildingMetrics}>
                {metrics.map((metric) => (
                  <View key={metric.key} style={styles.buildingMetric}>
                    <Text numberOfLines={1} style={styles.buildingMetricLabel}>{metric.label}</Text>
                    <Text style={styles.buildingMetricValue}>{metric.value ?? "-"}</Text>
                  </View>
                ))}
              </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ResourceGrid({ icon, items, onPress, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; items: { id: string; meta: string; title: string }[]; onPress: (id: string) => void; title: string }) {
  const visual = icon === "domain"
    ? { accent: colors.primary, iconBackground: colors.primarySoft }
    : icon === "map-marker-radius-outline"
      ? { accent: "#2F8F71", iconBackground: "#E8F7F1" }
      : { accent: "#5267B7", iconBackground: "#EEF1FF" };
  const rows = Array.from(
    { length: Math.ceil(items.length / 3) },
    (_, rowIndex) => items.slice(rowIndex * 3, rowIndex * 3 + 3),
  );

  return (
    <View style={styles.hierarchySection}>
      <View style={styles.resourceSectionHeader}>
        <View style={styles.resourceSectionTitleGroup}>
          <View style={[styles.resourceSectionIcon, { backgroundColor: visual.iconBackground }]}>
            <MaterialCommunityIcons color={visual.accent} name={icon} size={19} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.resourceCountBadge}>
          <Text style={styles.resourceCountText}>{items.length}</Text>
        </View>
      </View>

      <View style={[styles.resourceGrid, styles.resourceGridRows]}>
        {rows.map((row, rowIndex) => (
          <View key={`resource-row-${rowIndex}`} style={styles.resourceRow}>
            {row.map((item) => (
              <Pressable
                accessibilityLabel={`${item.title}, ${item.meta}`}
                accessibilityRole="button"
                key={item.id}
                onPress={() => onPress(item.id)}
                style={({ pressed }) => [
                  styles.resourceCard,
                  styles.resourceCardColumn,
                  pressed && styles.resourceCardPressed,
                ]}
              >
                <View style={styles.resourceCardTop}>
                  <View style={[styles.resourceIcon, { backgroundColor: visual.iconBackground }]}>
                    <MaterialCommunityIcons color={visual.accent} name={icon} size={25} />
                  </View>
                  <View style={styles.resourceArrow}>
                    <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={17} />
                  </View>
                </View>
                <View style={styles.resourceCardBody}>
                  <Text numberOfLines={2} style={styles.resourceCardTitle}>{item.title}</Text>
                  <View style={[styles.resourceMetaPill, { backgroundColor: visual.iconBackground }]}>
                    <Text numberOfLines={1} style={[styles.resourceMetaText, { color: visual.accent }]}>{item.meta}</Text>
                  </View>
                </View>
                <View pointerEvents="none" style={[styles.resourceCardBorder, { borderColor: visual.accent }]} />
              </Pressable>
            ))}
            {Array.from({ length: 3 - row.length }, (_, emptyIndex) => (
              <View key={`resource-empty-${rowIndex}-${emptyIndex}`} style={styles.resourceCardPlaceholder} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function AlarmLevelSummary({ configuration, inactiveCount, t }: { configuration?: BuildingAlarmLevelConfiguration; inactiveCount: number; t: ReturnType<typeof useI18n>["t"] }) {
  if (!configuration) return null;
  const items = [
    { background: "#EEF4FF", color: "#4F63F6", key: "safe", label: t("safe"), value: configuration.cautionThreshold === null ? "-" : `${formatThreshold(configuration.cautionThreshold)} ${t("lessThan")}` },
    { background: "#ECFBE8", color: "#2F8F24", key: "caution", label: t("caution"), value: formatThreshold(configuration.cautionThreshold) },
    { background: "#FFFDEA", color: "#A87500", key: "warning", label: t("warning"), value: formatThreshold(configuration.warningThreshold) },
    { background: "#FDECEC", color: "#D9332A", key: "danger", label: t("danger"), value: formatThreshold(configuration.dangerThreshold) },
    { background: "#F3F4F6", color: "#6B7280", key: "offline", label: t("offline"), value: `${inactiveCount}${t("nodesUnit")}` },
  ];
  return (
    <View accessibilityLabel={t("alarmLevelSettings")} style={styles.alarmLevelSummary}>
      {items.map((item) => (
        <View key={item.key} style={[styles.alarmLevelItem, { backgroundColor: item.background }]}>
          <View style={styles.alarmLevelLabelRow}><View style={[styles.alarmLevelDot, { backgroundColor: item.color }]} /><Text numberOfLines={1} style={[styles.alarmLevelLabel, { color: item.color }]}>{item.label}</Text></View>
          <Text numberOfLines={1} style={[styles.alarmLevelValue, { color: item.color }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ViewModeButton({ active, icon, label, onPress }: { active: boolean; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.viewToggleButton, active && styles.viewToggleButtonActive, pressed && styles.pressed]}>
      <MaterialCommunityIcons color={active ? colors.surface : colors.muted} name={icon} size={21} />
    </Pressable>
  );
}

function CompactNodeCard({ excluded, onOpen, state, t }: { excluded: boolean; onOpen: () => void; state: MonitoringNodeState; t: ReturnType<typeof useI18n>["t"] }) {
  if (!("doorState" in state.values)) return <AngleNodeCard onOpen={onOpen} state={state} t={t} />;
  const primaryValue = state.values.doorState === "open" ? t("doorOpen") : t("doorClosed");
  const batteryLevel = state.values.batteryLevel;
  const batteryPercent = Math.max(0, Math.min(100, batteryLevel ?? 0));
  const batteryColor = batteryLevel === null ? colors.offline : batteryLevel <= 20 ? colors.danger : batteryLevel <= 50 ? colors.warning : colors.caution;
  const icon = state.values.doorState === "open" ? "lock-open-variant-outline" : "lock-outline";
  const visualState = nodeVisualState(state, t);

  return (
    <View style={[styles.compactCard, styles.compactCardShort, styles.threeColumnCard, { borderTopColor: visualState.color }]}> 
      <Pressable onPress={onOpen} style={[styles.cardPressContent, styles.compactPressContent]}>
        <View style={styles.compactHeader}>
          <Text numberOfLines={1} style={styles.compactTitle}>{t("nodeNumber")} {state.node.number}</Text>
          <View style={[styles.compactStatus, { backgroundColor: `${visualState.color}18` }]}>
            <Text style={[styles.compactStatusText, { color: visualState.color }]}>{visualState.label}</Text>
          </View>
        </View>
        <View style={[styles.compactIcon, { backgroundColor: `${visualState.color}18` }]}>
          <MaterialCommunityIcons color={visualState.color} name={icon} size={23} />
        </View>
        <View style={styles.compactValues}>
          <Text numberOfLines={1} style={styles.compactValue}>{primaryValue}</Text>
        </View>
        <View style={styles.compactLocation}>
          <MaterialCommunityIcons color={colors.muted} name="map-marker-outline" size={12} />
          <Text numberOfLines={1} style={styles.compactLocationText}>{state.node.installedLocation ?? t("notAvailable")}</Text>
        </View>
        {excluded ? <Text style={styles.compactExcluded}>{t("alarmExcluded")}</Text> : null}
        <View style={styles.batteryFooter}>
          <View style={styles.batteryLabelRow}><Text numberOfLines={1} style={styles.batteryLabel}>{t("batteryLevel")}</Text><Text style={[styles.batteryValue, { color: batteryColor }]}>{batteryLevel ?? "-"}%</Text></View>
          <View style={styles.batteryTrack}><View style={[styles.batteryFill, { backgroundColor: batteryColor, width: `${batteryPercent}%` }]} /></View>
        </View>
      </Pressable>
    </View>
  );
}

function AngleNodeCard({ onOpen, state, t }: { onOpen: () => void; state: MonitoringNodeState; t: ReturnType<typeof useI18n>["t"] }) {
  if ("doorState" in state.values) return null;
  const { angleX, angleY } = state.values;
  const visual = angleStatusVisual(state.status, t);
  const activeDirection = getActiveDirection(angleX, angleY);

  return (
    <View style={[styles.angleCard, styles.threeColumnCard, { backgroundColor: visual.background, borderColor: visual.border, borderTopColor: visual.bar }]}> 
      <Pressable onPress={onOpen} style={styles.anglePressContent}>
        <View style={styles.angleHeader}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.angleTitle}>{t("nodeNumber")} {state.node.number}</Text>
          <Text numberOfLines={1} style={styles.angleSerial}>{state.gateway.serialNumber}</Text>
        </View>
        <Text style={[styles.angleStatusText, { color: visual.text }]}>{visual.label}</Text>
        </View>

        <View style={styles.angleIndicatorRow}>
          <DirectionIndicator active={activeDirection} color={visual.glow} />
          <MaterialCommunityIcons color={state.status === "offline" ? colors.offline : "#58B463"} name={state.status === "offline" ? "wifi-off" : "wifi"} size={20} />
        </View>

        <View style={styles.angleValues}>
          <View style={styles.angleValueChip}><Text numberOfLines={1} style={styles.angleValueText}>X: {formatAngle(angleX)}</Text></View>
          <View style={styles.angleValueChip}><Text numberOfLines={1} style={styles.angleValueText}>Y: {formatAngle(angleY)}</Text></View>
        </View>

        <View style={styles.angleLocation}>
          <MaterialCommunityIcons color={colors.muted} name="map-marker-outline" size={14} />
          <Text numberOfLines={1} style={styles.angleLocationText}>{state.node.installedLocation ?? t("notAvailable")}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function DirectionIndicator({ active, color }: { active: "bottom" | "center" | "left" | "right" | "top"; color: string }) {
  return (
    <View style={styles.directionIndicator}>
      {(["top", "left", "right", "bottom"] as const).map((direction) => (
        <View key={direction} style={[styles.directionDot, directionPosition(direction), active === direction && { backgroundColor: color, borderColor: color }]} />
      ))}
      <View style={[styles.directionDot, styles.directionCenter, active === "center" && { backgroundColor: color, borderColor: color }]} />
    </View>
  );
}

function directionPosition(direction: "bottom" | "left" | "right" | "top") {
  if (direction === "top") return styles.directionTop;
  if (direction === "left") return styles.directionLeft;
  if (direction === "right") return styles.directionRight;
  return styles.directionBottom;
}

function NodeCard({ canManage, filter, locale, onOpen, onToggle, saving, state, t }: { canManage: boolean; filter?: FaultFilterNodeRecord; locale: string; onOpen: () => void; onToggle: () => void; saving: boolean; state: MonitoringNodeState; t: ReturnType<typeof useI18n>["t"] }) {
  const value = "doorState" in state.values ? `${state.values.doorState === "open" ? t("doorOpen") : t("doorClosed")} · ${state.values.batteryLevel ?? "-"}%` : `X ${state.values.angleX}° · Y ${state.values.angleY}°`;
  const excluded = filter?.desiredEnabled ?? state.faultFiltered;
  const visualState = nodeVisualState(state, t);
  return <View style={styles.stateCard}><Pressable onPress={onOpen} style={styles.statePressContent}><View style={styles.stateRow}><View style={[styles.statusDot, { backgroundColor: visualState.color }]} /><View style={styles.flex}><Text style={styles.cardTitle}>{t("nodeNumber")} {state.node.number}</Text><Text style={styles.meta}>{state.node.installedLocation ?? t("notAvailable")}</Text></View><Text style={[styles.statusText, { color: visualState.color }]}>{visualState.label}</Text></View><Text style={styles.value}>{value}</Text><Text style={styles.meta}>{state.gateway.serialNumber} · {new Date(state.lastSeenAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")}</Text></Pressable><View style={styles.filterRow}><Text style={[styles.filterStatus, excluded && styles.filterStatusExcluded]}>{t(excluded ? "alarmExcluded" : "alarmIncluded")}</Text>{canManage && filter ? <Pressable disabled={saving} onPress={onToggle} style={({ pressed }) => [styles.filterButton, excluded && styles.filterButtonRestore, (pressed || saving) && styles.pressed]}><Text style={[styles.filterButtonText, excluded && styles.filterButtonRestoreText]}>{saving ? t("saving") : t(excluded ? "includeAlarm" : "excludeAlarm")}</Text></Pressable> : null}</View></View>;
}

function Crumb({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.crumb}><Text style={styles.crumbText}>{label}</Text><MaterialCommunityIcons color={colors.muted} name="chevron-right" size={16} /></Pressable>; }
function matchesStatusFilter(state: MonitoringNodeState, filter: NodeStatusFilter) {
  if (filter === "all") return true;
  const inactive = state.status === "offline" || state.status === "unconfigured";
  if (filter === "offline") return inactive;
  if (filter === "open" || filter === "closed") return !inactive && "doorState" in state.values && state.values.doorState === filter;
  return !inactive && state.status === filter;
}
function statusColor(status: MonitoringStatus) { return status === "unconfigured" ? colors.offline : colors[status]; }
function tStatus(status: MonitoringStatus, t: ReturnType<typeof useI18n>["t"]) { return status === "unconfigured" ? t("unconfigured") : t(status); }
function formatThreshold(value: number | null) { return value === null ? "-" : value.toFixed(1).replace(".0", ""); }
function formatAngle(value: number) { const formatted = value.toFixed(1).replace(".0", ""); return value > 0 ? `+${formatted}` : formatted; }
function getActiveDirection(x: number, y: number): "bottom" | "center" | "left" | "right" | "top" {
  if (Math.abs(x) === 0 && Math.abs(y) === 0) return "center";
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? "right" : "left";
  return y > 0 ? "bottom" : "top";
}
function angleStatusVisual(status: MonitoringStatus, t: ReturnType<typeof useI18n>["t"]): { background: string; bar: string; border: string; glow: string; label: string; text: string } {
  if (status === "danger") return { background: "#FDECEC", bar: "#D9332A", border: "#D9332A", glow: "#D9332A", label: t("danger"), text: "#D9332A" };
  if (status === "warning") return { background: "#FFFDEA", bar: "#E7C62E", border: "#E7C62E", glow: "#E7C62E", label: t("warning"), text: "#A87500" };
  if (status === "caution") return { background: "#ECFBE8", bar: "#63C847", border: "#63C847", glow: "#63C847", label: t("caution"), text: "#2F8F24" };
  if (status === "safe") return { background: "#EEF4FF", bar: "#29306B", border: "#9CC2FF", glow: "#4F63F6", label: t("safe"), text: "#4F63F6" };
  return { background: "#F3F4F6", bar: "#6B7280", border: "#9CA3AF", glow: "#6B7280", label: tStatus(status, t), text: "#6B7280" };
}
function nodeVisualState(state: MonitoringNodeState, t: ReturnType<typeof useI18n>["t"]) {
  if (!("doorState" in state.values)) return { color: statusColor(state.status), label: tStatus(state.status, t) };
  if (state.status === "offline" || state.status === "unconfigured") return { color: statusColor(state.status), label: tStatus(state.status, t) };
  return state.values.doorState === "open"
    ? { color: colors.danger, label: t("doorOpen") }
    : { color: colors.primaryDark, label: t("doorClosed") };
}

const styles = StyleSheet.create({
  batteryFill: { borderRadius: radius.pill, height: "100%" },
  batteryFooter: { gap: 3, marginTop: "auto" },
  batteryLabel: { color: colors.muted, fontSize: 7, fontWeight: "700" },
  batteryLabelRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  batteryTrack: { backgroundColor: colors.border, borderRadius: radius.pill, height: 5, overflow: "hidden", width: "100%" },
  batteryValue: { fontSize: 7, fontWeight: "800" },
  compactCardShort: { gap: 5, minHeight: 140 },
  compactGridLeft: { columnGap: 8, justifyContent: "flex-start" },
  compactPressContent: { gap: 5 },
  threeColumnCard: { width: "31%" },
  filterModalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, maxWidth: 430, padding: spacing.md, width: "90%" },
  filterModalClose: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  filterModalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  filterModalOverlay: { alignItems: "center", backgroundColor: "#0B172680", flex: 1, justifyContent: "center", padding: spacing.md },
  filterModalTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  filterOption: { alignItems: "center", borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterOptionActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterOptionCount: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterOptionList: { gap: spacing.xs },
  filterOptionMeta: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  filterOptionText: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  filterOptionTextActive: { color: colors.primaryDark },
  filterSelectButton: { flexShrink: 0, paddingVertical: 7 },
  filterSelectContent: { alignItems: "center", flexDirection: "row", flexWrap: "nowrap", gap: 5 },
  filterSelectValue: { color: colors.foreground, fontSize: 12, fontWeight: "800", textAlign: "center" },
  gatewayFilterText: { width: 84 },
  gatewayFilterButton: { width: 140 },
  nodeFilters: { alignItems: "center", flexDirection: "row", flexWrap: "nowrap", gap: 12, justifyContent: "flex-start" },
  statusFilterButton: { width: 105 },
  statusFilterText: { width: 56 },
  alarmLevelDot: { borderRadius: radius.pill, height: 7, width: 7 },
  alarmLevelItem: { alignItems: "center", borderRadius: radius.md, flex: 1, gap: 5, minWidth: 0, paddingHorizontal: 3, paddingVertical: 9 },
  alarmLevelLabel: { fontSize: 9, fontWeight: "800" },
  alarmLevelLabelRow: { alignItems: "center", flexDirection: "row", gap: 3 },
  alarmLevelSummary: { flexDirection: "row", gap: 4 },
  alarmLevelValue: { fontSize: 12, fontWeight: "800" },
  angleCard: { borderRadius: radius.md, borderTopWidth: 6, borderWidth: 1.5, gap: 7, minHeight: 160, paddingHorizontal: 9, paddingVertical: 9, width: "31.5%" },
  anglePressContent: { flex: 1, gap: 7 },
  angleHeader: { alignItems: "flex-start", flexDirection: "row", gap: 3 },
  angleIndicatorRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  angleLocation: { alignItems: "center", flexDirection: "row", gap: 2, marginTop: "auto" },
  angleLocationText: { color: colors.muted, flex: 1, fontSize: 10 },
  angleSerial: { color: colors.muted, fontSize: 10, marginTop: 3 },
  angleStatusText: { fontSize: 10, fontWeight: "800", paddingTop: 2 },
  angleTitle: { color: colors.foreground, fontSize: 12, fontWeight: "800" },
  angleValueChip: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 7, flex: 1, paddingHorizontal: 2, paddingVertical: 5 },
  angleValueText: { color: colors.foreground, fontSize: 10, fontWeight: "800", textAlign: "center" },
  angleValues: { flexDirection: "row", gap: 4 },
  breadcrumbs: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, cardContent: { gap: spacing.xs, padding: spacing.md }, cardPressContent: { flex: 1, gap: spacing.sm }, cardTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800" }, compactCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderTopWidth: 5, borderWidth: 1, gap: 6, minHeight: 150, padding: 7, width: "31.5%" }, compactExcluded: { color: colors.danger, fontSize: 8, fontWeight: "800" }, compactHeader: { alignItems: "flex-start", flexDirection: "row", gap: 3, justifyContent: "space-between" }, compactIcon: { alignItems: "center", alignSelf: "center", borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 }, compactLocation: { alignItems: "center", flexDirection: "row", gap: 2 }, compactLocationText: { color: colors.muted, flex: 1, fontSize: 8 }, compactStatus: { borderRadius: radius.pill, paddingHorizontal: 4, paddingVertical: 2 }, compactStatusText: { fontSize: 7, fontWeight: "800" }, compactTitle: { color: colors.foreground, flex: 1, fontSize: 10, fontWeight: "800" }, compactValue: { color: colors.foreground, flex: 1, fontSize: 9, fontWeight: "800", textAlign: "center" }, compactValues: { flexDirection: "row", gap: 3 }, compactGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.sm }, crumb: { alignItems: "center", flexDirection: "row" }, crumbCurrent: { color: colors.foreground, fontSize: 12, fontWeight: "800" }, crumbText: { color: colors.primary, fontSize: 12, fontWeight: "700" }, filterButton: { borderColor: colors.danger, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, filterButtonRestore: { borderColor: colors.primary }, filterButtonRestoreText: { color: colors.primary }, filterButtonText: { color: colors.danger, fontSize: 12, fontWeight: "800" }, filterRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm }, filterStatus: { color: colors.caution, fontSize: 12, fontWeight: "800" }, filterStatusExcluded: { color: colors.danger }, flex: { flex: 1 }, grid: { gap: spacing.md }, hierarchySection: { gap: spacing.md }, image: { height: "100%", width: "100%" }, imageFrame: { backgroundColor: colors.primarySoft, height: 150, padding: spacing.md }, loading: { alignItems: "center", gap: spacing.sm, padding: spacing.lg }, meta: { color: colors.muted, fontSize: 12, lineHeight: 18 }, nodeToolbar: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }, nodeTypeCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, overflow: "hidden" }, pressed: { opacity: 0.72 }, realtime: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, resourceArrow: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.pill, height: 28, justifyContent: "center", width: 28 }, resourceCard: { backgroundColor: colors.surface, borderRadius: radius.lg, minHeight: 164, overflow: "hidden", padding: 0, shadowColor: "#19334D", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.08, shadowRadius: 10, width: "31%", elevation: 2 }, resourceCardBody: { flex: 1, gap: spacing.xs, justifyContent: "flex-end", marginBottom: 12, marginHorizontal: 12, minWidth: 0, paddingTop: spacing.sm }, resourceCardBorder: { borderRadius: radius.lg, borderWidth: 2, bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }, resourceCardPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] }, resourceCardSingle: { width: "31%" }, resourceCardTitle: { color: colors.foreground, flexShrink: 1, fontSize: 14, fontWeight: "800", lineHeight: 18, width: "100%" }, resourceCardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginHorizontal: 12, marginTop: 12 }, resourceCountBadge: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, height: 30, justifyContent: "center", minWidth: 36, paddingHorizontal: spacing.sm }, resourceCountText: { color: colors.primaryDark, fontSize: 13, fontWeight: "800" }, resourceGrid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", rowGap: spacing.sm, width: "100%" }, resourceIcon: { alignItems: "center", borderRadius: radius.sm, height: 42, justifyContent: "center", width: 42 }, resourceMetaPill: { alignSelf: "flex-start", borderRadius: radius.pill, maxWidth: "100%", paddingHorizontal: 7, paddingVertical: 5 }, resourceMetaText: { fontSize: 9, fontWeight: "800" }, resourceSectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, resourceSectionIcon: { alignItems: "center", borderRadius: radius.sm, height: 34, justifyContent: "center", width: 34 }, resourceSectionTitleGroup: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, retry: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm }, retryText: { color: colors.primary, fontWeight: "800" }, scopeHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, scopeTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800" }, sectionTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" }, stateCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, statePressContent: { gap: spacing.sm }, stateRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, statusDot: { borderRadius: radius.pill, height: 10, width: 10 }, statusText: { fontSize: 12, fontWeight: "800" }, value: { color: colors.foreground, fontSize: 18, fontWeight: "800" }, viewToggle: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", overflow: "hidden" }, viewToggleButton: { alignItems: "center", height: 38, justifyContent: "center", width: 40 }, viewToggleButtonActive: { backgroundColor: colors.primary },
  resourceCardColumn: { flex: 1, minWidth: 0 },
  resourceCardPlaceholder: { flex: 1, minWidth: 0 },
  resourceGridRows: { flexDirection: "column", flexWrap: "nowrap" },
  resourceRow: { columnGap: spacing.sm, flexDirection: "row", width: "100%" },
  buildingCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  buildingCardShell: { backgroundColor: colors.surface, borderRadius: 22, elevation: 3, shadowColor: "#19334D", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.1, shadowRadius: 8 },
  buildingCardList: { gap: 10 },
  buildingHero: { backgroundColor: colors.primaryDark, borderTopLeftRadius: 21, borderTopRightRadius: 21, height: 96, overflow: "hidden", position: "relative" },
  buildingHeroFallback: { alignItems: "center", bottom: 0, gap: spacing.xs, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  buildingHeroFallbackText: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  buildingHeroImage: { borderTopLeftRadius: 21, borderTopRightRadius: 21, height: "100%", width: "100%" },
  buildingHeroOverlay: { backgroundColor: "rgba(9, 23, 42, 0.42)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  buildingHeroSubtitle: { color: "rgba(255,255,255,0.88)", fontSize: 10, fontWeight: "700" },
  buildingHeroText: { bottom: 12, gap: 2, left: 14, maxWidth: "72%", position: "absolute" },
  buildingHeroTitle: { color: colors.surface, fontSize: 19, fontWeight: "900", lineHeight: 23 },
  buildingMetric: { alignItems: "center", backgroundColor: colors.background, borderRadius: 12, flex: 1, gap: 2, justifyContent: "center", minHeight: 52, minWidth: 0, paddingHorizontal: 2, paddingVertical: 6 },
  buildingMetricLabel: { color: colors.muted, fontSize: 7, fontWeight: "800", textAlign: "center", width: "100%" },
  buildingMetrics: { backgroundColor: colors.surface, borderBottomLeftRadius: 21, borderBottomRightRadius: 21, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  buildingMetricValue: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  buildingOpenButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: radius.pill, height: 34, justifyContent: "center", position: "absolute", right: 12, top: 31, width: 34 },
  buildingSectionIcon: { backgroundColor: "#EEF1FF" },
  nodeTypeArrow: { alignItems: "center", backgroundColor: colors.foreground, borderRadius: radius.pill, height: 40, justifyContent: "center", width: 40 },
  nodeTypeBackgroundFallback: { backgroundColor: "#DDEAF1", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  nodeTypeBackgroundImage: { bottom: 0, height: "100%", left: 0, position: "absolute", right: 0, top: 0, width: "100%" },
  nodeTypeBackgroundOverlay: { backgroundColor: "rgba(244,247,250,0.42)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  nodeTypeCardContent: { backgroundColor: "transparent", flex: 1, gap: 7, justifyContent: "center", minHeight: 74, minWidth: 0, paddingHorizontal: 11, paddingVertical: 8 },
  nodeTypeCardDescription: { color: colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  nodeTypeCardRow: { alignItems: "center", backgroundColor: "transparent", flexDirection: "row", gap: 12, minHeight: 118, paddingHorizontal: 13, paddingVertical: 13, width: "100%" },
  nodeTypeCardShell: { alignSelf: "stretch", backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.82)", borderRadius: 26, borderWidth: 1, overflow: "hidden", position: "relative", width: "100%" },
  nodeTypeCardStack: { alignItems: "stretch", gap: 14, paddingHorizontal: 16, paddingTop: 26, width: "100%" },
  nodeTypeCardTint: { backgroundColor: colors.surface, borderRadius: 25, bottom: 0, left: 0, opacity: 0.68, position: "absolute", right: 0, top: 0 },
  nodeTypeCardTitle: { color: colors.foreground, fontSize: 19, fontWeight: "900" },
  nodeTypeImageFrame: { alignItems: "center", backgroundColor: "transparent", height: 88, justifyContent: "center", padding: 8, width: 98 },
  nodeTypePageBackground: { bottom: -spacing.lg, left: -spacing.md, overflow: "hidden", position: "absolute", right: -spacing.md, top: -spacing.lg },
  nodeTypePressWrapper: { backgroundColor: "transparent", width: "100%" },
  nodeTypeSelection: { marginBottom: -spacing.lg, marginHorizontal: -spacing.md, marginTop: -spacing.lg, minWidth: "100%", position: "relative" },
  directionBottom: { bottom: 0, left: 15, position: "absolute" },
  directionCenter: { left: 15, position: "absolute", top: 15 },
  directionDot: { backgroundColor: colors.surface, borderColor: colors.muted, borderRadius: radius.pill, borderWidth: 1, height: 11, width: 11 },
  directionIndicator: { height: 41, position: "relative", width: 41 },
  directionLeft: { left: 0, position: "absolute", top: 15 },
  directionRight: { position: "absolute", right: 0, top: 15 },
  directionTop: { left: 15, position: "absolute", top: 0 },
});
