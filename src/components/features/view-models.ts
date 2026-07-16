export type PresentationStatus = "ready" | "loading" | "error";

export type LoadableViewProps = {
  status?: PresentationStatus;
  errorMessage?: string;
};

export type GoalOptionView = {
  id: string;
  label: string;
};

export type TrainingContractView = {
  id: string;
  label: string;
  timeCommitment: string;
  description: string;
};

export type SkillStatView = {
  key: string;
  label: string;
  value: number;
  delta?: number;
};

export type EvidenceType = "url" | "file" | "metric" | "text";

export type QuestView = {
  id: string;
  title: string;
  summary: string;
  difficulty: number;
  estimatedMinutes: number;
  status: string;
  primarySkill: string;
  acceptanceCriteria: readonly string[];
  evidenceTypes: readonly EvidenceType[];
};

export type FileMetadataView = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

export type EvidenceSubmissionView = {
  evidenceType: EvidenceType;
  evidenceUrl?: string;
  fileMetadata?: FileMetadataView;
  metricResult?: string;
  evidenceText?: string;
  selfReflection: string;
};

export type ResourceView = {
  id: string;
  title: string;
  resourceType: string;
  relevance: number;
  difficulty: number;
  freshness: number;
  credibility: number;
  estimatedMinutes: number;
  skillTags: readonly string[];
  summary?: string;
  url?: string;
};

export type AgentRunView = {
  id: string;
  name: string;
  status: string;
  lastRun: string;
  summary: string;
};

export type PortfolioArtifactView = {
  id: string;
  title: string;
  artifactType: string;
  skillTags: readonly string[];
  qualityScore: number;
  verificationStatus: string;
  isPrivate: true;
  summary?: string;
};

export type ActivityView = {
  id: string;
  eventType: string;
  title: string;
  occurredAt: string;
  summary: string;
};

export type ProfilePreferencesView = {
  goalId: string;
  contractId: string;
  weeklyMinutes: number;
};

export type TrendPointView = {
  label: string;
  value: number;
};
