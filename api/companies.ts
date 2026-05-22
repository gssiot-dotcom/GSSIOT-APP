import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_SERVER_BASE_URL;

export const getCompaniesApi = async () => {
  const token = await AsyncStorage.getItem("token");

  const res = await axios.get(`${BASE_URL}/admin/dashboard`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  return res.data;
};