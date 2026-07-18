import { describe, expect, it } from "vitest";

import { SupabaseTrainingRepository } from "./supabase-training-repository";

const questRow = {
  id: "quest-standard-baseline",
  training_contract: "standard",
  purpose: "training",
  title: "Ship a reproducible baseline",
  summary: "Train a baseline.",
  instructions: "Commit one run.",
  quest_type: "modelExperiment",
  difficulty: 3,
  estimated_minutes: 70,
  base_xp: 70,
  optional: false,
  acceptance_criteria: ["Commit code"],
  evidence_requirements: [{ id: "commit", type: "githubCommit", required: true }],
  reflection_min_chars: 40,
  skill_weights: {
    dataHandling: 0.1,
    modeling: 0.4,
    evaluation: 0.2,
    engineering: 0.2,
    researchSense: 0,
    productThinking: 0,
    communication: 0.1,
  },
  expected_artifact_type: "githubRepository",
  resource_ids: ["resource-baseline"],
};

const resourceRow = {
  id: "resource-baseline",
  title: "Reproducible baselines",
  summary: "Build a trustworthy first model.",
  url: "https://example.com/resources/baseline",
  resource_type: "repository",
  difficulty: 3,
  estimated_minutes: 25,
  skill_tags: ["modeling", "engineering"],
  relevance: 96,
  freshness: 86,
  credibility: 89,
};

function createClient(rows: Record<string, unknown[]>, singles: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
    from(table: string) {
      const tableRows = rows[table] ?? [];
      const single = singles[table] ?? null;
      return {
        delete: () => ({ eq: async () => ({ data: null, error: null }) }),
        insert: async () => ({ data: null, error: null }),
        select() {
          const builder = {
            order: async () => ({ data: tableRows, error: null }),
            eq() {
              return {
                maybeSingle: async () => ({ data: single, error: null }),
                order: async () => ({ data: tableRows, error: null }),
              };
            },
          };
          return builder;
        },
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
        upsert: async () => ({ data: null, error: null }),
      };
    },
  };
}

describe("SupabaseTrainingRepository", () => {
  it("maps an empty user account into a usable training snapshot", async () => {
    const repository = new SupabaseTrainingRepository({
      client: createClient({
        quests: [questRow],
        resources: [resourceRow],
        skill_stats: [],
        quest_assignments: [],
        submissions: [],
        feedback: [],
        portfolio_artifacts: [],
        agent_runs: [],
      }) as never,
      clock: { now: () => "2026-07-16T16:00:00.000Z" },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
    });

    const snapshot = await repository.getSnapshot();

    expect(snapshot.profile).toMatchObject({
      id: "user-1",
      contract: "standard",
      onboardingCompleted: false,
    });
    expect(snapshot.quests["quest-standard-baseline"].title).toBe("Ship a reproducible baseline");
    expect(snapshot.resources).toHaveLength(1);
    expect(snapshot.progress.skills.modeling).toEqual({ score: 20, skillXp: 0, lastDelta: 0 });
  });

  it("maps persisted challenge acceptance into the profile", async () => {
    const repository = new SupabaseTrainingRepository({
      client: createClient(
        {
          quests: [questRow],
          resources: [resourceRow],
          skill_stats: [],
          quest_assignments: [],
          submissions: [],
          feedback: [],
          portfolio_artifacts: [],
          agent_runs: [],
        },
        {
          profiles: {
            user_id: "user-1",
            display_name: "Barry",
            goal: "Ship ML systems",
            contract: "standard",
            weekly_minutes: 600,
            timezone: "America/Los_Angeles",
            onboarding_completed: true,
            challenge_accepted_at: "2026-07-17T05:00:00.000Z",
          },
        },
      ) as never,
      clock: { now: () => "2026-07-17T05:00:00.000Z" },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
    });

    const snapshot = await repository.getSnapshot();

    expect(snapshot.profile.challengeAcceptedAt).toBe("2026-07-17T05:00:00.000Z");
  });
});
