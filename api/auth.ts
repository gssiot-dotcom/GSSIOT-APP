import apiClient from "./client";

export const loginApi = async (email: string, password: string) => {
  const res = await apiClient.post("/auth/login", {
    email,
    password,
  });

  return res.data;
};

export const registerApi = async (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  userType?: "manager" | "worker";
}) => {
  const res = await apiClient.post("/auth/register", {
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    userType: data.userType || "worker",
  });

  return res.data;
};

export const meApi = async () => {
  const res = await apiClient.get("/auth/me");

  return res.data;
};