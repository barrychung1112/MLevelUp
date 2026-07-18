import { describe, expect, it } from "vitest";

import {
  mapAssignmentRow,
  mapFeedbackRow,
  mapPortfolioArtifactRow,
  mapQuestRow,
  mapResourceRow,
  mapSkillStatsRows,
  mapSubmissionRow,
} from "./row-mappers";

describe("Supabase row mappers", () => {
  it("maps catalog quest rows into domain quests", () => {
    expect(
      mapQuestRow({
        id: "quest",
        training_contract: "standard",
        purpose: "calibration",
        title: "Quest",
        summary: "Summary",
        instructions: "Do it",
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
      }),
    ).toMatchObject({
      id: "quest",
      trainingContract: "standard",
      purpose: "calibration",
      estimatedMinutes: 70,
      expectedArtifactType: "githubRepository",
    });
  });

  it("maps seven skill rows and fills missing skills with defaults", () => {
    const skills = mapSkillStatsRows([
      { skill_key: "modeling", score: 25, skill_xp: 50, last_delta: 1.25 },
    ]);

    expect(skills.modeling).toEqual({ score: 25, skillXp: 50, lastDelta: 1.25 });
    expect(skills.communication).toEqual({ score: 20, skillXp: 0, lastDelta: 0 });
  });

  it("maps user-owned evidence, feedback, resources, assignments, and artifacts", () => {
    expect(
      mapAssignmentRow({
        id: "assignment-id",
        quest_id: "quest",
        assigned_date: "2026-07-16",
        slot: "primary",
        status: "completed",
        assigned_at: "2026-07-16T10:00:00.000Z",
        started_at: "2026-07-16T10:05:00.000Z",
        submitted_at: "2026-07-16T11:00:00.000Z",
        completed_at: "2026-07-16T11:01:00.000Z",
        latest_submission_id: "submission-id",
      }),
    ).toMatchObject({ id: "assignment-id", latestSubmissionId: "submission-id" });

    expect(
      mapSubmissionRow({
        id: "submission-id",
        idempotency_key: "idem",
        assignment_id: "assignment-id",
        revision_no: 1,
        evidence: [{ id: "evidence", requirementId: "commit", type: "githubCommit" }],
        self_reflection: "reflection",
        verification_status: "verified",
        verification_method: "mock",
        quality_score: 80,
        score_breakdown: {
          evidenceCompleteness: 45,
          evidenceValidity: 25,
          reflection: 10,
          artifactReadiness: 0,
        },
        hard_failures: [],
        submitted_at: "2026-07-16T11:00:00.000Z",
      }),
    ).toMatchObject({ idempotencyKey: "idem", evidence: [{ id: "evidence" }] });

    expect(
      mapFeedbackRow({
        id: "feedback-id",
        kind: "submission",
        submission_id: "submission-id",
        summary: "Good",
        strengths: ["complete"],
        improvements: [],
        next_actions: ["ship"],
        score_breakdown: undefined,
        xp_awarded: 70,
        skill_deltas: {
          dataHandling: 0,
          modeling: 1,
          evaluation: 0,
          engineering: 0,
          researchSense: 0,
          productThinking: 0,
          communication: 0,
        },
        created_at: "2026-07-16T11:00:00.000Z",
      }),
    ).toMatchObject({ id: "feedback-id", xpAwarded: 70 });

    expect(
      mapResourceRow({
        id: "resource",
        title: "Resource",
        summary: "Summary",
        url: "https://example.com",
        resource_type: "repository",
        difficulty: 3,
        estimated_minutes: 25,
        skill_tags: ["modeling"],
        relevance: 96,
        freshness: 86,
        credibility: 89,
      }),
    ).toMatchObject({ id: "resource", resourceType: "repository" });

    expect(
      mapPortfolioArtifactRow({
        id: "artifact-id",
        submission_id: "submission-id",
        assignment_id: "assignment-id",
        artifact_type: "githubRepository",
        title: "Artifact",
        description: "Description",
        artifact_url: "https://github.com/example/project",
        skill_tags: ["modeling"],
        quality_score: 80,
        verification_status: "verified",
        created_at: "2026-07-16T11:00:00.000Z",
      }),
    ).toMatchObject({ id: "artifact-id", artifactType: "githubRepository" });
  });
});
