import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, api, readStoredUser, setToken, setUnauthorizedHandler, writeStoredUser } from "./api";
import type { AuthUser, Role } from "./types";

/** Demo accounts used when the Spring Boot API isn't reachable. Password: `password`. */
const DEMO_ACCOUNTS: Record<string, AuthUser> = {
  admin: { username: "admin", displayName: "Ada Ironquill", role: "ADMINISTRATOR" },
  organizer: { username: "organizer", displayName: "Faris al-Rimal", role: "RACE_ORGANIZER" },
  viewer: { username: "viewer", displayName: "Tomas Reed", role: "VIEWER" },
};

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  offline: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  canManage: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setUser(readStoredUser());
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    writeStoredUser(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      writeStoredUser(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const identifier = username.trim().toLowerCase().split("@")[0] ?? "";
    try {
      const result = await api.login(username.trim(), password);
      const nextUser: AuthUser = {
        username: result.username,
        displayName: result.displayName ?? result.username,
        role: result.role,
      };
      setToken(result.token);
      writeStoredUser(nextUser);
      setUser(nextUser);
      setOffline(false);
      return nextUser;
    } catch (error) {
      const unreachable = error instanceof ApiError && error.status === 0;
      const demo = DEMO_ACCOUNTS[identifier];
      if (unreachable && demo && password.length > 0) {
        setToken(`demo.${identifier}.token`);
        writeStoredUser(demo);
        setUser(demo);
        setOffline(true);
        return demo;
      }
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      offline,
      login,
      logout,
      hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
      canManage: user?.role === "ADMINISTRATOR" || user?.role === "RACE_ORGANIZER",
      isAdmin: user?.role === "ADMINISTRATOR",
    }),
    [user, ready, offline, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export { DEMO_ACCOUNTS };