"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export type AuthStatus = "loading" | "unavailable" | "signedOut" | "signedIn" | "error";

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  error: string | null;
  requestMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "Authentication failed";
}

function callbackUrl(): string {
  if (typeof window === "undefined") return "/auth/callback";
  return `${window.location.origin}/auth/callback`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    const nextClient = getBrowserSupabaseClient();

    if (!nextClient) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setStatus("unavailable");
        setSession(null);
        setError("Supabase setup required");
      });
      return;
    }

    clientRef.current = nextClient;

    void nextClient.auth.getSession().then(
      ({ data, error: sessionError }) => {
        if (cancelled) return;
        if (sessionError) {
          setError(sessionError.message);
          setStatus("error");
          return;
        }
        setSession(data.session);
        setError(null);
        setStatus(data.session ? "signedIn" : "signedOut");
      },
      (sessionError: unknown) => {
        if (cancelled) return;
        setError(messageFor(sessionError));
        setStatus("error");
      },
    );

    const { data } = nextClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);
      setStatus(nextSession ? "signedIn" : "signedOut");
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const requestMagicLink = useCallback(
    async (email: string) => {
      if (!clientRef.current) throw new Error("Supabase setup required");
      const { error: signInError } = await clientRef.current.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (signInError) throw signInError;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!clientRef.current) throw new Error("Supabase setup required");
    const { error: signOutError } = await clientRef.current.auth.signOut();
    if (signOutError) throw signOutError;
    setSession(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, error, requestMagicLink, signOut }),
    [error, requestMagicLink, session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
