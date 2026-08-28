const demoModeValue = process.env.EXPO_PUBLIC_DEMO_MODE?.trim().toLowerCase();

export const runtimeConfig = {
  demoMode: demoModeValue !== "false",
  socketBaseUrl: (process.env.EXPO_PUBLIC_SOCKET_BASE_URL ?? process.env.EXPO_PUBLIC_SERVER_BASE_URL ?? "").replace(/\/$/, ""),
} as const;
