import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserType = "admin" | "manager" | "worker";

export const getSavedUser = async () => {
  const savedUser = await AsyncStorage.getItem("user");
  return savedUser ? JSON.parse(savedUser) : null;
};

export const getUserType = async (): Promise<UserType | null> => {
  const user = await getSavedUser();
  return user?.userType || null;
};

export const getRoleBasePath = async () => {
  const userType = await getUserType();

  if (userType === "admin") return "/admin";
  if (userType === "manager") return "/manager";
  if (userType === "worker") return "/worker";

  return "";
};

export const isAdmin = async () => {
  return (await getUserType()) === "admin";
};

export const isManager = async () => {
  return (await getUserType()) === "manager";
};

export const isWorker = async () => {
  return (await getUserType()) === "worker";
};