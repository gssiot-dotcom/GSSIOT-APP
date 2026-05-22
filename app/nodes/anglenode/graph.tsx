import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

import { getNodeGraphicDataApi } from "../../../api/graph";
import HeaderLogo from "../../../components/common/HeaderLogo";
import { useRealtimeRoom } from "../../../hooks/useRealtime";

const screenWidth = Dimensions.get("window").width;

type ViewMode = "hour" | "day";

type GraphPoint = {
  time: string;
  timestamp: number;
  x: number;
  y: number;
};

type SelectedPoint = {
  time: number;
  x: number;
  y: number;
  px: number;
  py: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

const CHART_WIDTH = screenWidth - 20;
const CHART_HEIGHT = 360;
const PLOT_LEFT = 23;
const PLOT_TOP = 14;
const PLOT_WIDTH = CHART_WIDTH - 54;
const PLOT_HEIGHT = 270;
const PLOT_BOTTOM = PLOT_TOP + PLOT_HEIGHT;

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getCalendarDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);

  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const formatXAxisLabel = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatTooltipTime = (ms: number) => {
  const d = new Date(ms);

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getDynamicYRange = (data: GraphPoint[]) => {
  if (!data.length) {
    return {
      min: -5,
      max: 5,
    };
  }

  const values = data.flatMap((item) => [item.x, item.y]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue < -10 || maxValue > 10) {
    return {
      min: -15,
      max: 15,
    };
  }

  if (minValue < -5 || maxValue > 5) {
    return {
      min: -10,
      max: 10,
    };
  }

  return {
    min: -5,
    max: 5,
  };
};

const getGraphRange = (
  viewMode: ViewMode,
  hours: number,
  selectedDate: Date
) => {
  if (viewMode === "day") {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(24, 0, 0, 0);

    return {
      start: start.getTime(),
      end: end.getTime(),
    };
  }

  const now = new Date();

  if (hours === 1) {
    const roundedMinutes = Math.ceil(now.getMinutes() / 10) * 10;

    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      roundedMinutes,
      0,
      0
    );

    return {
      start: end.getTime() - 60 * 60 * 1000,
      end: end.getTime(),
    };
  }

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() + (now.getMinutes() > 0 ? 1 : 0),
    0,
    0,
    0
  );

  return {
    start: end.getTime() - hours * 60 * 60 * 1000,
    end: end.getTime(),
  };
};

const makeTimeTicks = (
  viewMode: ViewMode,
  hours: number,
  selectedDate: Date
) => {
  const { start, end } = getGraphRange(viewMode, hours, selectedDate);
  const ticks: number[] = [];

  if (viewMode === "day") {
    for (let t = start; t <= end; t += 3 * 60 * 60 * 1000) {
      ticks.push(t);
    }

    return ticks;
  }

  const step =
    hours === 1
      ? 10 * 60 * 1000
      : hours === 6
        ? 60 * 60 * 1000
        : hours === 12
          ? 2 * 60 * 60 * 1000
          : 4 * 60 * 60 * 1000;

  for (let t = start; t <= end; t += step) {
    ticks.push(t);
  }

  return ticks;
};

