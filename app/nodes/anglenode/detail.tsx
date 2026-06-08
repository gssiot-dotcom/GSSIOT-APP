import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { getBuildingNodesApi } from "../../../api/nodes";
import HeaderLogo from "../../../components/common/HeaderLogo";
import { useRealtimeRoom } from "../../../hooks/useRealtime";

const getStatusInfo = (
  alarm: number,
  alarmLevel: any,
  isOffline?: boolean
) => {
  const caution = Number(alarmLevel?.green ?? 1);
  const warning = Number(alarmLevel?.yellow ?? 2.5);
  const danger = Number(alarmLevel?.red ?? 4);

  if (isOffline) {
    return {
      label: "통신불가",
      color: "bg-[#6B7280]",
      text: "text-[#6B7280]",
      chip: "bg-[#E5E7EB]",
    };
  }

  if (alarm >= danger) {
    return {
      label: "위험",
      color: "bg-[#D9332A]",
      text: "text-[#D9332A]",
      chip: "bg-[#FEE2E2]",
    };
  }

  if (alarm >= warning) {
    return {
      label: "경고",
      color: "bg-[#E7C62E]",
      text: "text-[#A87500]",
      chip: "bg-[#FFFDEA]",
    };
  }

  if (alarm >= caution) {
    return {
      label: "주의",
      color: "bg-[#63C847]",
      text: "text-[#2F8F24]",
      chip: "bg-[#ECFBE8]",
    };
  }

  return {
    label: "정상",
    color: "bg-[#29306B]",
    text: "text-[#29306B]",
    chip: "bg-[#EEF1FF]",
  };
};

