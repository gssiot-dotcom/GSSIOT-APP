import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { getBuildingNodesApi } from "../../../api/nodes";
import HeaderLogo from "../../../components/common/HeaderLogo";
import ImageZoomModal from "../../../components/common/ImageZoomModal";
import { useRealtimeRoom } from "../../../hooks/useRealtime";
import { getAssetUrl } from "../../../utils/getAssetUrl";

const PLAN_IMAGE_WIDTH = Dimensions.get("window").width - 84;

const getNumber = (...values: any[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
  }

  return 0;
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
      label: "통신불가",
      color: "bg-[#6B7280]",
      textColor: "text-[#6B7280]",
      chipBg: "bg-[#E5E7EB]",
    };
  }

  if (alarm >= danger) {
    return {
      label: "위험",
      color: "bg-[#B91C1C]",
      textColor: "text-[#B91C1C]",
      chipBg: "bg-[#FEE2E2]",
    };
  }

  if (alarm >= warning) {
    return {
      label: "경고",
      color: "bg-[#E7C62E]",
      textColor: "text-[#A87500]",
      chipBg: "bg-[#FFF8D8]",
    };
  }

  if (alarm >= caution) {
    return {
      label: "주의",
      color: "bg-[#63C847]",
      textColor: "text-[#2F8F24]",
      chipBg: "bg-[#ECFBE8]",
    };
  }

  return {
    label: "정상",
    color: "bg-[#1E2F5C]",
    textColor: "text-[#1E2F5C]",
    chipBg: "bg-[#EEF1FF]",
  };
};

