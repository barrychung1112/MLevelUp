"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function exchange() {
      const client = getBrowserSupabaseClient();
      if (!client) {
        setError("Supabase setup required");
        return;
      }

      const code = new URL(window.location.href).searchParams.get("code");
      if (!code) {
        setError("Missing authentication code");
        return;
      }

      const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      router.replace("/");
    }

    void exchange();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-text">
      {error ? (
        <p className="rounded border border-command-danger/40 bg-command-surface p-4 text-command-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-command-muted" role="status">Signing you in...</p>
      )}
    </main>
  );
}
