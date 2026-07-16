"use client";

import { ProgressReview } from "@/components/features/progress/progress-review";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { currentLevelXp, mapSkills, progressTrend } from "../_helpers/training-view-models";

export default function ProgressPage() {
  const training = useTraining();
  const state = training.snapshot;
  const skills = state ? mapSkills(state) : [];
  const weakest = [...skills].sort((a, b) => a.value - b.value)[0];
  return <TrainingPageShell><ProgressReview status={training.status === "ready" ? "ready" : training.status} errorMessage={training.loadError ?? undefined} level={state?.progress.level ?? 1} currentXp={state ? currentLevelXp(state) : 0} nextLevelXp={500} skills={skills} radarSummary={weakest ? `${weakest.label} 目前是優先補強能力。` : "完成任務後會產生能力摘要。"} trendSummary={state?.xpEvents.length ? "已依可驗證任務成果更新 XP 趨勢。" : "目前是訓練起點，完成第一項任務後會建立趨勢。"} trend={state ? progressTrend(state) : []} /></TrainingPageShell>;
}
