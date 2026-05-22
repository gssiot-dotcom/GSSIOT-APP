import apiClient from "./client";
import { getUserType } from "./roleApi";

export type NodeType = "door_node" | "angle_node" | "gangform_node";

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