import type { PolicyGatedSubmissionAdjudication } from "@/application/training/submit-quest";
import { adjudicateAiFeedback, type AiPolicyResult } from "@/domain/training/ai-policy";

import { runAdjuster } from "./adjuster";
import type { AgentRunDiagnostic } from "./contracts";
import type { AiConfig } from "./config";
import type { AgentContext } from "./context";
import { runCoordinator } from "./coordinator";
import { runLearningStrategist } from "./learning-strategist";
import {
  StructuredResponseError,
  type StructuredResponseGateway,
  type StructuredResponseResult,
} from "./openai-gateway";

type Phase3AgentType = "learningStrategist" | "adjuster" | "coordinator";

export type AiWorkflowAdjudication = PolicyGatedSubmissionAdjudication &
  Partial<Pick<AiPolicyResult, "adjustment">>;

export type AiWorkflowOutcome =
  | {
      source: "ai";
      adjudication: AiWorkflowAdjudication;
      diagnostics: AgentRunDiagnostic[];
    }
  | {
      source: "ai_fallback";
      errorCode: string;
      adjudication: AiWorkflowAdjudication;
      diagnostics: AgentRunDiagnostic[];
    };

export interface RunFeedbackWorkflowInput {
  config: AiConfig | null;
  gateway: StructuredResponseGateway;
  context: AgentContext;
  nowMs?: () => number;
  traceId: string;
}

interface CapturedSuccess<T> {
  ok: true;
  result: StructuredResponseResult<T>;
  diagnostic: AgentRunDiagnostic;
}

interface CapturedFailure {
  ok: false;
  errorCode: string;
  diagnostic: AgentRunDiagnostic;
}

type Captured<T> = CapturedSuccess<T> | CapturedFailure;

function inputSummary(context: AgentContext): Record<string, unknown> {
  return {
    questId: context.currentQuest.id,
    evidenceCount: context.evidence.length,
    eligibleQuestCount: context.eligibleQuests.length,
    recentOutcomeCount: context.recentOutcomes.total,
  };
}

function sanitizedErrorCode(error: unknown): string {
  return error instanceof StructuredResponseError ? error.code : "agent_failed";
}

async function capture<T>(
  agentType: Phase3AgentType,
  input: RunFeedbackWorkflowInput,
  work: () => Promise<StructuredResponseResult<T>>,
): Promise<Captured<T>> {
  const nowMs = input.nowMs ?? Date.now;
  const startedAt = nowMs();
  try {
    const result = await work();
    return {
      ok: true,
      result,
      diagnostic: {
        agentType,
        status: "completed",
        model: result.model,
        promptVersion: input.config?.promptVersion ?? "unconfigured",
        latencyMs: Math.max(0, nowMs() - startedAt),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        errorCode: null,
        fallbackUsed: false,
        traceId: input.traceId,
        inputSummary: inputSummary(input.context),
        outputSummary: { responseId: result.responseId },
      },
    };
  } catch (error) {
    const errorCode = sanitizedErrorCode(error);
    return {
      ok: false,
      errorCode,
      diagnostic: {
        agentType,
        status: "degraded",
        model: input.config?.model ?? "unconfigured",
        promptVersion: input.config?.promptVersion ?? "unconfigured",
        latencyMs: Math.max(0, nowMs() - startedAt),
        inputTokens: null,
        outputTokens: null,
        errorCode,
        fallbackUsed: true,
        traceId: input.traceId,
        inputSummary: inputSummary(input.context),
        outputSummary: { errorCode },
      },
    };
  }
}

function fallbackAdjudication(
  context: AgentContext,
  config: AiConfig | null,
): AiWorkflowAdjudication {
  const needsRevision =
    context.deterministicEvaluation.verificationStatus !== "verified";
  return {
    source: "ai_fallback",
    evaluation: context.deterministicEvaluation,
    skillWeights: context.currentQuest.skillWeights,
    summary: needsRevision
      ? "The submitted evidence needs revision before this quest can award XP."
      : "The submission was evaluated safely, but personalized AI feedback is temporarily unavailable.",
    strengths: needsRevision ? [] : ["Required evidence passed deterministic checks."],
    improvements: needsRevision
      ? context.deterministicEvaluation.hardFailures
      : ["Retry personalized feedback later."],
    nextActions: needsRevision
      ? ["Correct the evidence and submit a new revision."]
      : ["Continue with the deterministic result."],
    explanation: "Deterministic fallback preserved the training rules.",
    model: config?.model,
    promptVersion: config?.promptVersion,
  };
}

function fallback(
  input: RunFeedbackWorkflowInput,
  errorCode: string,
  diagnostics: AgentRunDiagnostic[],
): AiWorkflowOutcome {
  return {
    source: "ai_fallback",
    errorCode,
    adjudication: fallbackAdjudication(input.context, input.config),
    diagnostics: diagnostics.map((diagnostic) => ({
      ...diagnostic,
      fallbackUsed: true,
    })),
  };
}

export async function runFeedbackWorkflow(
  input: RunFeedbackWorkflowInput,
): Promise<AiWorkflowOutcome> {
  if (!input.config) return fallback(input, "missing_configuration", []);

  const [strategy, adjustment] = await Promise.all([
    capture("learningStrategist", input, () =>
      runLearningStrategist(input.gateway, input.config!, input.context),
    ),
    capture("adjuster", input, () =>
      runAdjuster(input.gateway, input.config!, input.context),
    ),
  ]);
  const specialistDiagnostics = [strategy.diagnostic, adjustment.diagnostic];
  if (!strategy.ok) {
    return fallback(input, strategy.errorCode, specialistDiagnostics);
  }
  if (!adjustment.ok) {
    return fallback(input, adjustment.errorCode, specialistDiagnostics);
  }

  const coordinator = await capture("coordinator", input, () =>
    runCoordinator(
      input.gateway,
      input.config!,
      input.context,
      strategy.result.data,
      adjustment.result.data,
    ),
  );
  const diagnostics = [...specialistDiagnostics, coordinator.diagnostic];
  if (!coordinator.ok) {
    return fallback(input, coordinator.errorCode, diagnostics);
  }

  const policy = adjudicateAiFeedback({
    deterministicEvaluation: input.context.deterministicEvaluation,
    coordinator: coordinator.result.data,
    adjustment: adjustment.result.data,
    baselineSkillWeights: input.context.currentQuest.skillWeights,
    currentDifficulty: input.context.currentQuest.difficulty,
    trainingStatus: input.context.trainingStatus,
    hasOpenPenaltyDebt: input.context.openPenaltyDebt,
    eligibleQuestIds: input.context.eligibleQuests.map((quest) => quest.id),
    recommendedQuestId: strategy.result.data.recommendedQuestId,
  });

  return {
    source: "ai",
    adjudication: {
      ...policy,
      model: coordinator.result.model,
      promptVersion: input.config.promptVersion,
    },
    diagnostics,
  };
}