const getDateRange = (
  viewMode: ViewMode,
  hours: number,
  selectedDate: Date
) => {
  if (viewMode === "day") {
    const from = new Date(selectedDate);
    from.setHours(0, 0, 0, 0);

    const to = new Date(selectedDate);
    to.setHours(23, 59, 59, 999);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

const getHistoryTime = (item: any) =>
  item.createdAt ||
  item.created_at ||
  item.updatedAt ||
  item.time ||
  item.timestamp ||
  item.date;

const getHistoryX = (item: any) =>
  Number(
    item.angleX ??
      item.calibratedX ??
      item.angle_x ??
      item.calibrated_x ??
      item.calibrated_angle_x ??
      item.x ??
      0
  );

const getHistoryY = (item: any) =>
  Number(
    item.angleY ??
      item.calibratedY ??
      item.angle_y ??
      item.calibrated_y ??
      item.calibrated_angle_y ??
      item.y ??
      0
  );

export default function AngleGraphScreen() {
  const router = useRouter();

  const { nodeId, doorNum, nodeNumber, buildingId } = useLocalSearchParams();

  const currentNodeNumber =
    typeof doorNum === "string"
      ? Number(doorNum)
      : typeof nodeNumber === "string"
        ? Number(nodeNumber)
        : typeof nodeId === "string"
          ? Number(nodeId)
          : 0;

  const [viewMode, setViewMode] = useState<ViewMode>("hour");
  const [hours, setHours] = useState<1 | 6 | 12 | 24>(1);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerViewDate, setPickerViewDate] = useState(new Date());

  const [graphData, setGraphData] = useState<GraphPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const range = useMemo(
    () => getGraphRange(viewMode, hours, selectedDate),
    [viewMode, hours, selectedDate]
  );

  const timeTicks = useMemo(
    () => makeTimeTicks(viewMode, hours, selectedDate),
    [viewMode, hours, selectedDate]
  );

  const yRange = useMemo(() => getDynamicYRange(graphData), [graphData]);

  const clampY = (value: number) => {
    if (value > yRange.max) return yRange.max;
    if (value < yRange.min) return yRange.min;
    return value;
  };

  const getX = (timestamp: number) => {
    const ratio = (timestamp - range.start) / (range.end - range.start);
    return PLOT_LEFT + ratio * PLOT_WIDTH;
  };

  const getY = (value: number) => {
    const safeValue = clampY(value);
    const ratio = (yRange.max - safeValue) / (yRange.max - yRange.min);
    return PLOT_TOP + ratio * PLOT_HEIGHT;
  };

  const visibleGraphData = useMemo(
    () =>
      graphData.filter(
        (item) => item.timestamp >= range.start && item.timestamp <= range.end
      ),
    [graphData, range]
  );

  const xLinePoints = useMemo(
    () =>
      visibleGraphData
        .map((item) => `${getX(item.timestamp)},${getY(item.x)}`)
        .join(" "),
    [visibleGraphData, range, yRange]
  );

  const yLinePoints = useMemo(
    () =>
      visibleGraphData
        .map((item) => `${getX(item.timestamp)},${getY(item.y)}`)
        .join(" "),
    [visibleGraphData, range, yRange]
  );

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      setSelectedPoint(null);

      if (!currentNodeNumber) {
        setGraphData([]);
        return;
      }

      const { from, to } = getDateRange(viewMode, hours, selectedDate);

      const result = await getNodeGraphicDataApi({
        nodeNumber: currentNodeNumber,
        nodeType: "angle_node",
        from,
        to,
      });

      console.log("angle graph result:", result);

      const histories =
        result.data?.data ||
        result.data ||
        result.histories ||
        result.items ||
        result ||
        [];

      const historyList = Array.isArray(histories) ? histories : [];

      const parsed: GraphPoint[] = historyList
        .map((item: any) => {
          const rawTime = getHistoryTime(item);
          const timestamp = new Date(rawTime).getTime();

          return {
            time: rawTime,
            timestamp,
            x: getHistoryX(item),
            y: getHistoryY(item),
          };
        })
        .filter((item) => !Number.isNaN(item.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp);

      setGraphData(parsed);
    } catch (error: any) {
      console.log("angle graph error status:", error?.response?.status);
      console.log("angle graph error data:", error?.response?.data);
      console.log("angle graph error message:", error?.message);

      setGraphData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [currentNodeNumber, viewMode, hours, selectedDate]);

  useRealtimeRoom({
    buildingId: typeof buildingId === "string" ? buildingId : null,
    nodeType: "angle",

    onMessage: (payload: any) => {
      console.log("angle graph realtime:", payload);

      if (viewMode === "day") return;

      const payloadNumber =
        payload.nodeNumber ??
        payload.node_number ??
        payload.number ??
        payload.nodeNum ??
        payload.doorNum;

      if (String(payloadNumber) !== String(currentNodeNumber)) {
        return;
      }

      const pointTime =
        payload.updatedAt ||
        payload.lastSeenAt ||
        payload.lastSeen ||
        payload.createdAt ||
        new Date().toISOString();

      const newPoint: GraphPoint = {
        time: pointTime,
        timestamp: new Date(pointTime).getTime(),
        x: Number(
          payload.angleX ??
            payload.calibratedX ??
            payload.angle_x ??
            payload.calibrated_x ??
            0
        ),
        y: Number(
          payload.angleY ??
            payload.calibratedY ??
            payload.angle_y ??
            payload.calibrated_y ??
            0
        ),
      };

      setGraphData((prev) =>
        [...prev, newPoint]
          .filter((item) => item.timestamp >= range.start)
          .sort((a, b) => a.timestamp - b.timestamp)
      );
    },
  });

  const updateSelectedPoint = (locationX: number) => {
    if (!visibleGraphData.length) return;

    const touchedTime =
      range.start +
      ((locationX - PLOT_LEFT) / PLOT_WIDTH) * (range.end - range.start);

    const nearest = visibleGraphData.reduce((prev, curr) =>
      Math.abs(curr.timestamp - touchedTime) <
      Math.abs(prev.timestamp - touchedTime)
        ? curr
        : prev
    );

    setSelectedPoint({
      time: nearest.timestamp,
      x: nearest.x,
      y: nearest.y,
      px: getX(nearest.timestamp),
      py: getY(nearest.x),
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
          updateSelectedPoint(evt.nativeEvent.locationX);
        },

        onPanResponderMove: (evt) => {
          updateSelectedPoint(evt.nativeEvent.locationX);
        },

        onPanResponderRelease: () => {},

        onPanResponderTerminate: () => {},
      }),
    [visibleGraphData, range, yRange]
  );

  return (
    <View className="flex-1 bg-[#EDEDED]">
      <HeaderLogo />

      <View className="bg-white px-6 py-5 border-b border-gray-300">
        <Text className="text-xl font-black text-[#1E263D]">
          비계전도 감시 시스템
        </Text>
      </View>

      <Pressable
        className="flex-1 pt-5 pb-6"
        onPress={() => setSelectedPoint(null)}
      >
        <View className="bg-[#F6F7FA] rounded-[28px] p-5 border border-gray-200">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-[#1E263D] text-xl font-black">
              비계 전도 실시간 데이터
              <Text className="text-[#5B8FD9]">
                {" "}
                Node-{currentNodeNumber || "-"}
              </Text>
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white items-center justify-center border border-gray-200"
            >
              <Text className="text-2xl text-gray-500">×</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mb-5 flex-wrap">
            <Text className="text-base font-black text-[#1E263D] mr-3">
              조회:
            </Text>

            {[1, 6, 12, 24].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setViewMode("hour");
                  setHours(item as 1 | 6 | 12 | 24);
                  setPickerOpen(false);
                }}
                className={`border rounded-xl px-3 py-2 mr-2 mb-2 ${
                  viewMode === "hour" && hours === item
                    ? "bg-[#29306B] border-[#29306B]"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    viewMode === "hour" && hours === item
                      ? "text-white"
                      : "text-[#1E263D]"
                  }`}
                >
                  {item} 시간
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => {
                setViewMode("day");
                setPickerOpen(true);
                setPickerViewDate(selectedDate);
              }}
              className={`border rounded-xl px-3 py-2 mr-2 mb-2 ${
                viewMode === "day"
                  ? "bg-[#29306B] border-[#29306B]"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  viewMode === "day" ? "text-white" : "text-[#1E263D]"
                }`}
              >
                일
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-6 items-center">
            <View className="flex-row">
              <View className="px-5 py-2 rounded-xl mr-3 border bg-white border-[#B91C1C]">
                <Text className="font-black text-base text-[#B91C1C]">X</Text>
              </View>

              <View className="px-5 py-2 rounded-xl border bg-white border-[#2563EB]">
                <Text className="font-black text-base text-[#2563EB]">Y</Text>
              </View>
            </View>

            {viewMode === "day" && (
              <TouchableOpacity
                onPress={() => {
                  setPickerOpen(true);
                  setPickerViewDate(selectedDate);
                }}
                className="bg-white border border-gray-300 rounded-xl px-4 py-2 ml-4"
              >
                <Text className="text-sm font-bold text-[#1E263D]">
                  {formatDate(selectedDate)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View className="h-[360px] items-center justify-center">
              <ActivityIndicator size="large" color="#1E2F5C" />
            </View>
          ) : !visibleGraphData.length ? (
            <View className="h-[360px] items-center justify-center">
              <Text className="text-gray-400">그래프 데이터가 없습니다.</Text>
            </View>
          ) : (
            <View
              className="relative"
              style={{
                width: CHART_WIDTH,
                height: CHART_HEIGHT,
              }}
              {...panResponder.panHandlers}
            >
              {selectedPoint && (
                <View
                  pointerEvents="none"
                  className="absolute bg-white rounded-xl px-4 py-3 border border-gray-300 z-50"
                  style={{
                    top: Math.max(selectedPoint.py - 95, 0),
                    left: Math.min(selectedPoint.px + 10, CHART_WIDTH - 160),
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Text className="text-base font-bold text-[#1E263D] mb-3">
                    {formatTooltipTime(selectedPoint.time)}
                  </Text>

                  <Text className="text-base text-[#B91C1C] mb-2">
                    X : {Number(selectedPoint.x).toFixed(1)}
                  </Text>

                  <Text className="text-base text-[#2563EB]">
                    Y : {Number(selectedPoint.y).toFixed(1)}
                  </Text>
                </View>
              )}

              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: PLOT_LEFT,
                  top: PLOT_TOP,
                  height: PLOT_HEIGHT,
                  width: 1,
                  backgroundColor: "#6B7280",
                }}
              />

              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: PLOT_LEFT,
                  top: PLOT_BOTTOM,
                  width: PLOT_WIDTH,
                  height: 1,
                  backgroundColor: "#6B7280",
                }}
              />

              <Text
                className="absolute text-gray-500 text-sm"
                style={{ left: yRange.max >= 10 ? -4 : 0, top: PLOT_TOP - 5 }}
              >
                {yRange.max.toFixed(1)}
              </Text>

              <Text
                className="absolute text-gray-500 text-sm"
                style={{ left: 0, top: getY(0) - 9 }}
              >
                0.0
              </Text>

              <Text
                className="absolute text-gray-500 text-sm"
                style={{
                  left: yRange.min <= -10 ? -12 : -8,
                  top: PLOT_BOTTOM - 10,
                }}
              >
                {yRange.min.toFixed(1)}
              </Text>

              {timeTicks.map((tick, index) => {
                const x = getX(tick);

                return (
                  <Text
                    key={`${tick}-${index}`}
                    className="absolute text-gray-500 text-xs"
                    style={{
                      left: x - 18,
                      top: PLOT_BOTTOM + 18,
                    }}
                  >
                    {formatXAxisLabel(tick)}
                  </Text>
                );
              })}

              <Svg
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                style={{ position: "absolute", left: 0, top: 0 }}
              >
                <Polyline
                  points={xLinePoints}
                  fill="none"
                  stroke="#B91C1C"
                  strokeWidth="2.5"
                />

                <Polyline
                  points={yLinePoints}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                />

                {selectedPoint && (
                  <>
                    <Circle
                      cx={selectedPoint.px}
                      cy={getY(selectedPoint.x)}
                      r="4"
                      fill="#B91C1C"
                    />
                    <Circle
                      cx={selectedPoint.px}
                      cy={getY(selectedPoint.y)}
                      r="4"
                      fill="#2563EB"
                    />
                  </>
                )}
              </Svg>
            </View>
          )}

          <View className="flex-row justify-between mt-3 px-3">
            <Text className="text-sm font-black text-[#1E263D]">
              Y축 : 변형
            </Text>

            <Text className="text-sm font-black text-[#1E263D]">
              X축 : 시간
            </Text>
          </View>
        </View>
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-center px-6">
          <View className="bg-white rounded-2xl p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-black text-[#1E263D]">
                날짜 선택
              </Text>

              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Text className="text-2xl text-gray-500">×</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <TouchableOpacity
                onPress={() =>
                  setPickerViewDate(
                    new Date(
                      pickerViewDate.getFullYear(),
                      pickerViewDate.getMonth() - 1,
                      1
                    )
                  )
                }
              >
                <Text className="text-2xl text-gray-400">‹</Text>
              </TouchableOpacity>

              <Text className="font-black text-[#1E263D]">
                {pickerViewDate.getMonth() + 1}월{" "}
                {pickerViewDate.getFullYear()}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setPickerViewDate(
                    new Date(
                      pickerViewDate.getFullYear(),
                      pickerViewDate.getMonth() + 1,
                      1
                    )
                  )
                }
              >
                <Text className="text-2xl text-gray-400">›</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row mb-2">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <Text
                  key={day}
                  className="flex-1 text-center text-xs font-bold text-[#1E263D]"
                >
                  {day}
                </Text>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {getCalendarDays(pickerViewDate).map((date, index) => {
                const isCurrentMonth =
                  date.getMonth() === pickerViewDate.getMonth();

                const isSelected =
                  selectedDate.toDateString() === date.toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    disabled={!isCurrentMonth}
                    onPress={() => {
                      setSelectedDate(date);
                      setViewMode("day");
                      setPickerOpen(false);
                    }}
                    className="w-[14.28%] items-center py-2"
                  >
                    <View
                      className={`w-8 h-8 rounded-md items-center justify-center ${
                        isSelected ? "bg-[#2F6FA7]" : "bg-transparent"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          isSelected
                            ? "text-white font-black"
                            : !isCurrentMonth
                              ? "text-gray-300"
                              : "text-[#111827]"
                        }`}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}