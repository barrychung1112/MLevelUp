"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useTraining } from "@/providers/training-provider";

import { exitSandboxSession } from "./sandbox-session";

export function SandboxEntry() {
  const router = useRouter();
  const training = useTraining();
  const initializing = useRef(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!accepted || training.status !== "ready" || !training.snapshot || initializing.current) return;
    initializing.current = true;

    void (async () => {
      if (!training.snapshot?.profile.onboardingCompleted) {
        await training.completeOnboarding({
          displayName: "Alex Pathfinder",
          targetRole: "machine-learning-engineer",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        });
      }
      await training.acceptChallenge();
      router.replace("/dashboard");
    })();
  }, [accepted, router, training]);

  function goBack() {
    exitSandboxSession(window.sessionStorage);
    router.replace("/");
  }

  if (training.status === "error") {
    return <main role="alert" className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-danger">Unable to prepare the sandbox account.</main>;
  }

  if (accepted) {
    return <main role="status" className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-muted">Signing in as Alex Pathfinder...</main>;
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-command-bg p-6 text-command-text">
      <div aria-hidden className="command-grid pointer-events-none absolute inset-0 opacity-60" />
      <div aria-hidden className="command-glow pointer-events-none absolute inset-0" />
      <Dialog
        open
        onOpenChange={(open) => { if (!open) goBack(); }}
        title="Sandbox Challenger Warning"
        description="Simulated access · No account or email required"
        closeLabel="Close sandbox warning"
        className="border-command-danger/50"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={goBack}>Go back</Button>
            <Button type="button" onClick={() => setAccepted(true)}>Accept and enter sandbox</Button>
          </>
        )}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-command-danger">
            <span className="grid size-12 shrink-0 place-items-center border border-command-danger/50 bg-command-danger/10">
              <ShieldAlert aria-hidden className="size-6" />
            </span>
            <p className="font-display text-xl font-semibold">You are about to enter a simulated learner account.</p>
          </div>
          <div className="space-y-3 border-l border-command-danger/40 pl-4 leading-7 text-command-muted">
            <p>The demo will sign you in as Alex Pathfinder and load a fixed training history, active mission, feedback, and portfolio proof.</p>
            <p>Everything stays in this browser. No email is sent, no real account is created, and no external service is required.</p>
            <p className="font-medium text-command-text">The challenge rules remain active inside the sandbox.</p>
            <p>Do you still want to continue?</p>
          </div>
        </div>
      </Dialog>
    </main>
  );
}
