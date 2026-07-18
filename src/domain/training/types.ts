export type SkillKey =
  | "dataHandling"
  | "modeling"
  | "evaluation"
  | "engineering"
  | "researchSense"
  | "productThinking"
  | "communication";

export type TrainingContract = "foundation" | "standard" | "intensive";
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type QuestPurpose = "calibration" | "training";

export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "reviewing"
  | "needs_revision"
  | "completed"
  | "rejected"
  | "skipped"
  | "expired";

export type EvidenceType =
  | "githubCommit"
  | "kaggleNotebook"
  | "screenshot"
  | "writtenReflection"
  | "metricResult"
  | "deployedApp"
  | "competitionRank"
  | "modelEvaluationReport"
  | "experimentLog"
  | "systemDesignNote";

export type ArtifactType =
  | "kaggleNotebook"
  | "githubRepository"
  | "modelEvaluationReport"
  | "deployedDemo"
  | "technicalWriteup"
  | "experimentLog"
  | "competitionSubmission"
  | "systemDesignNote"
  | "projectRetrospective";

export type QuestType =
  | "dataPractice"
  | "modelExperiment"
  | "evaluationPractice"
  | "engineeringBuild"
  | "researchReview"
  | "productExercise"
  | "communicationExercise";

export interface EvidenceRequirement {
  id: string;
  type: EvidenceType;
  required: boolean;
  acceptedHosts?: string[];
}

export type SkillWeights = Record<SkillKey, number>;
export type TargetRole = "machine-learning-engineer";
export type TrainingStatus = "normal" | "failure_review" | "recovery";
export type QuestScope = "main" | "daily" | "penalty" | "calibration";

export interface Quest {
  id: string;
  trainingContract: TrainingContract;
  purpose: QuestPurpose;
  title: string;
  summary: string;
  instructions: string;
  questType: QuestType;
  difficulty: Difficulty;
  estimatedMinutes: number;
  baseXp: number;
  optional: boolean;
  acceptanceCriteria: string[];
  evidenceRequirements: EvidenceRequirement[];
  reflectionMinChars: number;
  skillWeights: SkillWeights;
  expectedArtifactType?: ArtifactType;
  resourceIds: string[];
  scope: QuestScope;
  durationDays: number;
  executionSteps: string[];
  successMetrics: string[];
  outOfScope: string[];
}

export interface UserProfile {
  id: string;
  displayName: string;
  goal: string;
  contract: TrainingContract;
  weeklyMinutes: number;
  timezone: string;
  onboardingCompleted: boolean;
  challengeAcceptedAt: string | null;
  targetRole: TargetRole;
  dailyMinutes: 300;
  consecutiveFailureDays: number;
  trainingStatus: TrainingStatus;
  recoveryStartedAt: string | null;
  recoveryDeadline: string | null;
}

export type VerificationStatus =
  | "pending"
  | "needs_revision"
  | "verified"
  | "rejected";

export type VerificationMethod = null | "mock" | "manual" | "automatic";

export interface EvidenceRecord {
  id: string;
  requirementId: string;
  type: EvidenceType;
  url?: string;
  text?: string;
  fileName?: string;
  mimeType?: string;
  byteSize?: number;
  metricName?: string;
  metricValue?: number;
}

export interface SkillStat {
  score: number;
  skillXp: number;
  lastDelta: number;
}

export type SkillStats = Record<SkillKey, SkillStat>;
export type SkillXpAllocation = Record<SkillKey, number>;
export type SkillScoreDeltas = Record<SkillKey, number>;

export interface EvaluationScoreBreakdown {
  evidenceCompleteness: number;
  evidenceValidity: number;
  reflection: number;
  artifactReadiness: number;
}

export interface SubmissionEvaluation {
  qualityScore: number;
  verificationStatus: VerificationStatus;
  verificationMethod: VerificationMethod;
  scoreBreakdown: EvaluationScoreBreakdown;
  artifactReady: boolean;
  hardFailures: string[];
}

export type AssignmentSlot = "primary" | "secondary" | "optional";

export interface QuestAssignment {
  id: string;
  questId: string;
  assignedDate: string;
  slot: AssignmentSlot;
  status: AssignmentStatus;
  assignedAt: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  latestSubmissionId?: string;
  parentAssignmentId?: string;
  checkpointIndex?: number;
  dueAt?: string;
  expiredAt?: string;
  penaltySourceAssignmentId?: string;
}

export interface Submission {
  id: string;
  idempotencyKey: string;
  assignmentId: string;
  revisionNo: number;
  evidence: EvidenceRecord[];
  selfReflection: string;
  verificationStatus: VerificationStatus;
  verificationMethod: VerificationMethod;
  qualityScore: number;
  scoreBreakdown: EvaluationScoreBreakdown;
  hardFailures: string[];
  submittedAt: string;
}

export interface SubmissionFeedback {
  id: string;
  kind: "submission" | "daily";
  submissionId?: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
  scoreBreakdown?: EvaluationScoreBreakdown;
  xpAwarded: number;
  skillDeltas: SkillScoreDeltas;
  createdAt: string;
}

export interface UserProgress {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastQualifiedDate: string | null;
  skills: SkillStats;
}

export interface Resource {
  id: string;
  title: string;
  summary: string;
  url: string;
  resourceType: "article" | "competition" | "repository" | "paper" | "course";
  difficulty: Difficulty;
  estimatedMinutes: number;
  skillTags: SkillKey[];
  relevance: number;
  freshness: number;
  credibility: number;
  prerequisites: string[];
  requiredTools: string[];
  costTier: "free" | "paid";
  availabilityStatus: "available" | "unavailable" | "unchecked";
  lastCheckedAt: string | null;
  fallbackResourceId?: string;
}

export type AgentType = "coordinator" | "learningStrategist" | "resourceCollector" | "adjuster";

export interface AgentStatus {
  agentType: AgentType;
  status: "idle" | "running" | "completed" | "degraded";
  lastRunAt: string;
  summary: string;
  isMock: true;
}

export interface PortfolioArtifact {
  id: string;
  submissionId: string;
  assignmentId: string;
  artifactType: ArtifactType;
  title: string;
  description: string;
  artifactUrl?: string;
  skillTags: SkillKey[];
  qualityScore: number;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  type: "questCompleted" | "submissionNeedsRevision" | "artifactCreated" | "trainingReset";
  sourceId: string;
  title: string;
  summary: string;
  occurredAt: string;
}

export interface XpEvent {
  id: string;
  sourceSubmissionId: string;
  baseXp: number;
  qualityMultiplier: number;
  streakMultiplier: number;
  artifactMultiplier: number;
  awardedXp: number;
  createdAt: string;
}

export interface TrainingState {
  schemaVersion: 1;
  seedVersion: string;
  profile: UserProfile;
  progress: UserProgress;
  quests: Record<string, Quest>;
  assignments: Record<string, QuestAssignment>;
  submissions: Record<string, Submission>;
  feedback: Record<string, SubmissionFeedback>;
  resources: Resource[];
  artifacts: PortfolioArtifact[];
  agents: AgentStatus[];
  activity: ActivityEvent[];
  xpEvents: XpEvent[];
}
