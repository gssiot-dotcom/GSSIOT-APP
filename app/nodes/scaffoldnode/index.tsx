import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

import { getBuildingNodesApi } from "../../../api/nodes";
import HeaderLogo from "../../../components/common/HeaderLogo";
import { useRealtimeRoom } from "../../../hooks/useRealtime";

const COLUMN_COUNT = 3;

const formatLocation = (value: any) => {
  if (!value) return "위치정보없음";

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : "위치정보없음";
  }

  if (typeof value === "object") {
    const rawX = value.xPercent ?? value.x_percent ?? value.x;
    const rawY = value.yPercent ?? value.y_percent ?? value.y;

    if (
      rawX === undefined ||
      rawX === null ||
      rawX === "" ||
      rawY === undefined ||
      rawY === null ||
      rawY === ""
    ) {
      return "위치정보없음";
    }

    const x = Number(rawX);
    const y = Number(rawY);

    if (Number.isNaN(x) || Number.isNaN(y)) {
      return "위치정보없음";
    }

    if (x === 0 && y === 0) {
      return "위치정보없음";
    }

    return `X:${x.toFixed(1)}% Y:${y.toFixed(1)}%`;
  }

  return "위치정보없음";
};

export default function ScaffoldNodeScreen() {
  const { siteName, buildingId, companyId } = useLocalSearchParams();

  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  const fetchNodes = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      if (typeof buildingId !== "string") {
        setNodes([]);
        return;
      }

      const result = await getBuildingNodesApi({
        companyId: typeof companyId === "string" ? companyId : undefined,
        buildingId,
        nodeType: "door_node",
      });

      console.log("door nodes result:", result);

      const nodesList = result.data?.nodesList || result.nodesList || [];

      setNodes(Array.isArray(nodesList) ? nodesList : []);
    } catch (error: any) {
      console.log(error?.response?.data || error);
      alert("해치발판 노드를 불러오지 못했습니다.");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNodes(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  useRealtimeRoom({
    buildingId: typeof buildingId === "string" ? buildingId : null,
    nodeType: "node",

    onMessage: (payload: any) => {
      console.log("scaffold realtime:", payload);

      setNodes((prev) =>
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
            doorState: payload.doorState ?? payload.doorChk ?? node.doorState,
            batteryLevel:
              payload.batteryLevel ?? payload.betChk ?? node.batteryLevel,
            status: payload.status ?? payload.node_status ?? node.status,
            installedLocation:
              payload.installedLocation ??
              payload.position ??
              node.installedLocation,
            lastSeenAt:
              payload.updatedAt ??
              payload.lastSeenAt ??
              payload.lastSeen ??
              node.lastSeenAt,
            updatedAt: payload.updatedAt ?? node.updatedAt,
          };
        })
      );
    },
  });

  const filteredNodes = nodes.filter((node) => {
    const isOpen = node.doorState === 1 || node.doorState === true;
    const isClosed = node.doorState === 0 || node.doorState === false;

    if (filter === "all") return true;
    if (filter === "open") return isOpen;
    if (filter === "closed") return isClosed;

    return true;
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

  const openCount = nodes.filter(
    (node) => node.doorState === 1 || node.doorState === true
  ).length;

  const closedCount = nodes.filter(
    (node) => node.doorState === 0 || node.doorState === false
  ).length;

  const offlineCount = nodes.filter(
    (node) => String(node.status).toLowerCase() === "offline"
  ).length;

  return (
    <View className="flex-1 bg-[#F6F8FB]">
      <HeaderLogo />

      <View className="bg-white px-5 pt-2 pb-3 z-10 border-b border-[#EEF2F7]">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-2">
            <Text className="text-[18px] font-black text-[#111827]">
              해치발판
            </Text>

            <Text
              className="text-[12px] text-[#64748B] font-semibold mt-1"
              numberOfLines={1}
            >
              {siteName || "건물"}
            </Text>
          </View>

          <View className="bg-[#EEF4FF] border border-[#DCEAFF] rounded-full px-3 py-2">
            <Text className="text-[#1E2F5C] text-xs font-black">
              총 {nodes.length}개
            </Text>
          </View>
        </View>

        <View className="flex-row mt-3 justify-between">
          {[
            {
              key: "all",
              label: "전체",
              value: nodes.length,
              bg: "bg-[#F0FDF4]",
              text: "text-[#15803D]",
              dot: "bg-[#22C55E]",
            },
            {
              key: "closed",
              label: "닫힘",
              value: closedCount,
              bg: "bg-[#EEF4FF]",
              text: "text-[#1E2F5C]",
              dot: "bg-[#1E2F5C]",
            },
            {
              key: "open",
              label: "열림",
              value: openCount,
              bg: "bg-[#FEF2F2]",
              text: "text-[#DC2626]",
              dot: "bg-[#EF4444]",
            },
            {
              key: "offline",
              label: "비활성",
              value: offlineCount,
              bg: "bg-[#F1F5F9]",
              text: "text-[#64748B]",
              dot: "bg-[#94A3B8]",
            },
          ].map((item) => (
            <View
              key={item.key}
              className={`rounded-[16px] px-2 py-2 items-center ${item.bg}`}
              style={{ width: "24%" }}
            >
              <View className="flex-row items-center mb-1">
                <View className={`w-2 h-2 rounded-full ${item.dot} mr-1`} />

                <Text className={`text-[10px] font-black ${item.text}`}>
                  {item.label}
                </Text>
              </View>

              <Text className={`text-[15px] font-black ${item.text}`}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row mt-3 gap-2">
          {[
            { key: "all", label: "전체 문" },
            { key: "closed", label: "닫힌 문" },
            { key: "open", label: "열린 문" },
          ].map((item) => {
            const isActive = filter === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key as typeof filter)}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}
                className={`flex-1 py-2.5 rounded-full border ${isActive
                  ? "bg-[#111827] border-[#111827]"
                  : "bg-[#F8FAFC] border-[#E2E8F0]"
                  }`}
              >
                <Text
                  className={`text-center text-xs font-black ${isActive ? "text-white" : "text-[#1E2F5C]"
                    }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E2F5C" />
        </View>
      ) : (
        <FlatList
          data={paddedNodes}
          keyExtractor={(item: any) => String(item._id)}
          numColumns={COLUMN_COUNT}
          className="flex-1 px-3 mt-4"
          contentContainerStyle={{ paddingBottom: 140 }}
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

            const isOpen = item.doorState === 1 || item.doorState === true;
            const isOffline = String(item.status).toLowerCase() === "offline";

            const statusLabel = isOffline ? "비활성" : isOpen ? "열림" : "닫힘";

            const statusColor = isOffline
              ? "bg-[#94A3B8]"
              : isOpen
                ? "bg-[#EF4444]"
                : "bg-[#1E2F5C]";

            const statusTextColor = isOffline
              ? "text-[#64748B]"
              : isOpen
                ? "text-[#DC2626]"
                : "text-[#1E2F5C]";

            const statusChipBg = isOffline
              ? "bg-[#F1F5F9]"
              : isOpen
                ? "bg-[#FEF2F2]"
                : "bg-[#EEF4FF]";

            const statusBorder = isOffline
              ? "border-[#CBD5E1]"
              : isOpen
                ? "border-[#FECACA]"
                : "border-[#DBEAFE]";

            const battery = item.batteryLevel ?? 0;
            const location = formatLocation(item.installedLocation);

            return (
              <Pressable
                className="w-[32%] mb-4"
                onPress={() =>
                  router.push({
                    pathname: "/nodes/scaffoldnode/detail",
                    params: {
                      nodeId: item._id,
                      buildingId,
                      companyId,
                      siteName,
                      doorNum: item.number,
                      status: isOpen ? "open" : "closed",
                      location,
                    },
                  } as any)
                }
              >
                <View
                  className={`h-40 bg-white rounded-[18px] overflow-hidden border ${statusBorder}`}
                  style={{
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.04,
                    shadowRadius: 12,
                    elevation: 2,
                  }}
                >
                  <View className={`h-1.5 ${statusColor}`} />

                  <View className="flex-1 px-3 py-3">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 pr-1">
                        <Text className="text-[#111827] text-[12px] font-black">
                          노드 {item.number}
                        </Text>
                      </View>

                      <View className={`${statusChipBg} px-2 py-1 rounded-full`}>
                        <Text
                          className={`${statusTextColor} text-[10px] font-black`}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    <View className="items-center justify-center my-1">
                      <View
                        className={`${statusColor} w-11 h-11 rounded-full items-center justify-center`}
                        style={{
                          shadowColor: isOpen ? "#EF4444" : "#1E2F5C",
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.18,
                          shadowRadius: 6,
                          elevation: 4,
                        }}
                      >
                        <Image
                          source={
                            isOpen
                              ? require("../../../assets/images/lock-on.png")
                              : require("../../../assets/images/lock.png")
                          }
                          style={{
                            width: 24,
                            height: 24,
                            tintColor: "white",
                          }}
                          resizeMode="contain"
                        />
                      </View>
                    </View>

                    <View className="flex-row items-center mt-1">
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#64748B"
                      />

                      <Text
                        className="text-[#64748B] text-[10px] ml-1 flex-1 font-semibold"
                        numberOfLines={1}
                      >
                        {location}
                      </Text>
                    </View>

                    <View className="mt-auto">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-[#64748B] text-[10px] font-bold">
                          배터리
                        </Text>

                        <Text className="text-[#111827] text-[10px] font-black">
                          {battery}%
                        </Text>
                      </View>

                      <View className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <View
                          className="h-full bg-[#63A0FF] rounded-full"
                          style={{ width: `${battery}%` }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-[#64748B]">
                등록된 해치발판 노드가 없습니다.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}