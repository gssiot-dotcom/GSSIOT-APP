import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
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
    <View className="flex-1 bg-[#EDEDED]">
      <HeaderLogo />

      <View className="bg-white px-4 py-4 border-b border-gray-300 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-black text-gray-900">
            건물 목록 - {companyName || "전체"}
          </Text>

          <Text className="text-xs text-gray-500 mt-1">
            {user?.name || "-"} ({user?.userType || "-"})
          </Text>
        </View>

        {companyLogoUri ? (
          <View className="w-24 h-14 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <Image
              source={{ uri: companyLogoUri }}
              className="w-full h-full"
              resizeMode="cover"
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
            padding: 14,
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

              return (
                <TouchableOpacity
                  key={buildingId}
                  activeOpacity={0.9}
                  className="bg-white rounded-[30px] border border-[#DCE6F5] px-5 py-5 mb-4"
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
                        companyLogo: typeof companyLogo === "string" ? companyLogo : "",
                      },
                    } as any)
                  }
                >
                  <View className="flex-row items-center justify-between mb-5">
                    <View className="flex-1 flex-row items-center pr-3">
                      <Text
                        className="text-[18px] font-black text-[#1E263D] mr-3"
                        numberOfLines={1}
                      >
                        {buildingName}
                      </Text>

                      <Text
                        className="text-xs text-gray-500 flex-1"
                        numberOfLines={1}
                      >
                        {buildingAddr}
                      </Text>
                    </View>

                    <Text className="text-[#1E2F5C] text-2xl font-black">
                      →
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <View className="flex-1 bg-[#F6F7FA] rounded-2xl py-4 items-center mr-2">
                      <Text className="text-gray-500 text-[11px] font-bold mb-2">
                        게이트웨이
                      </Text>
                      <Text className="text-[#1E263D] text-2xl font-black">
                        {gatewayCount}
                      </Text>
                    </View>

                    <View className="flex-1 bg-[#F6F7FA] rounded-2xl py-4 items-center mr-2">
                      <Text className="text-gray-500 text-[11px] font-bold mb-2">
                        해치발판
                      </Text>
                      <Text className="text-[#1E263D] text-2xl font-black">
                        {hatchCount}
                      </Text>
                    </View>

                    <View className="flex-1 bg-[#F6F7FA] rounded-2xl py-4 items-center mr-2">
                      <Text className="text-gray-500 text-[11px] font-bold mb-2">
                        비계전도
                      </Text>
                      <Text className="text-[#1E263D] text-2xl font-black">
                        {angleCount}
                      </Text>
                    </View>

                    <View className="flex-1 bg-[#F6F7FA] rounded-2xl py-4 items-center">
                      <Text className="text-gray-500 text-[11px] font-bold mb-2">
                        수직노드
                      </Text>
                      <Text className="text-[#1E263D] text-2xl font-black">
                        {verticalCount}
                      </Text>
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