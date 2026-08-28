import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "react-native-ui-datepicker";
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from "react-native-svg";

import { useAuth } from "@/src/auth/AuthProvider";
import { can, permissions } from "@/src/auth/permissions";
import { AppScreen } from "@/src/components/AppScreen";
import { StateView } from "@/src/components/StateView";
import { Surface } from "@/src/components/Surface";
import { appRepository } from "@/src/data/appRepository";
import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";
import type { CanonicalNodeType, SensorHistoryChartResponse, SensorHistoryReading } from "@/src/types/domain";

type GraphRangeMode = 1 | 6 | 12 | "date";
type LoadState = "error" | "loading" | "ready";

const graphWidth = 360;
const graphHeight = 230;
const plot = { bottom: 190, left: 43, right: 12, top: 18 };
const nodeTypeLabels = { angle_node: "nodeAngle", door_node: "nodeDoor", gangform_node: "nodeGangform" } as const;

export default function NodeGraphScreen() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const params = useLocalSearchParams<{ buildingId?: string; nodeId?: string; nodeNumber?: string; nodeType?: string }>();
  const buildingId = firstParam(params.buildingId);
  const nodeId = firstParam(params.nodeId);
  const nodeNumber = firstParam(params.nodeNumber) ?? "-";
  const nodeType = toNodeType(firstParam(params.nodeType));
  const [rangeMode, setRangeMode] = useState<GraphRangeMode>(12);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [chart, setChart] = useState<SensorHistoryChartResponse>();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const range = useMemo(() => {
    void reloadKey;
    if (rangeMode === "date") return dayRange(selectedDate);
    const to = new Date();
    const from = new Date(to.getTime() - rangeMode * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [rangeMode, reloadKey, selectedDate]);

  useEffect(() => {
    if (!session || !buildingId || !nodeId || !nodeType || !can(session, permissions.monitoringView)) return;
    let active = true;
    setLoadState("loading");
    void appRepository.getNodeHistoryChart(session, buildingId, nodeType, nodeId, range.from, range.to)
      .then((response) => {
        if (!active) return;
        setChart(response);
        setLoadState("ready");
      })
      .catch(() => { if (active) setLoadState("error"); });
    return () => { active = false; };
  }, [buildingId, nodeId, nodeType, range.from, range.to, session]);

  if (!session) return <Redirect href="/login" />;
  if (!can(session, permissions.monitoringView)) return <AppScreen showHeading={false} title={t("nodeGraph")}><StateView title={t("forbidden")} /></AppScreen>;
  if (!buildingId || !nodeId || !nodeType) return <AppScreen showHeading={false} title={t("nodeGraph")}><StateView title={t("nodeNotFound")} /></AppScreen>;

  return (
    <AppScreen showHeading={false} title={t("nodeGraph")}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}><MaterialCommunityIcons color={colors.surface} name="chart-line" size={24} /></View>
        <View style={styles.flex}><Text style={styles.eyebrow}>{t(nodeTypeLabels[nodeType])}</Text><Text style={styles.title}>{t("nodeNumber")} {nodeNumber} · {t("nodeGraph")}</Text><Text style={styles.meta}>{formatRange(range.from, range.to, locale)}</Text></View>
      </View>

      <View accessibilityLabel={t("graphPeriod")} style={styles.periodRow}>
        {([1, 6, 12] as const).map((hours) => <Pressable key={hours} onPress={() => setRangeMode(hours)} style={[styles.periodButton, rangeMode === hours && styles.periodButtonActive]}><Text style={[styles.periodText, rangeMode === hours && styles.periodTextActive]}>{t(hours === 1 ? "graph1Hour" : hours === 6 ? "graph6Hours" : "graph12Hours")}</Text></Pressable>)}
      </View>
      <Pressable onPress={() => setDatePickerOpen(true)} style={[styles.dateButton, rangeMode === "date" && styles.dateButtonActive]}><MaterialCommunityIcons color={rangeMode === "date" ? colors.surface : colors.primaryDark} name="calendar-month-outline" size={18} /><Text style={[styles.dateButtonText, rangeMode === "date" && styles.dateButtonTextActive]}>{rangeMode === "date" ? formatSelectedDate(selectedDate, locale) : t("selectGraphDate")}</Text></Pressable>

      <Modal animationType="fade" onRequestClose={() => setDatePickerOpen(false)} transparent visible={datePickerOpen}>
        <Pressable onPress={() => setDatePickerOpen(false)} style={styles.modalOverlay}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.datePickerCard}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t("selectGraphDate")}</Text><Pressable accessibilityLabel={t("back")} onPress={() => setDatePickerOpen(false)} style={styles.modalClose}><MaterialCommunityIcons color={colors.muted} name="close" size={21} /></Pressable></View>
            <View style={styles.calendarHelp}><MaterialCommunityIcons color={colors.primaryDark} name="gesture-tap-button" size={17} /><Text style={styles.calendarHelpText}>{t("calendarSelectorHelp")}</Text></View>
            <DateTimePicker components={{ IconNext: <MaterialCommunityIcons color={colors.primaryDark} name="chevron-right" size={24} />, IconPrev: <MaterialCommunityIcons color={colors.primaryDark} name="chevron-left" size={24} /> }} date={selectedDate} locale={locale} maxDate={new Date()} mode="single" onChange={({ date }) => { if (!date) return; setSelectedDate(dayjs(date).toDate()); setRangeMode("date"); setDatePickerOpen(false); }} styles={{ button_next: styles.calendarNavButton, button_prev: styles.calendarNavButton, month_selector: styles.calendarSelector, month_selector_label: styles.calendarSelectorText, year_selector: styles.calendarSelector, year_selector_label: styles.calendarSelectorText }} />
          </Pressable>
        </Pressable>
      </Modal>

      {loadState === "loading" ? <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.meta}>{t("loading")}</Text></View> : null}
      {loadState === "error" ? <Surface><StateView message={t("retryHelp")} title={t("graphLoadError")} /><Pressable onPress={() => setReloadKey((value) => value + 1)} style={styles.retry}><Text style={styles.retryText}>{t("retry")}</Text></Pressable></Surface> : null}
      {loadState === "ready" && chart ? chart.items.length ? (
        <Surface>
          {chart.sampled ? <View style={styles.sampledNotice}><MaterialCommunityIcons color={colors.primary} name="information-outline" size={17} /><Text style={styles.sampledText}>{t("graphSampled")}: {chart.returnedPointCount}/{chart.totalRawPointCount}</Text></View> : null}
          {nodeType === "door_node" ? <DoorHistoryChart items={chart.items} locale={locale} t={t} /> : <AngleHistoryChart items={chart.items} locale={locale} t={t} />}
          <LatestReading item={chart.items[chart.items.length - 1]!} locale={locale} t={t} />
        </Surface>
      ) : <Surface><StateView title={t("graphEmpty")} /></Surface> : null}
    </AppScreen>
  );
}

