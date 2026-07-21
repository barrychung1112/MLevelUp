"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isDemoMode } from "@/lib/demo-mode";

import { useAuth } from "./auth-provider";
import { LoginTerminal } from "./login-terminal";

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  if (isDemoMode() || pathname.startsWith("/p/")) return children;

  if (auth.status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-muted">
        <p role="status">Syncing account signal...</p>
      </main>
    );
  }

  if (auth.status === "signedIn") return children;

  if (auth.status === "unavailable") {
    return (
      <main className="grid min-h-screen place-items-center bg-command-bg p-6">
        <section
          role="alert"
          className="w-full max-w-md rounded border border-command-danger/40 bg-command-surface/90 p-6 text-command-text shadow-command"
        >
          <h1 className="font-display text-2xl font-semibold text-command-danger">
            Supabase setup required
          </h1>
          <p className="mt-3 text-sm text-command-muted">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local,
            then restart the dev server.
          </p>
        </section>
      </main>
    );
  }

  return <LoginTerminal requestMagicLink={auth.requestMagicLink} authError={auth.error} />;
}
