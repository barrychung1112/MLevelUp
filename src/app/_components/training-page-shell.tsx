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
import { useTraining } from "@/providers/training-provider";

const ITEMS = [
  { href: "/dashboard", label: "任務終端", icon: Gauge },
  { href: "/quests", label: "每日任務", icon: ScrollText },
  { href: "/resources", label: "學習資源", icon: Library },
  { href: "/progress", label: "能力成長", icon: ChartNoAxesCombined },
  { href: "/agents", label: "Agent 狀態", icon: Bot },
  { href: "/portfolio", label: "私人作品集", icon: FolderKanban },
  { href: "/archive", label: "訓練紀錄", icon: Archive },
  { href: "/profile", label: "個人設定", icon: CircleUserRound },
];

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
        {redirectTo ? <p role="status" className="text-command-muted">正在切換訓練區域…</p> : children}
      </div>
    </AppShell>
  );
}
