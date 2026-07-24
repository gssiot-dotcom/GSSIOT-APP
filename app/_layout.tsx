import { Stack } from "expo-router";
import "../global.css";
import { useInAppUpdate } from "../hooks/useInAppUpdate";

export default function RootLayout() {
  useInAppUpdate();

  return <Stack screenOptions={{ headerShown: false }} />;
}
