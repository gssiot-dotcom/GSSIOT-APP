export type AuthContext = "gss-admin" | "company-user";

export type AppUser = {
  company?: { id: string; name: string } | null;
  companyId?: string;
  email: string;
  id: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
  name: string;
  permissions: string[];
  phone: string | null;
  role: { id: string; isSuperAdmin: boolean; key: string; name: string } | null;
};

export type AuthSession = {
  context: AuthContext;
  preview?: boolean;
  user: AppUser;
};

export type SessionState =
  | { status: "booting" }
  | { status: "anonymous" }
  | { session: AuthSession; status: "authenticated" };
