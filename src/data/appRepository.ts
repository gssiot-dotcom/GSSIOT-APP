import * as api from "@/src/api/app";
import { demoAlarmLevels, demoAlarms, demoBuildingOverview, demoFaultFilters, demoNodeHistoryChart, demoNodeStates, demoNotifications, demoScopeFor, updateDemoFaultFilter } from "@/src/data/demo";
import { previewSummary } from "@/src/data/preview";
import type { AuthSession } from "@/src/types/auth";
import type { AlarmItem, CanonicalNodeType } from "@/src/types/domain";

export const appRepository = {
  getDashboardSummary(session: AuthSession) {
    if (!session.preview) return api.getDashboardSummary(session);
    return Promise.resolve({
      kpis: {},
      range: { from: new Date().toISOString(), key: "7d" as const, to: new Date().toISOString() },
      severityDistribution: { ...previewSummary, unconfigured: 0 },
    });
  },
  acknowledgeAlarm(session: AuthSession, alarmId: string): Promise<AlarmItem> {
    if (!session.preview) return api.acknowledgeAlarm(session, alarmId);
    const alarm = demoAlarms.find((item) => item.id === alarmId);
    if (!alarm) return Promise.reject(new Error("Demo alarm not found"));
    return Promise.resolve({ ...alarm, status: "acknowledged" });
  },
  getAlarms(session: AuthSession) {
    return session.preview ? Promise.resolve([...demoAlarms]) : api.getAlarms(session);
  },
  getAlarmLevels(session: AuthSession, buildingId: string) {
    return session.preview ? Promise.resolve(demoAlarmLevels()) : api.getAlarmLevels(session, buildingId);
  },
  getBuildingMonitoring(session: AuthSession, buildingId: string) {
    return session.preview ? Promise.resolve(demoBuildingOverview(buildingId)) : api.getBuildingMonitoring(session, buildingId);
  },
  async getBuildingPlanImage(session: AuthSession, buildingId: string) {
    if (session.preview) return undefined;
    const images = await api.getBuildingImages(session, buildingId);
    const plan = images.filter((item) => item.kind === "PLAN").sort((left, right) => left.orderIndex - right.orderIndex)[0];
    return plan ? api.getBuildingImageData(plan.contentPath) : undefined;
  },
  async getBuildingRealImage(session: AuthSession, buildingId: string) {
    if (session.preview) return undefined;
    const images = await api.getBuildingImages(session, buildingId);
    const photo = images.filter((item) => item.kind === "REAL").sort((left, right) => left.orderIndex - right.orderIndex)[0];
    return photo ? api.getBuildingImageData(photo.contentPath) : undefined;
  },
  getFaultFilters(session: AuthSession, buildingId: string) {
    return session.preview ? Promise.resolve(demoFaultFilters(buildingId)) : api.getFaultFilters(session, buildingId);
  },
  getMonitoringScope(session: AuthSession) {
    return session.preview ? Promise.resolve(demoScopeFor(session)) : api.getMonitoringScope(session);
  },
  getNodeTypeMonitoring(session: AuthSession, buildingId: string, nodeType: CanonicalNodeType) {
    return session.preview ? Promise.resolve(demoNodeStates(buildingId, nodeType)) : api.getNodeTypeMonitoring(session, buildingId, nodeType);
  },
  getNodeHistoryChart(session: AuthSession, buildingId: string, nodeType: CanonicalNodeType, nodeId: string, from: string, to: string) {
    return session.preview ? Promise.resolve(demoNodeHistoryChart(nodeType, nodeId, from, to)) : api.getNodeHistoryChart(session, buildingId, nodeType, nodeId, from, to);
  },
  getNotifications(session: AuthSession) {
    return session.preview ? Promise.resolve([...demoNotifications]) : api.getNotifications(session);
  },
  markAllNotificationsRead(session: AuthSession): Promise<{ updated: number }> {
    if (!session.preview) return api.markAllNotificationsRead(session);
    return Promise.resolve({ updated: demoNotifications.filter((item) => !item.read).length });
  },
  updateFaultFilter(
    session: AuthSession,
    buildingId: string,
    input: { gatewayId: string; nodeIds: string[]; nodeTypeId: string },
  ) {
    if (!session.preview) return api.updateFaultFilter(session, buildingId, input);
    return Promise.resolve(updateDemoFaultFilter(buildingId, input));
  },
};
