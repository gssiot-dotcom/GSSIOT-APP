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

const statusOptions = ["전체상태", "정상", "주의", "경고", "위험", "비활성"];

const getNumber = (...values: any[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
  }

  return 0;
};

const getNodeNumber = (node: any) =>
  node?.number ?? node?.node_number ?? node?.nodeNum ?? node?.doorNum ?? "-";

const getNodeX = (node: any) =>
  getNumber(
    node?.angleX,
    node?.calibratedX,
    node?.angle_x,
    node?.calibrated_x,
    node?.calibrated_angle_x,
    node?.x
  );

const getNodeY = (node: any) =>
  getNumber(
    node?.angleY,
    node?.calibratedY,
    node?.angle_y,
    node?.calibrated_y,
    node?.calibrated_angle_y,
    node?.y
  );

const getGateway = (node: any) =>
  node?.gateway || node?.gatewayId || node?.gateway_id || null;

const getZoneName = (node: any) =>
  getGateway(node)?.serialNumber ||
  getGateway(node)?.gatewaySerialNumber ||
  getGateway(node)?.serial_number ||
  getGateway(node)?.gateway_serial_number ||
  "구역 없음";

const getGatewaySerial = (node: any) =>
  getGateway(node)?.serialNumber ||
  getGateway(node)?.gatewaySerialNumber ||
  getGateway(node)?.serial_number ||
  getGateway(node)?.gateway_serial_number ||
  "-";

const getLocation = (node: any) => {
  const value = node?.installedLocation || node?.position || node?.floor;

  if (!value) return "위치 정보 없음";

  if (typeof value === "string") {
    return value.trim() ? value : "위치 정보 없음";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    if (value.xPercent !== undefined && value.yPercent !== undefined) {
      return `X ${Number(value.xPercent).toFixed(1)}%, Y ${Number(
        value.yPercent
      ).toFixed(1)}%`;
    }

    return "위치 정보 있음";
  }

  return String(value);
};

const getStatusInfo = (
  alarm: number,
  alarmLevel: any,
  isOffline?: boolean
) => {
  const caution = Number(alarmLevel?.green ?? 0.5);
  const warning = Number(alarmLevel?.yellow ?? 1);
  const danger = Number(alarmLevel?.red ?? 2);

  if (isOffline) {
    return {
      label: "비활성",
      bar: "bg-[#6B7280]",
      border: "border-[#9CA3AF]",
      bg: "bg-[#F3F4F6]",
      text: "text-[#6B7280]",
      chip: "bg-[#E5E7EB]",
      glow: "#6B7280",
    };
  }

  if (alarm >= danger) {
    return {
      label: "위험",
      bar: "bg-[#D9332A]",
      border: "border-[#D9332A]",
      bg: "bg-[#FDECEC]",
      text: "text-[#D9332A]",
      chip: "bg-[#FEE2E2]",
      glow: "#D9332A",
    };
  }

  if (alarm >= warning) {
    return {
      label: "경고",
      bar: "bg-[#E7C62E]",
      border: "border-[#E7C62E]",
      bg: "bg-[#FFFDEA]",
      text: "text-[#A87500]",
      chip: "bg-[#FFF8D8]",
      glow: "#E7C62E",
    };
  }

  if (alarm >= caution) {
    return {
      label: "주의",
      bar: "bg-[#63C847]",
      border: "border-[#63C847]",
      bg: "bg-[#ECFBE8]",
      text: "text-[#2F8F24]",
      chip: "bg-[#ECFBE8]",
      glow: "#63C847",
    };
  }

  return {
    label: "정상",
    bar: "bg-[#29306B]",
    border: "border-[#9CC2FF]",
    bg: "bg-[#EEF4FF]",
    text: "text-[#4F63F6]",
    chip: "bg-[#EAF1FF]",
    glow: "#4F63F6",
  };
};

const getNodeStatusLabel = (node: any, alarmLevel: any) => {
  const x = getNodeX(node);
  const y = getNodeY(node);
  const isOffline = String(node.status).toLowerCase() === "offline";
  const maxAlarm = Math.max(Math.abs(x), Math.abs(y));

  return getStatusInfo(maxAlarm, alarmLevel, isOffline).label;
};

