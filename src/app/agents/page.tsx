"use client";

import { AgentStatusBoard } from "@/components/features/agents/agent-status-board";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { mapAgent } from "../_helpers/training-view-models";

export default function AgentsPage() {
  const training = useTraining();
  const state = training.snapshot;
  const agents = state ? [...state.agents].sort((a, b) => b.lastRunAt.localeCompare(a.lastRunAt)).map((agent) => mapAgent(agent, state.profile.timezone)) : [];
  return <TrainingPageShell><AgentStatusBoard agents={agents} status={training.status === "ready" ? "ready" : training.status} errorMessage={training.loadError ?? undefined} /></TrainingPageShell>;
}
