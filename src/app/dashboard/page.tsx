"use client";

import { useRouter } from "next/navigation";

import { DashboardOverview } from "@/components/features/dashboard/dashboard";
import { localDateForInstant } from "@/domain/training/calendar";
import { selectPrimaryAssignment } from "@/domain/training/selectors";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import {
  contractLabel,
  currentLevelXp,
  latestBy,
  mapActivity,
  mapAgent,
  mapArtifact,
  mapQuest,
  mapResource,
  mapSkills,
} from "../_helpers/training-view-models";

export default function DashboardPage() {
  const router = useRouter();
  const training = useTraining();
  const state = training.snapshot;
  const primary = state
    ? selectPrimaryAssignment(state, localDateForInstant(new Date().toISOString(), state.profile.timezone))
    : undefined;
  const feedback = state
    ? latestBy(Object.values(state.feedback), (item) => item.createdAt)?.summary ?? "完成今日任務後，協調員 Agent 會在這裡整理 Demo 回饋。"
    : "";
  const recentArtifact = state ? latestBy(state.artifacts, (item) => item.createdAt) : null;
  const recentActivity = state ? latestBy(state.activity, (item) => item.occurredAt) : null;

  async function handleOpenPrimaryQuest() {
    if (!primary) return;
    try {
      await training.startQuest(primary.assignment.id);
      router.push(`/quests/${primary.assignment.id}`);
    } catch {
      // The provider exposes the command error in the dashboard state.
    }
  }

  return (
    <TrainingPageShell>
      <DashboardOverview
        status={training.status === "ready" ? "ready" : training.status}
        errorMessage={training.loadError ?? undefined}
        level={state?.progress.level ?? 1}
        currentXp={state ? currentLevelXp(state) : 0}
        nextLevelXp={500}
        streakDays={state?.progress.currentStreak ?? 0}
        contractLabel={state ? contractLabel(state.profile.contract) : ""}
        primaryQuest={primary ? mapQuest(primary.assignment, primary.quest) : null}
        skills={state ? mapSkills(state) : []}
        feedback={feedback}
        resources={state ? state.resources.slice(0, 3).map(mapResource) : []}
        agents={state ? [...state.agents].sort((a, b) => b.lastRunAt.localeCompare(a.lastRunAt)).map((agent) => mapAgent(agent, state.profile.timezone)) : []}
        recentArtifact={recentArtifact ? mapArtifact(recentArtifact) : null}
        recentActivity={recentActivity && state ? mapActivity(recentActivity, state.profile.timezone) : null}
        onOpenPrimaryQuest={() => { void handleOpenPrimaryQuest(); }}
      />
    </TrainingPageShell>
  );
}
