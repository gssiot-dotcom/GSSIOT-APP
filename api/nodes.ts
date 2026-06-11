import apiClient from "./client";
import { getUserType } from "./roleApi";

export type NodeType = "door_node" | "angle_node" | "gangform_node";
export type AlarmType = "angle_node" | "gangform_node";

export const getBuildingNodesApi = async ({
  companyId,
  buildingId,
  nodeType,
}: {
  companyId?: string;
  buildingId: string;
  nodeType: NodeType;
}) => {
  const userType = await getUserType();

  if (userType === "admin") {
    const res = await apiClient.get(
      `/admin/company/buildings/${buildingId}/nodes-page`,
      {
        params: {
          companyId,
          nodeType,
        },
      }
    );

    return res.data;
  }

  if (userType === "manager") {
    const res = await apiClient.get(
      `/manager/buildings/${buildingId}/nodes-page`,
      {
        params: {
          nodeType,
        },
      }
    );

    return res.data;
  }

  if (userType === "worker") {
    const res = await apiClient.get(
      `/worker/buildings/${buildingId}/nodes-page`,
      {
        params: {
          nodeType,
        },
      }
    );

    return res.data;
  }

  return {
    data: {
      nodesList: [],
      gatewayList: [],
      buildingAlarmLevel: null,
    },
  };
};

export const updateNodeAlarmFilterApi = async ({
  buildingId,
  gatewayId,
  alarmType,
  nodeNumber,
  enabled,
}: {
  buildingId: string;
  gatewayId: string;
  alarmType: AlarmType;
  nodeNumber: number;
  enabled: boolean;
}) => {
  const userType = await getUserType();

  const body = {
    buildingId,
    gatewayId,
    alarmType,
    nodeNumber,
    enabled,
  };

  if (userType === "admin") {
    const res = await apiClient.patch(
      `/admin/buildings/${buildingId}/fault-filter`,
      body
    );

    return res.data;
  }

  if (userType === "manager") {
    const res = await apiClient.patch(
      `/manager/buildings/${buildingId}/fault-filter`,
      body
    );

    return res.data;
  }

  throw new Error("알람 제외 설정 권한이 없습니다.");
};