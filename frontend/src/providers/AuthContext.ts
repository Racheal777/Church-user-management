import { createContext, useContext } from "react";
import type { Member, Permissions } from "../lib/api";

export type AuthContextValue = {
  member: (Member & { permissions: Permissions }) | null;
  accessToken: string | null;
  loading: boolean;
  requestOtp: (phoneNumber: string) => Promise<string>;
  verifyOtp: (phoneNumber: string, otpCode: string) => Promise<void>;
  devLogin: (phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMember: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
