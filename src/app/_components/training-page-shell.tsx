"use client";

import {
  Archive,
  Bot,
  ChartNoAxesCombined,
  CircleUserRound,
  FolderKanban,
  Gauge,
  Library,
  ScrollText,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { NAVIGATION_COPY } from "@/presentation/product-copy";
import { useTraining } from "@/providers/training-provider";

const ICONS = [
  Gauge,
  ScrollText,
  Library,
  ChartNoAxesCombined,
  Bot,
  FolderKanban,
  Archive,
  CircleUserRound,
] as const;

const ITEMS = NAVIGATION_COPY.map((item, index) => ({ ...item, icon: ICONS[index] }));

export function TrainingPageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { replace } = useRouter();
  const { status, snapshot, clearCommandStatus } = useTraining();
  const redirectTo = status === "ready" && snapshot
    ? pathname === "/onboarding"
      ? snapshot.profile.onboardingCompleted ? "/dashboard" : null
      : snapshot.profile.onboardingCompleted ? null : "/onboarding"
    : null;

  useEffect(() => {
    clearCommandStatus();
  }, [clearCommandStatus, pathname]);

  useEffect(() => {
    if (redirectTo) replace(redirectTo);
  }, [redirectTo, replace]);

  return (
    <AppShell items={ITEMS} currentPath={pathname}>
      <div className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {redirectTo ? <p role="status" className="text-command-muted">Entering training sector…</p> : children}
      </div>
    </AppShell>
  );
}
