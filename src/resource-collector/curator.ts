import { z } from "zod";

import type { AiConfig } from "@/ai/config";
import type { StructuredResponseGateway } from "@/ai/openai-gateway";
import { resourceCuratorInstructions } from "@/ai/prompts/resource-curator";
import { SKILL_KEYS } from "@/domain/training/constants";
import type { Difficulty, SkillKey } from "@/domain/training/types";

import type { ResourceCandidate } from "./contracts";

export const ResourceCurationSchema = z.strictObject({
  summary: z.string().trim().min(20).max(400),
  difficulty: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(5).max(300),
  skillTags: z.array(z.enum(SKILL_KEYS)).min(1).max(4),
  prerequisites: z.array(z.string().trim().min(1).max(100)).max(5),
  relevance: z.number().int().min(0).max(100),
  taskFit: z.number().int().min(0).max(100),
  reason: z.string().trim().min(10).max(240),
});

export type ResourceCuration = z.infer<typeof ResourceCurationSchema> & {
  fallbackUsed: boolean;
};

function fallback(candidate: ResourceCandidate): ResourceCuration {
  const isPaper = candidate.resourceType === "paper";
  return {
    summary: candidate.summary.slice(0, 400),
    difficulty: (isPaper ? 4 : 3) as Difficulty,
    estimatedMinutes: isPaper ? 60 : 45,
    skillTags: [(isPaper ? "researchSense" : "engineering") as SkillKey],
    prerequisites: [],
    relevance: candidate.credibilityHint ?? 70,
    taskFit: candidate.credibilityHint ?? 70,
    reason: "Deterministic source-based enrichment was used.",
    fallbackUsed: true,
  };
}

export async function curateCandidate(
  candidate: ResourceCandidate,
  gateway: StructuredResponseGateway | null,
  config: AiConfig | null,
): Promise<ResourceCuration> {
  if (!gateway || !config) return fallback(candidate);
  try {
    const result = await gateway.generate({
      model: config.model,
      schemaName: "resource_curation",
      schema: ResourceCurationSchema,
      instructions: resourceCuratorInstructions(config.promptVersion),
      input: candidate,
    });
    return { ...result.data, fallbackUsed: false };
  } catch {
    return fallback(candidate);
  }
}
