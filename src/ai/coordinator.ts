import {
  CoordinatorFeedbackSchema,
  type AdjustmentProposal,
  type CoordinatorFeedback,
  type LearningStrategyProposal,
} from "./contracts";
import type { AiConfig } from "./config";
import type { AgentContext } from "./context";
import type {
  StructuredResponseGateway,
  StructuredResponseResult,
} from "./openai-gateway";
import { coordinatorInstructions } from "./prompts/coordinator";

export function runCoordinator(
  gateway: StructuredResponseGateway,
  config: AiConfig,
  context: AgentContext,
  learningStrategy: LearningStrategyProposal,
  adjustment: AdjustmentProposal,
): Promise<StructuredResponseResult<CoordinatorFeedback>> {
  return gateway.generate({
    model: config.model,
    schemaName: "coordinator_feedback",
    schema: CoordinatorFeedbackSchema,
    instructions: coordinatorInstructions(config.promptVersion),
    input: { context, learningStrategy, adjustment },
  });
}
