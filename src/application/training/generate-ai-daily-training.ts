import { buildDailyQuestGenerationContext } from "@/ai/daily-quest-context";
import type { DailyQuestGeneratorResult } from "@/ai/run-daily-quest-generator";
import type { AgentRunDiagnostic } from "@/ai/contracts";
import type { Difficulty, Quest, QuestAssignment, TrainingState } from "@/domain/training/types";

import { generateDailyTraining, type DailyGenerationReason } from "./generate-daily-training";

const BASE_XP: Record<Difficulty, number> = { 1: 20, 2: 30, 3: 45, 4: 65, 5: 90 };

export interface GenerateAiDailyTrainingInput {
  state: TrainingState;
  now: string;
  localDate: string;
  nextId: () => string;
  generator: (context: ReturnType<typeof buildDailyQuestGenerationContext>) => Promise<DailyQuestGeneratorResult>;
}

export interface AiDailyGenerationOutcome {
  state: TrainingState;
  source: "ai_generated" | "catalog_fallback" | "none";
  reason: DailyGenerationReason;
  createdQuest?: Quest;
  createdAssignment?: QuestAssignment;
  diagnostic?: AgentRunDiagnostic;
  fallbackReason?: string;
}

function blockedReason(state: TrainingState, localDate: string): DailyGenerationReason | null {
  const assignments = Object.values(state.assignments);
  if (assignments.some((assignment) =>
    assignment.assignedDate === localDate && state.quests[assignment.questId]?.scope === "daily",
  )) return "already_assigned";
  return null;
}

export async function generateAiDailyTraining(
  input: GenerateAiDailyTrainingInput,
): Promise<AiDailyGenerationOutcome> {
  const blocked = blockedReason(input.state, input.localDate);
  if (blocked) return { state: structuredClone(input.state), source: "none", reason: blocked };

  const generated = await input.generator(buildDailyQuestGenerationContext(input.state));
  if (!generated.ok) {
    const fallback = generateDailyTraining(input);
    return {
      ...fallback,
      source: fallback.createdAssignment ? "catalog_fallback" : "none",
      diagnostic: generated.diagnostic,
      fallbackReason: generated.errorCode,
    };
  }

  const state = structuredClone(input.state);
  const questId = input.nextId();
  const assignmentId = input.nextId();
  const proposal = generated.proposal;
  const quest: Quest = {
    id: questId,
    trainingContract: state.profile.contract,
    purpose: "training",
    title: proposal.title,
    summary: proposal.summary,
    instructions: proposal.instructions,
    questType: proposal.questType,
    difficulty: proposal.difficulty,
    estimatedMinutes: proposal.estimatedMinutes,
    baseXp: BASE_XP[proposal.difficulty],
    optional: false,
    acceptanceCriteria: proposal.acceptanceCriteria,
    evidenceRequirements: proposal.evidenceRequirements,
    reflectionMinChars: proposal.difficulty >= 4 ? 80 : 40,
    skillWeights: proposal.skillWeights,
    expectedArtifactType: proposal.expectedArtifactType,
    resourceIds: proposal.resourceIds,
    scope: "daily",
    durationDays: 1,
    executionSteps: proposal.executionSteps,
    successMetrics: proposal.successMetrics,
    outOfScope: proposal.outOfScope,
  };
  const assignment: QuestAssignment = {
    id: assignmentId,
    questId,
    assignedDate: input.localDate,
    slot: "secondary",
    status: "assigned",
    assignedAt: input.now,
    dueAt: new Date(new Date(input.now).getTime() + 24 * 60 * 60 * 1_000).toISOString(),
  };
  state.quests[quest.id] = quest;
  state.assignments[assignment.id] = assignment;
  return {
    state,
    source: "ai_generated",
    reason: "assigned",
    createdQuest: quest,
    createdAssignment: assignment,
    diagnostic: generated.diagnostic,
  };
}
