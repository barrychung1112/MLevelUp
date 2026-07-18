import { describe, expect, it, vi } from "vitest";

import type { AiConfig } from "./config";
import type { AgentContext } from "./context";
import type { StructuredResponseGateway } from "./openai-gateway";
import { runAdjuster } from "./adjuster";
import { runCoordinator } from "./coordinator";
import { runLearningStrategist } from "./learning-strategist";

const config: AiConfig = {
  apiKey: "test-key",
  model: "gpt-5.6-terra",
  promptVersion: "phase3-v1",
};

const context = {
  currentQuest: { id: "quest-current" },
  eligibleQuests: [{ id: "quest-next" }],
} as AgentContext;

describe("Phase 3 logical agents", () => {
  it("uses separate schemas and sends validated specialist results to Coordinator", async () => {
    const generate = vi.fn(async (request: { schemaName: string; input: unknown }) => {
      const values = {
        learning_strategy: {
          recommendedQuestId: "quest-next",
          checkpointFocus: "Run one baseline.",
          expectedEvidence: ["Notebook URL"],
          successMeasures: ["Metric recorded"],
          reasoning: "A direct baseline reveals the bottleneck.",
          portfolioOutcome: "notebook",
          confidence: 0.8,
        },
        adjustment: {
          difficultyAction: "maintain",
          recommendedDifficulty: 3,
          granularityAction: "split",
          targetSkills: ["modeling"],
          reasoning: "Use a smaller feedback loop.",
          riskFlags: [],
          confidence: 0.75,
        },
        coordinator_feedback: {
          summary: "The baseline is reproducible.",
          strengths: ["Metric recorded."],
          improvements: ["Add error analysis."],
          nextActions: ["Inspect one error slice."],
          suggestedQualityScore: 82,
          suggestedSkillWeights: {
            dataHandling: 0.1,
            modeling: 0.4,
            evaluation: 0.2,
            engineering: 0.2,
            researchSense: 0,
            productThinking: 0,
            communication: 0.1,
          },
          explanation: "The measurable checkpoint is met.",
          confidence: 0.8,
        },
      } as const;
      return {
        data: values[request.schemaName as keyof typeof values],
        responseId: `response-${request.schemaName}`,
        model: config.model,
        inputTokens: 20,
        outputTokens: 10,
      };
    });
    const gateway = { generate } as unknown as StructuredResponseGateway;

    const strategy = await runLearningStrategist(gateway, config, context);
    const adjustment = await runAdjuster(gateway, config, context);
    const coordinator = await runCoordinator(
      gateway,
      config,
      context,
      strategy.data,
      adjustment.data,
    );

    expect(strategy.data.recommendedQuestId).toBe("quest-next");
    expect(adjustment.data.granularityAction).toBe("split");
    expect(coordinator.data.suggestedQualityScore).toBe(82);
    expect(generate.mock.calls.map(([call]) => call.schemaName)).toEqual([
      "learning_strategy",
      "adjustment",
      "coordinator_feedback",
    ]);
    expect(generate.mock.calls[2][0].input).toMatchObject({
      learningStrategy: strategy.data,
      adjustment: adjustment.data,
    });
  });
});
