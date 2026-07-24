import { useEffect } from "react";
import { Platform } from "react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";

export function useInAppUpdate() {
  useEffect(() => {
    if (__DEV__ || Platform.OS !== "android") {
      return;
    }

    const checkUpdate = async () => {
      try {
        const result = await ExpoInAppUpdates.checkForUpdate();

        if (!result.updateAvailable) {
          return;
        }

        if (result.immediateAllowed) {
          await ExpoInAppUpdates.startUpdate(true);
        } else if (result.flexibleAllowed) {
          await ExpoInAppUpdates.startUpdate(false);
        }
      } catch (error) {
        console.warn("인앱 업데이트 확인 실패:", error);
      }
    };

    void checkUpdate();
  }, []);
}
