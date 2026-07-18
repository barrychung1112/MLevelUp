import { describe, expect, it, vi } from "vitest";

import type { AiConfig } from "./config";
import type { AgentContext } from "./context";
import {
  StructuredResponseError,
  type StructuredResponseGateway,
  type StructuredResponseResult,
} from "./openai-gateway";
import { runFeedbackWorkflow } from "./run-feedback-workflow";

const config: AiConfig = {
  apiKey: "test-key",
  model: "gpt-5.6-terra",
  promptVersion: "phase3-v1",
};

const skillWeights = {
  dataHandling: 0.1,
  modeling: 0.4,
  evaluation: 0.2,
  engineering: 0.2,
  researchSense: 0,
  productThinking: 0,
  communication: 0.1,
};

const context = {
  trainingStatus: "normal",
  currentQuest: {
    id: "quest-current",
    difficulty: 3,
    skillWeights,
  },
  deterministicEvaluation: {
    qualityScore: 80,
    verificationStatus: "verified",
    verificationMethod: "mock",
    scoreBreakdown: {
      evidenceCompleteness: 35,
      evidenceValidity: 20,
      reflection: 15,
      artifactReadiness: 10,
    },
    artifactReady: true,
    hardFailures: [],
  },
  openPenaltyDebt: false,
  eligibleQuests: [{ id: "quest-next" }],
  evidence: [{ type: "githubCommit" }],
  recentOutcomes: { total: 3 },
} as unknown as AgentContext;

function successfulGateway() {
  const generate = vi.fn(async (
    request: { schemaName: string },
  ): Promise<StructuredResponseResult<unknown>> => {
    const data = {
      learning_strategy: {
        recommendedQuestId: "quest-next",
        checkpointFocus: "Run one error slice.",
        expectedEvidence: ["Error table"],
        successMeasures: ["Largest error segment recorded"],
        reasoning: "Direct error analysis targets the current weakness.",
        portfolioOutcome: "modelEvaluationReport",
        confidence: 0.8,
      },
      adjustment: {
        difficultyAction: "maintain",
        recommendedDifficulty: 3,
        granularityAction: "split",
        targetSkills: ["evaluation"],
        reasoning: "Use a shorter feedback loop.",
        riskFlags: [],
        confidence: 0.8,
      },
      coordinator_feedback: {
        summary: "The evidence is reproducible.",
        strengths: ["The metric is recorded."],
        improvements: ["Add segmented error analysis."],
        nextActions: ["Create one error slice table."],
        suggestedQualityScore: 82,
        suggestedSkillWeights: skillWeights,
        explanation: "Evaluation is the next deliberate-practice target.",
        confidence: 0.8,
      },
    } as const;
    return {
      data: data[request.schemaName as keyof typeof data],
      responseId: `response-${request.schemaName}`,
      model: config.model,
      inputTokens: 20,
      outputTokens: 10,
    };
  });
  return { gateway: { generate } as unknown as StructuredResponseGateway, generate };
}

describe("runFeedbackWorkflow", () => {
  it("runs both specialists before Coordinator and applies policy", async () => {
    const { gateway, generate } = successfulGateway();
    let time = 1_000;

    const result = await runFeedbackWorkflow({
      config,
      gateway,
      context,
      nowMs: () => (time += 25),
      traceId: "trace-success",
    });

    expect(result.source).toBe("ai");
    if (result.source !== "ai") throw new Error("expected AI result");
    expect(result.adjudication.evaluation.qualityScore).toBe(82);
    expect(result.adjudication.recommendedQuestId).toBe("quest-next");
    expect(result.diagnostics).toHaveLength(3);
    expect(generate.mock.calls.map(([call]) => call.schemaName)).toEqual([
      "learning_strategy",
      "adjustment",
      "coordinator_feedback",
    ]);
  });

  it("falls back without calling a model when configuration is missing", async () => {
    const { gateway, generate } = successfulGateway();

    const result = await runFeedbackWorkflow({
      config: null,
      gateway,
      context,
      nowMs: () => 1_000,
      traceId: "trace-missing-config",
    });

    expect(result).toMatchObject({
      source: "ai_fallback",
      errorCode: "missing_configuration",
      diagnostics: [],
      adjudication: {
        source: "ai_fallback",
        evaluation: context.deterministicEvaluation,
      },
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it("does not call Coordinator when either specialist fails", async () => {
    const { gateway, generate } = successfulGateway();
    generate.mockImplementation(async (request: { schemaName: string }) => {
      if (request.schemaName === "adjustment") {
        throw new StructuredResponseError("rate_limited", true);
      }
      return {
        data: {
          recommendedQuestId: "quest-next",
          checkpointFocus: "Run one error slice.",
          expectedEvidence: ["Error table"],
          successMeasures: ["Largest error segment recorded"],
          reasoning: "Target the weakness.",
          portfolioOutcome: null,
          confidence: 0.8,
        },
        responseId: "response-learning",
        model: config.model,
        inputTokens: 20,
        outputTokens: 10,
      };
    });

    const result = await runFeedbackWorkflow({
      config,
      gateway,
      context,
      nowMs: () => 1_000,
      traceId: "trace-failure",
    });

    expect(result.source).toBe("ai_fallback");
    expect(generate.mock.calls.map(([call]) => call.schemaName)).not.toContain(
      "coordinator_feedback",
    );
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        agentType: "adjuster",
        status: "degraded",
        errorCode: "rate_limited",
        fallbackUsed: true,
      }),
    );
  });
});
