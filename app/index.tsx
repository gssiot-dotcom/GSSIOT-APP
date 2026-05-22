import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function LoadingScreen() {
  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const savedUser = await AsyncStorage.getItem("user");

      setTimeout(async () => {
        if (!token || !savedUser) {
          router.replace("/auth/login");
          return;
        }

        const user = JSON.parse(savedUser);

        const userType = String(
          user.userType || ""
        ).toLowerCase();

        if (userType === "admin") {
          router.replace("/companies" as any);
        } else if (userType === "manager") {
          router.replace("/buildings" as any);
        } else if (userType === "worker") {
          router.replace("/node-types" as any);
        } else {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");

          router.replace("/auth/login");
        }
      }, 1500);
    } catch (error) {
      console.log("auto login error:", error);

      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");

      router.replace("/auth/login");
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <View className="items-center">
        <Text className="text-5xl font-black text-blue-900 tracking-[-2px]">
          GSS
        </Text>

        <Text className="mt-2 text-sm text-gray-500">
          건설 안전 모니터링 시스템
        </Text>

        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 32 }}
        />

        <Text className="mt-4 text-xs text-gray-400">
          시스템을 불러오는 중...
        </Text>
      </View>
    </View>
  );
}