import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { StructuredResponseGateway } from "@/ai/openai-gateway";
import { portfolioAchievementInstructions } from "@/ai/prompts/portfolio-achievements";

import type { AchievementRepository } from "./achievement-repository";
import { validateAchievementBullets } from "./grounding-validator";
import { buildAchievementSourceFacts, fingerprintSourceFacts } from "./source-facts";

const OutputSchema = z.object({
  bullets: z.array(z.object({
    text: z.string().min(1).max(160),
    source_refs: z.array(z.string().min(1)).min(1),
  })).min(3).max(5),
});

export async function generateAchievements(
  dependencies: {
    repository: AchievementRepository;
    gateway: StructuredResponseGateway;
    model: string;
    promptVersion: string;
    nextId?: () => string;
  },
  input: { userId: string; artifactId: string; replaceExistingDraft: boolean },
) {
  const source = await dependencies.repository.loadOwnedSource(input.userId, input.artifactId);
  if (!source) return { ok: false as const, reason: "artifact_not_found" as const };
  const existing = await dependencies.repository.loadDraft(input.userId, input.artifactId);
  if (existing && !input.replaceExistingDraft) {
    return { ok: false as const, reason: "draft_exists" as const };
  }
  const facts = buildAchievementSourceFacts(source);
  const generated = await dependencies.gateway.generate({
    model: dependencies.model,
    schemaName: "portfolio_achievements",
    schema: OutputSchema,
    instructions: portfolioAchievementInstructions(dependencies.promptVersion),
    input: { facts },
  });
  const candidates = generated.data.bullets.map((bullet) => ({ text: bullet.text, sourceRefs: bullet.source_refs }));
  const validation = validateAchievementBullets(candidates, facts);
  if (!validation.ok) return { ok: false as const, reason: "grounding_failed" as const, errors: validation.errors };

  const nextId = dependencies.nextId ?? randomUUID;
  const draft = {
    artifactId: input.artifactId,
    userId: input.userId,
    bullets: generated.data.bullets.map((bullet) => ({ id: nextId(), ...bullet })),
    status: "draft" as const,
    sourceFingerprint: fingerprintSourceFacts(facts),
    model: generated.model,
    promptVersion: dependencies.promptVersion,
  };
  await dependencies.repository.saveDraft(draft, facts);
  return { ok: true as const, draft };
}
