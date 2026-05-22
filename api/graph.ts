import apiClient from "./client";

export const getNodeGraphicDataApi = async (params: {
  nodeNumber: string | number;
  nodeType: "angle_node" | "gangform_node";
  from: string;
  to: string;
}) => {
  const res = await apiClient.get("/nodes/graphic-data", {
    params,
  });

  return res.data;
};