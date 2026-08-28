import type { AuthSession } from "@/src/types/auth";
import type {
  AlarmItem,
  BuildingAlarmLevelsResponse,
  BuildingFaultFiltersResponse,
  CanonicalNodeType,
  MonitoringBuildingOverview,
  MonitoringNodeState,
  MonitoringNodeTypeResponse,
  MonitoringScopeOptions,
  NotificationItem,
  SensorHistoryChartResponse,
} from "@/src/types/domain";

const allScope: MonitoringScopeOptions = {
  companies: [
    { id: "demo-company", name: "GSS 건설" },
    { id: "demo-partner", name: "한빛 안전건설" },
    { id: "demo-future", name: "미래 종합건설" },
  ],
  areas: [
    { companyId: "demo-company", id: "area-seoul", name: "서울 스마트 현장" },
    { companyId: "demo-company", id: "area-incheon", name: "인천 물류 현장" },
    { companyId: "demo-company", id: "area-daejeon", name: "대전 연구 현장" },
    { companyId: "demo-partner", id: "area-busan", name: "부산 해안 현장" },
    { companyId: "demo-future", id: "area-gwangju", name: "광주 복합 현장" },
  ],
  buildings: [
    { areaId: "area-seoul", companyId: "demo-company", id: "building-a", title: "A동" },
    { areaId: "area-seoul", companyId: "demo-company", id: "building-b", title: "B동" },
    { areaId: "area-seoul", companyId: "demo-company", id: "building-f", title: "C동" },
    { areaId: "area-incheon", companyId: "demo-company", id: "building-c", title: "물류센터" },
    { areaId: "area-daejeon", companyId: "demo-company", id: "building-g", title: "연구동" },
    { areaId: "area-busan", companyId: "demo-partner", id: "building-d", title: "현장 사무동" },
    { areaId: "area-busan", companyId: "demo-partner", id: "building-e", title: "타워동" },
    { areaId: "area-gwangju", companyId: "demo-future", id: "building-h", title: "복합센터" },
  ],
};

const typeRecords = {
  door_node: { displayName: "Door Node", id: "type-door", key: "door_node", numericCode: 0 },
  angle_node: { displayName: "Angle Node", id: "type-angle", key: "angle_node", numericCode: 1 },
  gangform_node: { displayName: "Gangform Node", id: "type-gangform", key: "gangform_node", numericCode: 2 },
} as const;

const demoFilteredNodes = new Map<string, Set<string>>();

function filterKey(buildingId: string, gatewayId: string, nodeTypeId: string) {
  return `${buildingId}:${gatewayId}:${nodeTypeId}`;
}

function companyScope(roleKey: string): MonitoringScopeOptions {
  const companyId = "demo-company";
  const company = allScope.companies.filter((item) => item.id === companyId);
  if (roleKey === "building_manager") {
    return { companies: company, areas: [], buildings: allScope.buildings.filter((item) => item.id === "building-a") };
  }
  if (roleKey === "viewer") {
    return { companies: company, areas: [], buildings: allScope.buildings.filter((item) => item.id === "building-b") };
  }
  if (roleKey === "site_manager") {
    return {
      companies: company,
      areas: allScope.areas.filter((item) => item.id === "area-seoul"),
      buildings: allScope.buildings.filter((item) => item.areaId === "area-seoul"),
    };
  }
  return {
    companies: company,
    areas: allScope.areas.filter((item) => item.companyId === companyId),
    buildings: allScope.buildings.filter((item) => item.companyId === companyId),
  };
}

export function demoScopeFor(session: AuthSession): MonitoringScopeOptions {
  if (session.context === "gss-admin") return allScope;
  return companyScope(session.user.role?.key ?? "viewer");
}

function countFor(buildingId: string, nodeType: CanonicalNodeType): number {
  const buildingWeight = Math.max(1, buildingId.charCodeAt(buildingId.length - 1) % 5);
  const typeWeight = nodeType === "door_node" ? 5 : nodeType === "angle_node" ? 3 : 2;
  return buildingWeight + typeWeight;
}

export function demoBuildingOverview(buildingId: string): MonitoringBuildingOverview {
  const building = allScope.buildings.find((item) => item.id === buildingId) ?? allScope.buildings[0];
  return {
    building: { ...building, address: "서울특별시 안전로 101", number: building.title, status: "ACTIVE" },
    nodeTypes: (["door_node", "angle_node", "gangform_node"] as const).map((key, index) => ({
      count: countFor(building.id, key),
      latestStatus: index === 0 ? "danger" : index === 1 ? "warning" : "safe",
      nodeType: typeRecords[key],
    })),
  };
}

function nodeValues(nodeType: CanonicalNodeType, index: number): MonitoringNodeState["values"] {
  if (nodeType === "door_node") return { batteryLevel: 92 - index * 7, doorState: index === 1 ? "open" : "closed" };
  return { angleX: Number((index * 0.8 + 0.4).toFixed(1)), angleY: Number((index * 0.6 + 0.2).toFixed(1)) };
}