function AngleHistoryChart({ items, locale, t }: { items: SensorHistoryReading[]; locale: string; t: ReturnType<typeof useI18n>["t"] }) {
  const points = items.filter((item): item is SensorHistoryReading & { values: { angleX: number; angleY: number } } => "angleX" in item.values);
  const xValues = points.map((item) => item.values.angleX);
  const yValues = points.map((item) => item.values.angleY);
  const scale = chartScale([...xValues, ...yValues, 0]);
  return (
    <View>
      <Svg accessibilityLabel={t("angleGraph")} height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`} width="100%">
        <ChartGrid max={scale.max} min={scale.min} />
        <Line stroke={colors.border} strokeDasharray="4 4" x1={plot.left} x2={graphWidth - plot.right} y1={toY(0, scale)} y2={toY(0, scale)} />
        <Polyline fill="none" points={linePoints(xValues, scale)} stroke={colors.primary} strokeLinejoin="round" strokeWidth="2.5" />
        <Polyline fill="none" points={linePoints(yValues, scale)} stroke="#0F9D8A" strokeLinejoin="round" strokeWidth="2.5" />
        {xValues.map((value, index) => <Circle cx={toX(index, xValues.length)} cy={toY(value, scale)} fill={colors.primary} key={`x-${points[index]?.id}`} r="2.5" />)}
        {yValues.map((value, index) => <Circle cx={toX(index, yValues.length)} cy={toY(value, scale)} fill="#0F9D8A" key={`y-${points[index]?.id}`} r="2.5" />)}
        <TimeLabels items={points} locale={locale} />
      </Svg>
      <View style={styles.legendRow}><Legend color={colors.primary} label="X" /><Legend color="#0F9D8A" label="Y" /><Text style={styles.meta}>{t("tiltReference")}: 0°</Text></View>
    </View>
  );
}

function DoorHistoryChart({ items, locale, t }: { items: SensorHistoryReading[]; locale: string; t: ReturnType<typeof useI18n>["t"] }) {
  const points = items.filter((item): item is SensorHistoryReading & { values: { batteryLevel: number | null; doorState: "closed" | "open" } } => "doorState" in item.values);
  const hasBattery = points.some((item) => item.values.batteryLevel !== null);
  const values = points.map((item) => hasBattery ? item.values.batteryLevel ?? 0 : item.values.doorState === "open" ? 100 : 0);
  const scale = { max: 100, min: 0 };
  return (
    <View>
      <Svg accessibilityLabel={t("doorGraph")} height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`} width="100%">
        <ChartGrid max={100} min={0} />
        <Polyline fill="none" points={linePoints(values, scale)} stroke={colors.primary} strokeLinejoin="round" strokeWidth="2.5" />
        {values.map((value, index) => <Circle cx={toX(index, values.length)} cy={toY(value, scale)} fill={colors.surface} key={points[index]?.id} r="3.5" stroke={colors.primary} strokeWidth="2" />)}
        <TimeLabels items={points} locale={locale} />
      </Svg>
      <View style={styles.legendRow}><Legend color={colors.primary} label={t(hasBattery ? "batteryTrend" : "doorStateTrend")} /></View>
    </View>
  );
}

