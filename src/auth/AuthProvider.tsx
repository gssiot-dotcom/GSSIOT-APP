import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import * as authApi from "@/src/api/auth";
import { createPreviewSession } from "@/src/auth/permissions";
import { runtimeConfig } from "@/src/config/runtime";
import type { AuthContext, AuthSession, SessionState } from "@/src/types/auth";

type AuthContextValue = {
  login: (context: AuthContext, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  preview: (roleKey: string) => void;
  session: AuthSession | null;
  state: SessionState;
};

const Context = createContext<AuthContextValue | null>(null);
const contextStorageKey = "gss.mobile.auth-context.v1";

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ status: "booting" });

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(contextStorageKey);
      if (stored !== "gss-admin" && stored !== "company-user") {
        setState({ status: "anonymous" });
        return;
      }
      try {
        const session = await authApi.getCurrentSession(stored);
        setState({ session, status: "authenticated" });
      } catch {
        await AsyncStorage.removeItem(contextStorageKey);
        setState({ status: "anonymous" });
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      async login(context, email, password) {
        const session = await authApi.login(context, email.trim(), password);
        await AsyncStorage.setItem(contextStorageKey, context);
        setState({ session, status: "authenticated" });
      },
      async logout() {
        if (state.status === "authenticated" && !state.session.preview) await authApi.logout();
        await AsyncStorage.removeItem(contextStorageKey);
        setState({ status: "anonymous" });
      },
      preview(roleKey) {
        if (!runtimeConfig.demoMode) return;
        setState({ session: createPreviewSession(roleKey), status: "authenticated" });
      },
      session: state.status === "authenticated" ? state.session : null,
      state,
    }),
    [state],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
