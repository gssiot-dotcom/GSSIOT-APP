import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";

const BASE_URL = process.env.EXPO_PUBLIC_SERVER_BASE_URL;

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let handlingUnauthorized = false;

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes("/auth/login")) {
      handlingUnauthorized = false;
    }

    return response;
  },
  async (error) => {
    const isUnauthorized = error?.response?.status === 401;
    const isLoginRequest = error?.config?.url?.includes("/auth/login");

    if (isUnauthorized && !isLoginRequest && !handlingUnauthorized) {
      handlingUnauthorized = true;
      await AsyncStorage.multiRemove(["token", "user"]);
      router.replace("/auth/login");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
