import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { api, setUnauthorizedHandler } from "./api";
import { supabase } from "./supabase";
import type { AuthUser, Role } from "./types";

/** The backend uses ORGANIZER; the UI uses RACE_ORGANIZER. */
function normalizeRole(role: string | undefined | null): Role {
  const value = (role ?? "").toUpperCase();
  if (value === "ADMINISTRATOR" || value === "ADMIN") return "ADMINISTRATOR";
  if (value === "RACE_ORGANIZER" || value === "ORGANIZER") return "RACE_ORGANIZER";
  return "VIEWER";
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  /** True when the backend profile couldn't be reached, so the role fell back to VIEWER. */
  offline: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  canManage: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Turns a Supabase session into an app user, enriching it with the backend profile. */
async function buildUser(session: Session): Promise<{ user: AuthUser; offline: boolean }> {
  const email = session.user.email ?? "";
  const metadataName =
    (session.user.user_metadata?.['full_name'] as string | undefined) ??
    (session.user.user_metadata?.['fullName'] as string | undefined);
  const fallback: AuthUser = {
    username: email,
    displayName: metadataName ?? email.split("@")[0] ?? email,
    role: "VIEWER",
  };
  try {
    const profile = await api.myProfile(session.access_token);
    return {
      user: {
        username: profile.email ?? email,
        displayName: profile.fullName ?? fallback.displayName,
        role: normalizeRole(profile.role),
      },
      offline: false,
    };
  } catch {
    return { user: fallback, offline: true };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;

    async function sync(session: Session | null) {
      if (!session) {
        if (active) {
          setUser(null);
          setOffline(false);
          setReady(true);
        }
        return;
      }
      const built = await buildUser(session);
      if (!active) return;
      setUser(built.user);
      setOffline(built.offline);
      setReady(true);
    }

    supabase.auth.getSession().then(({ data }) => sync(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      sync(session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => undefined);
    setUser(null);
    setOffline(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("Please confirm your email address before signing in.");
    const built = await buildUser(data.session);
    setUser(built.user);
    setOffline(built.offline);
    setReady(true);
    return built.user;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName },
        ...(typeof window === "undefined" ? {} : { emailRedirectTo: window.location.origin }),
      },
    });
    if (error) throw new Error(error.message);
    // Without email confirmation Supabase returns a session right away; create the profile now.
    if (data.session) {
      await api.createProfile(fullName, data.session.access_token).catch(() => undefined);
      const built = await buildUser(data.session);
      setUser(built.user);
      setOffline(built.offline);
      setReady(true);
      return { needsEmailConfirmation: false };
    }
    return { needsEmailConfirmation: true };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      offline,
      login,
      signUp,
      logout,
      hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
      canManage: user?.role === "ADMINISTRATOR" || user?.role === "RACE_ORGANIZER",
      isAdmin: user?.role === "ADMINISTRATOR",
    }),
    [user, ready, offline, login, signUp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
