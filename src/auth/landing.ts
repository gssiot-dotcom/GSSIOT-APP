import { can, permissions } from "@/src/auth/permissions";
import type { AuthSession } from "@/src/types/auth";

export type LandingKind = "alarms" | "devices" | "monitoring" | "reports" | "welcome";

export function landingFor(session: AuthSession): LandingKind {
  const roleKey = session.user.role?.key;
  if (roleKey === "gss_device_manager" && can(session, permissions.devicesView)) return "devices";
  if (roleKey === "gss_report_manager" && can(session, permissions.reportsView)) return "reports";
  if (can(session, permissions.monitoringView)) return "monitoring";
  if (can(session, permissions.alarmsView)) return "alarms";
  return "welcome";
}
