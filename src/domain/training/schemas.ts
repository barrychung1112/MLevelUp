import { z } from "zod";

import { SKILL_KEYS } from "./constants";
import { findArtifactEvidence } from "./evaluate-submission";
import { qualityMultiplier } from "./rewards";

const IsoTimestampSchema = z.iso.datetime({ offset: true });

export const SkillKeySchema = z.enum(SKILL_KEYS);
export const TrainingContractSchema = z.enum([
  "foundation",
  "standard",
  "intensive",
]);
export const DifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export const AssignmentStatusSchema = z.enum([
  "assigned",
  "in_progress",
  "submitted",
  "reviewing",
  "needs_revision",
  "completed",
  "rejected",
  "skipped",
  "expired",
]);
export const EvidenceTypeSchema = z.enum([
  "githubCommit",
  "kaggleNotebook",
  "screenshot",
  "writtenReflection",
  "metricResult",
  "deployedApp",
  "competitionRank",
  "modelEvaluationReport",
  "experimentLog",
  "systemDesignNote",
]);
export const ArtifactTypeSchema = z.enum([
  "kaggleNotebook",
  "githubRepository",
  "modelEvaluationReport",
  "deployedDemo",
  "technicalWriteup",
  "experimentLog",
  "competitionSubmission",
  "systemDesignNote",
  "projectRetrospective",
]);

const SkillWeightsSchema = z
  .strictObject({
    dataHandling: z.number().min(0).max(1),
    modeling: z.number().min(0).max(1),
    evaluation: z.number().min(0).max(1),
    engineering: z.number().min(0).max(1),
    researchSense: z.number().min(0).max(1),
    productThinking: z.number().min(0).max(1),
    communication: z.number().min(0).max(1),
  })
  .refine(
    (weights) =>
      Math.abs(SKILL_KEYS.reduce((sum, key) => sum + weights[key], 0) - 1) <
      0.000_001,
    { message: "Skill weights must sum to 1" },
  );

export const EvidenceRequirementSchema = z.strictObject({
  id: z.string().min(1),
  type: EvidenceTypeSchema,
  required: z.boolean(),
  acceptedHosts: z.array(z.string().min(1)).optional(),
});

const EvidenceRequirementsSchema = z
  .array(EvidenceRequirementSchema)
  .min(1)
  .refine(
    (requirements) =>
      new Set(requirements.map((requirement) => requirement.id)).size ===
      requirements.length,
    { message: "Evidence requirement ids must be unique" },
  );

export const QuestSchema = z.strictObject({
  id: z.string().min(1),
  trainingContract: TrainingContractSchema,
  purpose: z.enum(["calibration", "training"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  instructions: z.string().min(1),
  questType: z.enum([
    "dataPractice",
    "modelExperiment",
    "evaluationPractice",
    "engineeringBuild",
    "researchReview",
    "productExercise",
    "communicationExercise",
  ]),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().positive(),
  baseXp: z.number().int().positive(),
  optional: z.boolean(),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
  evidenceRequirements: EvidenceRequirementsSchema,
  reflectionMinChars: z.number().int().nonnegative(),
  skillWeights: SkillWeightsSchema,
  expectedArtifactType: ArtifactTypeSchema.optional(),
  resourceIds: z.array(z.string().min(1)),
  scope: z.enum(["main", "daily", "penalty", "calibration"]),
  durationDays: z.number().int().positive(),
  executionSteps: z.array(z.string().min(1)).min(1),
  successMetrics: z.array(z.string().min(1)).min(1),
  outOfScope: z.array(z.string().min(1)),
});

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const TimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isValidTimeZone, { message: "Invalid IANA timezone" });

export const UserProfileSchema = z.strictObject({
  id: z.string().min(1),
  displayName: z.string().min(1),
  goal: z.string().min(1),
  contract: TrainingContractSchema,
  weeklyMinutes: z.number().int().positive(),
  timezone: TimeZoneSchema,
  onboardingCompleted: z.boolean(),
  challengeAcceptedAt: IsoTimestampSchema.nullable(),
  targetRole: z.literal("machine-learning-engineer"),
  dailyMinutes: z.literal(300),
  consecutiveFailureDays: z.number().int().nonnegative(),
  trainingStatus: z.enum(["normal", "failure_review", "recovery"]),
  recoveryStartedAt: IsoTimestampSchema.nullable(),
  recoveryDeadline: IsoTimestampSchema.nullable(),
});

const MAX_EVIDENCE_URL_LENGTH = 2_048;

function trimText(value: string): string {
  return value.trim();
}

function normalizeSafeHttpsUrl(value: string): string | undefined {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > MAX_EVIDENCE_URL_LENGTH) {
    return undefined;
  }

  try {
    return new URL(normalized).protocol === "https:" ? normalized : undefined;
  } catch {
    return undefined;
  }
}

