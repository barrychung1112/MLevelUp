import { describe, expect, it } from "vitest";

import {
  mapAssignmentRow,
  mapAgentRunRow,
  mapResourceCollectorStatusRow,
  mapFeedbackRow,
  mapPortfolioArtifactRow,
  mapQuestRow,
  mapResourceRow,
  mapSkillStatsRows,
  mapSubmissionRow,
} from "./row-mappers";

describe("Supabase row mappers", () => {
  it("maps sanitized collector diagnostics into a real degraded agent status", () => {
    expect(mapResourceCollectorStatusRow({
      status: "degraded",
      candidate_count: 8,
      inserted_count: 3,
      updated_count: 2,
      duplicate_count: 1,
      rejected_count: 1,
      fallback_count: 2,
      unavailable_count: 1,
      unchecked_count: 1,
      model: "gpt-test",
      prompt_version: "phase4-resource-v1",
      error_code: null,
      started_at: "2026-07-19T08:00:00.000Z",
      completed_at: "2026-07-19T08:01:00.000Z",
    })).toMatchObject({
      agentType: "resourceCollector",
      status: "degraded",
      lastRunAt: "2026-07-19T08:01:00.000Z",
      isMock: false,
      fallbackUsed: true,
      model: "gpt-test",
      promptVersion: "phase4-resource-v1",
      summary: expect.stringContaining("8 candidates"),
    });
  });

  it("maps Phase 3 feedback provenance and agent diagnostics", () => {
    expect(
      mapFeedbackRow({
        id: "feedback-ai",
        kind: "submission",
        submission_id: "submission-1",
        summary: "AI feedback",
        strengths: ["Clear metric"],
        improvements: ["Add error slices"],
        next_actions: ["Create one slice table"],
        xp_awarded: 70,
        skill_deltas: {
          dataHandling: 0,
          modeling: 0.1,
          evaluation: 0.2,
          engineering: 0,
          researchSense: 0,
          productThinking: 0,
          communication: 0,
        },
        source: "ai",
        model: "gpt-5.6-terra",
        prompt_version: "phase3-v1",
        ai_confidence: 0.82,
        adjustment_explanation: "Maintain difficulty.",
        recommended_quest_id: "quest-next",
        created_at: "2026-07-18T18:00:00.000Z",
      }),
    ).toMatchObject({
      source: "ai",
      model: "gpt-5.6-terra",
      promptVersion: "phase3-v1",
      aiConfidence: 0.82,
      adjustmentExplanation: "Maintain difficulty.",
      recommendedQuestId: "quest-next",
    });

    expect(
      mapAgentRunRow({
        agent_type: "coordinator",
        status: "completed",
        summary: "Feedback generated.",
        completed_at: "2026-07-18T18:00:01.000Z",
        created_at: "2026-07-18T18:00:00.000Z",
        is_mock: false,
        model: "gpt-5.6-terra",
        prompt_version: "phase3-v1",
        latency_ms: 900,
        input_tokens: 200,
        output_tokens: 80,
        error_code: null,
        fallback_used: false,
        trace_id: "trace-1",
      }),
    ).toMatchObject({
      isMock: false,
      model: "gpt-5.6-terra",
      promptVersion: "phase3-v1",
      latencyMs: 900,
      inputTokens: 200,
      outputTokens: 80,
      fallbackUsed: false,
      traceId: "trace-1",
    });
  });

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
        scope: "main",
        duration_days: 5,
        execution_steps: ["Run baseline"],
        success_metrics: ["Metric recorded"],
        out_of_scope: ["Deployment"],
        owner_user_id: "user-1",
        source: "ai_generated",
        generation_trace_id: "trace-1",
        generation_model: "gpt-test",
        generation_prompt_version: "daily-v1",
      }),
    ).toMatchObject({
      id: "quest",
      trainingContract: "standard",
      purpose: "calibration",
      estimatedMinutes: 70,
      expectedArtifactType: "githubRepository",
      scope: "main",
      durationDays: 5,
      ownerUserId: "user-1",
      source: "ai_generated",
      generationTraceId: "trace-1",
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
        parent_assignment_id: "assignment-parent",
        checkpoint_index: 2,
        due_at: "2026-07-17T10:00:00.000Z",
        expired_at: null,
        penalty_source_assignment_id: "assignment-source",
      }),
    ).toMatchObject({
      id: "assignment-id",
      latestSubmissionId: "submission-id",
      parentAssignmentId: "assignment-parent",
      checkpointIndex: 2,
      penaltySourceAssignmentId: "assignment-source",
    });

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
        prerequisites: ["Python"],
        required_tools: ["Git"],
        cost_tier: "free",
        availability_status: "available",
        last_checked_at: "2026-07-18T08:00:00.000Z",
        fallback_resource_id: "resource-fallback",
        source: "github",
        external_id: "123",
        canonical_url: "https://github.com/example/resource",
        content_fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        quality_score: 88,
        task_fit: 80,
        published_at: "2026-07-01T08:00:00.000Z",
        updated_at: "2026-07-17T08:00:00.000Z",
        ingested_at: "2026-07-18T08:00:00.000Z",
        metadata_version: "phase4-resource-v1",
      }),
    ).toMatchObject({
      id: "resource",
      resourceType: "repository",
      requiredTools: ["Git"],
      fallbackResourceId: "resource-fallback",
      source: "github",
      qualityScore: 88,
      taskFit: 80,
    });

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
