import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { getBuildingNodesApi } from "../../../api/nodes";
import HeaderLogo from "../../../components/common/HeaderLogo";
import { useRealtimeRoom } from "../../../hooks/useRealtime";

const COLUMN_COUNT = 3;

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
      bar: "bg-[#6B7280]",
      border: "border-[#9CA3AF]",
      bg: "bg-[#F3F4F6]",
      text: "text-[#6B7280]",
      chip: "bg-white/70",
    };
  }

  if (alarm >= danger) {
    return {
      label: "위험",
      bar: "bg-[#D9332A]",
      border: "border-[#D9332A]",
      bg: "bg-[#FDECEC]",
      text: "text-[#D9332A]",
      chip: "bg-white/70",
    };
  }

  if (alarm >= warning) {
    return {
      label: "경고",
      bar: "bg-[#E7C62E]",
      border: "border-[#E7C62E]",
      bg: "bg-[#FFFDEA]",
      text: "text-[#A87500]",
      chip: "bg-white/70",
    };
  }

  if (alarm >= caution) {
    return {
      label: "주의",
      bar: "bg-[#63C847]",
      border: "border-[#63C847]",
      bg: "bg-[#ECFBE8]",
      text: "text-[#2F8F24]",
      chip: "bg-white/70",
    };
  }

  return {
    label: "정상",
    bar: "bg-[#29306B]",
    border: "border-[#9CC2FF]",
    bg: "bg-[#EEF4FF]",
    text: "text-[#4F63F6]",
    chip: "bg-white/70",
  };
};

