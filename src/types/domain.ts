export type Severity = "safe" | "caution" | "warning" | "danger" | "offline";
export type MonitoringStatus = Severity | "unconfigured";
export type CanonicalNodeType = "door_node" | "angle_node" | "gangform_node";

export type MonitoringSummary = Record<Severity, number>;

export type CompanyOption = { id: string; name: string };
export type AreaOption = { companyId: string; id: string; name: string };
export type BuildingOption = { areaId: string; companyId: string; id: string; title: string };

export type MonitoringScopeOptions = {
  areas: AreaOption[];
  buildings: BuildingOption[];
  companies: CompanyOption[];
};

export type NodeTypeRecord = {
  displayName: string;
  id: string;
  key: CanonicalNodeType;
  numericCode?: number;
};

export type MonitoringBuildingOverview = {
  building: BuildingOption & {
    address?: string | null;
    buildingType?: string | null;
    number?: string | null;
    status?: "ACTIVE" | "INACTIVE";
  };
  nodeTypes: {
    count: number;
    latestStatus: MonitoringStatus | null;
    nodeType: NodeTypeRecord;
  }[];
};

export type MonitoringNodeState = {
  faultFiltered: boolean;
  gateway: { id: string; serialNumber: string };
  lastSeenAt: string;
  node: { id: string; installedLocation: string | null; number: string };
  nodeId: string;
  status: MonitoringStatus;
  updatedAt: string;
  values: { angleX: number; angleY: number } | { batteryLevel: number | null; doorState: "closed" | "open" };
};

export type FaultFilterNodeRecord = {
  applied: boolean;
  appliedAt: string | null;
  appliedCommandId: string | null;
  desiredCommandId: string | null;
  desiredEnabled: boolean;
  desiredStatus: string | null;
  failureReason: string | null;
  gateway: { id: string; serialNumber: string };
  gatewayId: string;
  node: { id: string; number: string };
  nodeId: string;
  nodeTypeId: string;
};

export type FaultFilterGatewayGroup = {
  gateway: { id: string; serialNumber: string };
  nodeTypes: {
    nodeType: NodeTypeRecord;
    nodes: FaultFilterNodeRecord[];
  }[];
};

export type BuildingFaultFiltersResponse = {
  building: MonitoringBuildingOverview["building"];
  gateways: FaultFilterGatewayGroup[];
};

export type BuildingAlarmLevelConfiguration = {
  cautionThreshold: number | null;
  dangerThreshold: number | null;
  enabled: boolean;
  id: string;
  nodeType: NodeTypeRecord;
  nodeTypeId: string;
  warningThreshold: number | null;
};

export type BuildingAlarmLevelsResponse = {
  configurations: BuildingAlarmLevelConfiguration[];
};

export type BuildingPlanImage = {
  contentPath: string;
  height: number | null;
  id: string;
  kind: "PLAN" | "REAL";
  orderIndex: number;
  width: number | null;
};

export type MonitoringNodeTypeResponse = {
  building: MonitoringBuildingOverview["building"];
  historyRetentionDays: number;
  nodeType: NodeTypeRecord;
  states: MonitoringNodeState[];
};

export type MonitoringNodeStateEvent = {
  buildingId: string;
  nodeType: CanonicalNodeType;
  state: MonitoringNodeState;
};

export type SensorHistoryReading = {
  id: string;
  receivedAt: string;
  status: MonitoringStatus;
  values: MonitoringNodeState["values"];
};

export type SensorHistoryChartResponse = {
  from: string;
  items: SensorHistoryReading[];
  returnedPointCount: number;
  sampled: boolean;
  sampleLimit: number;
  to: string;
  totalRawPointCount: number;
};

export type AlarmItem = {
  buildingName: string;
  id: string;
  nodeName: string;
  occurredAt: string;
  severity: Exclude<Severity, "safe" | "offline">;
  status: "open" | "acknowledged" | "resolved";
};

export type NotificationItem = {
  createdAt: string;
  id: string;
  message: string;
  read: boolean;
  title: string;
};

export type PaginatedResponse<T> = { items: T[]; page: number; pageSize: number; total: number };

export type NodeTypePreview = {
  caution: number;
  danger: number;
  key: "nodeAngle" | "nodeDoor" | "nodeGangform";
  offline: number;
  safe: number;
  total: number;
  warning: number;
};
export type DashboardSummary = {
  kpis: {
    activeBuildings?: number;
    activeCompanies?: number;
    activeCompanyUsers?: number;
    activeSites?: number;
    gateways?: number;
    gatewaysOffline?: number;
    nodes?: number;
    nodesUnassigned?: number;
    telemetryReadings?: number;
  };
  openAlarmsBySeverity?: Record<"CAUTION" | "DANGER" | "WARNING", number>;
  range: { from: string; key: "7d" | "30d" | "90d"; to: string };
  severityDistribution?: Record<"caution" | "danger" | "offline" | "safe" | "unconfigured" | "warning", number>;
};
