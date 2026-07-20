import { describe, expect, it } from "vitest";

import {
  PublicPortfolioProfileInputSchema,
  PublishArtifactInputSchema,
  summarizePublicPortfolio,
  type PublishedArtifact,
} from "./contracts";

const publishedAt = "2026-07-19T00:00:00.000Z";

function artifact(
  input: Partial<PublishedArtifact> & Pick<PublishedArtifact, "artifactId" | "skillTags" | "qualityScore">,
): PublishedArtifact {
  return {
    artifactId: input.artifactId,
    artifactType: input.artifactType ?? "model_report",
    publicTitle: input.publicTitle ?? "Validated ML artifact",
    publicSummary:
      input.publicSummary ?? "A reproducible machine-learning artifact with evaluation evidence.",
    artifactUrl: input.artifactUrl ?? null,
    skillTags: input.skillTags,
    qualityScore: input.qualityScore,
    featured: input.featured ?? false,
    displayOrder: input.displayOrder ?? 0,
    publishedAt: input.publishedAt ?? publishedAt,
    updatedAt: input.updatedAt ?? publishedAt,
  };
}

describe("public portfolio contracts", () => {
  it("accepts a normalized public profile", () => {
    const result = PublicPortfolioProfileInputSchema.parse({
      slug: "barry-ml",
      displayName: " Barry ",
      headline: " Machine Learning Engineer in Training ",
      bio: " Building evaluated ML systems. ",
    });

    expect(result).toEqual({
      slug: "barry-ml",
      displayName: "Barry",
      headline: "Machine Learning Engineer in Training",
      bio: "Building evaluated ML systems.",
    });
  });

  it("rejects an unsafe public slug", () => {
    expect(() =>
      PublicPortfolioProfileInputSchema.parse({
        slug: "Barry ML",
        displayName: "Barry",
        headline: "Machine Learning Engineer",
        bio: "",
      }),
    ).toThrow();
  });

  it("accepts only editable publication fields", () => {
    const result = PublishArtifactInputSchema.parse({
      artifactId: "8a165314-e249-4187-957a-143f80997319",
      publicTitle: "Validated churn model",
      publicSummary:
        "Compared three baselines and documented validation leakage controls.",
      showArtifactUrl: true,
      featured: false,
      displayOrder: 0,
    });

    expect(result).not.toHaveProperty("qualityScore");
    expect(result).not.toHaveProperty("skillTags");
    expect(result).not.toHaveProperty("artifactType");
  });

  it("rejects unexpected canonical fields", () => {
    expect(() =>
      PublishArtifactInputSchema.parse({
        artifactId: "8a165314-e249-4187-957a-143f80997319",
        publicTitle: "Validated churn model",
        publicSummary:
          "Compared three baselines and documented validation leakage controls.",
        showArtifactUrl: true,
        featured: false,
        displayOrder: 0,
        qualityScore: 100,
      }),
    ).toThrow();
  });

  it("derives public evidence totals from visible snapshots", () => {
    const summary = summarizePublicPortfolio([
      artifact({
        artifactId: "a",
        skillTags: ["modeling", "evaluation"],
        qualityScore: 80,
        featured: true,
      }),
      artifact({
        artifactId: "b",
        artifactType: "deployed_demo",
        artifactUrl: "https://example.com/demo",
        skillTags: ["engineering", "modeling"],
        qualityScore: 90,
        displayOrder: 1,
      }),
    ]);

    expect(summary).toMatchObject({
      artifactCount: 2,
      featuredCount: 1,
      averageQualityScore: 85,
      demonstratedSkillCount: 3,
    });
    expect(summary.skillCoverage.modeling).toBe(2);
    expect(summary.skillCoverage.communication).toBe(0);
  });

  it("counts a repeated skill once per artifact", () => {
    const summary = summarizePublicPortfolio([
      artifact({
        artifactId: "a",
        skillTags: ["modeling", "modeling"],
        qualityScore: 80,
      }),
    ]);

    expect(summary.skillCoverage.modeling).toBe(1);
  });
});
