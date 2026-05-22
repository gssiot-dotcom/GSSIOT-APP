import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { getBuildingsApi } from "../../api/buildings";
import HeaderLogo from "../../components/common/HeaderLogo";

const nodeTypes = [
  {
    title: "해치발판 개폐",
    image: require("../../assets/images/scaffoldnode_img.png"),
    path: "/nodes/scaffoldnode",
  },
  {
    title: "비계 전도",
    image: require("../../assets/images/anglenode_img.png"),
    path: "/nodes/anglenode",
  },
  {
    title: "폼 변형",
    image: require("../../assets/images/verticalnode_img.png"),
    path: "/nodes/verticalnode",
  },
] as const;

export default function NodetypesScreen() {
  const { siteName, buildingId, companyId } = useLocalSearchParams();

  const [user, setUser] = useState<any>(null);

  const [currentSiteName, setCurrentSiteName] = useState<string>(
    typeof siteName === "string" ? siteName : ""
  );

  const [currentBuildingId, setCurrentBuildingId] = useState<string>(
    typeof buildingId === "string" ? buildingId : ""
  );

  const [currentCompanyId, setCurrentCompanyId] = useState<string>(
    typeof companyId === "string" ? companyId : ""
  );

  const fetchUserBuilding = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");

      if (!savedUser) return;

      const parsedUser = JSON.parse(savedUser);

      setUser(parsedUser);

      if (siteName && buildingId) return;

      const result = await getBuildingsApi();

      console.log("node-types buildings result:", result);

      const buildings = Array.isArray(result.data)
        ? result.data
        : [];

      const myBuilding = Array.isArray(buildings) ? buildings[0] : null;

      if (myBuilding) {
        setCurrentSiteName(
          myBuilding.title || myBuilding.buildingName || ""
        );

        setCurrentBuildingId(myBuilding._id || myBuilding.id || "");

        setCurrentCompanyId(
          String(myBuilding.companyId?._id || myBuilding.companyId || "")
        );
      }
    } catch (error) {
      console.log("user building error:", error);
    }
  };

  useEffect(() => {
    fetchUserBuilding();
  }, []);

  return (
    <View className="flex-1 bg-[#EDEDED]">
      <HeaderLogo />

      <View className="bg-white px-4 py-4 border-b border-gray-300">
        <Text className="text-lg font-black text-gray-900">
          서비스 목록 - {currentSiteName || "건물 없음"}
        </Text>

        <Text className="text-xs text-gray-500 mt-1">
          {user?.name || "-"} ({user?.userType || "-"})
        </Text>
      </View>

      <View className="px-4 pt-8 gap-8">
        {nodeTypes.map((item) => (
          <Pressable
            key={item.title}
            onPress={() =>
              router.push({
                pathname: item.path,
                params: {
                  siteName: currentSiteName,
                  buildingId: currentBuildingId,
                  companyId: currentCompanyId,
                },
              } as any)
            }
            className="h-36 bg-white rounded-3xl px-5 flex-row items-center shadow-md"
          >
            <Image
              source={item.image}
              resizeMode="contain"
              className="w-40 h-28"
            />

            <View className="flex-1 items-center">
              <Text className="text-lg font-black text-[#1E263D]">
                {item.title}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View className="absolute bottom-10 self-center w-40 h-1.5 rounded-full bg-[#29306B]" />
    </View>
  );
}