const CanonicalRequiredStringSchema = z.string().trim().min(1);
const SafeHttpsUrlSchema = z
  .string()
  .trim()
  .max(MAX_EVIDENCE_URL_LENGTH)
  .refine((value) => normalizeSafeHttpsUrl(value) !== undefined, {
    message: "URL must use HTTPS",
  });
const EvidenceRecordBaseShape = {
  id: CanonicalRequiredStringSchema,
  requirementId: CanonicalRequiredStringSchema,
  type: EvidenceTypeSchema,
  text: z.string().transform(trimText).optional(),
  fileName: CanonicalRequiredStringSchema.optional(),
  mimeType: CanonicalRequiredStringSchema.transform((value) =>
    value.toLowerCase(),
  ).optional(),
  byteSize: z.number().int().positive().optional(),
  metricName: CanonicalRequiredStringSchema.optional(),
  metricValue: z.number().finite().optional(),
};

export const EvidenceRecordSchema = z.strictObject({
  ...EvidenceRecordBaseShape,
  url: SafeHttpsUrlSchema.optional(),
});

const EvidenceRecordInputSchema = z.strictObject({
  ...EvidenceRecordBaseShape,
  url: z
    .string()
    .transform((value) => normalizeSafeHttpsUrl(value))
    .optional(),
});

export const CompleteOnboardingInputSchema = z.strictObject({
  displayName: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  contract: TrainingContractSchema,
  weeklyMinutes: z.number().int().positive(),
  timezone: TimeZoneSchema,
});

export const UpdateProfileInputSchema = CompleteOnboardingInputSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "At least one profile field is required" },
);

export const AssignmentIdInputSchema = z.string().trim().min(1);

export const SubmitQuestInputSchema = z.strictObject({
  idempotencyKey: z
    .string()
    .trim()
    .min(1, { message: "Idempotency key is required" }),
  assignmentId: AssignmentIdInputSchema,
  evidence: z.array(EvidenceRecordInputSchema),
  selfReflection: z.string().transform(trimText),
});

export const SkillStatSchema = z.strictObject({
  score: z.number().min(0).max(100),
  skillXp: z.number().int().nonnegative(),
  lastDelta: z.number().min(0).max(2),
});

export const SkillStatsSchema = z.strictObject({
  dataHandling: SkillStatSchema,
  modeling: SkillStatSchema,
  evaluation: SkillStatSchema,
  engineering: SkillStatSchema,
  researchSense: SkillStatSchema,
  productThinking: SkillStatSchema,
  communication: SkillStatSchema,
});

export const SkillScoreDeltasSchema = z.strictObject({
  dataHandling: z.number().min(0).max(2),
  modeling: z.number().min(0).max(2),
  evaluation: z.number().min(0).max(2),
  engineering: z.number().min(0).max(2),
  researchSense: z.number().min(0).max(2),
  productThinking: z.number().min(0).max(2),
  communication: z.number().min(0).max(2),
});

export const EvaluationScoreBreakdownSchema = z.strictObject({
  evidenceCompleteness: z.number().min(0).max(45),
  evidenceValidity: z.number().min(0).max(25),
  reflection: z.number().min(0).max(20),
  artifactReadiness: z.number().min(0).max(10),
});

export const QuestAssignmentSchema = z.strictObject({
  id: z.string().min(1),
  questId: z.string().min(1),
  assignedDate: z.iso.date(),
  slot: z.enum(["primary", "secondary", "optional"]),
  status: AssignmentStatusSchema,
  assignedAt: IsoTimestampSchema,
  startedAt: IsoTimestampSchema.optional(),
  submittedAt: IsoTimestampSchema.optional(),
  completedAt: IsoTimestampSchema.optional(),
  latestSubmissionId: z.string().min(1).optional(),
  parentAssignmentId: z.string().min(1).optional(),
  checkpointIndex: z.number().int().nonnegative().optional(),
  dueAt: IsoTimestampSchema.optional(),
  expiredAt: IsoTimestampSchema.optional(),
  penaltySourceAssignmentId: z.string().min(1).optional(),
});

