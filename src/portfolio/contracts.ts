import { z } from "zod";

import { SKILL_KEYS } from "@/domain/training/constants";
import type { SkillKey } from "@/domain/training/types";

export const PublicPortfolioProfileInputSchema = z.strictObject({
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  displayName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(3).max(200),
  bio: z.string().trim().max(800),
});

export const PublishArtifactInputSchema = z.strictObject({
  artifactId: z.string().min(1).max(120),
  publicTitle: z.string().trim().min(3).max(200),
  publicSummary: z.string().trim().min(20).max(1_200),
  showArtifactUrl: z.boolean(),
  featured: z.boolean(),
  displayOrder: z.number().int().nonnegative().max(10_000),
});

export type PublicPortfolioProfileInput = z.infer<
  typeof PublicPortfolioProfileInputSchema
>;
export type PublishArtifactInput = z.infer<typeof PublishArtifactInputSchema>;

export type PublicPortfolioProfile = PublicPortfolioProfileInput & {
  userId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublishedArtifact = {
  artifactId: string;
  artifactType: string;
  publicTitle: string;
  publicSummary: string;
  artifactUrl: string | null;
  skillTags: readonly SkillKey[];
  qualityScore: number;
  featured: boolean;
  displayOrder: number;
  publishedAt: string;
  updatedAt: string;
  keyAchievements?: readonly string[];
  linkVerification?: {
    provider: "github" | "kaggle";
    resourceType: "repository" | "commit" | "notebook" | "competition";
    verifiedAt: string;
    staleAfter: string;
    ownershipVerified: false;
  } | null;
};

export type PublicPortfolio = {
  profile: PublicPortfolioProfile;
  artifacts: readonly PublishedArtifact[];
};

export type PortfolioPublicationState = {
  profile: PublicPortfolioProfile | null;
  artifacts: readonly PublishedArtifact[];
};

export type PublicPortfolioSummary = {
  artifactCount: number;
  featuredCount: number;
  averageQualityScore: number;
  demonstratedSkillCount: number;
  skillCoverage: Record<SkillKey, number>;
};

export function summarizePublicPortfolio(
  artifacts: readonly PublishedArtifact[],
): PublicPortfolioSummary {
  const skillCoverage = Object.fromEntries(
    SKILL_KEYS.map((skill) => [skill, 0]),
  ) as Record<SkillKey, number>;

  for (const artifact of artifacts) {
    for (const skill of new Set(artifact.skillTags)) {
      skillCoverage[skill] += 1;
    }
  }

  const totalQuality = artifacts.reduce(
    (sum, artifact) => sum + artifact.qualityScore,
    0,
  );

  return {
    artifactCount: artifacts.length,
    featuredCount: artifacts.filter((artifact) => artifact.featured).length,
    averageQualityScore:
      artifacts.length === 0
        ? 0
        : Math.round(totalQuality / artifacts.length),
    demonstratedSkillCount: Object.values(skillCoverage).filter(
      (count) => count > 0,
    ).length,
    skillCoverage,
  };
}
