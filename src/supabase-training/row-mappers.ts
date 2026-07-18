import { SKILL_KEYS } from "@/domain/training/constants";
import {
  QuestSchema,
  ResourceSchema,
  SkillStatsSchema,
  type SubmissionFeedbackSchema,
} from "@/domain/training/schemas";
import type {
  AgentStatus,
  PortfolioArtifact,
  Quest,
  QuestAssignment,
  Resource,
  SkillStats,
  Submission,
  SubmissionFeedback,
} from "@/domain/training/types";

export type QuestRow = {
  id: string;
  training_contract: Quest["trainingContract"];
  purpose: Quest["purpose"];
  title: string;
  summary: string;
  instructions: string;
  quest_type: Quest["questType"];
  difficulty: Quest["difficulty"];
  estimated_minutes: number;
  base_xp: number;
  optional: boolean;
  acceptance_criteria: Quest["acceptanceCriteria"];
  evidence_requirements: Quest["evidenceRequirements"];
  reflection_min_chars: number;
  skill_weights: Quest["skillWeights"];
  expected_artifact_type: Quest["expectedArtifactType"] | null;
  resource_ids: string[];
  scope?: Quest["scope"];
  duration_days?: number;
  execution_steps?: string[];
  success_metrics?: string[];
  out_of_scope?: string[];
};

export type ResourceRow = {
  id: string;
  title: string;
  summary: string;
  url: string;
  resource_type: Resource["resourceType"];
  difficulty: Resource["difficulty"];
  estimated_minutes: number;
  skill_tags: Resource["skillTags"];
  relevance: number;
  freshness: number;
  credibility: number;
  prerequisites?: string[];
  required_tools?: string[];
  cost_tier?: Resource["costTier"];
  availability_status?: Resource["availabilityStatus"];
  last_checked_at?: string | null;
  fallback_resource_id?: string | null;
};

export type SkillStatRow = {
  skill_key: keyof SkillStats;
  score: number;
  skill_xp: number;
  last_delta: number;
};

export type AssignmentRow = {
  id: string;
  quest_id: string;
  assigned_date: string;
  slot: QuestAssignment["slot"];
  status: QuestAssignment["status"];
  assigned_at: string;
  started_at?: string | null;
  submitted_at?: string | null;
  completed_at?: string | null;
  latest_submission_id?: string | null;
  parent_assignment_id?: string | null;
  checkpoint_index?: number | null;
  due_at?: string | null;
  expired_at?: string | null;
  penalty_source_assignment_id?: string | null;
};

export type SubmissionRow = {
  id: string;
  idempotency_key: string;
  assignment_id: string;
  revision_no: number;
  evidence: Submission["evidence"];
  self_reflection: string;
  verification_status: Submission["verificationStatus"];
  verification_method: Submission["verificationMethod"];
  quality_score: number;
  score_breakdown: Submission["scoreBreakdown"];
  hard_failures: Submission["hardFailures"];
  submitted_at: string;
};

export type FeedbackRow = {
  id: string;
  kind: SubmissionFeedback["kind"];
  submission_id?: string | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  next_actions: string[];
  score_breakdown?: SubmissionFeedback["scoreBreakdown"] | null;
  xp_awarded: number;
  skill_deltas: SubmissionFeedback["skillDeltas"];
  source?: SubmissionFeedback["source"] | null;
  model?: string | null;
  prompt_version?: string | null;
  ai_confidence?: number | null;
  adjustment_explanation?: string | null;
  recommended_quest_id?: string | null;
  created_at: string;
};

export type PortfolioArtifactRow = {
  id: string;
  submission_id?: string | null;
  assignment_id?: string | null;
  artifact_type: PortfolioArtifact["artifactType"];
  title: string;
  description: string;
  artifact_url?: string | null;
  skill_tags: PortfolioArtifact["skillTags"];
  quality_score: number;
  verification_status: PortfolioArtifact["verificationStatus"];
  created_at: string;
};

export type AgentRunRow = {
  agent_type: AgentStatus["agentType"];
  status: AgentStatus["status"];
  summary: string;
  completed_at?: string | null;
  started_at?: string | null;
  created_at: string;
  is_mock: boolean;
  model?: string | null;
  prompt_version?: string | null;
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  error_code?: string | null;
  fallback_used?: boolean | null;
  trace_id?: string | null;
};

export function mapQuestRow(row: QuestRow): Quest {
  return QuestSchema.parse({
    id: row.id,
    trainingContract: row.training_contract,
    purpose: row.purpose,
    title: row.title,
    summary: row.summary,
    instructions: row.instructions,
    questType: row.quest_type,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    baseXp: row.base_xp,
    optional: row.optional,
    acceptanceCriteria: row.acceptance_criteria,
    evidenceRequirements: row.evidence_requirements,
    reflectionMinChars: row.reflection_min_chars,
    skillWeights: row.skill_weights,
    expectedArtifactType: row.expected_artifact_type ?? undefined,
    resourceIds: row.resource_ids,
    scope: row.scope ?? (row.purpose === "calibration" ? "calibration" : "daily"),
    durationDays: row.duration_days ?? 1,
    executionSteps: row.execution_steps ?? [row.instructions],
    successMetrics: row.success_metrics ?? row.acceptance_criteria,
    outOfScope: row.out_of_scope ?? [],
  });
}

