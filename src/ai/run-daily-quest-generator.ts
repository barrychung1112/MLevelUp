import { validateGeneratedDailyQuest } from "@/domain/training/validate-generated-daily-quest";

import {
  GeneratedDailyQuestProposalSchema,
  type GeneratedDailyQuestProposal,
} from "./daily-quest-contracts";
import type { DailyQuestGenerationContext } from "./daily-quest-context";
import type { AgentRunDiagnostic } from "./contracts";
import type { AiConfig } from "./config";
import {
  StructuredResponseError,
  type StructuredResponseGateway,
} from "./openai-gateway";
import { dailyQuestGenerationInstructions } from "./prompts/learning-strategist";

export type DailyQuestGeneratorResult =
  | { ok: true; proposal: GeneratedDailyQuestProposal; diagnostic: AgentRunDiagnostic }
  | { ok: false; errorCode: string; diagnostic: AgentRunDiagnostic };

export interface RunDailyQuestGeneratorInput {
  config: AiConfig | null;
  gateway: StructuredResponseGateway;
  context: DailyQuestGenerationContext;
  traceId: string;
  nowMs?: () => number;
}

function summary(context: DailyQuestGenerationContext): Record<string, unknown> {
  return {
    difficultyCeiling: context.difficultyCeiling,
    weakestSkills: context.weakestSkills,
    recentDailyQuestCount: context.recentDailyQuests.length,
    availableResourceCount: context.availableResources.length,
  };
}

function errorCode(error: unknown): string {
  return error instanceof StructuredResponseError ? error.code : "agent_failed";
}

export async function runDailyQuestGenerator(
  input: RunDailyQuestGeneratorInput,
): Promise<DailyQuestGeneratorResult> {
  const nowMs = input.nowMs ?? Date.now;
  const startedAt = nowMs();
  const baseDiagnostic = {
    agentType: "learningStrategist" as const,
    promptVersion: input.config?.promptVersion ?? "unconfigured",
    traceId: input.traceId,
    inputSummary: summary(input.context),
  };
  if (!input.config) {
    return {
      ok: false,
      errorCode: "missing_configuration",
      diagnostic: {
        ...baseDiagnostic,
        status: "degraded",
        model: "unconfigured",
        latencyMs: 0,
        inputTokens: null,
        outputTokens: null,
        errorCode: "missing_configuration",
        fallbackUsed: true,
        outputSummary: { errorCode: "missing_configuration" },
      },
    };
  }
  try {
    const result = await input.gateway.generate({
      model: input.config.model,
      schemaName: "generated_daily_quest",
      schema: GeneratedDailyQuestProposalSchema,
      instructions: dailyQuestGenerationInstructions(input.config.promptVersion),
      input: input.context,
      timeoutMs: 15_000,
      maxAttempts: 1,
    });
    const validation = validateGeneratedDailyQuest({
      proposal: result.data,
      context: input.context,
    });
    if (!validation.accepted) {
      return {
        ok: false,
        errorCode: validation.code,
        diagnostic: {
          ...baseDiagnostic,
          status: "degraded",
          model: result.model,
          latencyMs: Math.max(0, nowMs() - startedAt),
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          errorCode: validation.code,
          fallbackUsed: true,
          outputSummary: { responseId: result.responseId, rejectionCode: validation.code },
        },
      };
    }
    return {
      ok: true,
      proposal: result.data,
      diagnostic: {
        ...baseDiagnostic,
        status: "completed",
        model: result.model,
        latencyMs: Math.max(0, nowMs() - startedAt),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        errorCode: null,
        fallbackUsed: false,
        outputSummary: { responseId: result.responseId, title: result.data.title },
      },
    };
  } catch (error) {
    const code = errorCode(error);
    return {
      ok: false,
      errorCode: code,
      diagnostic: {
        ...baseDiagnostic,
        status: "degraded",
        model: input.config.model,
        latencyMs: Math.max(0, nowMs() - startedAt),
        inputTokens: null,
        outputTokens: null,
        errorCode: code,
        fallbackUsed: true,
        outputSummary: { errorCode: code },
      },
    };
  }
}
