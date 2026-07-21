"use client";

import { LogIn, ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";

type LoginTerminalProps = {
  requestMagicLink: (email: string) => Promise<void>;
  authError?: string | null;
};

export function LoginTerminal({ requestMagicLink, authError }: LoginTerminalProps) {
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setConfirming(true);
  }

  async function confirmChallenge() {
    setSubmitting(true);
    setResult(null);
    try {
      await requestMagicLink(email.trim());
      setConfirming(false);
      setResult("success");
    } catch {
      setConfirming(false);
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-command-bg p-6">
      <div aria-hidden className="command-grid pointer-events-none absolute inset-0 opacity-60" />
      <div aria-hidden className="command-glow pointer-events-none absolute inset-0" />
      <form
        onSubmit={onSubmit}
        className="command-panel relative z-10 w-full max-w-xl border border-command-border bg-command-surface/90 p-6 text-command-text shadow-command sm:p-8"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-sm border border-command-cyan/50 bg-command-cyan/10 text-command-cyan shadow-[0_0_24px_rgba(77,231,255,0.16)]">
            <LogIn aria-hidden className="size-5" />
          </span>
          <div>
            <p className="font-data text-[0.65rem] uppercase tracking-[0.22em] text-command-cyan">
              Secure training access
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Become anyone you want to be — the hard way.
            </h1>
            <p className="mt-4 max-w-lg leading-7 text-command-muted">
              Build real machine learning skills through missions, evidence, feedback,
              and work worth showing.
            </p>
          </div>
        </div>

        <div className="mt-8">
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

        {result === "success" ? (
          <section className="mt-5 border border-command-success/40 bg-command-success/10 p-4" role="status">
            <p className="font-display font-semibold text-command-success">Access link transmitted</p>
            <p className="mt-1 text-sm text-command-muted">Check your inbox to continue. The link will return you to your training terminal.</p>
          </section>
        ) : null}
        {result === "error" || authError ? (
          <section className="mt-5 border border-command-danger/40 bg-command-danger/10 p-4" role="alert">
            <p className="font-display font-semibold text-command-danger">Transmission failed</p>
            <p className="mt-1 text-sm text-command-muted">The access link could not be sent. Check your email address and try again.</p>
          </section>
        ) : null}

        <Button className="mt-6 w-full" type="submit">
          Enter Training
        </Button>
      </form>

      <Dialog
        open={confirming}
        onOpenChange={(open) => { if (!submitting) setConfirming(open); }}
        title="Challenger Warning"
        description="Courage protocol · Entry path"
        closeLabel="Close challenger warning"
        className="border-command-danger/50"
        footer={(
          <>
            <Button type="button" variant="secondary" disabled={submitting} onClick={() => setConfirming(false)}>Go Back</Button>
            <Button type="button" loading={submitting} disabled={submitting} onClick={() => void confirmChallenge()}>Accept the Challenge</Button>
          </>
        )}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-command-danger">
            <span className="grid size-12 place-items-center border border-command-danger/50 bg-command-danger/10"><ShieldAlert aria-hidden className="size-6" /></span>
            <p className="font-display text-xl font-semibold">This is a road for those who choose to become stronger.</p>
          </div>
          <div className="space-y-3 border-l border-command-danger/40 pl-4 leading-7 text-command-muted">
            <p>The system will not ask you to choose a comfortable difficulty. Every mission will push you toward the hardest challenge you can realistically complete with your current ability and time.</p>
            <p>Failure will not end your training. It will become evidence for what the system assigns next.</p>
            <p className="font-medium text-command-text">Once you begin, there is no easy way back.</p>
            <p>Do you still want to continue?</p>
          </div>
        </div>
      </Dialog>
    </main>
  );
}
