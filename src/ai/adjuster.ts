import {
  AdjustmentProposalSchema,
  type AdjustmentProposal,
} from "./contracts";
import type { AiConfig } from "./config";
import type { AgentContext } from "./context";
import type {
  StructuredResponseGateway,
  StructuredResponseResult,
} from "./openai-gateway";
import { adjusterInstructions } from "./prompts/adjuster";

export function runAdjuster(
  gateway: StructuredResponseGateway,
  config: AiConfig,
  context: AgentContext,
): Promise<StructuredResponseResult<AdjustmentProposal>> {
  return gateway.generate({
    model: config.model,
    schemaName: "adjustment",
    schema: AdjustmentProposalSchema,
    instructions: adjusterInstructions(config.promptVersion),
    input: context,
  });
}
