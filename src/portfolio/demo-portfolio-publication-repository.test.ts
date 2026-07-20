import { describe, expect, it } from "vitest";

import { DemoPortfolioPublicationRepository } from "./demo-portfolio-publication-repository";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const input = {
  artifactId: "8a165314-e249-4187-957a-143f80997319",
  publicTitle: "Validated churn model",
  publicSummary: "Compared three baselines and documented validation leakage controls.",
  showArtifactUrl: false,
  featured: true,
  displayOrder: 0,
};

describe("DemoPortfolioPublicationRepository", () => {
  it("persists publication state across repository instances", async () => {
    const storage = new MemoryStorage();
    const first = new DemoPortfolioPublicationRepository(storage, () => "2026-07-19T00:00:00.000Z");
    await first.saveProfile({ slug: "barry-ml", displayName: "Barry", headline: "ML Engineer", bio: "" });
    await first.publishArtifact(input);

    const second = new DemoPortfolioPublicationRepository(storage);
    const state = await second.load();

    expect(state.profile?.isPublished).toBe(false);
    expect(state.artifacts).toHaveLength(1);
    expect(state.artifacts[0]?.publicTitle).toBe("Validated churn model");
  });

  it("enforces the three-featured-artifact limit", async () => {
    const repository = new DemoPortfolioPublicationRepository(new MemoryStorage());
    for (let index = 1; index <= 3; index += 1) {
      await repository.publishArtifact({
        ...input,
        artifactId: `00000000-0000-4000-8000-00000000000${index}`,
      });
    }

    await expect(repository.publishArtifact({
      ...input,
      artifactId: "00000000-0000-4000-8000-000000000004",
    })).rejects.toMatchObject({ code: "featured_limit" });
  });
});