const formatValue = (value: number) => {
  const text = value.toFixed(1).replace(".0", "");
  return value > 0 ? `+${text}` : text;
};

const getActiveDirection = (x: number, y: number) => {
  if (Math.abs(x) === 0 && Math.abs(y) === 0) {
    return "center";
  }

  if (Math.abs(x) >= Math.abs(y)) {
    if (x > 0) return "right";
    if (x < 0) return "left";
  }

  if (y > 0) return "bottom";
  if (y < 0) return "top";

  return "center";
};

export default function VerticalNodeScreen() {
  const { siteName, buildingId, companyId, buildingPlanImage } =
    useLocalSearchParams();

  const [verticalNodes, setVerticalNodes] = useState<any[]>([]);
  const [alarmLevel, setAlarmLevel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedZone, setSelectedZone] = useState("전체구역");
  const [selectedStatus, setSelectedStatus] = useState("전체상태");

  const [zoneOpen, setZoneOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const closeDropdowns = () => {
    setZoneOpen(false);
    setStatusOpen(false);
  };

  const fetchVerticalNodes = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      if (!buildingId || typeof buildingId !== "string") {
        setVerticalNodes([]);
        return;
      }

      const result = await getBuildingNodesApi({
        companyId: typeof companyId === "string" ? companyId : undefined,
        buildingId,
        nodeType: "gangform_node",
      });

      const nodesList = result.data?.nodesList || result.nodesList || [];
      const gatewayList = result.data?.gatewayList || result.gatewayList || [];

      const buildingAlarmLevel =
        result.data?.buildingAlarmLevel || result.buildingAlarmLevel || null;

      setAlarmLevel(buildingAlarmLevel);

      const nodesWithGateway = nodesList.map((node: any) => {
        const nodeGatewayId =
          node.gateway?._id ||
          node.gateway?.id ||
          node.gatewayId?._id ||
          node.gatewayId?.id ||
          node.gatewayId ||
          node.gateway_id?._id ||
          node.gateway_id?.id ||
          node.gateway_id ||
          node.gatewayObjectId ||
          node.gatewayObjectID;

        const gateway =
          node.gateway && typeof node.gateway === "object"
            ? node.gateway
            : gatewayList.find((gw: any) => {
                const gatewayId = gw._id || gw.id;

                return String(gatewayId) === String(nodeGatewayId);
              });

        return {
          ...node,
          gateway: gateway || null,
        };
      });

      setVerticalNodes(Array.isArray(nodesWithGateway) ? nodesWithGateway : []);
    } catch (error: any) {
      console.log("vertical error status:", error?.response?.status);
      console.log("vertical error data:", error?.response?.data);
      console.log("vertical error message:", error?.message);
      alert("수직노드를 불러오지 못했습니다.");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchVerticalNodes(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVerticalNodes();
  }, []);

  useRealtimeRoom({
    buildingId: typeof buildingId === "string" ? buildingId : null,
    nodeType: "vertical",

    onMessage: (payload: any) => {
      setVerticalNodes((prev) =>
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
        verticalNodes
          .map((node) => getZoneName(node))
          .filter((zone) => zone && zone !== "구역 없음")
      )
    ),
  ];

  const inactiveCount = verticalNodes.filter(
    (node) => getNodeStatusLabel(node, alarmLevel) === "비활성"
  ).length;

  const filteredNodes = verticalNodes
    .filter((node) => {
      const zone = getZoneName(node);
      const statusLabel = getNodeStatusLabel(node, alarmLevel);

      const zoneMatched = selectedZone === "전체구역" || zone === selectedZone;

      const statusMatched =
        selectedStatus === "전체상태" || statusLabel === selectedStatus;

      return zoneMatched && statusMatched;
    })
    .sort((a, b) => {
      const aOffline = String(a.status).toLowerCase() === "offline";
      const bOffline = String(b.status).toLowerCase() === "offline";

      if (aOffline && !bOffline) return 1;
      if (!aOffline && bOffline) return -1;

      const aAlarm = Math.max(Math.abs(getNodeX(a)), Math.abs(getNodeY(a)));
      const bAlarm = Math.max(Math.abs(getNodeX(b)), Math.abs(getNodeY(b)));

      return bAlarm - aAlarm;
    });

  const paddedNodes = [
    ...filteredNodes,
    ...Array.from(
      {
        length:
          (COLUMN_COUNT - (filteredNodes.length % COLUMN_COUNT)) %
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

        <View className="bg-white px-5 pt-2 pb-3 z-10 border-b border-[#EEF2F7]">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-2">
              <Text className="text-[18px] font-black text-[#111827]">
                폼 변형 감지 시스템
              </Text>

              <View className="flex-row items-center mt-1">
                <Text
                  className="text-[12px] text-[#64748B] font-semibold"
                  numberOfLines={1}
                >
                  {siteName || "건물"}
                </Text>

                <Text className="text-[12px] text-[#94A3B8] font-bold ml-2">
                  · 총 {verticalNodes.length}개
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setZoneOpen(!zoneOpen);
                  setStatusOpen(false);
                }}
                className="bg-[#EEF4FF] border border-[#DCEAFF] px-3 py-2 rounded-full flex-row items-center gap-1"
              >
                <Text className="text-[#1E2F5C] text-xs font-black">
                  {selectedZone}
                </Text>

                <Ionicons name="chevron-down" size={14} color="#1E2F5C" />
              </Pressable>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setStatusOpen(!statusOpen);
                  setZoneOpen(false);
                }}
                className="bg-[#111827] px-3 py-2 rounded-full flex-row items-center gap-1"
              >
                <Text className="text-white text-xs font-black">
                  {selectedStatus}
                </Text>

                <Ionicons name="chevron-down" size={14} color="white" />
              </Pressable>
            </View>
          </View>

          <View className="flex-row mt-3 justify-between">
            {[
              {
                label: "정상",
                value: `${alarmLevel?.green ?? 0.5} 미만`,
                color: "bg-[#3B82F6]",
                bg: "bg-[#EFF6FF]",
                text: "text-[#2563EB]",
              },
              {
                label: "주의",
                value: `${alarmLevel?.green ?? 0.5}`,
                color: "bg-[#22C55E]",
                bg: "bg-[#F0FDF4]",
                text: "text-[#15803D]",
              },
              {
                label: "경고",
                value: `${alarmLevel?.yellow ?? 1}`,
                color: "bg-[#FACC15]",
                bg: "bg-[#FEFCE8]",
                text: "text-[#A16207]",
              },
              {
                label: "위험",
                value: `${alarmLevel?.red ?? 2}`,
                color: "bg-[#EF4444]",
                bg: "bg-[#FEF2F2]",
                text: "text-[#DC2626]",
              },
              {
                label: "비활성",
                value: `${inactiveCount}개`,
                color: "bg-[#94A3B8]",
                bg: "bg-[#F1F5F9]",
                text: "text-[#64748B]",
              },
            ].map((item) => (
              <View
                key={item.label}
                className={`rounded-2xl px-2 py-2 items-center ${item.bg}`}
                style={{ width: "19%" }}
              >
                <View className="flex-row items-center mb-1">
                  <View className={`w-2 h-2 rounded-full ${item.color} mr-1`} />

                  <Text className={`text-[10px] font-black ${item.text}`}>
                    {item.label}
                  </Text>
                </View>

                <Text className={`text-[12px] font-black ${item.text}`}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {zoneOpen && (
          <View className="absolute top-[150px] right-[92px] w-36 max-h-64 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden z-50 elevation-50">
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {zones.map((zone) => (
                <Pressable
                  key={zone}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedZone(zone);
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

        {statusOpen && (
          <View className="absolute top-[150px] right-4 w-28 max-h-64 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden z-50 elevation-50">
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {statusOptions.map((status) => (
                <Pressable
                  key={status}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedStatus(status);
                    setStatusOpen(false);
                  }}
                  className={`px-3 py-3 ${
                    selectedStatus === status ? "bg-[#EEF1FF]" : "bg-white"
                  }`}
                >
                  <Text className="text-xs font-bold text-[#1E263D]">
                    {status}
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
            data={paddedNodes}
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

              const x = getNodeX(item);
              const y = getNodeY(item);
              const isOffline = String(item.status).toLowerCase() === "offline";
              const maxAlarm = Math.max(Math.abs(x), Math.abs(y));
              const style = getStatusInfo(maxAlarm, alarmLevel, isOffline);
              const activeDirection = getActiveDirection(x, y);

              const nodeNumber = getNodeNumber(item);
              const gatewaySerial = getGatewaySerial(item);
              const location = getLocation(item);

              return (
                <Pressable
                  className="w-[31.5%] mb-4"
                  onPress={(e) => {
                    e.stopPropagation();

                    router.push({
                      pathname: "/nodes/verticalnode/detail",
                      params: {
                        nodeId: item._id,
                        nodeNumber,
                        x,
                        y,
                        location,
                        gatewaySerial,
                        status: isOffline ? "offline" : "online",
                        buildingId,
                        companyId,
                        siteName,
                        buildingPlanImage:
                          typeof buildingPlanImage === "string"
                            ? buildingPlanImage
                            : "[]",
                      },
                    } as any);
                  }}
                >
                  <View
                    className={`h-42 rounded-2xl shadow-md overflow-hidden border ${style.border} ${style.bg}`}
                  >
                    <View className={`h-2 ${style.bar}`} />

                    <View className="flex-1 px-3 py-3">
                      <View className="flex-row justify-between items-center mb-2">
                        <View>
                          <Text className="text-[#1E263D] text-xs font-black">
                            노드 {nodeNumber}
                          </Text>

                          <Text className="text-gray-500 text-[10px] font-bold">
                            {gatewaySerial}
                          </Text>
                        </View>

                        <View className={`${style.chip} px-2 py-1 rounded-full`}>
                          <Text
                            className={`${style.text} text-[10px] font-black`}
                          >
                            {style.label}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row justify-between items-center mb-2">
                        <View className="w-11 h-11 items-center justify-center">
                          {[
                            { key: "top", className: "absolute top-0" },
                            { key: "left", className: "absolute left-0" },
                            { key: "right", className: "absolute right-0" },
                            { key: "bottom", className: "absolute bottom-0" },
                          ].map((dot) => {
                            const isActive = activeDirection === dot.key;

                            return (
                              <View
                                key={dot.key}
                                className={`${dot.className} w-3 h-3 rounded-full border border-gray-500 ${
                                  isActive ? "" : "bg-white"
                                }`}
                                style={
                                  isActive
                                    ? {
                                        backgroundColor: style.glow,
                                        shadowColor: style.glow,
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.7,
                                        shadowRadius: 7,
                                        elevation: 8,
                                      }
                                    : undefined
                                }
                              />
                            );
                          })}

                          <View
                            className={`w-3 h-3 rounded-full border border-gray-500 ${
                              activeDirection === "center" ? "" : "bg-white"
                            }`}
                            style={
                              activeDirection === "center"
                                ? {
                                    backgroundColor: style.glow,
                                    shadowColor: style.glow,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.7,
                                    shadowRadius: 7,
                                    elevation: 8,
                                  }
                                : undefined
                            }
                          />
                        </View>

                        <Ionicons
                          name={isOffline ? "wifi-outline" : "wifi"}
                          size={15}
                          color={isOffline ? "#9CA3AF" : "#4CAF50"}
                        />
                      </View>

                      <View className="flex-row justify-between mb-2 gap-1">
                        <View className="flex-1 bg-white/70 rounded-md px-1 py-0.5">
                          <Text className="text-[#1E263D] text-[10px] font-black text-center">
                            X: {formatValue(x)}
                          </Text>
                        </View>

                        <View className="flex-1 bg-white/70 rounded-md px-1 py-0.5">
                          <Text className="text-[#1E263D] text-[10px] font-black text-center">
                            Y: {formatValue(y)}
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
                  등록된 수직노드가 없습니다
                </Text>
              </View>
            }
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}