import { Ionicons } from "@expo/vector-icons";
import {
  CommonActions,
  useNavigation,
} from "@react-navigation/native";
import { Alert, Image, TouchableOpacity, View } from "react-native";

export default function HeaderLogo() {
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      "로그아웃",
      "로그아웃 하시겠습니까?",
      [
        {
          text: "아니오",
          style: "cancel",
        },
        {
          text: "예",
          style: "destructive",
          onPress: () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "auth/login" as never,
                  },
                ],
              })
            );
          },
        },
      ],
      {
        cancelable: true,
      }
    );
  };

  return (
    <View className="bg-[#1E2F5C] pt-11 pb-2 flex-row items-center">
      
      {/* 뒤로가기 버튼 */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="pl-4 pr-2"
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      {/* 로고 */}
      <View className="flex-1 items-center">
        <Image
          source={require("../../assets/images/Gss-logo-white.png")}
          className="w-28 h-14"
          resizeMode="contain"
        />
      </View>

      {/* 로그아웃 버튼 */}
      <TouchableOpacity
        onPress={handleLogout}
        className="pr-4 pl-2"
      >
        <Ionicons
          name="log-out-outline"
          size={24}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
}