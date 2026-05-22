import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_SERVER_BASE_URL;

export const getGatewaysApi = async () => {
  const token = await AsyncStorage.getItem("token");

  const res = await axios.get(`${BASE_URL}/gateways`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  return res.data;
};