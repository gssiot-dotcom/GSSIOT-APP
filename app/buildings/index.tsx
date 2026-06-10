import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getBuildingsApi, getBuildingStatsApi } from "../../api/buildings";
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
    return getAssetUrl(imageValue);
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

export default function BuildingsScreen() {
  const { companyName, companyId, companyLogo } = useLocalSearchParams();

  const [user, setUser] = useState<any>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const companyLogoUri = useMemo(() => {
    return getAssetUrl(typeof companyLogo === "string" ? companyLogo : "");
  }, [companyLogo]);

  const fetchBuildings = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const savedUser = await AsyncStorage.getItem("user");
      const loginUser = savedUser ? JSON.parse(savedUser) : null;

      setUser(loginUser);

      const targetCompanyId = typeof companyId === "string" ? companyId : "";

      const buildingsResult = await getBuildingsApi();
      const statsResult = await getBuildingStatsApi(targetCompanyId);

      const allBuildings = Array.isArray(buildingsResult.data)
        ? buildingsResult.data
        : [];

      const statsBuildings =
        statsResult.data?.buildingsList || statsResult.buildingsList || [];

      const statsMap = new Map();

      statsBuildings.forEach((building: any) => {
        const id = String(building._id || building.id);
        statsMap.set(id, building.statistics || {});
      });

      const mergedBuildings = allBuildings.map((building: any) => {
        const buildingId = String(building._id || building.id);

        return {
          ...building,
          statistics: statsMap.get(buildingId) || {},
        };
      });

      const filteredBuildings = targetCompanyId
        ? mergedBuildings.filter((building: any) => {
          const buildingCompanyId =
            building.companyId?._id || building.companyId;

          return String(buildingCompanyId) === String(targetCompanyId);
        })
        : mergedBuildings;

      setBuildings(Array.isArray(filteredBuildings) ? filteredBuildings : []);
    } catch (error: any) {
      console.log(error?.response?.data || error);
      alert("건물 목록을 불러오지 못했습니다.");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchBuildings(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  return (
    <View className="flex-1 bg-[#F4F6FA]">
      <HeaderLogo />

      <View className="px-5 pt-3 pb-3 bg-white flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[20px] font-black text-[#111827]">
            건물 목록
          </Text>

          <Text className="text-[12px] text-[#6B7280] font-semibold mt-1">
            {companyName || "전체"} · {user?.name || "-"} ·{" "}
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

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E2F5C" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 30,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1E2F5C"]}
              tintColor="#1E2F5C"
            />
          }
        >
          <View>
            {buildings.map((building) => {
              const buildingId = building._id || building.id;

              const buildingName =
                building.title || building.buildingName || "이름 없음";

              const buildingAddr =
                building.address || building.buildingAddress || "-";

              const stats = building.statistics || building.stats || building;

              const gatewayCount =
                stats.totalGatewaysCounts ??
                stats.totalGatewaysCount ??
                stats.gatewayCount ??
                stats.gatewaysCount ??
                stats.totalGateways ??
                0;

              const hatchCount =
                stats.doorNodeCount ??
                stats.doorNodesCount ??
                stats.hatchNodeCount ??
                stats.hatchNodesCount ??
                0;

              const angleCount =
                stats.angleNodeCount ?? stats.angleNodesCount ?? 0;

              const verticalCount =
                stats.gangformNodeCount ??
                stats.gangformNodesCount ??
                stats.verticalNodeCount ??
                stats.verticalNodesCount ??
                0;

              const buildingPlanImage = JSON.stringify(
                building.buildingPlanImage || []
              );

              const buildingRealImageUri = getFirstImageUrl(
                building.buildingRealImage || building.buildingsRealImage
              );

              return (
                <TouchableOpacity
                  key={buildingId}
                  activeOpacity={0.9}
                  className="rounded-[26px] mb-4 overflow-hidden bg-white border border-[#EEF1F5]"
                  style={{
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.08,
                    shadowRadius: 18,
                    elevation: 4,
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/node-types",
                      params: {
                        buildingId: String(buildingId),
                        siteName: String(buildingName),
                        companyId: String(
                          building.companyId?._id || building.companyId
                        ),
                        buildingPlanImage,
                        companyLogo:
                          typeof companyLogo === "string" ? companyLogo : "",
                        buildingRealImage: JSON.stringify(
                          building.buildingRealImage || building.buildingsRealImage || []
                        ),
                      },
                    } as any)
                  }
                >
                  <View className="h-36 overflow-hidden">
                    {buildingRealImageUri ? (
                      <Image
                        source={{ uri: buildingRealImageUri }}
                        resizeMode="cover"
                        style={StyleSheet.absoluteFillObject}
                      />
                    ) : (
                      <View className="flex-1 bg-[#E5E7EB]" />
                    )}

                    <View
                      style={StyleSheet.absoluteFillObject}
                      className="bg-black/20"
                    />

                    <View className="absolute left-4 right-4 bottom-4">
                      <View className="flex-row items-end justify-between">
                        <View className="flex-1 pr-3">
                          <Text
                            className="text-[22px] font-black text-white"
                            numberOfLines={1}
                          >
                            {buildingName}
                          </Text>

                          <Text
                            className="text-[12px] text-white font-semibold mt-1"
                            numberOfLines={1}
                          >
                            {buildingAddr}
                          </Text>
                        </View>

                        <View className="w-10 h-10 rounded-full bg-white/90 items-center justify-center">
                          <Text className="text-[#111827] text-2xl font-black">
                            ›
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="px-4 py-4 bg-white">
                    <View className="flex-row justify-between">
                      <View className="flex-1 rounded-2xl bg-[#F8FAFC] py-3 items-center mr-2">
                        <Text className="text-[10px] text-[#64748B] font-black mb-1">
                          게이트웨이
                        </Text>
                        <Text className="text-[26px] text-[#111827] font-black">
                          {gatewayCount}
                        </Text>
                      </View>

                      <View className="flex-1 rounded-2xl bg-[#F8FAFC] py-3 items-center mr-2">
                        <Text className="text-[10px] text-[#64748B] font-black mb-1">
                          해치발판
                        </Text>
                        <Text className="text-[26px] text-[#111827] font-black">
                          {hatchCount}
                        </Text>
                      </View>

                      <View className="flex-1 rounded-2xl bg-[#F8FAFC] py-3 items-center mr-2">
                        <Text className="text-[10px] text-[#64748B] font-black mb-1">
                          비계전도
                        </Text>
                        <Text className="text-[26px] text-[#111827] font-black">
                          {angleCount}
                        </Text>
                      </View>

                      <View className="flex-1 rounded-2xl bg-[#F8FAFC] py-3 items-center">
                        <Text className="text-[10px] text-[#64748B] font-black mb-1">
                          수직노드
                        </Text>
                        <Text className="text-[26px] text-[#111827] font-black">
                          {verticalCount}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {!buildings.length && (
            <View className="items-center mt-20">
              <Text className="text-gray-500">등록된 건물이 없습니다.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}