export default function VerticalNodeDetailScreen() {
  const {
    nodeId,
    buildingId,
    companyId,
    siteName,
    x: paramX,
    y: paramY,
    buildingPlanImage,
  } = useLocalSearchParams();

  const [node, setNode] = useState<any>(null);
  const [gateway, setGateway] = useState<any>(null);
  const [alarmLevel, setAlarmLevel] = useState<any>(null);
  const [planImageUrls, setPlanImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  const fetchNode = async () => {
    try {
      setLoading(true);

      if (!buildingId || typeof buildingId !== "string") {
        setNode(null);
        return;
      }

      const imageKeys =
        typeof buildingPlanImage === "string"
          ? JSON.parse(buildingPlanImage)
          : [];

      const imageUrls = Array.isArray(imageKeys)
        ? imageKeys.map(getAssetUrl).filter(Boolean)
        : [];

      setPlanImageUrls(imageUrls);

      const result = await getBuildingNodesApi({
        companyId: typeof companyId === "string" ? companyId : undefined,
        buildingId,
        nodeType: "gangform_node",
      });

      console.log("vertical detail result:", result);

      const nodes = result.data?.nodesList || result.nodesList || [];
      const gateways = result.data?.gatewayList || result.gatewayList || [];

      const buildingAlarmLevel =
        result.data?.buildingAlarmLevel || result.buildingAlarmLevel || null;

      setAlarmLevel(buildingAlarmLevel);

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

      const initialX =
        typeof paramX === "string" && paramX !== "" ? Number(paramX) : undefined;

      const initialY =
        typeof paramY === "string" && paramY !== "" ? Number(paramY) : undefined;

      setNode({
        ...foundNode,
        angleX: initialX ?? foundNode.angleX,
        angleY: initialY ?? foundNode.angleY,
      });

      setGateway(foundGateway || null);
    } catch (error: any) {
      console.log(
        "vertical detail error:",
        error?.response?.data || error?.message
      );
      setNode(null);
      setPlanImageUrls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNode();
  }, []);

  useRealtimeRoom({
    buildingId: typeof buildingId === "string" ? buildingId : null,
    nodeType: "vertical",

    onMessage: (payload: any) => {
      console.log("vertical detail realtime:", payload);

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

          installedLocation:
            payload.installedLocation ??
            payload.position ??
            prev.installedLocation,

          position: payload.position ?? prev.position,
          floor: payload.floor ?? prev.floor,

          lastSeenAt: payload.updatedAt ?? payload.lastSeenAt ?? prev.lastSeenAt,
          updatedAt: payload.updatedAt ?? prev.updatedAt,
        };
      });
    },
  });

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

  if (!node) {
    return (
      <View className="flex-1 bg-[#EDEDED]">
        <HeaderLogo />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">노드 정보를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  const xValue = getNumber(
    node.angleX,
    node.calibratedX,
    node.calibrated_x,
    node.angle_x
  );

  const yValue = getNumber(
    node.angleY,
    node.calibratedY,
    node.calibrated_y,
    node.angle_y
  );

  const isOffline = String(node.status).toLowerCase() === "offline";
  const maxAlarm = Math.max(Math.abs(xValue), Math.abs(yValue));
  const statusInfo = getStatusInfo(maxAlarm, alarmLevel, isOffline);

  const gatewaySerial =
    gateway?.serialNumber ||
    gateway?.gatewaySerialNumber ||
    gateway?.serial_number ||
    "-";

  const nodeLocation =
    node.installedLocation && String(node.installedLocation).trim() !== ""
      ? node.installedLocation
      : node.position && String(node.position).trim() !== ""
        ? node.position
        : node.floor && String(node.floor).trim() !== ""
          ? node.floor
          : "위치 정보 없음";

  const displayNodeNumber = node.number ?? "-";

  return (
    <View className="flex-1 bg-[#EDEDED]">
      <HeaderLogo />

      <View className="bg-white px-6 py-5 border-b border-gray-300 flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-xl font-black text-[#1E263D]">
            폼 변형 감시 시스템
          </Text>

          <Text className="text-xs text-gray-500 mt-1">
            {siteName || "건물"}
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/nodes/verticalnode/graph",
              params: {
                nodeId: String(nodeId),
                nodeNumber: String(displayNodeNumber),
                buildingId: String(buildingId),
                companyId: typeof companyId === "string" ? companyId : "",
                siteName: String(siteName || ""),
              },
            } as any)
          }
          className="bg-[#1E2F5C] px-4 py-2 rounded-xl flex-row items-center"
        >
          <Ionicons name="stats-chart" size={16} color="white" />
          <Text className="text-white font-bold ml-2">그래프 보기</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-[28px] shadow-md overflow-hidden border border-gray-100">
          <View className={`h-2 ${statusInfo.color}`} />

          <View className="px-6 py-6">
            <View className="flex-row justify-between items-center mb-5">
              <View>
                <Text className="text-gray-500 text-xs font-bold">
                  VERTICAL NODE DETAIL
                </Text>

                <Text className="text-[#1E263D] text-2xl font-black mt-1">
                  노드 {displayNodeNumber}
                </Text>
              </View>

              <View className={`${statusInfo.chipBg} px-4 py-2 rounded-full`}>
                <Text className={`${statusInfo.textColor} text-sm font-black`}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            <View className="mb-3 bg-[#F6F7FA] rounded-2xl p-3 overflow-hidden">
              {planImageUrls.length > 0 ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  snapToInterval={PLAN_IMAGE_WIDTH}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                >
                  {planImageUrls.map((url, index) => (
                    <Pressable
                      key={`${url}-${index}`}
                      onPress={() => {
                        setZoomIndex(index);
                        setZoomVisible(true);
                      }}
                      style={{ width: PLAN_IMAGE_WIDTH }}
                      className="h-44 items-center justify-center"
                    >
                      <Image
                        source={{ uri: url }}
                        style={{
                          width: PLAN_IMAGE_WIDTH,
                          height: 176,
                        }}
                        resizeMode="contain"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Image
                  source={require("../../../assets/images/verticalnode_img.png")}
                  className="w-full h-44"
                  resizeMode="contain"
                />
              )}
            </View>

            <View className="bg-[#F6F7FA] rounded-2xl px-4 py-5 mb-3">
              <Text className="text-gray-500 text-xs font-bold mb-3">
                변형 상태
              </Text>

              <View className="flex-row gap-3">
                <View className="flex-1 bg-white rounded-2xl px-4 py-4 border border-gray-100">
                  <Text className="text-gray-500 text-xs font-bold">X</Text>

                  <Text
                    className={`${statusInfo.textColor} text-2xl font-black mt-2`}
                  >
                    {xValue > 0 ? `+${xValue.toFixed(1)}` : xValue.toFixed(1)}
                  </Text>
                </View>

                <View className="flex-1 bg-white rounded-2xl px-4 py-4 border border-gray-100">
                  <Text className="text-gray-500 text-xs font-bold">Y</Text>

                  <Text className="text-[#1E263D] text-2xl font-black mt-2">
                    {yValue > 0 ? `+${yValue.toFixed(1)}` : yValue.toFixed(1)}
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
                <Ionicons name="location-outline" size={15} color="#6B7280" />

                <Text className="text-gray-500 text-xs font-bold ml-1">
                  위치
                </Text>
              </View>

              <Text className="text-[#1E263D] text-base font-black">
                {nodeLocation}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <ImageZoomModal
        visible={zoomVisible}
        imageUrls={planImageUrls}
        index={zoomIndex}
        onClose={() => setZoomVisible(false)}
      />
    </View>
  );
}