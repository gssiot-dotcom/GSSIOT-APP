import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { registerApi } from "../../api/auth";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !phone || !password || !passwordConfirm) {
      Alert.alert("알림", "모든 항목을 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert("알림", "비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setLoading(true);

      const data = await registerApi({
        name,
        email,
        phone,
        password,
        userType: "worker",
      });
      console.log("signup result:", data);

      if (data.state === "success") {
        Alert.alert("성공", "회원가입이 완료되었습니다.");
        router.replace("/auth/login");
      } else {
        Alert.alert(
          "회원가입 실패",
          data.message || "회원가입에 실패했습니다."
        );
      }
    } catch (error: any) {
      console.log(error?.response?.data || error);
      Alert.alert("서버 오류", "서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-[#EDEDED]"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
      }}
      enableOnAndroid
      extraScrollHeight={40}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-white rounded-[32px] px-7 py-8 shadow-md">
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-[#1E2F5C] items-center justify-center mb-4">
            <Ionicons name="person-add" size={38} color="white" />
          </View>

          <Text className="text-3xl font-black text-[#1E263D]">
            회원가입
          </Text>

          <Text className="text-gray-500 mt-2 text-sm">
            계정을 생성해주세요
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-[#1E263D] font-bold mb-2">이름</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력하세요"
            placeholderTextColor="#9CA3AF"
            className="bg-[#F6F7FA] rounded-2xl px-4 py-4 text-[#1E263D]"
          />
        </View>

        <View className="mb-4">
          <Text className="text-[#1E263D] font-bold mb-2">이메일</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="이메일을 입력하세요"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-[#F6F7FA] rounded-2xl px-4 py-4 text-[#1E263D]"
          />
        </View>

        <View className="mb-4">
          <Text className="text-[#1E263D] font-bold mb-2">전화번호</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="전화번호를 입력하세요"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            className="bg-[#F6F7FA] rounded-2xl px-4 py-4 text-[#1E263D]"
          />
        </View>

        <View className="mb-4">
          <Text className="text-[#1E263D] font-bold mb-2">비밀번호</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            className="bg-[#F6F7FA] rounded-2xl px-4 py-4 text-[#1E263D]"
          />
        </View>

        <View className="mb-7">
          <Text className="text-[#1E263D] font-bold mb-2">
            비밀번호 확인
          </Text>
          <TextInput
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="비밀번호를 다시 입력하세요"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            className="bg-[#F6F7FA] rounded-2xl px-4 py-4 text-[#1E263D]"
          />
        </View>

        <Pressable
          onPress={handleSignup}
          disabled={loading}
          className="bg-[#1E2F5C] rounded-2xl py-4 items-center"
        >
          <Text className="text-white text-base font-black">
            {loading ? "가입 중..." : "회원가입"}
          </Text>
        </Pressable>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">이미 계정이 있으신가요?</Text>

          <Pressable onPress={() => router.push("/auth/login")}>
            <Text className="text-[#1E2F5C] font-black ml-1">
              로그인
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}