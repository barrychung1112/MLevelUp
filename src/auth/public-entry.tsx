"use client";

import { ArrowLeft, ArrowRight, Eye, LogIn, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { LoginTerminal } from "./login-terminal";

interface PublicEntryProps {
  requestMagicLink(email: string): Promise<void>;
  authError?: string | null;
}

export function PublicEntry({ requestMagicLink, authError }: PublicEntryProps) {
  const [signingIn, setSigningIn] = useState(false);

  if (signingIn) {
    return (
      <div className="relative min-h-screen bg-command-bg">
        <Button
          type="button"
          variant="secondary"
          className="absolute left-5 top-5 z-30"
          onClick={() => setSigningIn(false)}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to demo options
        </Button>
        <LoginTerminal requestMagicLink={requestMagicLink} authError={authError} />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-command-bg text-command-text">
      <div aria-hidden className="command-grid pointer-events-none absolute inset-0 opacity-55" />
      <div aria-hidden className="command-glow pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-20 size-96 rotate-12 border border-command-cyan/15 bg-command-cyan/[0.025] [clip-path:polygon(50%_0,100%_30%,82%_100%,18%_100%,0_30%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-command-border/70 pb-5">
          <div>
            <p className="font-data text-[0.65rem] uppercase tracking-[0.34em] text-command-cyan">MLevelUp</p>
            <p className="mt-1 text-xs text-command-muted">Machine learning field terminal</p>
          </div>
          <span className="font-data text-[0.65rem] uppercase tracking-[0.2em] text-command-success">Demo ready</span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <section>
            <p className="font-data text-xs uppercase tracking-[0.3em] text-command-danger">The hard path begins here</p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              Become the engineer your evidence can prove.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-command-muted">
              One failed mission. One focused recovery. One verified result. Follow a 90-second training run from consequence to public proof.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/demo?guided=1&restart=1" className="inline-flex min-h-12 items-center justify-center gap-3 border border-command-cyan bg-command-cyan px-5 font-display font-semibold text-command-bg shadow-[0_0_30px_rgba(77,231,255,0.2)] transition hover:bg-command-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-command-cyan">
                <Play aria-hidden className="size-4 fill-current" />
                Watch the challenge
              </Link>
              <Link href="/demo?restart=1" className="inline-flex min-h-12 items-center justify-center gap-3 border border-command-border bg-command-surface/80 px-5 font-display font-semibold text-command-text transition hover:border-command-cyan/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-command-cyan">
                <Eye aria-hidden className="size-4" />
                Enter live demo
              </Link>
            </div>
            <button type="button" onClick={() => setSigningIn(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-command-muted transition hover:text-command-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-command-cyan">
              <LogIn aria-hidden className="size-4" />
              Sign in
              <ArrowRight aria-hidden className="size-4" />
            </button>
          </section>

          <aside className="command-panel relative border border-command-border bg-command-surface/85 p-6 shadow-command sm:p-8">
            <div className="absolute -left-px -top-px h-16 w-px bg-command-danger" />
            <p className="font-data text-[0.65rem] uppercase tracking-[0.25em] text-command-danger">Judge route / 90 seconds</p>
            <ol className="mt-7 space-y-5">
              {[
                ["01", "Incomplete mission", "2 of 4 checkpoints before deadline"],
                ["02", "Consequence", "Penalty recovered with zero XP"],
                ["03", "Adjusted challenge", "A measurable daily mission"],
                ["04", "Verified growth", "Policy-gated XP and portfolio proof"],
              ].map(([number, title, detail]) => (
                <li key={number} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-command-border/65 pt-4">
                  <span className="font-data text-sm text-command-cyan">{number}</span>
                  <div><p className="font-display font-semibold">{title}</p><p className="mt-1 text-sm text-command-muted">{detail}</p></div>
                </li>
              ))}
            </ol>
            <p className="mt-7 border-l border-command-success pl-4 text-sm leading-6 text-command-muted">
              No account. No API keys. No external service calls. The same evidence chain, every time.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
