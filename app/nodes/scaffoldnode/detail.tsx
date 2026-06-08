import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { getBuildingNodesApi } from "../../../api/nodes";
import HeaderLogo from "../../../components/common/HeaderLogo";
import { useRealtimeRoom } from "../../../hooks/useRealtime";

export default function ScaffoldNodeDetailScreen() {
  const { nodeId, buildingId, companyId } = useLocalSearchParams();

  const [node, setNode] = useState<any>(null);
  const [gateway, setGateway] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNodeDetail = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      if (typeof buildingId !== "string") {
        return;
      }

      const result = await getBuildingNodesApi({
        companyId: typeof companyId === "string" ? companyId : undefined,
        buildingId,
        nodeType: "door_node",
      });

      console.log("door node detail result:", result);

      const nodes = result.data?.nodesList || result.nodesList || [];
      const gateways = result.data?.gatewayList || result.gatewayList || [];

      const foundNode = nodes.find(
        (item: any) => String(item._id) === String(nodeId)
      );

      if (!foundNode) {
        setNode(null);
        return;
      }

      const nodeGatewayId =
        foundNode.gatewayId?._id ||
        foundNode.gatewayId ||
        foundNode.gateway_id?._id ||
        foundNode.gateway_id;

      const foundGateway = gateways.find(
        (item: any) => String(item._id || item.id) === String(nodeGatewayId)
      );

      setNode(foundNode);
      setGateway(foundGateway || null);
    } catch (error: any) {
      console.log(error?.response?.data || error);
      alert("노드 상세 정보를 불러오지 못했습니다.");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNodeDetail(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNodeDetail();
  }, []);

  useRealtimeRoom({
    buildingId: typeof buildingId === "string" ? buildingId : null,
    nodeType: "node",

    onMessage: (payload: any) => {
      console.log("scaffold detail realtime:", payload);

      setNode((prev: any) => {
        if (!prev) return prev;

        const payloadNumber =
          payload.nodeNumber ??
          payload.number ??
          payload.node_number ??
          payload.nodeNum ??
          payload.doorNum;

        const payloadNodeId = payload.nodeId ?? payload._id;

        const isSameNode =
          String(prev._id) === String(payloadNodeId) ||
          String(prev.number) === String(payloadNumber);

        if (!isSameNode) return prev;

        return {
          ...prev,
          doorState: payload.doorState ?? payload.doorChk ?? prev.doorState,
          batteryLevel:
            payload.batteryLevel ?? payload.betChk ?? prev.batteryLevel,
          status: payload.status ?? payload.node_status ?? prev.status,
          installedLocation:
            payload.installedLocation ??
            payload.position ??
            prev.installedLocation,
          lastSeenAt:
            payload.updatedAt ??
            payload.lastSeenAt ??
            payload.lastSeen ??
            prev.lastSeenAt,
          updatedAt: payload.updatedAt ?? prev.updatedAt,
        };
      });
    },
  });

  const isOpen = node?.doorState === 1 || node?.doorState === true;
  const isOffline = String(node?.status).toLowerCase() === "offline";

  const statusLabel = isOffline ? "통신불가" : isOpen ? "열림" : "닫힘";

  const statusColor = isOffline
    ? "bg-[#6B7280]"
    : isOpen
    ? "bg-[#B91C1C]"
    : "bg-[#1E2F5C]";

  const statusTextColor = isOffline
    ? "text-[#6B7280]"
    : isOpen
    ? "text-[#B91C1C]"
    : "text-[#1E2F5C]";

  const statusChipBg = isOffline
    ? "bg-[#E5E7EB]"
    : isOpen
    ? "bg-[#FEE2E2]"
    : "bg-[#EEF1FF]";

  const battery = node?.batteryLevel ?? 0;
  const position = node?.installedLocation || "위치 정보 없음";
  const doorNum = node?.number || "-";

  const gatewaySerial =
    gateway?.serialNumber ||
    gateway?.gatewaySerialNumber ||
    gateway?.serial_number ||
    "-";

  const gatewayStatus = gateway?.gatewayStatus || gateway?.status || "-";
  const gatewayAlive = String(gatewayStatus).toLowerCase() !== "offline";

  if (loading) {
    return (
      <View className="flex-1 bg-[#EDEDED]">
        <HeaderLogo />

        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E2F5C" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#EDEDED]">
      <HeaderLogo />

      <View className="bg-white px-6 py-5 border-b border-gray-300">
        <Text className="text-xl font-black text-[#1E263D]">
          해치 발판 모니터링
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 40,
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
        {!node ? (
          <View className="items-center mt-20">
            <Text className="text-gray-500">
              노드 정보를 찾을 수 없습니다.
            </Text>
          </View>
        ) : (
          <View className="bg-white rounded-[28px] shadow-md overflow-hidden border border-gray-100">
            <View className={`h-2 ${statusColor}`} />

            <View className="px-6 py-6">
              <View className="flex-row justify-between items-center mb-5">
                <View>
                  <Text className="text-gray-500 text-xs font-bold">
                    NODE DETAIL
                  </Text>

                  <Text className="text-[#1E263D] text-2xl font-black mt-1">
                    노드 {doorNum}
                  </Text>
                </View>

                <View className={`${statusChipBg} px-4 py-2 rounded-full`}>
                  <Text className={`${statusTextColor} text-sm font-black`}>
                    {statusLabel}
                  </Text>
                </View>
              </View>

              <View className="mb-6 bg-[#F6F7FA] rounded-2xl p-3">
                <Image
                  source={require("../../../assets/images/scaffoldnode_img.png")}
                  className="w-full h-44"
                  resizeMode="contain"
                />
              </View>

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1 bg-[#F6F7FA] rounded-2xl px-4 py-4">
                  <Text className="text-gray-500 text-xs font-bold mb-1">
                    게이트웨이
                  </Text>

                  <Text className="text-[#1E263D] text-base font-black">
                    {gatewaySerial}
                  </Text>
                </View>

                <View className="flex-1 bg-[#F6F7FA] rounded-2xl px-4 py-4">
                  <Text className="text-gray-500 text-xs font-bold mb-1">
                    통신상태
                  </Text>

                  <View className="flex-row items-center">
                    <View
                      className={`w-2.5 h-2.5 rounded-full mr-2 ${
                        isOffline ? "bg-[#6B7280]" : "bg-[#2563EB]"
                      }`}
                    />

                    <Text className="text-[#1E263D] text-base font-black">
                      {isOffline ? "Off" : "On"}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-[#F6F7FA] rounded-2xl px-4 py-4 mb-3">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="location-outline" size={15} color="#6B7280" />

                  <Text className="text-gray-500 text-xs font-bold ml-1">
                    위치
                  </Text>
                </View>

                <Text className="text-[#1E263D] text-base font-black">
                  {position}
                </Text>
              </View>

              <View className="bg-[#F6F7FA] rounded-2xl px-4 py-4 mb-3">
                <Text className="text-gray-500 text-xs font-bold mb-2">
                  배터리 상태
                </Text>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-[#1E263D] text-base font-black">
                    {battery}%
                  </Text>

                  <Ionicons name="battery-full" size={20} color="#2563EB" />
                </View>

                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-[#63A0FF] rounded-full"
                    style={{ width: `${battery}%` }}
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 bg-[#F6F7FA] rounded-2xl px-4 py-4">
                  <Text className="text-gray-500 text-xs font-bold mb-1">
                    도어 번호
                  </Text>

                  <Text className="text-[#1E263D] text-xl font-black">
                    {doorNum}
                  </Text>
                </View>

                <View className="flex-1 bg-[#F6F7FA] rounded-2xl px-4 py-4">
                  <Text className="text-gray-500 text-xs font-bold mb-1">
                    상태값
                  </Text>

                  <Text className="text-[#D9332A] text-xl font-black">
                    {node?.doorState ?? "-"}
                  </Text>
                </View>

                <View className="flex-1 bg-[#F6F7FA] rounded-2xl px-4 py-4">
                  <Text className="text-gray-500 text-xs font-bold mb-1">
                    게이트웨이 상태
                  </Text>

                  <Text className="text-[#1E263D] text-xl font-black">
                    {gatewayAlive ? "On" : "Off"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}