export function mapResourceRow(row: ResourceRow): Resource {
  return ResourceSchema.parse({
    id: row.id,
    title: row.title,
    summary: row.summary,
    url: row.url,
    resourceType: row.resource_type,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    skillTags: row.skill_tags,
    relevance: row.relevance,
    freshness: row.freshness,
    credibility: row.credibility,
    prerequisites: row.prerequisites ?? [],
    requiredTools: row.required_tools ?? [],
    costTier: row.cost_tier ?? "free",
    availabilityStatus: row.availability_status ?? "available",
    lastCheckedAt: row.last_checked_at ?? null,
    fallbackResourceId: row.fallback_resource_id ?? undefined,
  });
}

export function mapSkillStatsRows(rows: SkillStatRow[]): SkillStats {
  const skills = Object.fromEntries(
    SKILL_KEYS.map((key) => [key, { score: 20, skillXp: 0, lastDelta: 0 }]),
  ) as SkillStats;

  for (const row of rows) {
    skills[row.skill_key] = {
      score: Number(row.score),
      skillXp: row.skill_xp,
      lastDelta: Number(row.last_delta),
    };
  }

  return SkillStatsSchema.parse(skills);
}

export function mapAssignmentRow(row: AssignmentRow): QuestAssignment {
  return {
    id: row.id,
    questId: row.quest_id,
    assignedDate: row.assigned_date,
    slot: row.slot,
    status: row.status,
    assignedAt: row.assigned_at,
    startedAt: row.started_at ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    latestSubmissionId: row.latest_submission_id ?? undefined,
    parentAssignmentId: row.parent_assignment_id ?? undefined,
    checkpointIndex: row.checkpoint_index ?? undefined,
    dueAt: row.due_at ?? undefined,
    expiredAt: row.expired_at ?? undefined,
    penaltySourceAssignmentId: row.penalty_source_assignment_id ?? undefined,
  };
}

export function mapSubmissionRow(row: SubmissionRow): Submission {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    assignmentId: row.assignment_id,
    revisionNo: row.revision_no,
    evidence: row.evidence,
    selfReflection: row.self_reflection,
    verificationStatus: row.verification_status,
    verificationMethod: row.verification_method,
    qualityScore: row.quality_score,
    scoreBreakdown: row.score_breakdown,
    hardFailures: row.hard_failures,
    submittedAt: row.submitted_at,
  };
}

export function mapFeedbackRow(row: FeedbackRow): SubmissionFeedback {
  const feedback: SubmissionFeedback = {
    id: row.id,
    kind: row.kind,
    submissionId: row.submission_id ?? undefined,
    summary: row.summary,
    strengths: row.strengths,
    improvements: row.improvements,
    nextActions: row.next_actions,
    scoreBreakdown: row.score_breakdown ?? undefined,
    xpAwarded: row.xp_awarded,
    skillDeltas: row.skill_deltas,
    source: row.source ?? "demo",
    model: row.model ?? undefined,
    promptVersion: row.prompt_version ?? undefined,
    aiConfidence: row.ai_confidence ?? undefined,
    adjustmentExplanation: row.adjustment_explanation ?? undefined,
    recommendedQuestId: row.recommended_quest_id ?? undefined,
    createdAt: row.created_at,
  };

  return feedback satisfies typeof SubmissionFeedbackSchema._output;
}

export function mapPortfolioArtifactRow(row: PortfolioArtifactRow): PortfolioArtifact {
  return {
    id: row.id,
    submissionId: row.submission_id ?? "",
    assignmentId: row.assignment_id ?? "",
    artifactType: row.artifact_type,
    title: row.title,
    description: row.description,
    artifactUrl: row.artifact_url ?? undefined,
    skillTags: row.skill_tags,
    qualityScore: row.quality_score,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
  };
}

export function mapAgentRunRow(row: AgentRunRow): AgentStatus {
  return {
    agentType: row.agent_type,
    status: row.status,
    lastRunAt: row.completed_at ?? row.started_at ?? row.created_at,
    summary: row.summary,
    isMock: row.is_mock,
    model: row.model ?? undefined,
    promptVersion: row.prompt_version ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    inputTokens: row.input_tokens ?? undefined,
    outputTokens: row.output_tokens ?? undefined,
    errorCode: row.error_code ?? undefined,
    fallbackUsed: row.fallback_used ?? undefined,
    traceId: row.trace_id ?? undefined,
  };
}
