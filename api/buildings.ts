import apiClient from "./client";
import { getUserType } from "./roleApi";

export const getBuildingsApi = async () => {
  const userType = await getUserType();

  if (userType === "admin") {
    const res = await apiClient.get("/buildings");

    return {
      data:
        res.data?.data?.buildings ||
        res.data?.data?.items ||
        res.data?.data ||
        res.data?.buildings ||
        res.data?.items ||
        [],
    };
  }

  if (userType === "manager") {
    const res = await apiClient.get("/manager/buildings-page");

    return {
      data:
        res.data?.data?.buildingsList ||
        res.data?.buildingsList ||
        [],
    };
  }

  if (userType === "worker") {
    const res = await apiClient.get("/worker/dashboard/buildings");

    const building =
      res.data?.data?.building ||
      res.data?.building ||
      null;

    const buildings =
      res.data?.data?.buildingsList ||
      res.data?.data?.buildings ||
      res.data?.buildingsList ||
      res.data?.buildings ||
      [];

    return {
      data: building ? [building] : buildings,
    };
  }

  return { data: [] };
};

export const getBuildingStatsApi = async (companyId?: string) => {
  const userType = await getUserType();

  if (userType === "admin") {
    const res = await apiClient.get("/admin/buildings-page", {
      params: { companyId },
    });

    return res.data;
  }

  if (userType === "manager") {
    const res = await apiClient.get("/manager/buildings-page");

    return res.data;
  }

  if (userType === "worker") {
    const res = await apiClient.get("/worker/dashboard/buildings");

    const building =
      res.data?.data?.building ||
      res.data?.building ||
      null;

    return {
      data: {
        buildingsList: building ? [building] : [],
      },
    };
  }

  return {
    data: {
      buildingsList: [],
    },
  };
};