export default function AngleNodeDetailScreen() {
  const {
    nodeId,
    buildingId,
    companyId,
    siteName,
    axisX: paramAxisX,
    axisY: paramAxisY,
  } = useLocalSearchParams();

  const [node, setNode] = useState<any>(null);
  const [gateway, setGateway] = useState<any>(null);
  const [alarmLevel, setAlarmLevel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      if (typeof buildingId !== "string") {
        setNode(null);
        return;
      }

      const result = await getBuildingNodesApi({
        companyId: typeof companyId === "string" ? companyId : undefined,
        buildingId,
        nodeType: "angle_node",
      });

      console.log("angle detail result:", result);

      const nodes = result.data?.nodesList || result.nodesList || [];
      const gateways = result.data?.gatewayList || result.gatewayList || [];

      const buildingAlarmLevel =
        result.data?.buildingAlarmLevel || result.buildingAlarmLevel || null;

      const foundNode = nodes.find(
        (item: any) => String(item._id) === String(nodeId)
      );

      const nodeGatewayId =
        foundNode?.gatewayId?._id ||
        foundNode?.gatewayId ||
        foundNode?.gateway_id?._id ||
        foundNode?.gateway_id;

      const foundGateway = gateways.find(
        (item: any) => String(item._id || item.id) === String(nodeGatewayId)
      );

      const initialAxisX =
        typeof paramAxisX === "string" && paramAxisX !== ""
          ? Number(paramAxisX)
          : undefined;

      const initialAxisY =
        typeof paramAxisY === "string" && paramAxisY !== ""
          ? Number(paramAxisY)
          : undefined;

      setNode(
        foundNode
          ? {
              ...foundNode,
              angleX: initialAxisX ?? foundNode.angleX,
              angleY: initialAxisY ?? foundNode.angleY,
            }
          : null
      );

      setGateway(foundGateway || null);
      setAlarmLevel(buildingAlarmLevel);
    } catch (error: any) {
      console.log("angle detail error:", error?.response?.data || error);
      alert("비계전도 상세 정보를 불러오지 못했습니다.");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchDetail(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, []);

  useRealtimeRoom({
    buildingId: typeof buildingId === "string" ? buildingId : null,
    nodeType: "angle",

    onMessage: (payload: any) => {
      console.log("angle detail realtime:", payload);

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

          angleX: payload.angleX ?? prev.angleX,
          angleY: payload.angleY ?? prev.angleY,

          angle_x: payload.angleX ?? payload.angle_x ?? prev.angle_x,
          angle_y: payload.angleY ?? payload.angle_y ?? prev.angle_y,

          calibratedX: payload.angleX ?? prev.calibratedX,
          calibratedY: payload.angleY ?? prev.calibratedY,

          calibrated_x: payload.angleX ?? prev.calibrated_x,
          calibrated_y: payload.angleY ?? prev.calibrated_y,

          status: payload.status ?? prev.status,
          lastSeenAt: payload.updatedAt ?? prev.lastSeenAt,
          updatedAt: payload.updatedAt ?? prev.updatedAt,
        };
      });
    },
  });

  const axisX = Number(
    node?.angleX ??
      node?.calibratedX ??
      node?.angle_x ??
      node?.calibrated_x ??
      0
  );

  const axisY = Number(
    node?.angleY ??
      node?.calibratedY ??
      node?.angle_y ??
      node?.calibrated_y ??
      0
  );

  const isOffline = String(node?.status).toLowerCase() === "offline";
  const maxAlarm = Math.max(Math.abs(axisX), Math.abs(axisY));
  const status = getStatusInfo(maxAlarm, alarmLevel, isOffline);

  const nodeNumber = node?.number ?? "-";

  const gatewaySerial =
    gateway?.serialNumber ||
    gateway?.gatewaySerialNumber ||
    gateway?.serial_number ||
    "-";

  const location = node?.installedLocation || "위치 정보 없음";

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
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-xl font-black text-[#1E263D]">
              비계전도 상세
            </Text>

            <Text className="text-xs text-gray-500 mt-1">
              {siteName || "건물"}
            </Text>
          </View>

          {node && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/nodes/anglenode/graph",
                  params: {
                    nodeId: String(node._id),
                    doorNum: String(node.number),
                    buildingId: String(buildingId),
                    companyId:
                      typeof companyId === "string" ? companyId : "",
                    siteName:
                      typeof siteName === "string" ? siteName : "",
                  },
                } as any)
              }
              className="bg-[#1E2F5C] px-4 py-2 rounded-xl flex-row items-center"
            >
              <Ionicons name="stats-chart" size={16} color="white" />

              <Text className="text-white font-bold ml-2">
                그래프 보기
              </Text>
            </Pressable>
          )}
        </View>
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
            <View className={`h-2 ${status.color}`} />

            <View className="px-6 py-6">
              <View className="flex-row justify-between items-center mb-5">
                <View>
                  <Text className="text-gray-500 text-xs font-bold">
                    ANGLE NODE DETAIL
                  </Text>

                  <Text className="text-[#1E263D] text-2xl font-black mt-1">
                    노드 {nodeNumber}
                  </Text>
                </View>

                <View className={`${status.chip} px-4 py-2 rounded-full`}>
                  <Text className={`${status.text} text-sm font-black`}>
                    {status.label}
                  </Text>
                </View>
              </View>

              <View className="mb-3 bg-[#F6F7FA] rounded-2xl p-3">
                <Image
                  source={require("../../../assets/images/anglenode_img.png")}
                  className="w-full h-44"
                  resizeMode="contain"
                />
              </View>

              <View className="bg-[#F6F7FA] rounded-2xl px-4 py-5 mb-3">
                <Text className="text-gray-500 text-xs font-bold mb-3">
                  현재 각도
                </Text>

                <View className="flex-row gap-3">
                  <View className="flex-1 bg-white rounded-2xl px-4 py-4">
                    <Text className="text-gray-500 text-xs mb-1">
                      Axis-X
                    </Text>

                    <Text className={`${status.text} text-2xl font-black`}>
                      {axisX.toFixed(1)}
                    </Text>
                  </View>

                  <View className="flex-1 bg-white rounded-2xl px-4 py-4">
                    <Text className="text-gray-500 text-xs mb-1">
                      Axis-Y
                    </Text>

                    <Text className="text-[#1E263D] text-2xl font-black">
                      {axisY.toFixed(1)}
                    </Text>
                  </View>
                </View>
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
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color="#6B7280"
                  />

                  <Text className="text-gray-500 text-xs font-bold ml-1">
                    위치
                  </Text>
                </View>

                <Text className="text-[#1E263D] text-base font-black">
                  {location}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}