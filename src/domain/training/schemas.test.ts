import { describe, expect, test } from "vitest";

import { createTrainingSeed } from "@/mocks/training/seed";

import {
  CompleteOnboardingInputSchema,
  PortfolioArtifactSchema,
  QuestSchema,
  ResourceSchema,
  SubmitQuestInputSchema,
  TrainingStateSchema,
  UpdateProfileInputSchema,
  UserProfileSchema,
} from "./schemas";

const validQuest = {
  id: "quest-baseline",
  trainingContract: "standard",
  purpose: "training",
  title: "Build a baseline model",
  summary: "Train and evaluate a reproducible baseline.",
  instructions: "Create a baseline and document the validation strategy.",
  questType: "modelExperiment",
  difficulty: 3,
  estimatedMinutes: 70,
  baseXp: 70,
  optional: false,
  acceptanceCriteria: ["Report one validation metric"],
  evidenceRequirements: [
    { id: "metric", type: "metricResult", required: true },
  ],
  reflectionMinChars: 40,
  skillWeights: {
    dataHandling: 0.1,
    modeling: 0.4,
    evaluation: 0.3,
    engineering: 0.1,
    researchSense: 0,
    productThinking: 0,
    communication: 0.1,
  },
  expectedArtifactType: "modelEvaluationReport",
  resourceIds: ["resource-validation"],
};

