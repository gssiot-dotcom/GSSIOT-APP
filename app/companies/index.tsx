import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getCompaniesApi } from "../../api/companies";
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

export default function CompaniesScreen() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUser = async () => {
    const savedUser = await AsyncStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  };

  const fetchCompanies = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const result = await getCompaniesApi();

      const companyList = result.data?.companies || result.companies || [];

      setCompanies(Array.isArray(companyList) ? companyList : []);
    } catch (error: any) {
      console.log(error?.response?.data || error);
      alert("회사 목록을 불러오지 못했습니다.");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchUser(), fetchCompanies(true)]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchCompanies();
  }, []);

  return (
    <View className="flex-1 bg-[#F6F8FB]">
      <HeaderLogo />

      <View className="px-5 pt-3 pb-3 bg-white">
        <View className="flex-row items-end justify-between mt-1">
          <View>
            <Text className="text-[20px] font-black text-[#111827]">
              건설사 목록
            </Text>

            <Text className="text-[12px] font-semibold text-[#64748B] mt-1">
              {user?.name || "-"} · {user?.userType || "-"}
            </Text>
          </View>

          <View className="bg-white rounded-full px-4 py-2 border border-[#E8EDF5]">
            <Text className="text-[12px] font-black text-[#1E2F5C]">
              총 {companies.length}개
            </Text>
          </View>
        </View>
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
            paddingTop: 8,
            paddingBottom: 28,
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
          <View className="flex-row flex-wrap justify-between">
            {companies.map((item) => {
              const company = item.company || item;

              const companyId = company._id || company.id;
              const companyName = company.companyName || "이름 없음";
              const companyAddress = company.companyAddress || "-";
              const companyLogo = company.companyLogo || "";
              const companyLogoUri = getAssetUrl(companyLogo);

              const buildingCount = item.companyStatistics?.buildingsCount || 0;

              return (
                <TouchableOpacity
                  key={companyId}
                  activeOpacity={0.9}
                  className="bg-white rounded-[28px] mb-4 border border-[#EEF2F7] overflow-hidden"
                  style={{
                    width: "48%",
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.04,
                    shadowRadius: 12,
                    elevation: 2,
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/buildings",
                      params: {
                        companyId: String(companyId),
                        companyName: String(companyName),
                        companyLogo: String(companyLogo),
                      },
                    } as any)
                  }
                >
                  <View className="p-4">
                    <View className="flex-row items-center justify-between mb-5">
                      <View className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#EEF2F7] items-center justify-center overflow-hidden">
                        {companyLogoUri ? (
                          <Image
                            source={{ uri: companyLogoUri }}
                            className="w-full h-full"
                            resizeMode="contain"
                          />
                        ) : (
                          <Text className="text-[10px] text-[#A0AEC0] font-black">
                            LOGO
                          </Text>
                        )}
                      </View>

                      <View className="bg-[#EEF4FF] rounded-full px-3 py-1 border border-[#DCEAFF]">
                        <Text className="text-[11px] font-black text-[#1E2F5C]">
                          {buildingCount}개
                        </Text>
                      </View>
                    </View>

                    <Text
                      className="text-[16px] font-black text-[#111827] leading-5 mb-2"
                      numberOfLines={2}
                    >
                      {companyName}
                    </Text>

                    <Text
                      className="text-[11px] text-[#64748B] font-semibold leading-4 mb-5"
                      numberOfLines={2}
                    >
                      {companyAddress}
                    </Text>

                    <View className="h-[1px] bg-[#F1F5F9] mb-3" />

                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] font-bold text-[#64748B]">
                        건물 보기
                      </Text>

                      <View className="w-7 h-7 rounded-full bg-[#111827] items-center justify-center">
                        <Text className="text-white text-base font-black">
                          →
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {!companies.length && (
            <View className="items-center mt-20">
              <Text className="text-[#64748B]">등록된 회사가 없습니다.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}