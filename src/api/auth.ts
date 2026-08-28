import { clearCsrfToken, request } from "@/src/api/http";
import type { AuthContext, AuthSession } from "@/src/types/auth";

export function login(context: AuthContext, email: string, password: string) {
  clearCsrfToken();
  const path = context === "gss-admin" ? "/auth/gss/login" : "/auth/company/login";
  return request<AuthSession>(
    path,
    { body: JSON.stringify({ email, password }), method: "POST" },
    false,
  );
}

export function getCurrentSession(context: AuthContext) {
  return request<AuthSession>(
    context === "gss-admin" ? "/auth/gss/me" : "/auth/company/me",
  );
}

export async function logout() {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    clearCsrfToken();
  }
}
