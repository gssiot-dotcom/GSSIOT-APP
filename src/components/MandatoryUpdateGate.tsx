import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/src/i18n";
import { colors, radius, spacing } from "@/src/theme/tokens";

type UpdateModule = typeof import("expo-in-app-updates");
type GateState =
  | { kind: "checking" }
  | { kind: "ready" }
  | { immediate: boolean; kind: "required"; retry: boolean; storeVersion?: string };

export function MandatoryUpdateGate({ children }: PropsWithChildren) {
  const { t } = useI18n();
  const [state, setState] = useState<GateState>({ kind: "checking" });
  const modulePromise = useRef<Promise<UpdateModule> | null>(null);
  const checking = useRef(false);

  const loadModule = useCallback(() => {
    modulePromise.current ??= import("expo-in-app-updates");
    return modulePromise.current;
  }, []);

  const startUpdate = useCallback(async (immediateAllowed = true) => {
    try {
      const updates = await loadModule();
      const started = await updates.startUpdate(immediateAllowed);
      if (!started) setState((current) => current.kind === "required" ? { ...current, retry: true } : current);
    } catch {
      setState((current) => current.kind === "required" ? { ...current, retry: true } : current);
    }
  }, [loadModule]);

  const checkForUpdate = useCallback(async (initial: boolean) => {
    if (__DEV__ || Platform.OS !== "android") {
      setState({ kind: "ready" });
      return;
    }
    if (checking.current) return;
    checking.current = true;
    try {
      const updates = await loadModule();
      const result = await updates.checkForUpdate();
      if (!result.updateAvailable) {
        setState({ kind: "ready" });
        return;
      }
      const immediate = result.immediateAllowed !== false;
      setState({ immediate, kind: "required", retry: false, storeVersion: result.storeVersion });
      await startUpdate(immediate);
    } catch {
      if (initial) setState({ kind: "ready" });
      else setState((current) => current.kind === "required" ? { ...current, retry: true } : current);
    } finally {
      checking.current = false;
    }
  }, [loadModule, startUpdate]);

  useEffect(() => {
    void checkForUpdate(true);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void checkForUpdate(false);
    });
    return () => subscription.remove();
  }, [checkForUpdate]);

  useEffect(() => {
    if (state.kind !== "required") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [state.kind]);

  if (state.kind === "ready") return children;

  if (state.kind === "checking") {
    return (
      <View style={styles.centered}>
        <Image resizeMode="contain" source={require("../../assets/images/Gss-logo-blue.png")} style={styles.logo} />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.message}>{t("updateChecking")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Image resizeMode="contain" source={require("../../assets/images/Gss-logo-blue.png")} style={styles.logo} />
      <View style={styles.card}>
        <Text style={styles.title}>{t("updateRequiredTitle")}</Text>
        <Text style={styles.message}>{t("updateRequiredBody")}</Text>
        {state.storeVersion ? <Text style={styles.version}>{t("storeVersion")} {state.storeVersion}</Text> : null}
        {state.retry ? <Text style={styles.error}>{t("updateFailed")}</Text> : null}
        <Pressable onPress={() => void startUpdate(state.immediate)} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>{state.retry ? t("updateRetry") : t("updateNow")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg, width: "100%" },
  centered: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.lg, justifyContent: "center", padding: spacing.lg },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, textAlign: "center" },
  logo: { height: 74, width: 190 },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  title: { color: colors.foreground, fontSize: 22, fontWeight: "900", textAlign: "center" },
  version: { color: colors.primaryDark, fontSize: 13, fontWeight: "700", textAlign: "center" },
});