export const SubmissionSchema = z.strictObject({
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  assignmentId: z.string().min(1),
  revisionNo: z.number().int().positive(),
  evidence: z.array(EvidenceRecordSchema),
  selfReflection: z.string().transform(trimText),
  verificationStatus: z.enum([
    "pending",
    "needs_revision",
    "verified",
    "rejected",
  ]),
  verificationMethod: z.enum(["mock", "manual", "automatic"]).nullable(),
  qualityScore: z.number().min(0).max(100),
  scoreBreakdown: EvaluationScoreBreakdownSchema,
  hardFailures: z.array(z.string()),
  submittedAt: IsoTimestampSchema,
});

export const SubmissionFeedbackSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(["submission", "daily"]),
  submissionId: z.string().min(1).optional(),
  summary: z.string().min(1),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  nextActions: z.array(z.string()),
  scoreBreakdown: EvaluationScoreBreakdownSchema.optional(),
  xpAwarded: z.number().int().nonnegative(),
  skillDeltas: SkillScoreDeltasSchema,
  createdAt: IsoTimestampSchema,
});

export const UserProgressSchema = z.strictObject({
  totalXp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  lastQualifiedDate: z.iso.date().nullable(),
  skills: SkillStatsSchema,
});

export const ResourceSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  url: z.url(),
  resourceType: z.enum(["article", "competition", "repository", "paper", "course"]),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().positive(),
  skillTags: z.array(SkillKeySchema).min(1),
  relevance: z.number().min(0).max(100),
  freshness: z.number().min(0).max(100),
  credibility: z.number().min(0).max(100),
  prerequisites: z.array(z.string().min(1)),
  requiredTools: z.array(z.string().min(1)),
  costTier: z.enum(["free", "paid"]),
  availabilityStatus: z.enum(["available", "unavailable", "unchecked"]),
  lastCheckedAt: IsoTimestampSchema.nullable(),
  fallbackResourceId: z.string().min(1).optional(),
});

export const AgentStatusSchema = z.strictObject({
  agentType: z.enum([
    "coordinator",
    "learningStrategist",
    "resourceCollector",
    "adjuster",
  ]),
  status: z.enum(["idle", "running", "completed", "degraded"]),
  lastRunAt: IsoTimestampSchema,
  summary: z.string().min(1),
  isMock: z.literal(true),
});

export const PortfolioArtifactSchema = z.strictObject({
  id: z.string().min(1),
  submissionId: z.string().min(1),
  assignmentId: z.string().min(1),
  artifactType: ArtifactTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  artifactUrl: SafeHttpsUrlSchema.optional(),
  skillTags: z.array(SkillKeySchema).min(1),
  qualityScore: z.number().min(0).max(100),
  verificationStatus: z.enum([
    "pending",
    "needs_revision",
    "verified",
    "rejected",
  ]),
  createdAt: IsoTimestampSchema,
});

export const ActivityEventSchema = z.strictObject({
  id: z.string().min(1),
  type: z.enum(["questCompleted", "submissionNeedsRevision", "artifactCreated", "trainingReset"]),
  sourceId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  occurredAt: IsoTimestampSchema,
});

export const XpEventSchema = z.strictObject({
  id: z.string().min(1),
  sourceSubmissionId: z.string().min(1),
  baseXp: z.number().int().positive(),
  qualityMultiplier: z.number().nonnegative(),
  streakMultiplier: z.number().min(1).max(1.1),
  artifactMultiplier: z.number().min(1).max(1.25),
  awardedXp: z.number().int().nonnegative(),
  createdAt: IsoTimestampSchema,
});

