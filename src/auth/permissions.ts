import type { AuthContext, AuthSession } from "@/src/types/auth";

export const permissions = {
  alarmLevelsManage: "alarm-levels.manage",
  alarmLevelsView: "alarm-levels.view",
  alarmsAcknowledge: "alarms.acknowledge",
  alarmsView: "alarms.view",
  buildingPlansView: "building-plans.view",
  dashboardView: "dashboard.view",
  devicesView: "devices.view",
  monitoringView: "monitoring.view",
  notificationsView: "notifications.view",
  reportsView: "reports.view",
  welcomeView: "welcome.view",
} as const;

export function can(session: AuthSession | null, permission: string): boolean {
  return Boolean(
    session && (session.user.isSuperAdmin || session.user.permissions.includes(permission)),
  );
}

const companyReadOnly = [
  "welcome.view",
  "areas.view",
  "buildings.view",
  "building-plans.view",
  "company-devices.view",
  "gateways.view",
  "nodes.view",
  "monitoring.view",
  "alarm-levels.view",
  "alarm-rules.view",
  "alarms.view",
  "reports.view",
];

const previewRoles: Record<string, { context: AuthContext; isSuperAdmin?: boolean; name: string; permissions: string[] }> = {
  platform_manager: {
    context: "company-user",
    name: "Platform Manager",
    permissions: [...companyReadOnly, "dashboard.view", "notifications.view", "alarms.acknowledge", "alarm-levels.manage"],
  },
  site_manager: {
    context: "company-user",
    name: "Site Manager",
    permissions: [...companyReadOnly, "dashboard.view", "alarms.acknowledge", "alarm-levels.manage"],
  },
  building_manager: {
    context: "company-user",
    name: "Building Manager",
    permissions: [...companyReadOnly, "dashboard.view", "alarms.acknowledge", "alarm-levels.manage"],
  },
  viewer: { context: "company-user", name: "Viewer", permissions: companyReadOnly },
  no_permission: { context: "company-user", name: "No Permission", permissions: ["welcome.view"] },
  gss_super_admin: {
    context: "gss-admin",
    isSuperAdmin: true,
    name: "GSS Super Admin",
    permissions: [],
  },
  gss_device_manager: {
    context: "gss-admin",
    name: "GSS Device Manager",
    permissions: ["dashboard.view", "devices.view", "monitoring.view", "monitoring.realtime"],
  },
  gss_support: {
    context: "gss-admin",
    name: "GSS Support",
    permissions: [
      "dashboard.view",
      "devices.view",
      "monitoring.view",
      "alarms.view",
      "notifications.view",
      "reports.view",
    ],
  },
  gss_report_manager: {
    context: "gss-admin",
    name: "GSS Report Manager",
    permissions: ["dashboard.view", "monitoring.view", "alarms.view", "reports.view"],
  },
};

export const previewRoleOptions = Object.entries(previewRoles).map(([key, value]) => ({
  context: value.context,
  key,
  name: value.name,
}));

export function createPreviewSession(roleKey: string): AuthSession {
  const role = previewRoles[roleKey] ?? previewRoles.viewer;
  return {
    context: role.context,
    preview: true,
    user: {
      company: role.context === "company-user" ? { id: "demo-company", name: "GSS 건설" } : null,
      companyId: role.context === "company-user" ? "demo-company" : undefined,
      email: "preview@gssiot.com",
      id: `demo-${roleKey}`,
      isActive: true,
      isSuperAdmin: Boolean(role.isSuperAdmin),
      lastLoginAt: new Date().toISOString(),
      name: "데모 사용자",
      permissions: [...new Set(role.permissions)],
      phone: null,
      role: { id: roleKey, isSuperAdmin: Boolean(role.isSuperAdmin), key: roleKey, name: role.name },
    },
  };
}