function ChartGrid({ max, min }: { max: number; min: number }) {
  return <>{[max, (max + min) / 2, min].map((tick) => { const y = toY(tick, { max, min }); return <G key={tick}><Line stroke={colors.border} strokeWidth="1" x1={plot.left} x2={graphWidth - plot.right} y1={y} y2={y} /><SvgText fill={colors.muted} fontSize="10" textAnchor="end" x={plot.left - 7} y={y + 3}>{formatTick(tick)}</SvgText></G>; })}</>;
}

function TimeLabels({ items, locale }: { items: SensorHistoryReading[]; locale: string }) {
  if (!items.length) return null;
  const indexes = [...new Set([0, Math.floor((items.length - 1) / 2), items.length - 1])];
  return <>{indexes.map((index) => <SvgText fill={colors.muted} fontSize="9" key={items[index]?.id} textAnchor={index === 0 ? "start" : index === items.length - 1 ? "end" : "middle"} x={toX(index, items.length)} y={graphHeight - 12}>{new Date(items[index]!.receivedAt).toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" })}</SvgText>)}</>;
}

function LatestReading({ item, locale, t }: { item: SensorHistoryReading; locale: string; t: ReturnType<typeof useI18n>["t"] }) {
  const value = "angleX" in item.values ? `X ${formatValue(item.values.angleX)}° · Y ${formatValue(item.values.angleY)}°` : `${item.values.doorState === "open" ? t("doorOpen") : t("doorClosed")} · ${item.values.batteryLevel ?? "-"}%`;
  return <View style={styles.latest}><View><Text style={styles.latestLabel}>{t("latestGraphValue")}</Text><Text style={styles.latestValue}>{value}</Text></View><Text style={styles.latestTime}>{new Date(item.receivedAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")}</Text></View>;
}

function Legend({ color, label }: { color: string; label: string }) { return <View style={styles.legend}><View style={[styles.legendLine, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>; }
function chartScale(values: number[]) { const rawMin = Math.min(...values); const rawMax = Math.max(...values); const padding = Math.max((rawMax - rawMin) * 0.12, 0.5); return { max: rawMax + padding, min: rawMin - padding }; }
function toX(index: number, count: number) { return plot.left + (index / Math.max(count - 1, 1)) * (graphWidth - plot.left - plot.right); }
function toY(value: number, scale: { max: number; min: number }) { return plot.bottom - ((value - scale.min) / Math.max(scale.max - scale.min, 1)) * (plot.bottom - plot.top); }
function linePoints(values: number[], scale: { max: number; min: number }) { return values.map((value, index) => `${toX(index, values.length)},${toY(value, scale)}`).join(" "); }
function formatTick(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function formatValue(value: number) { const formatted = value.toFixed(1); return `${value > 0 ? "+" : ""}${formatted}`; }
function dayRange(date: Date) { const from = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const to = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1); return { from: from.toISOString(), to: to.toISOString() }; }
function formatSelectedDate(date: Date, locale: string) { return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "long", year: "numeric" }); }
function firstParam(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function toNodeType(value: string | undefined): CanonicalNodeType | undefined { return value === "door_node" || value === "angle_node" || value === "gangform_node" ? value : undefined; }
function formatRange(from: string, to: string, locale: string) { const formatLocale = locale === "ko" ? "ko-KR" : "en-US"; return `${new Date(from).toLocaleString(formatLocale)} – ${new Date(to).toLocaleString(formatLocale)}`; }

const styles = StyleSheet.create({
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  calendarHelp: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, flexDirection: "row", gap: spacing.xs, marginBottom: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  calendarHelpText: { color: colors.primaryDark, flex: 1, fontSize: 11, fontWeight: "700" },
  calendarNavButton: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  calendarSelector: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, justifyContent: "center", minHeight: 38, paddingHorizontal: 12 },
  calendarSelectorText: { color: colors.primaryDark, fontSize: 14, fontWeight: "800" },
  dateButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.primaryDark, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.xs, paddingHorizontal: 13, paddingVertical: 9 },
  dateButtonActive: { backgroundColor: colors.primaryDark },
  dateButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
  dateButtonTextActive: { color: colors.surface },
  datePickerCard: { backgroundColor: colors.surface, borderRadius: radius.lg, maxWidth: 420, padding: spacing.md, width: "92%" },
  flex: { flex: 1 },
  heading: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  headingIcon: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, height: 48, justifyContent: "center", width: 48 },
  latest: { alignItems: "flex-end", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", padding: spacing.sm },
  latestLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  latestTime: { color: colors.muted, flexShrink: 1, fontSize: 10, textAlign: "right" },
  latestValue: { color: colors.foreground, fontSize: 17, fontWeight: "800", marginTop: 3 },
  legend: { alignItems: "center", flexDirection: "row", gap: 4 },
  legendLine: { borderRadius: radius.pill, height: 3, width: 18 },
  legendRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingHorizontal: spacing.sm },
  legendText: { color: colors.foreground, fontSize: 11, fontWeight: "700" },
  loading: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  modalClose: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  modalOverlay: { alignItems: "center", backgroundColor: "#0B172680", flex: 1, justifyContent: "center", padding: spacing.md },
  modalTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  periodButton: { alignItems: "center", borderRadius: radius.pill, flex: 1, paddingHorizontal: 5, paddingVertical: 9 },
  periodButtonActive: { backgroundColor: colors.primary },
  periodRow: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", padding: 3 },
  periodText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  periodTextActive: { color: colors.surface },
  retry: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm },
  retryText: { color: colors.primary, fontWeight: "800" },
  sampledNotice: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, flexDirection: "row", gap: spacing.xs, padding: spacing.sm },
  sampledText: { color: colors.primaryDark, fontSize: 11, fontWeight: "700" },
  title: { color: colors.foreground, fontSize: 20, fontWeight: "800" },
});
