import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { getBuildingsApi } from "../../api/buildings";
import HeaderLogo from "../../components/common/HeaderLogo";

const S3_ASSET_BASE_URL = process.env.EXPO_PUBLIC_S3_ASSET_BASE_URL;

const getAssetUrl = (key?: string | null) => {
  if (!key) return "";

  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }

  const normalizedKey = key.replace(/^\/+/, "");

  const encodedKey = normalizedKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${S3_ASSET_BASE_URL}/${encodedKey}`;
};

const getFirstImageUrl = (imageValue: any) => {
  if (!imageValue) return "";

  if (typeof imageValue === "string") {
    try {
      const parsed = JSON.parse(imageValue);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return getFirstImageUrl(parsed);
      }

      return getAssetUrl(imageValue);
    } catch {
      return getAssetUrl(imageValue);
    }
  }

  if (Array.isArray(imageValue) && imageValue.length > 0) {
    const firstImage = imageValue[0];

    if (typeof firstImage === "string") {
      return getAssetUrl(firstImage);
    }

    return getAssetUrl(
      firstImage?.url ||
        firstImage?.key ||
        firstImage?.path ||
        firstImage?.image ||
        ""
    );
  }

  return "";
};

const nodeTypes = [
  {
    title: "해치발판 개폐",
    subtitle: "발판 개폐 상태 모니터링",
    image: require("../../assets/images/scaffoldnode_img.png"),
    path: "/nodes/scaffoldnode",
  },
  {
    title: "비계 전도",
    subtitle: "비계 기울기 및 위험 감지",
    image: require("../../assets/images/anglenode_img.png"),
    path: "/nodes/anglenode",
  },
  {
    title: "폼 변형",
    subtitle: "폼 변형 상태 모니터링",
    image: require("../../assets/images/verticalnode_img.png"),
    path: "/nodes/verticalnode",
  },
] as const;

export default function NodetypesScreen() {
  const {
    siteName,
    buildingId,
    companyId,
    buildingPlanImage,
    buildingRealImage,
    companyLogo,
  } = useLocalSearchParams();

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

  const [currentBuildingPlanImage, setCurrentBuildingPlanImage] =
    useState<string>(
      typeof buildingPlanImage === "string" ? buildingPlanImage : "[]"
    );

  const [currentBuildingRealImage, setCurrentBuildingRealImage] =
    useState<string>(
      typeof buildingRealImage === "string" ? buildingRealImage : "[]"
    );

  const [currentCompanyLogo, setCurrentCompanyLogo] = useState<string>(
    typeof companyLogo === "string" ? companyLogo : ""
  );

  const companyLogoUri = useMemo(() => {
    return getAssetUrl(currentCompanyLogo);
  }, [currentCompanyLogo]);

  const backgroundImageUri = useMemo(() => {
    return getFirstImageUrl(currentBuildingRealImage);
  }, [currentBuildingRealImage]);

  const fetchUserBuilding = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");

      if (!savedUser) return;

      const parsedUser = JSON.parse(savedUser);

      setUser(parsedUser);

      if (siteName && buildingId) {
        if (typeof buildingPlanImage === "string") {
          setCurrentBuildingPlanImage(buildingPlanImage);
        }

        if (typeof buildingRealImage === "string") {
          setCurrentBuildingRealImage(buildingRealImage);
        }

        if (typeof companyLogo === "string") {
          setCurrentCompanyLogo(companyLogo);
        }

        return;
      }

      const result = await getBuildingsApi();

      console.log("node-types buildings result:", result);

      const buildings = Array.isArray(result.data) ? result.data : [];
      const myBuilding = Array.isArray(buildings) ? buildings[0] : null;

      if (myBuilding) {
        setCurrentSiteName(myBuilding.title || myBuilding.buildingName || "");

        setCurrentBuildingId(myBuilding._id || myBuilding.id || "");

        setCurrentCompanyId(
          String(myBuilding.companyId?._id || myBuilding.companyId || "")
        );

        setCurrentBuildingPlanImage(
          JSON.stringify(myBuilding.buildingPlanImage || [])
        );

        setCurrentBuildingRealImage(
          JSON.stringify(
            myBuilding.buildingRealImage ||
              myBuilding.buildingsRealImage ||
              []
          )
        );

        setCurrentCompanyLogo(
          myBuilding.companyId?.companyLogo || myBuilding.companyLogo || ""
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
    <View className="flex-1 bg-[#F6F8FB]">
      <HeaderLogo />

      <View className="px-5 pt-3 pb-3 bg-white flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[20px] font-black text-[#111827]">
            서비스 목록
          </Text>

          <Text
            className="text-[12px] text-[#6B7280] font-semibold mt-1"
            numberOfLines={1}
          >
            {currentSiteName || "건물 없음"} · {user?.name || "-"} ·{" "}
            {user?.userType || "-"}
          </Text>
        </View>

        {companyLogoUri ? (
          <View className="w-20 h-12 rounded-2xl bg-white border border-[#EEF2F7] overflow-hidden">
            <Image
              source={{ uri: companyLogoUri }}
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
        ) : null}
      </View>

      <View className="flex-1 overflow-hidden">
        {backgroundImageUri ? (
          <>
            <Image
              source={{ uri: backgroundImageUri }}
              resizeMode="cover"
              className="absolute left-0 top-0 right-0 bottom-0 w-full h-full"
            />

            <View className="absolute left-0 top-0 right-0 bottom-0 bg-white/50" />
          </>
        ) : (
          <View className="absolute left-0 top-0 right-0 bottom-0 bg-[#F6F8FB]" />
        )}

        <View className="px-4 pt-4">
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
                    buildingPlanImage: currentBuildingPlanImage,
                    buildingRealImage: currentBuildingRealImage,
                    companyLogo: currentCompanyLogo,
                  },
                } as any)
              }
              className="bg-white/85 rounded-[28px] mb-4 border border-[#EEF2F7] overflow-hidden"
              style={{
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View className="px-5 py-5 flex-row items-center">
                <View className="w-28 h-24 rounded-3xl bg-[#F8FAFC] border border-[#EEF2F7] items-center justify-center overflow-hidden mr-5">
                  <Image
                    source={item.image}
                    resizeMode="contain"
                    className="w-24 h-20"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-[17px] font-black text-[#111827]">
                    {item.title}
                  </Text>

                  <Text
                    className="text-[12px] text-[#64748B] font-semibold mt-1"
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                </View>

                <View className="w-8 h-8 rounded-full bg-[#111827] items-center justify-center ml-3">
                  <Text className="text-white text-lg font-black">→</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}