export const TrainingStateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  seedVersion: z.string().min(1),
  profile: UserProfileSchema,
  progress: UserProgressSchema,
  quests: z.record(z.string(), QuestSchema),
  assignments: z.record(z.string(), QuestAssignmentSchema),
  submissions: z.record(z.string(), SubmissionSchema),
  feedback: z.record(z.string(), SubmissionFeedbackSchema),
  resources: z.array(ResourceSchema),
  artifacts: z.array(PortfolioArtifactSchema),
  agents: z.array(AgentStatusSchema),
  activity: z.array(ActivityEventSchema),
  xpEvents: z.array(XpEventSchema),
}).superRefine((state, context) => {
  const keyedCollections = [
    ["quests", state.quests],
    ["assignments", state.assignments],
    ["submissions", state.submissions],
    ["feedback", state.feedback],
  ] as const;

  for (const [collectionName, collection] of keyedCollections) {
    for (const [recordKey, entity] of Object.entries(collection)) {
      if (recordKey !== entity.id) {
        context.addIssue({
          code: "custom",
          path: [collectionName, recordKey],
          message: "Record key must match entity id",
        });
      }
    }
  }

  const checkUniqueIds = (
    collectionName: "resources" | "artifacts" | "activity" | "xpEvents",
    entities: ReadonlyArray<{ id: string }>,
  ) => {
    const seenIds = new Set<string>();
    for (const [index, entity] of entities.entries()) {
      if (seenIds.has(entity.id)) {
        context.addIssue({
          code: "custom",
          path: [collectionName, index, "id"],
          message: `${collectionName} entity ids must be unique`,
        });
      }
      seenIds.add(entity.id);
    }
  };
  checkUniqueIds("resources", state.resources);
  checkUniqueIds("artifacts", state.artifacts);
  checkUniqueIds("activity", state.activity);
  checkUniqueIds("xpEvents", state.xpEvents);

  const resourceIds = new Set(state.resources.map((resource) => resource.id));
  for (const [questId, quest] of Object.entries(state.quests)) {
    for (const resourceId of quest.resourceIds) {
      if (!resourceIds.has(resourceId)) {
        context.addIssue({
          code: "custom",
          path: ["quests", questId, "resourceIds"],
          message: "Quest must reference existing resources",
        });
      }
    }
  }

  for (const [assignmentId, assignment] of Object.entries(state.assignments)) {
    if (!state.quests[assignment.questId]) {
      context.addIssue({
        code: "custom",
        path: ["assignments", assignmentId, "questId"],
        message: "Assignment must reference an existing quest",
      });
    }
    if (assignment.latestSubmissionId) {
      const submission = state.submissions[assignment.latestSubmissionId];
      if (!submission || submission.assignmentId !== assignment.id) {
        context.addIssue({
          code: "custom",
          path: ["assignments", assignmentId, "latestSubmissionId"],
          message:
            "Assignment latest submission must exist and reference the assignment",
        });
      }
    }
  }

  const idempotencyKeys = new Set<string>();
  for (const [submissionId, submission] of Object.entries(state.submissions)) {
    if (!state.assignments[submission.assignmentId]) {
      context.addIssue({
        code: "custom",
        path: ["submissions", submissionId, "assignmentId"],
        message: "Submission must reference an existing assignment",
      });
    }
    if (idempotencyKeys.has(submission.idempotencyKey)) {
      context.addIssue({
        code: "custom",
        path: ["submissions", submissionId, "idempotencyKey"],
        message: "Submission idempotency key must be unique",
      });
    }
    idempotencyKeys.add(submission.idempotencyKey);
  }

  for (const [feedbackId, feedback] of Object.entries(state.feedback)) {
    if (feedback.kind === "submission" && !feedback.submissionId) {
      context.addIssue({
        code: "custom",
        path: ["feedback", feedbackId, "submissionId"],
        message: "Submission feedback must reference a submission",
      });
    }
    if (feedback.submissionId && !state.submissions[feedback.submissionId]) {
      context.addIssue({
        code: "custom",
        path: ["feedback", feedbackId, "submissionId"],
        message: "Feedback must reference an existing submission",
      });
    }
  }

  for (const [index, artifact] of state.artifacts.entries()) {
    const submission = state.submissions[artifact.submissionId];
    const assignment = state.assignments[artifact.assignmentId];
    if (!submission || !assignment) {
      context.addIssue({
        code: "custom",
        path: ["artifacts", index],
        message: "Artifact must reference an existing submission and assignment",
      });
    } else if (submission.assignmentId !== assignment.id) {
      context.addIssue({
        code: "custom",
        path: ["artifacts", index, "assignmentId"],
        message: "Artifact submission must belong to its assignment",
      });
    }
  }

  const artifactIds = new Set(state.artifacts.map((artifact) => artifact.id));
  for (const [index, event] of state.activity.entries()) {
    const sourceExists =
      event.type === "questCompleted"
        ? Boolean(state.assignments[event.sourceId])
        : event.type === "submissionNeedsRevision"
          ? Boolean(state.submissions[event.sourceId])
          : artifactIds.has(event.sourceId);
    if (!sourceExists) {
      context.addIssue({
        code: "custom",
        path: ["activity", index, "sourceId"],
        message: "Activity must reference an existing source entity",
      });
    }
  }

  const agentTypes = new Set<string>();
  for (const [index, agent] of state.agents.entries()) {
    if (agentTypes.has(agent.agentType)) {
      context.addIssue({
        code: "custom",
        path: ["agents", index, "agentType"],
        message: "Agent types must be unique",
      });
    }
    agentTypes.add(agent.agentType);
  }

  const xpSources = new Set<string>();
  let ledgerTotal = 0;
  for (const [index, event] of state.xpEvents.entries()) {
    ledgerTotal += event.awardedXp;
    const submission = state.submissions[event.sourceSubmissionId];
    if (!submission) {
      context.addIssue({
        code: "custom",
        path: ["xpEvents", index, "sourceSubmissionId"],
        message: "XP event must reference an existing submission",
      });
    } else {
      if (
        submission.verificationStatus !== "verified" ||
        submission.hardFailures.length > 0 ||
        submission.qualityScore < 60
      ) {
        context.addIssue({
          code: "custom",
          path: ["xpEvents", index, "sourceSubmissionId"],
          message:
            "XP source submission must be verified, eligible, and free of hard failures",
        });
      }

      const assignment = state.assignments[submission.assignmentId];
      const quest = assignment ? state.quests[assignment.questId] : undefined;
      if (quest) {
        const expectedQualityMultiplier = qualityMultiplier(
          submission.qualityScore,
        );
        const artifactReady = Boolean(
          findArtifactEvidence(quest, submission.evidence),
        );
        const expectedArtifactMultiplier =
          artifactReady && submission.qualityScore >= 80 ? 1.25 : 1;
        const streakStep = (event.streakMultiplier - 1) * 100;
        const validStreakStep =
          Math.abs(streakStep - Math.round(streakStep)) < 0.000_001;
        const expectedAwardedXp = Math.round(
          quest.baseXp *
            expectedQualityMultiplier *
            event.streakMultiplier *
            expectedArtifactMultiplier,
        );

        if (
          event.baseXp !== quest.baseXp ||
          event.qualityMultiplier !== expectedQualityMultiplier ||
          event.artifactMultiplier !== expectedArtifactMultiplier ||
          !validStreakStep ||
          event.awardedXp !== expectedAwardedXp
        ) {
          context.addIssue({
            code: "custom",
            path: ["xpEvents", index],
            message:
              "XP event base XP, multipliers, and awarded XP must match the reward formula",
          });
        }
      }

      const rewardFeedback = Object.values(state.feedback).filter(
        (feedback) =>
          feedback.kind === "submission" &&
          feedback.submissionId === submission.id,
      );
      if (
        rewardFeedback.length !== 1 ||
        rewardFeedback[0].xpAwarded !== event.awardedXp
      ) {
        context.addIssue({
          code: "custom",
          path: ["xpEvents", index, "awardedXp"],
          message: "XP event reward must match exactly one submission feedback record",
        });
      }
    }
    if (xpSources.has(event.sourceSubmissionId)) {
      context.addIssue({
        code: "custom",
        path: ["xpEvents", index, "sourceSubmissionId"],
        message: "XP source must be unique",
      });
    }
    xpSources.add(event.sourceSubmissionId);
  }

  for (const [feedbackId, feedback] of Object.entries(state.feedback)) {
    if (
      feedback.kind === "submission" &&
      feedback.xpAwarded > 0 &&
      (!feedback.submissionId || !xpSources.has(feedback.submissionId))
    ) {
      context.addIssue({
        code: "custom",
        path: ["feedback", feedbackId, "xpAwarded"],
        message: "Positive feedback reward must reference an XP event",
      });
    }
  }

  if (ledgerTotal !== state.progress.totalXp) {
    context.addIssue({
      code: "custom",
      path: ["progress", "totalXp"],
      message: "Total XP must equal XP event ledger",
    });
  }

  const expectedLevel = 1 + Math.floor(state.progress.totalXp / 500);
  if (state.progress.level !== expectedLevel) {
    context.addIssue({
      code: "custom",
      path: ["progress", "level"],
      message: "Level must match total XP",
    });
  }
});
