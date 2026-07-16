"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useTraining } from "@/providers/training-provider";

export default function Page() {
  const router = useRouter();
  const { status, snapshot, loadError } = useTraining();

  useEffect(() => {
    if (status !== "ready" || !snapshot) return;
    router.replace(snapshot.profile.onboardingCompleted ? "/dashboard" : "/onboarding");
  }, [router, snapshot, status]);

  if (status === "error") return <main className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-danger" role="alert">{loadError ?? "無法載入訓練資料。"}</main>;
  return <main className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-muted" role="status">正在啟動任務終端…</main>;
}
