import {
  LearningStrategyProposalSchema,
  type LearningStrategyProposal,
} from "./contracts";
import type { AiConfig } from "./config";
import type { AgentContext } from "./context";
import type {
  StructuredResponseGateway,
  StructuredResponseResult,
} from "./openai-gateway";
import { learningStrategistInstructions } from "./prompts/learning-strategist";

export function runLearningStrategist(
  gateway: StructuredResponseGateway,
  config: AiConfig,
  context: AgentContext,
): Promise<StructuredResponseResult<LearningStrategyProposal>> {
  return gateway.generate({
    model: config.model,
    schemaName: "learning_strategy",
    schema: LearningStrategyProposalSchema,
    instructions: learningStrategistInstructions(config.promptVersion),
    input: context,
  });
}
