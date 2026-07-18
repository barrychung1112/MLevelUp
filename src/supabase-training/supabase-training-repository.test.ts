import { describe, expect, it, vi } from "vitest";

import type { AgentRunDiagnostic } from "@/ai/contracts";
import { createTrainingSeed } from "@/mocks/training/seed";

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

function createClient(rows: Record<string, unknown[]>, singles: Record<string, unknown> = {}, orders: Array<{ table: string; column: string }> = []) {
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
            order: async (column: string) => { orders.push({ table, column }); return { data: tableRows, error: null }; },
            eq() {
              return {
                maybeSingle: async () => ({ data: single, error: null }),
                order: async (column: string) => { orders.push({ table, column }); return { data: tableRows, error: null }; },
              };
            },
          };
          return builder;
        },
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
        upsert: async (value?: unknown) => {
          void value;
          return { data: null, error: null };
        },
      };
    },
  };
}

describe("SupabaseTrainingRepository", () => {
  it("delegates browser submissions to the authenticated server client", async () => {
    const outcome = { delegated: true };
    const submit = vi.fn().mockResolvedValue(outcome);
    const repository = new SupabaseTrainingRepository({
      client: createClient({}) as never,
      clock: { now: () => "2026-07-18T18:00:00.000Z" },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
      submissionClient: { submit } as never,
    });
    const input = {
      idempotencyKey: "delegated-key",
      assignmentId: "assignment-1",
      evidence: [],
      selfReflection: "A reflection",
    };

    await expect(repository.submitQuest(input)).resolves.toBe(outcome);
    expect(submit).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledWith(input);
  });

  it("persists a user-owned outcome with redacted agent diagnostics", async () => {
    const agentUpserts: unknown[] = [];
    const client = createClient({});
    const originalFrom = client.from;
    client.from = (table: string) => {
      const tableClient = originalFrom(table);
      return {
        ...tableClient,
        upsert: async (value: unknown) => {
          if (table === "agent_runs") agentUpserts.push(value);
          return { data: null, error: null };
        },
      };
    };
    const repository = new SupabaseTrainingRepository({
      client: client as never,
      clock: { now: () => "2026-07-18T18:00:01.000Z" },
      ids: { next: () => "00000000-0000-4000-8000-000000000099" },
    });
    const state = createTrainingSeed("2026-07-18T18:00:00.000Z");
    state.profile.id = "user-1";
    const assignment = Object.values(state.assignments)[0];
    const submission = {
      id: "00000000-0000-4000-8000-000000000010",
      idempotencyKey: "phase3-persist",
      assignmentId: assignment.id,
      revisionNo: 1,
      evidence: [],
      selfReflection: "A verified reflection.",
      verificationStatus: "verified" as const,
      verificationMethod: "automatic" as const,
      qualityScore: 80,
      scoreBreakdown: {
        evidenceCompleteness: 35,
        evidenceValidity: 20,
        reflection: 15,
        artifactReadiness: 10,
      },
      hardFailures: [],
      submittedAt: "2026-07-18T18:00:00.000Z",
    };
    state.submissions[submission.id] = submission;
    const diagnostics: AgentRunDiagnostic[] = [{
      agentType: "coordinator",
      status: "completed",
      model: "gpt-5.6-terra",
      promptVersion: "phase3-v1",
      latencyMs: 900,
      inputTokens: 200,
      outputTokens: 80,
      errorCode: null,
      fallbackUsed: false,
      traceId: "trace-1",
      inputSummary: { questId: "quest-safe" },
      outputSummary: { responseId: "response-safe" },
    }];

    await repository.persistSubmissionOutcome(
      { state, submission, evaluation: {
        qualityScore: 80,
        verificationStatus: "verified",
        verificationMethod: "automatic",
        scoreBreakdown: submission.scoreBreakdown,
        artifactReady: false,
        hardFailures: [],
      } },
      diagnostics,
    );

    expect(agentUpserts).toContainEqual([
      expect.objectContaining({
        user_id: "user-1",
        submission_id: submission.id,
        agent_type: "coordinator",
        is_mock: false,
        input: { questId: "quest-safe" },
        output: { responseId: "response-safe" },
      }),
    ]);
  });

  it("orders skill stats by their actual updated_at column", async () => {
    const orders: Array<{ table: string; column: string }> = [];
    const repository = new SupabaseTrainingRepository({
      client: createClient({
        quests: [questRow], resources: [resourceRow], skill_stats: [], quest_assignments: [],
        submissions: [], feedback: [], portfolio_artifacts: [], agent_runs: [],
      }, {}, orders) as never,
      clock: { now: () => "2026-07-18T06:00:00.000Z" },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
    });

    await repository.getSnapshot();

    expect(orders).toContainEqual({ table: "skill_stats", column: "updated_at" });
  });

  it("persists the courage oath timestamp", async () => {
    const profileUpserts: unknown[] = [];
    const client = createClient({
      quests: [questRow], resources: [resourceRow], skill_stats: [], quest_assignments: [],
      submissions: [], feedback: [], portfolio_artifacts: [], agent_runs: [],
    });
    const originalFrom = client.from;
    client.from = (table: string) => {
      const tableClient = originalFrom(table);
      return {
        ...tableClient,
        upsert: async (value: unknown) => {
          if (table === "profiles") profileUpserts.push(value);
          return { data: null, error: null };
        },
      };
    };
    const repository = new SupabaseTrainingRepository({
      client: client as never,
      clock: { now: () => "2026-07-17T05:00:00.000Z" },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
    });

    await repository.acceptChallenge();

    expect(profileUpserts).toContainEqual(
      expect.objectContaining({
        challenge_accepted_at: "2026-07-17T05:00:00.000Z",
        target_role: "machine-learning-engineer",
        daily_minutes: 300,
        consecutive_failure_days: 0,
        training_status: "normal",
      }),
    );
  });

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
          quests: [
            questRow,
            { ...questRow, id: "quest-penalty-daily", scope: "penalty", base_xp: 0 },
          ],
          resources: [resourceRow],
          skill_stats: [],
          quest_assignments: [{
            id: "assignment-penalty",
            quest_id: "quest-penalty-daily",
            assigned_date: "2026-07-17",
            slot: "secondary",
            status: "assigned",
            assigned_at: "2026-07-17T05:00:00.000Z",
            penalty_source_assignment_id: "assignment-source",
          }],
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
            target_role: "machine-learning-engineer",
            daily_minutes: 300,
            consecutive_failure_days: 4,
            training_status: "recovery",
            recovery_started_at: "2026-07-17T05:00:00.000Z",
            recovery_deadline: "2026-07-20T05:00:00.000Z",
          },
        },
      ) as never,
      clock: { now: () => "2026-07-17T05:00:00.000Z" },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
    });

    const snapshot = await repository.getSnapshot();

    expect(snapshot.profile.challengeAcceptedAt).toBe("2026-07-17T05:00:00.000Z");
    expect(snapshot.profile).toMatchObject({
      consecutiveFailureDays: 4,
      trainingStatus: "recovery",
      recoveryDeadline: "2026-07-20T05:00:00.000Z",
    });
  });
});
