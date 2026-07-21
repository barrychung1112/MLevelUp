"use client";

import { LogOut, ShieldCheck } from "lucide-react";

import { exitSandboxSession } from "./sandbox-session";

export function SandboxBanner({ leave = () => window.location.assign("/") }: { leave?: () => void }) {
  function exit() {
    exitSandboxSession();
    leave();
  }

  return (
    <aside className="flex flex-wrap items-center justify-between gap-3 border border-command-warning/40 bg-command-warning/10 px-4 py-3 text-sm" aria-label="Sandbox session">
      <p className="flex items-center gap-2 text-command-warning"><ShieldCheck aria-hidden className="size-4" /><strong>Sandbox account</strong><span className="text-command-muted">Local simulated data · nothing is saved to your real account</span></p>
      <button type="button" onClick={exit} className="inline-flex min-h-11 items-center gap-2 border border-command-warning/50 px-3 font-semibold text-command-warning hover:bg-command-warning/10"><LogOut aria-hidden className="size-4" />Exit live demo</button>
    </aside>
  );
}
