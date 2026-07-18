"use client";

import { LogIn } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { isDemoMode } from "@/lib/demo-mode";

import { useAuth } from "./auth-provider";

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isDemoMode()) return children;

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await auth.requestMagicLink(email.trim());
      setMessage("登入連結已寄出，請前往信箱完成登入。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "無法寄送登入連結");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-command-bg p-6">
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="w-full max-w-md rounded border border-command-border bg-command-surface/90 p-6 text-command-text shadow-command"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded border border-command-accent/50 bg-command-accent/10 text-command-accent">
            <LogIn aria-hidden className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">進入訓練終端</h1>
            <p className="mt-2 text-sm text-command-muted">
              輸入 Email，我們會寄送一次性登入連結，開啟你的個人訓練進度。
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Field
            label="Email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>

        {message ? <p className="mt-4 text-sm text-command-success" role="status">{message}</p> : null}
        {error || auth.error ? (
          <p className="mt-4 text-sm text-command-danger" role="alert">
            {error ?? auth.error}
          </p>
        ) : null}

        <Button className="mt-6 w-full" disabled={submitting} type="submit">
          {submitting ? "寄送中…" : "寄送登入連結"}
        </Button>
      </form>
    </main>
  );
}
