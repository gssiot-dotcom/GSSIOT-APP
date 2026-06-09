import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getCompaniesApi } from "../../api/companies";
import HeaderLogo from "../../components/common/HeaderLogo";

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

      console.log("companies result:", result);

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
    <View className="flex-1 bg-[#EDEDED]">
      <HeaderLogo />

      <View className="bg-white px-4 py-4 border-b border-gray-300">
        <Text className="text-lg font-black text-gray-900">건설사 목록</Text>

        <Text className="text-xs text-gray-500 mt-1">
          {user?.name || "-"} ({user?.userType || "-"})
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E2F5C" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 12,
            paddingBottom: 24,
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

              const buildingCount = item.companyStatistics?.buildingsCount || 0;

              return (
                <TouchableOpacity
                  key={companyId}
                  activeOpacity={0.85}
                  className="bg-white rounded-2xl border border-blue-200 p-4 mb-4"
                  style={{
                    width: "48%",
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
                  <Text
                    className="text-sm font-black text-gray-800 mb-4"
                    numberOfLines={1}
                  >
                    {companyName}
                  </Text>

                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xs text-gray-600">총 건물</Text>

                    <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                      <Text className="text-sm font-bold text-blue-600">
                        {buildingCount}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mb-5">
                    <Text className="text-xs text-gray-600">주소</Text>

                    <View className="bg-blue-600 rounded-full px-3 py-1 max-w-[70%]">
                      <Text
                        className="text-[11px] font-bold text-white"
                        numberOfLines={1}
                      >
                        {companyAddress}
                      </Text>
                    </View>
                  </View>

                  <View className="items-start">
                    <View className="bg-gray-100 rounded-lg px-4 py-2">
                      <Text className="text-xs text-gray-600">건물 보기 →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {!companies.length && (
            <View className="items-center mt-20">
              <Text className="text-gray-500">등록된 회사가 없습니다.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}