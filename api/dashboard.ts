import apiClient from "./client";
import { getRoleBasePath } from "./roleApi";

export const getDashboardApi = async () => {
  const roleBasePath = await getRoleBasePath();

  const res = await apiClient.get(
    `${roleBasePath}/dashboard`
  );

  return res.data;
};

export const getOrganizationTabsApi = async () => {
  const roleBasePath = await getRoleBasePath();

  const res = await apiClient.get(
    `${roleBasePath}/organization-tabs`
  );

  return res.data;
};

export const getAssigningResourcesApi = async () => {
  const roleBasePath = await getRoleBasePath();

  const res = await apiClient.get(
    `${roleBasePath}/unassigned-resources`
  );

  return res.data;
};