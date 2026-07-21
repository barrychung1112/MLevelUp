"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useTraining } from "@/providers/training-provider";

export function SandboxEntry() {
  const router = useRouter();
  const training = useTraining();
  const initializing = useRef(false);

  useEffect(() => {
    if (training.status !== "ready" || !training.snapshot || initializing.current) return;
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
  }, [router, training]);

  if (training.status === "error") {
    return <main role="alert" className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-danger">Unable to prepare the sandbox account.</main>;
  }

  return <main role="status" className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-muted">Preparing fake learner account...</main>;
}
