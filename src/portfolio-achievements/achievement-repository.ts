import type { AchievementSourceFact } from "./contracts";

export type AchievementSourceBundle = {
  artifact: { title: string; artifactType: string; qualityScore: number; skillTags: readonly string[] };
  quest?: { title: string; objective: string; executionSteps: readonly string[]; successMetrics: readonly string[] } | null;
  metrics?: readonly { name: string; value: string | number }[];
  verification?: { provider: string; verifiedAt: string; metadata: Record<string, unknown> } | null;
};

export type StoredAchievementDraft = {
  artifactId: string;
  userId: string;
  bullets: readonly { id: string; text: string; source_refs: readonly string[] }[];
  status: "draft" | "approved" | "outdated";
  sourceFingerprint: string;
  model: string;
  promptVersion: string;
};

export interface AchievementRepository {
  loadOwnedSource(userId: string, artifactId: string): Promise<AchievementSourceBundle | null>;
  loadDraft(userId: string, artifactId: string): Promise<unknown | null>;
  saveDraft(draft: StoredAchievementDraft, facts: readonly AchievementSourceFact[]): Promise<void>;
}
