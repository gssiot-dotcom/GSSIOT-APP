import apiClient from "./client";

export type NodeGraphicDataPoint = {
  _id?: string;
  nodeNumber: number;
  angleX?: number | null;
  angleY?: number | null;
  gwNumber?: string | number;
  createdAt: string;
  updatedAt?: string;
};

type ApiResponse<T> = {
  state: string;
  message?: string;
  data: T;
};

export const getNodeGraphicDataApi = async (params: {
  nodeNumber: string | number;
  nodeType: "angle_node" | "gangform_node";
  from: string;
  to: string;
}): Promise<NodeGraphicDataPoint[]> => {
  const res = await apiClient.get("/nodes/graphic-data", {
    params,
  });

  const body = res.data as ApiResponse<NodeGraphicDataPoint[]> | NodeGraphicDataPoint[];

  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "state" in body &&
    "data" in body
  ) {
    if (body.state !== "success") {
      throw new Error(body.message || "Request failed");
    }

    return Array.isArray(body.data) ? body.data : [];
  }

  return Array.isArray(body) ? body : [];
};
