import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import { api, getStoredAccessToken, setStoredAccessToken, type Member, type Permissions } from "../lib/api";

type AuthContextValue = {
  member: (Member & { permissions: Permissions }) | null;
  accessToken: string | null;
  loading: boolean;
  requestOtp: (phoneNumber: string) => Promise<string>;
  verifyOtp: (phoneNumber: string, otpCode: string) => Promise<void>;
  devLogin: (phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

  async function refreshSession() {
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

  return (
    <AuthContext.Provider
      value={{
        member,
        accessToken,
        loading,
        requestOtp,
        verifyOtp,
        devLogin,
        logout,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
