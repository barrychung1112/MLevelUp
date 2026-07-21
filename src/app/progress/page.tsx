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
  return <TrainingPageShell><ProgressReview status={training.status === "ready" ? "ready" : training.status} errorMessage={training.loadError ?? undefined} level={state?.progress.level ?? 1} currentXp={state ? currentLevelXp(state) : 0} nextLevelXp={500} skills={skills} radarSummary={weakest ? `${weakest.label} is the current priority for improvement.` : "Complete a mission to generate a skill summary."} trendSummary={state?.xpEvents.length ? "XP trend updated from verified mission results." : "This is your training baseline. Complete the first mission to establish a trend."} trend={state ? progressTrend(state) : []} /></TrainingPageShell>;
}
