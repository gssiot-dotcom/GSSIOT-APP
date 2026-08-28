import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/src/providers/AppProviders";
import { MandatoryUpdateGate } from "@/src/components/MandatoryUpdateGate";
import { colors } from "@/src/theme/tokens";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <MandatoryUpdateGate>
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="node-detail" />
          <Stack.Screen name="node-graph" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </MandatoryUpdateGate>
    </AppProviders>
  );
}