describe("strict domain schemas", () => {
  test("accepts a quest whose skill weights total one", () => {
    expect(QuestSchema.parse(validQuest)).toEqual(validQuest);
  });

  test("accepts calibration and training quest purposes", () => {
    expect(QuestSchema.parse({ ...validQuest, purpose: "calibration" })).toMatchObject({
      purpose: "calibration",
    });
    expect(() => QuestSchema.parse({ ...validQuest, purpose: "unknown" })).toThrow();
  });

  test("rejects quest skill weights that do not total one", () => {
    expect(() =>
      QuestSchema.parse({
        ...validQuest,
        skillWeights: { ...validQuest.skillWeights, modeling: 0.2 },
      }),
    ).toThrow(/sum to 1/i);
  });

  test("rejects unknown profile fields", () => {
    expect(() =>
      UserProfileSchema.parse({
        id: "user-demo",
        displayName: "Demo Hunter",
        goal: "Become an ML engineer",
        contract: "standard",
        weeklyMinutes: 600,
        timezone: "America/Los_Angeles",
        onboardingCompleted: false,
        unexpected: true,
      }),
    ).toThrow();
  });

  test("accepts Supabase timestamptz offsets", () => {
    expect(
      UserProfileSchema.parse({
        id: "user-demo",
        displayName: "Demo Hunter",
        goal: "Become an ML engineer",
        contract: "standard",
        weeklyMinutes: 600,
        timezone: "America/Los_Angeles",
        onboardingCompleted: false,
        challengeAcceptedAt: "2026-07-18T06:30:00+00:00",
      }).challengeAcceptedAt,
    ).toBe("2026-07-18T06:30:00+00:00");
  });

  test("accepts bounded resource quality signals", () => {
    expect(
      ResourceSchema.parse({
        id: "resource-quality",
        title: "Quality resource",
        summary: "A resource with explicit ranking inputs.",
        url: "https://example.com/resource",
        resourceType: "article",
        difficulty: 2,
        estimatedMinutes: 20,
        skillTags: ["evaluation"],
        relevance: 92,
        freshness: 81,
        credibility: 88,
      }),
    ).toMatchObject({ relevance: 92, freshness: 81, credibility: 88 });
  });

  test("rejects resource quality signals outside zero to one hundred", () => {
    const resource = {
      id: "resource-quality",
      title: "Quality resource",
      summary: "A resource with explicit ranking inputs.",
      url: "https://example.com/resource",
      resourceType: "article",
      difficulty: 2,
      estimatedMinutes: 20,
      skillTags: ["evaluation"],
      relevance: 101,
      freshness: 81,
      credibility: 88,
    };

    expect(() => ResourceSchema.parse(resource)).toThrow();
  });

  test("validates strict repository command inputs at runtime", () => {
    expect(() =>
      CompleteOnboardingInputSchema.parse({
        displayName: "Barry",
        goal: "Ship ML systems",
        contract: "standard",
        weeklyMinutes: 600,
        timezone: "not/a-timezone",
      }),
    ).toThrow(/timezone/i);
    expect(() => UpdateProfileInputSchema.parse({})).toThrow(/field/i);
    expect(() =>
      SubmitQuestInputSchema.parse({
        idempotencyKey: "   ",
        assignmentId: "assignment-one",
        evidence: [],
        selfReflection: "reflection",
      }),
    ).toThrow(/idempotency/i);
    expect(() =>
      CompleteOnboardingInputSchema.parse({
        displayName: "Barry",
        goal: "Ship ML systems",
        contract: "standard",
        weeklyMinutes: 600,
        timezone: "America/Los_Angeles",
        unexpected: true,
      }),
    ).toThrow();
  });

  test("rejects record keys that do not match entity ids", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");
    const [questId] = Object.keys(state.quests);
    state.quests["wrong-key"] = state.quests[questId];
    delete state.quests[questId];

    expect(() => TrainingStateSchema.parse(state)).toThrow(/record key.*entity id/i);
  });

  test("rejects dangling assignment references", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");
    const assignment = Object.values(state.assignments)[0];
    assignment.questId = "missing-quest";

    expect(() => TrainingStateSchema.parse(state)).toThrow(/assignment.*quest/i);
  });

  test("rejects quest references to missing resources", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");
    Object.values(state.quests)[0].resourceIds = ["missing-resource"];

    expect(() => TrainingStateSchema.parse(state)).toThrow(/quest.*resource/i);
  });

  test("rejects activity references to missing source entities", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");
    state.activity.push({
      id: "activity-dangling",
      type: "questCompleted",
      sourceId: "missing-assignment",
      title: "Dangling event",
      summary: "This event has no source entity.",
      occurredAt: "2026-07-16T16:00:00.000Z",
    });

    expect(() => TrainingStateSchema.parse(state)).toThrow(/activity.*source/i);
  });

  test("rejects progress XP that is inconsistent with its event ledger", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");
    state.progress.totalXp = 1;

    expect(() => TrainingStateSchema.parse(state)).toThrow(/total xp.*ledger/i);
  });

  test("rejects duplicate XP sources even when the ledger total is consistent", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");
    const assignment = Object.values(state.assignments)[0];
    const quest = state.quests[assignment.questId];
    const submission = {
      id: "submission-ledger",
      idempotencyKey: "ledger-key",
      assignmentId: assignment.id,
      revisionNo: 1,
      evidence: [
        {
          id: "evidence-ledger",
          requirementId: quest.evidenceRequirements[0].id,
          type: quest.evidenceRequirements[0].type,
          metricName: "f1",
          metricValue: 0.8,
        },
      ],
      selfReflection: "A substantive reflection about the experiment and next validation step.",
      verificationStatus: "verified" as const,
      verificationMethod: "mock" as const,
      qualityScore: 80,
      scoreBreakdown: {
        evidenceCompleteness: 45,
        evidenceValidity: 25,
        reflection: 10,
        artifactReadiness: 0,
      },
      hardFailures: [],
      submittedAt: "2026-07-16T16:00:00.000Z",
    };
    state.submissions[submission.id] = submission;
    state.xpEvents = [
      {
        id: "xp-one",
        sourceSubmissionId: submission.id,
        baseXp: 10,
        qualityMultiplier: 1,
        streakMultiplier: 1,
        artifactMultiplier: 1,
        awardedXp: 10,
        createdAt: "2026-07-16T16:00:00.000Z",
      },
      {
        id: "xp-two",
        sourceSubmissionId: submission.id,
        baseXp: 20,
        qualityMultiplier: 1,
        streakMultiplier: 1,
        artifactMultiplier: 1,
        awardedXp: 20,
        createdAt: "2026-07-16T16:00:00.000Z",
      },
    ];
    state.progress.totalXp = 30;

    expect(() => TrainingStateSchema.parse(state)).toThrow(/xp source.*unique/i);
  });

  test("rejects XP events sourced from an unverified submission", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");
    const assignment = Object.values(state.assignments)[0];
    const quest = state.quests[assignment.questId];
    state.submissions["submission-forged"] = {
      id: "submission-forged",
      idempotencyKey: "forged-key",
      assignmentId: assignment.id,
      revisionNo: 1,
      evidence: [],
      selfReflection: "Incomplete evidence should never receive a reward.",
      verificationStatus: "needs_revision",
      verificationMethod: "mock",
      qualityScore: 0,
      scoreBreakdown: {
        evidenceCompleteness: 0,
        evidenceValidity: 0,
        reflection: 10,
        artifactReadiness: 0,
      },
      hardFailures: ["Missing required evidence"],
      submittedAt: "2026-07-16T16:00:00.000Z",
    };
    state.xpEvents.push({
      id: "xp-forged",
      sourceSubmissionId: "submission-forged",
      baseXp: quest.baseXp,
      qualityMultiplier: 1,
      streakMultiplier: 1,
      artifactMultiplier: 1,
      awardedXp: quest.baseXp,
      createdAt: "2026-07-16T16:00:00.000Z",
    });
    state.progress.totalXp = quest.baseXp;

    expect(() => TrainingStateSchema.parse(state)).toThrow(/xp.*verified/i);
  });

  test("rejects non-HTTPS portfolio artifact URLs", () => {
    expect(() =>
      PortfolioArtifactSchema.parse({
        id: "artifact-unsafe",
        submissionId: "submission-safe",
        assignmentId: "assignment-safe",
        artifactType: "githubRepository",
        title: "Unsafe artifact",
        description: "This URL must not be accepted.",
        artifactUrl: "http://example.com/artifact",
        skillTags: ["engineering"],
        qualityScore: 80,
        verificationStatus: "verified",
        createdAt: "2026-07-16T16:00:00.000Z",
      }),
    ).toThrow(/https/i);
  });
});
