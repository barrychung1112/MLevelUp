import { createHash } from "node:crypto";

import type { AchievementSourceFact } from "./contracts";

type AchievementSourceInput = {
  artifact: {
    title: string;
    artifactType: string;
    qualityScore: number;
    skillTags: readonly string[];
  } & Record<string, unknown>;
  quest?: ({
    title: string;
    objective: string;
    executionSteps: readonly string[];
    successMetrics: readonly string[];
  } & Record<string, unknown>) | null;
  metrics?: readonly { name: string; value: string | number }[];
  verification?: ({
    provider: string;
    verifiedAt: string;
    metadata: Record<string, unknown>;
  } & Record<string, unknown>) | null;
} & Record<string, unknown>;

const VERIFICATION_METADATA_KEYS = [
  "fullName",
  "description",
  "defaultBranch",
  "primaryLanguage",
  "topics",
  "visibility",
  "archived",
  "pushedAt",
  "repositoryFullName",
  "sha",
  "committedAt",
  "authorLogin",
  "messageSubject",
  "signatureVerified",
  "ownerReference",
  "notebookSlug",
  "title",
  "lastUpdatedAt",
  "competitionSlug",
  "category",
  "deadline",
  "public",
] as const;

function fact(ref: string, value: unknown): AchievementSourceFact | null {
  if (value === null || value === undefined || value === "") return null;
  return {
    ref,
    value: Array.isArray(value) ? value.join(", ") : String(value),
  };
}

export function buildAchievementSourceFacts(
  input: AchievementSourceInput,
): AchievementSourceFact[] {
  const facts: Array<AchievementSourceFact | null> = [
    fact("artifact:title", input.artifact.title),
    fact("artifact:type", input.artifact.artifactType),
    fact("artifact:quality_score", input.artifact.qualityScore),
    fact("artifact:skill_tags", input.artifact.skillTags),
  ];

  if (input.quest) {
    facts.push(
      fact("quest:title", input.quest.title),
      fact("quest:objective", input.quest.objective),
      ...input.quest.executionSteps.map((value, index) =>
        fact(`quest:step:${index + 1}`, value),
      ),
      ...input.quest.successMetrics.map((value, index) =>
        fact(`quest:success_metric:${index + 1}`, value),
      ),
    );
  }

  for (const metric of input.metrics ?? []) {
    facts.push(fact(`metric:${metric.name}`, metric.value));
  }

  if (input.verification) {
    facts.push(
      fact("verification:provider", input.verification.provider),
      fact("verification:verified_at", input.verification.verifiedAt),
    );
    for (const key of VERIFICATION_METADATA_KEYS) {
      facts.push(
        fact(
          `verification:metadata:${key}`,
          input.verification.metadata[key],
        ),
      );
    }
  }

  return facts.filter((value): value is AchievementSourceFact => value !== null);
}

export function fingerprintSourceFacts(
  facts: readonly AchievementSourceFact[],
): string {
  const canonical = [...facts]
    .sort(
      (left, right) =>
        left.ref.localeCompare(right.ref) || left.value.localeCompare(right.value),
    )
    .map(({ ref, value }) => [ref, value]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
