import {
  startTransition,
  useEffect,
  useState,
  type ReactNode
} from "react";

import { api, getStoredAccessToken, setStoredAccessToken, type Member, type Permissions } from "../lib/api";
import { AuthContext, type AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<(Member & { permissions: Permissions }) | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        if (accessToken) {
          const session = await api.me(accessToken);
          startTransition(() => {
            setMember(session.member);
            setAccessToken(session.accessToken);
            setStoredAccessToken(session.accessToken);
          });
        } else {
          const session = await api.refresh();
          startTransition(() => {
            setMember(session.member);
            setAccessToken(session.accessToken);
            setStoredAccessToken(session.accessToken);
          });
        }
      } catch {
        setStoredAccessToken(null);
        setMember(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function requestOtp(phoneNumber: string) {
    const response = await api.requestOtp(phoneNumber);
    return response.message;
  }

  async function verifyOtp(phoneNumber: string, otpCode: string) {
    const session = await api.verifyOtp(phoneNumber, otpCode);
    startTransition(() => {
      setMember(session.member);
      setAccessToken(session.accessToken);
      setStoredAccessToken(session.accessToken);
    });
  }

  async function devLogin(phoneNumber: string) {
    const session = await api.devLogin(phoneNumber);
    startTransition(() => {
      setMember(session.member);
      setAccessToken(session.accessToken);
      setStoredAccessToken(session.accessToken);
    });
  }

  async function refreshMember() {
    const session = await api.refresh();
    startTransition(() => {
      setMember(session.member);
      setAccessToken(session.accessToken);
      setStoredAccessToken(session.accessToken);
    });
  }

  async function logout() {
    try {
      await api.logout(accessToken);
    } finally {
      setStoredAccessToken(null);
      setMember(null);
      setAccessToken(null);
    }
  }

  const value: AuthContextValue = {
    member,
    accessToken,
    loading,
    requestOtp,
    verifyOtp,
    devLogin,
    logout,
    refreshMember
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