export default function AngleNodeScreen() {
  const { siteName, buildingId, companyId } = useLocalSearchParams();

  const [angleNodes, setAngleNodes] = useState<any[]>([]);
  const [alarmLevel, setAlarmLevel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedZone, setSelectedZone] = useState("전체구역");
  const [selectedNode, setSelectedNode] = useState("전체노드");

  const [zoneOpen, setZoneOpen] = useState(false);
  const [nodeOpen, setNodeOpen] = useState(false);

  const closeDropdowns = () => {
    setZoneOpen(false);
    setNodeOpen(false);
  };

  const fetchAngleNodes = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      if (!buildingId || typeof buildingId !== "string") {
        setAngleNodes([]);
        return;
      }

      const result = await getBuildingNodesApi({
        companyId: typeof companyId === "string" ? companyId : undefined,
        buildingId,
        nodeType: "angle_node",
      });

      console.log("angle nodes result:", result);

      const nodesList = result.data?.nodesList || result.nodesList || [];
      const gatewayList = result.data?.gatewayList || result.gatewayList || [];

      console.log("angle nodesList length:", nodesList.length);
      console.log("angle first node:", nodesList[0]);

      const buildingAlarmLevel =
        result.data?.buildingAlarmLevel || result.buildingAlarmLevel || null;

      setAlarmLevel(buildingAlarmLevel);

      const nodesWithGateway = nodesList.map((node: any) => {
        const nodeGatewayId =
          node.gatewayId?._id ||
          node.gatewayId ||
          node.gateway_id?._id ||
          node.gateway_id;

        const gateway = gatewayList.find(
          (gw: any) => String(gw._id || gw.id) === String(nodeGatewayId)
        );

        return {
          ...node,
          gateway,
        };
      });

      setAngleNodes(Array.isArray(nodesWithGateway) ? nodesWithGateway : []);
    } catch (error: any) {
      console.log("angle error status:", error?.response?.status);
      console.log("angle error data:", error?.response?.data);
      console.log("angle error message:", error?.message);

      setAngleNodes([]);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchAngleNodes(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAngleNodes();
  }, []);

  useRealtimeRoom({
    buildingId: typeof buildingId === "string" ? buildingId : null,
    nodeType: "angle",

    onMessage: (payload: any) => {
      console.log("angle realtime:", payload);

      setAngleNodes((prev) =>
        prev.map((node) => {
          const payloadNumber =
            payload.nodeNumber ??
            payload.number ??
            payload.node_number ??
            payload.nodeNum ??
            payload.doorNum;

          const payloadNodeId = payload.nodeId ?? payload._id;

          const isSameNode =
            String(node._id) === String(payloadNodeId) ||
            String(node.number) === String(payloadNumber);

          if (!isSameNode) return node;

          return {
            ...node,

            angleX: payload.angleX ?? node.angleX,
            angleY: payload.angleY ?? node.angleY,

            angle_x: payload.angleX ?? payload.angle_x ?? node.angle_x,
            angle_y: payload.angleY ?? payload.angle_y ?? node.angle_y,

            calibratedX: payload.angleX ?? node.calibratedX,
            calibratedY: payload.angleY ?? node.calibratedY,

            calibrated_x: payload.angleX ?? node.calibrated_x,
            calibrated_y: payload.angleY ?? node.calibrated_y,

            status: payload.status ?? node.status,
            lastSeenAt: payload.updatedAt ?? payload.lastSeenAt,
            updatedAt: payload.updatedAt ?? node.updatedAt,
          };
        })
      );
    },
  });

  const zones = [
    "전체구역",
    ...Array.from(
      new Set(
        angleNodes
          .map((node) => node.gateway?.zoneName || node.gateway?.zone_name)
          .filter(Boolean)
      )
    ),
  ];

  const nodeNumbers = [
    "전체노드",
    ...angleNodes
      .filter((node) => {
        if (selectedZone === "전체구역") return true;

        return (
          (node.gateway?.zoneName || node.gateway?.zone_name) === selectedZone
        );
      })
      .map((node) => String(node.number)),
  ];

  const filteredAngleNodes = angleNodes
    .filter((node) => {
      const zoneMatched =
        selectedZone === "전체구역" ||
        (node.gateway?.zoneName || node.gateway?.zone_name) === selectedZone;

      const nodeMatched =
        selectedNode === "전체노드" || String(node.number) === selectedNode;

      return zoneMatched && nodeMatched;
    })
    .sort((a, b) => {
      const aOffline = String(a.status).toLowerCase() === "offline";
      const bOffline = String(b.status).toLowerCase() === "offline";

      if (aOffline && !bOffline) return 1;
      if (!aOffline && bOffline) return -1;

      const aX = Number(
        a.angleX ?? a.calibratedX ?? a.calibrated_x ?? a.angle_x ?? 0
      );

      const aY = Number(
        a.angleY ?? a.calibratedY ?? a.calibrated_y ?? a.angle_y ?? 0
      );

      const bX = Number(
        b.angleX ?? b.calibratedX ?? b.calibrated_x ?? b.angle_x ?? 0
      );

      const bY = Number(
        b.angleY ?? b.calibratedY ?? b.calibrated_y ?? b.angle_y ?? 0
      );

      return (
        Math.max(Math.abs(bX), Math.abs(bY)) -
        Math.max(Math.abs(aX), Math.abs(aY))
      );
    });

  const inactiveCount = angleNodes.filter(
    (node) => String(node.status).toLowerCase() === "offline"
  ).length;

  const paddedAngleNodes = [
    ...filteredAngleNodes,
    ...Array.from(
      {
        length:
          (COLUMN_COUNT - (filteredAngleNodes.length % COLUMN_COUNT)) %
          COLUMN_COUNT,
      },
      (_, i) => ({
        _id: `empty-${i}`,
        empty: true,
      })
    ),
  ];

  return (
    <TouchableWithoutFeedback onPress={closeDropdowns}>
      <View className="flex-1 bg-[#EDEDED]">
        <HeaderLogo />

        <View className="bg-white px-4 py-4 border-b border-gray-300 z-10">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-2">
              <Text className="text-lg font-black text-[#1E263D]">
                비계전도 감시 시스템
              </Text>

              <Text className="text-xs text-gray-500 mt-1">
                {siteName || "건물"}
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setZoneOpen(!zoneOpen);
                  setNodeOpen(false);
                }}
                className="bg-[#29306B] px-3 py-2 rounded-full flex-row items-center gap-1"
              >
                <Text className="text-white text-xs font-bold">
                  {selectedZone}
                </Text>

                <Ionicons name="chevron-down" size={14} color="white" />
              </Pressable>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setNodeOpen(!nodeOpen);
                  setZoneOpen(false);
                }}
                className="bg-[#29306B] px-3 py-2 rounded-full flex-row items-center gap-1"
              >
                <Text className="text-white text-xs font-bold">
                  {selectedNode === "전체노드"
                    ? "전체노드"
                    : `노드 ${selectedNode}`}
                </Text>

                <Ionicons name="chevron-down" size={14} color="white" />
              </Pressable>
            </View>
          </View>

          <View className="flex-row mt-4 justify-between">
            {[
              {
                label: "정상",
                value: `${alarmLevel?.blue ?? "-"} 이하`,
                color: "bg-[#4F63F6]",
              },
              {
                label: "주의",
                value: `${alarmLevel?.green ?? "-"}`,
                color: "bg-[#6FE24B]",
              },
              {
                label: "경고",
                value: `${alarmLevel?.yellow ?? "-"}`,
                color: "bg-[#EFE33C]",
              },
              {
                label: "위험",
                value: `${alarmLevel?.red ?? "-"}`,
                color: "bg-[#D9332A]",
              },
              {
                label: "비활성",
                value: `${inactiveCount}`,
                color: "bg-[#9CA3AF]",
              },
            ].map((item) => (
              <View key={item.label} className="items-center">
                <View className="flex-row items-center mb-1">
                  <View className={`w-3 h-3 rounded-full ${item.color} mr-1`} />

                  <Text className="text-xs text-[#1E263D]">{item.label}</Text>
                </View>

                <View className="bg-white border border-gray-300 rounded-md px-3 py-1">
                  <Text className="text-xs text-[#1E263D]">{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {zoneOpen && (
          <View className="absolute top-[150px] right-[96px] w-36 max-h-64 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden z-50 elevation-50">
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {zones.map((zone) => (
                <Pressable
                  key={zone}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedZone(zone);
                    setSelectedNode("전체노드");
                    setZoneOpen(false);
                  }}
                  className={`px-3 py-3 ${
                    selectedZone === zone ? "bg-[#EEF1FF]" : "bg-white"
                  }`}
                >
                  <Text className="text-xs font-bold text-[#1E263D]">
                    {zone}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {nodeOpen && (
          <View className="absolute top-[150px] right-4 w-28 max-h-64 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden z-50 elevation-50">
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {nodeNumbers.map((node) => (
                <Pressable
                  key={node}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                    setNodeOpen(false);
                  }}
                  className={`px-3 py-3 ${
                    selectedNode === node ? "bg-[#EEF1FF]" : "bg-white"
                  }`}
                >
                  <Text className="text-xs font-bold text-[#1E263D]">
                    {node === "전체노드" ? node : `노드 ${node}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1E2F5C" />
          </View>
        ) : (
          <FlatList
            data={paddedAngleNodes}
            keyExtractor={(item: any) => String(item._id)}
            numColumns={COLUMN_COUNT}
            className="flex-1 px-4 mt-5"
            contentContainerStyle={{ paddingBottom: 120 }}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#1E2F5C"]}
                tintColor="#1E2F5C"
              />
            }
            renderItem={({ item }: any) => {
              if ("empty" in item) {
                return <View className="w-[31.5%] mb-4" />;
              }

              const axisX = Number(
                item.angleX ??
                  item.calibratedX ??
                  item.angle_x ??
                  item.calibrated_x ??
                  0
              );

              const axisY = Number(
                item.angleY ??
                  item.calibratedY ??
                  item.angle_y ??
                  item.calibrated_y ??
                  0
              );

              const isOffline = String(item.status).toLowerCase() === "offline";

              const maxAlarm = Math.max(Math.abs(axisX), Math.abs(axisY));
              const status = getStatusInfo(maxAlarm, alarmLevel, isOffline);

              const gatewaySerial =
                item.gateway?.serialNumber ||
                item.gateway?.gatewaySerialNumber ||
                item.gateway?.serial_number ||
                "-";

              const location =
                item.installedLocation && String(item.installedLocation).trim()
                  ? item.installedLocation
                  : "위치 정보 없음";

              return (
                <Pressable
                  className="w-[31.5%] mb-4"
                  onPress={(e) => {
                    e.stopPropagation();

                    router.push({
                      pathname: "/nodes/anglenode/detail",
                      params: {
                        nodeId: item._id,
                        doorNum: item.number,
                        axisX,
                        axisY,
                        location,
                        gatewaySerial,
                        status: isOffline ? "offline" : "online",
                        buildingId,
                        companyId,
                        siteName,
                      },
                    } as any);
                  }}
                >
                  <View
                    className={`h-42 rounded-2xl shadow-md overflow-hidden border ${status.border} ${status.bg}`}
                  >
                    <View className={`h-2 ${status.bar}`} />

                    <View className="flex-1 px-3 py-3">
                      <View className="flex-row justify-between items-start mb-2">
                        <View>
                          <Text className="text-[#1E263D] text-xs font-black">
                            노드 {item.number}
                          </Text>

                          <Text className="text-gray-500 text-[10px] font-bold mt-0.5">
                            {gatewaySerial}
                          </Text>
                        </View>

                        <View className={`${status.chip} px-2 py-1 rounded-full`}>
                          <Text
                            className={`${status.text} text-[10px] font-black`}
                          >
                            {status.label}
                          </Text>
                        </View>
                      </View>

                      <View className="bg-white/70 rounded-xl px-2 py-2 mb-2">
                        <View className="flex-row justify-between">
                          <Text className="text-gray-500 text-[11px]">
                            Axis-X
                          </Text>

                          <Text
                            className={`${status.text} text-[11px] font-black`}
                          >
                            {axisX.toFixed(1)}
                          </Text>
                        </View>

                        <View className="flex-row justify-between mt-1">
                          <Text className="text-gray-500 text-[11px]">
                            Axis-Y
                          </Text>

                          <Text className="text-[#1E263D] text-[11px] font-black">
                            {axisY.toFixed(1)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center mt-auto">
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color="#6B7280"
                        />

                        <Text
                          className="text-gray-500 text-[10px] ml-1 flex-1"
                          numberOfLines={1}
                        >
                          {location}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="items-center mt-20">
                <Text className="text-gray-500">
                  등록된 비계전도 노드가 없습니다.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}