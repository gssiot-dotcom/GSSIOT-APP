import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { loginApi } from "../../api/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("알림", "이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      const result = await loginApi(email, password);

      console.log("login result:", result);

      if (result.state === "success") {
        const accessToken = result.data?.accessToken;
        const user = result.data?.user;

        if (!accessToken || !user) {
          Alert.alert("로그인 실패", "로그인 응답 정보가 올바르지 않습니다.");
          return;
        }

        await AsyncStorage.setItem("token", accessToken);
        await AsyncStorage.setItem("user", JSON.stringify(user));

        const userType = String(user.userType || "").toLowerCase();

        if (userType === "admin") {
          router.replace("/companies" as any);
        } else if (userType === "manager") {
          router.replace("/buildings" as any);
        } else if (userType === "worker") {
          router.replace("/node-types" as any);
        } else {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");

          router.replace("/auth/login" as any);
        }
      } else {
        Alert.alert(
          "로그인 실패",
          result.message || "이메일 또는 비밀번호를 확인해주세요."
        );
      }
    } catch (error: any) {
      console.log(error?.response?.data || error);
      Alert.alert("로그인 실패", "이메일 또는 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/login-bg.png")}
      className="flex-1"
      resizeMode="cover"
    >
      <View className="absolute inset-0 bg-[#1E2F5C]/70" />

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 20,
        }}
        enableOnAndroid
        extraScrollHeight={0}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-[28px] px-6 py-9">
          <View className="items-center mb-8">
            <Image
              source={require("../../assets/images/Gss-logo-blue.png")}
              className="w-28 h-16"
              resizeMode="contain"
            />

            <Text className="text-sm text-gray-500 mt-5">
              건설 안전 모니터링 시스템
            </Text>
          </View>

          <Text className="text-xs font-bold text-gray-700 mb-2">이메일</Text>

          <TextInput
            className="h-12 bg-gray-100 rounded-lg px-4 text-sm mb-5"
            placeholder="이메일을 입력하세요"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text className="text-xs font-bold text-gray-700 mb-2">
            비밀번호
          </Text>

          <TextInput
            className="h-12 bg-gray-100 rounded-lg px-4 text-sm mb-5"
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            className="h-12 bg-blue-600 rounded-lg items-center justify-center mb-4"
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white font-bold text-sm">
              {loading ? "로그인 중..." : "로그인"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/auth/signup")}
          >
            <Text className="text-sm font-bold text-[#1E2F5C]">
              회원가입 하러가기
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
}