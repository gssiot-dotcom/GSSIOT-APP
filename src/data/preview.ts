import type { AlarmItem, MonitoringSummary, NodeTypePreview, NotificationItem } from "@/src/types/domain";

export const previewSummary: MonitoringSummary = {
  caution: 4,
  danger: 2,
  offline: 3,
  safe: 41,
  warning: 6,
};

export const previewNodeTypes: NodeTypePreview[] = [
  { caution: 2, danger: 1, key: "nodeDoor", offline: 1, safe: 18, total: 25, warning: 3 },
  { caution: 1, danger: 1, key: "nodeAngle", offline: 1, safe: 14, total: 19, warning: 2 },
  { caution: 1, danger: 0, key: "nodeGangform", offline: 1, safe: 9, total: 12, warning: 1 },
];

export const previewAlarms: AlarmItem[] = [
  {
    buildingName: "A동",
    id: "alarm-1",
    nodeName: "각도 노드 102",
    occurredAt: "2026-08-11T01:12:00.000Z",
    severity: "danger",
    status: "open",
  },
  {
    buildingName: "B동",
    id: "alarm-2",
    nodeName: "출입구 노드 24",
    occurredAt: "2026-08-11T00:42:00.000Z",
    severity: "warning",
    status: "acknowledged",
  },
  {
    buildingName: "A동",
    id: "alarm-3",
    nodeName: "갱폼 노드 07",
    occurredAt: "2026-08-10T23:18:00.000Z",
    severity: "caution",
    status: "open",
  },
];

export const previewNotifications: NotificationItem[] = [
  {
    createdAt: "2026-08-11T01:12:00.000Z",
    id: "notification-1",
    message: "A동 각도 노드 102가 위험 단계로 분류되었습니다.",
    read: false,
    title: "위험 알람 발생",
  },
  {
    createdAt: "2026-08-10T23:20:00.000Z",
    id: "notification-2",
    message: "게이트웨이 GW-0300의 연결 상태를 확인하세요.",
    read: true,
    title: "게이트웨이 오프라인",
  },
  {
    createdAt: "2026-08-10T22:45:00.000Z",
    id: "notification-3",
    message: "B동 출입구 노드 24 경고가 확인 처리되었습니다.",
    read: true,
    title: "알람 확인 완료",
  },
];