export function demoNodeStates(buildingId: string, nodeType: CanonicalNodeType): MonitoringNodeTypeResponse {
  const overview = demoBuildingOverview(buildingId);
  const count = Math.min(8, countFor(buildingId, nodeType));
  const states: MonitoringNodeState[] = Array.from({ length: count }, (_, index) => ({
    gateway: { id: `gateway-${buildingId}`, serialNumber: `GW-${buildingId.slice(-1).toUpperCase()}100` },
    faultFiltered: false,
    lastSeenAt: new Date(Date.now() - index * 70_000).toISOString(),
    node: { id: `${buildingId}-${nodeType}-${index + 1}`, installedLocation: `${index + 1}층 ${index % 2 ? "동측" : "서측"}`, number: String(101 + index) },
    nodeId: `${buildingId}-${nodeType}-${index + 1}`,
    status: index === 0 ? "danger" : index === 1 ? "warning" : index === 2 ? "offline" : "safe",
    updatedAt: new Date(Date.now() - index * 70_000).toISOString(),
    values: nodeValues(nodeType, index),
  }));
  return { building: overview.building, historyRetentionDays: 180, nodeType: typeRecords[nodeType], states };
}

export function demoAlarmLevels(): BuildingAlarmLevelsResponse {
  return {
    configurations: [
      { cautionThreshold: 1, dangerThreshold: 3, enabled: true, id: "demo-angle-levels", nodeType: typeRecords.angle_node, nodeTypeId: typeRecords.angle_node.id, warningThreshold: 2 },
      { cautionThreshold: 0.5, dangerThreshold: 2, enabled: true, id: "demo-gangform-levels", nodeType: typeRecords.gangform_node, nodeTypeId: typeRecords.gangform_node.id, warningThreshold: 1 },
    ],
  };
}

export function demoNodeHistoryChart(nodeType: CanonicalNodeType, nodeId: string, from: string, to: string): SensorHistoryChartResponse {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const pointCount = 24;
  const step = Math.max(1, (toDate.getTime() - fromDate.getTime()) / (pointCount - 1));
  const items = Array.from({ length: pointCount }, (_, index) => {
    const phase = index / 3;
    const values: MonitoringNodeState["values"] = nodeType === "door_node"
      ? { batteryLevel: Math.max(48, 92 - index), doorState: index % 7 === 0 ? "open" : "closed" }
      : { angleX: Number((Math.sin(phase) * 1.8 + index * 0.025).toFixed(1)), angleY: Number((Math.cos(phase * 0.85) * 1.3 - 0.2).toFixed(1)) };
    return { id: `${nodeId}-history-${index}`, receivedAt: new Date(fromDate.getTime() + step * index).toISOString(), status: index % 11 === 0 ? "warning" as const : "safe" as const, values };
  });
  return { from: fromDate.toISOString(), items, returnedPointCount: items.length, sampled: false, sampleLimit: 500, to: toDate.toISOString(), totalRawPointCount: items.length };
}

export function demoFaultFilters(buildingId: string): BuildingFaultFiltersResponse {
  const overview = demoBuildingOverview(buildingId);
  const gateway = { id: `gateway-${buildingId}`, serialNumber: `GW-${buildingId.slice(-1).toUpperCase()}100` };
  return {
    building: overview.building,
    gateways: [{
      gateway,
      nodeTypes: (Object.keys(typeRecords) as CanonicalNodeType[]).map((nodeType) => {
        const record = typeRecords[nodeType];
        const selected = demoFilteredNodes.get(filterKey(buildingId, gateway.id, record.id)) ?? new Set<string>();
        return {
          nodeType: record,
          nodes: demoNodeStates(buildingId, nodeType).states.map((state) => ({
            applied: selected.has(state.nodeId),
            appliedAt: selected.has(state.nodeId) ? new Date().toISOString() : null,
            appliedCommandId: selected.has(state.nodeId) ? "demo-command" : null,
            desiredCommandId: selected.has(state.nodeId) ? "demo-command" : null,
            desiredEnabled: selected.has(state.nodeId),
            desiredStatus: selected.has(state.nodeId) ? "ACKNOWLEDGED" : null,
            failureReason: null,
            gateway,
            gatewayId: gateway.id,
            node: state.node,
            nodeId: state.nodeId,
            nodeTypeId: record.id,
          })),
        };
      }),
    }],
  };
}

export function updateDemoFaultFilter(
  buildingId: string,
  input: { gatewayId: string; nodeIds: string[]; nodeTypeId: string },
): BuildingFaultFiltersResponse {
  demoFilteredNodes.set(filterKey(buildingId, input.gatewayId, input.nodeTypeId), new Set(input.nodeIds));
  return demoFaultFilters(buildingId);
}

export const demoAlarms: AlarmItem[] = [
  { buildingName: "A동", id: "alarm-1", nodeName: "각도 노드 102", occurredAt: "2026-08-11T01:12:00.000Z", severity: "danger", status: "open" },
  { buildingName: "B동", id: "alarm-2", nodeName: "출입구 노드 124", occurredAt: "2026-08-11T00:42:00.000Z", severity: "warning", status: "acknowledged" },
  { buildingName: "물류센터", id: "alarm-3", nodeName: "갱폼 노드 207", occurredAt: "2026-08-10T23:18:00.000Z", severity: "caution", status: "open" },
];

export const demoNotifications: NotificationItem[] = [
  { createdAt: "2026-08-11T01:12:00.000Z", id: "notification-1", message: "A동 각도 노드 102가 위험 단계로 분류되었습니다.", read: false, title: "위험 알람 발생" },
  { createdAt: "2026-08-10T23:20:00.000Z", id: "notification-2", message: "게이트웨이 GW-A100의 연결 상태를 확인하세요.", read: true, title: "게이트웨이 오프라인" },
];
