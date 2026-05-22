import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import { getBuildingNodesApi } from "../../../api/nodes";
import HeaderLogo from "../../../components/common/HeaderLogo";
import { useRealtimeRoom } from "../../../hooks/useRealtime";

const COLUMN_COUNT = 3;

export default function ScaffoldNodeScreen() {
  const { siteName, buildingId, companyId } = useLocalSearchParams();

  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  const fetchNodes = async () => {
    try {
      setLoading(true);

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
      setLoading(false);
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

  const offlineCount = nodes.filter(
    (node) => String(node.status).toLowerCase() === "offline"
  ).length;

  return (
    <View className="flex-1 bg-[#EDEDED]">
      <HeaderLogo />

      <View className="bg-white px-4 py-4 border-b border-gray-300">
        <Text className="text-lg font-black text-[#1E263D]">
          해치 발판 모니터링
        </Text>

        <Text className="text-xs text-gray-500 mt-1">
          {siteName || "건물"}
        </Text>

        <View className="flex-row mt-4 gap-2">
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
                className={`flex-1 py-3 rounded-2xl border ${
                  isActive
                    ? "bg-[#29306B] border-[#29306B]"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-center text-xs font-black ${
                    isActive ? "text-white" : "text-[#29306B]"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-row mx-4 mt-4 gap-2">
        <View className="flex-1 bg-white rounded-2xl px-3 py-3 shadow-sm border border-gray-100">
          <Text className="text-gray-500 text-[10px]">전체</Text>
          <Text className="text-[#29306B] text-lg font-black">
            {nodes.length}
          </Text>
        </View>

        <View className="flex-1 bg-white rounded-2xl px-3 py-3 shadow-sm border border-gray-100">
          <Text className="text-gray-500 text-[10px]">문 열림</Text>
          <Text className="text-[#D9332A] text-lg font-black">
            {openCount}
          </Text>
        </View>

        <View className="flex-1 bg-white rounded-2xl px-3 py-3 shadow-sm border border-gray-100">
          <Text className="text-gray-500 text-[10px]">통신불가</Text>
          <Text className="text-[#6B7280] text-lg font-black">
            {offlineCount}
          </Text>
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
          className="flex-1 px-4 mt-5"
          contentContainerStyle={{ paddingBottom: 140 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: any) => {
            if ("empty" in item) {
              return <View className="w-[31.5%] mb-4" />;
            }

            const isOpen = item.doorState === 1 || item.doorState === true;

            const isOffline = String(item.status).toLowerCase() === "offline";

            const statusLabel = isOffline
              ? "통신불가"
              : isOpen
              ? "열림"
              : "닫힘";

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

            const battery = item.batteryLevel ?? 0;

            return (
              <Pressable
                className="w-[31.5%] mb-4"
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
                      location: item.installedLocation || "",
                    },
                  } as any)
                }
              >
                <View className="h-40 bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                  <View className={`h-2 ${statusColor}`} />

                  <View className="flex-1 px-3 py-3">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-[#1E263D] text-xs font-black">
                        노드 {item.number}
                      </Text>

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
                        className={`${statusColor} w-11 h-11 rounded-full items-center justify-center shadow-sm`}
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
                        color="#6B7280"
                      />

                      <Text
                        className="text-gray-500 text-[10px] ml-1 flex-1"
                        numberOfLines={1}
                      >
                        {item.installedLocation || "-"}
                      </Text>
                    </View>

                    <View className="mt-auto">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-gray-500 text-[10px]">
                          배터리
                        </Text>

                        <Text className="text-[#1E263D] text-[10px] font-black">
                          {battery}%
                        </Text>
                      </View>

                      <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
              <Text className="text-gray-500">
                등록된 해치발판 노드가 없습니다.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}