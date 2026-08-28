import { request, requestBlob } from "@/src/api/http";
import type { AuthSession } from "@/src/types/auth";
import type {
  AlarmItem,
  AreaOption,
  BuildingAlarmLevelsResponse,
  BuildingFaultFiltersResponse,
  BuildingOption,
  BuildingPlanImage,
  CanonicalNodeType,
  DashboardSummary,
  MonitoringBuildingOverview,
  MonitoringNodeTypeResponse,
  MonitoringScopeOptions,
  NotificationItem,
  PaginatedResponse,
  SensorHistoryChartResponse,
} from "@/src/types/domain";

type ApiAlarm = {
  building?: { id: string; title: string };
  id: string;
  lastTriggeredAt: string;
  node?: { id: string; number: string };
  nodeType?: { displayName: string; id: string; key: string };
  openedAt: string;
  severity: "CAUTION" | "WARNING" | "DANGER";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
};

type ApiNotification = {
  body: string;
  createdAt: string;
  id: string;
  readAt: string | null;
  title: string;
};

function basePath(session: AuthSession): "admin" | "company" {
  return session.context === "gss-admin" ? "admin" : "company";
}

export function getDashboardSummary(session: AuthSession) {
  return request<DashboardSummary>(`/${basePath(session)}/dashboard/summary?range=7d`);
}

function normalizeAlarm(item: ApiAlarm): AlarmItem {
  return {
    buildingName: item.building?.title ?? "-",
    id: item.id,
    nodeName: item.node ? `${item.nodeType?.displayName ?? "Node"} ${item.node.number}` : "-",
    occurredAt: item.lastTriggeredAt || item.openedAt,
    severity: item.severity.toLowerCase() as AlarmItem["severity"],
    status: item.status.toLowerCase() as AlarmItem["status"],
  };
}

function normalizeNotification(item: ApiNotification): NotificationItem {
  return { createdAt: item.createdAt, id: item.id, message: item.body, read: Boolean(item.readAt), title: item.title };
}

export function getMonitoringScope(session: AuthSession) {
  if (session.context === "gss-admin") {
    return request<MonitoringScopeOptions>("/admin/monitoring/history/options");
  }
  const canViewAreas = session.user.permissions.includes("areas.view");
  const canViewBuildings = session.user.permissions.includes("buildings.view");
  if (!canViewAreas && !canViewBuildings) {
    return request<MonitoringScopeOptions>("/company/monitoring/history/options");
  }
  return Promise.all([
    canViewAreas
      ? request<PaginatedResponse<AreaOption>>("/company/areas?page=1&pageSize=100")
      : Promise.resolve({ items: [], page: 1, pageSize: 100, total: 0 }),
    canViewBuildings
      ? request<PaginatedResponse<BuildingOption>>("/company/buildings?page=1&pageSize=100")
      : request<MonitoringScopeOptions>("/company/monitoring/history/options").then((value) => ({ items: value.buildings, page: 1, pageSize: 100, total: value.buildings.length })),
  ]).then(([areas, buildings]) => ({
    areas: areas.items,
    buildings: buildings.items,
    companies: session.user.company ? [session.user.company] : [],
  }));
}

export function getBuildingMonitoring(session: AuthSession, buildingId: string) {
  const path = session.context === "gss-admin"
    ? `/admin/monitoring/buildings/${buildingId}`
    : `/company/buildings/${buildingId}/monitoring`;
  return request<MonitoringBuildingOverview>(path);
}

export function getNodeTypeMonitoring(session: AuthSession, buildingId: string, nodeType: CanonicalNodeType) {
  const path = session.context === "gss-admin"
    ? `/admin/monitoring/buildings/${buildingId}/node-types/${nodeType}`
    : `/company/buildings/${buildingId}/monitoring/${nodeType}`;
  return request<MonitoringNodeTypeResponse>(path);
}

export function getNodeHistoryChart(session: AuthSession, buildingId: string, nodeType: CanonicalNodeType, nodeId: string, from: string, to: string) {
  const query = new URLSearchParams({ from, to }).toString();
  const path = session.context === "gss-admin"
    ? `/admin/monitoring/buildings/${buildingId}/node-types/${nodeType}/nodes/${nodeId}/history/chart?${query}`
    : `/company/buildings/${buildingId}/monitoring/${nodeType}/nodes/${nodeId}/history/chart?${query}`;
  return request<SensorHistoryChartResponse>(path);
}

export function getFaultFilters(session: AuthSession, buildingId: string) {
  return request<BuildingFaultFiltersResponse>(
    `/${basePath(session)}/buildings/${buildingId}/alarm-levels/fault-filters`,
  );
}

export function getAlarmLevels(session: AuthSession, buildingId: string) {
  return request<BuildingAlarmLevelsResponse>(`/${basePath(session)}/buildings/${buildingId}/alarm-levels`);
}

export function getBuildingImages(session: AuthSession, buildingId: string) {
  return request<BuildingPlanImage[]>(`/${basePath(session)}/buildings/${buildingId}/images`);
}

export async function getBuildingImageData(contentPath: string): Promise<string> {
  const blob = await requestBlob(contentPath);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read the building plan image."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The building plan image is invalid."));
    reader.readAsDataURL(blob);
  });
}

export function updateFaultFilter(
  session: AuthSession,
  buildingId: string,
  input: { gatewayId: string; nodeIds: string[]; nodeTypeId: string },
) {
  return request<BuildingFaultFiltersResponse>(
    `/${basePath(session)}/buildings/${buildingId}/alarm-levels/fault-filters`,
    { body: JSON.stringify(input), method: "PATCH" },
  );
}

export async function getAlarms(session: AuthSession): Promise<AlarmItem[]> {
  const response = await request<PaginatedResponse<ApiAlarm>>(`/${basePath(session)}/alarms?page=1&pageSize=50`);
  return response.items.map(normalizeAlarm);
}

export async function acknowledgeAlarm(session: AuthSession, alarmId: string): Promise<AlarmItem> {
  const response = await request<ApiAlarm>(`/${basePath(session)}/alarms/${alarmId}/acknowledge`, {
    body: JSON.stringify({}),
    method: "PATCH",
  });
  return normalizeAlarm(response);
}

export async function getNotifications(session: AuthSession): Promise<NotificationItem[]> {
  const response = await request<PaginatedResponse<ApiNotification>>(`/${basePath(session)}/notifications?page=1&pageSize=50`);
  return response.items.map(normalizeNotification);
}

export function markAllNotificationsRead(session: AuthSession) {
  return request<{ updated: number }>(`/${basePath(session)}/notifications/read-all`, { method: "PATCH" });
}
