"use client";

import { useRouter } from "next/navigation";

import { DashboardOverview } from "@/components/features/dashboard/dashboard";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import {
  currentLevelXp,
  formatTimestamp,
  latestBy,
  mapActivity,
  mapAgent,
  mapArtifact,
  mapFeedback,
  mapQuest,
  mapResource,
  mapSkills,
} from "../_helpers/training-view-models";

export default function DashboardPage() {
  const router = useRouter();
  const training = useTraining();
  const state = training.snapshot;
  const activeAssignments = state
    ? Object.values(state.assignments).filter((assignment) =>
        ["assigned", "in_progress", "needs_revision"].includes(assignment.status),
      )
    : [];
  const missionForScope = (scope: "main" | "daily") => {
    if (!state) return null;
    const assignment = activeAssignments.find((item) => {
      const assignmentScope = state.quests[item.questId]?.scope;
      return assignmentScope === scope || (scope === "main" && assignmentScope === "calibration");
    });
    const quest = assignment ? state.quests[assignment.questId] : undefined;
    return assignment && quest ? mapQuest(assignment, quest, state.resources) : null;
  };
  const penalties = state
    ? activeAssignments.flatMap((assignment) => {
        const quest = state.quests[assignment.questId];
        return quest?.scope === "penalty" ? [mapQuest(assignment, quest, state.resources)] : [];
      })
    : [];
  const latestFeedback = state
    ? latestBy(Object.values(state.feedback), (item) => item.createdAt)
    : null;
  const feedback = latestFeedback
    ? mapFeedback(latestFeedback)
    : {
        summary: "Complete a mission and the Coordinator will summarize your feedback here.",
        provenance: "Demo" as const,
      };
  const recentArtifact = state ? latestBy(state.artifacts, (item) => item.createdAt) : null;
  const recentActivity = state ? latestBy(state.activity, (item) => item.occurredAt) : null;

  async function handleOpenQuest(assignmentId: string) {
    const assignment = state?.assignments[assignmentId];
    if (!assignment) return;
    try {
      if (assignment.status === "assigned") await training.startQuest(assignment.id);
      router.push(`/quests/${assignment.id}`);
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
        trainingStatus={state?.profile.trainingStatus ?? "normal"}
        failureDays={state?.profile.consecutiveFailureDays ?? 0}
        recoveryDeadline={state?.profile.recoveryDeadline && state ? formatTimestamp(state.profile.recoveryDeadline, state.profile.timezone) : null}
        mainMission={missionForScope("main")}
        dailyMission={missionForScope("daily")}
        penalties={penalties}
        skills={state ? mapSkills(state) : []}
        feedback={feedback}
        resources={state ? state.resources.slice(0, 3).map(mapResource) : []}
        agents={state ? [...state.agents].sort((a, b) => b.lastRunAt.localeCompare(a.lastRunAt)).map((agent) => mapAgent(agent, state.profile.timezone)) : []}
        recentArtifact={recentArtifact ? mapArtifact(recentArtifact) : null}
        recentActivity={recentActivity && state ? mapActivity(recentActivity, state.profile.timezone) : null}
        onOpenQuest={(assignmentId) => { void handleOpenQuest(assignmentId); }}
        onContinueChallenge={() => { void training.continueChallenge(); }}
        onAbandonChallenge={() => { void training.abandonChallenge().then(() => router.replace("/onboarding")); }}
      />
    </TrainingPageShell>
  );
}
