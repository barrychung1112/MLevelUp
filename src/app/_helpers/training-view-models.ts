import type {
  ActivityEvent,
  AgentStatus,
  EvidenceType as DomainEvidenceType,
  PortfolioArtifact,
  Quest,
  QuestAssignment,
  Resource,
  SubmissionFeedback,
  SkillKey,
  TrainingContract,
  TrainingState,
} from "@/domain/training/types";
import type {
  ActivityView,
  AgentRunView,
  EvidenceType,
  FeedbackView,
  GoalOptionView,
  PortfolioArtifactView,
  QuestView,
  ResourceView,
  SkillStatView,
  TrainingContractView,
  TrendPointView,
} from "@/components/features/view-models";
import { SKILL_KEYS } from "@/domain/training/constants";

export const GOALS: readonly GoalOptionView[] = [
  { id: "job-ready", label: "Become a job-ready ML Engineer" },
  { id: "competition", label: "Improve competition and experimentation skills" },
  { id: "portfolio", label: "Build an ML Engineer portfolio" },
];

export const CONTRACTS: readonly TrainingContractView[] = [
  { id: "foundation", label: "Foundation", timeCommitment: "30–45 minutes daily", description: "Build fundamentals through small, consistently completed missions." },
  { id: "standard", label: "Standard", timeCommitment: "1–2 hours daily", description: "Combine implementation, reading, experiment logs, and portfolio work." },
  { id: "intensive", label: "Intensive", timeCommitment: "3+ hours daily", description: "Train through competitions, deployment, research, and system design." },
];

export const SKILL_LABELS: Record<SkillKey, string> = {
  dataHandling: "Data Handling",
  modeling: "Modeling",
  evaluation: "Evaluation",
  engineering: "Engineering",
  researchSense: "Research Sense",
  productThinking: "Product Thinking",
  communication: "Communication",
};

const CONTRACT_LABELS: Record<TrainingContract, string> = {
  foundation: "Foundation",
  standard: "Standard",
  intensive: "Intensive",
};

const AGENT_LABELS: Record<AgentStatus["agentType"], string> = {
  coordinator: "Coordinator",
  learningStrategist: "Learning Strategist",
  resourceCollector: "Resource Collector",
  adjuster: "Adjuster",
};

const URL_EVIDENCE = new Set<DomainEvidenceType>(["githubCommit", "kaggleNotebook", "deployedApp", "competitionRank"]);
const FILE_EVIDENCE = new Set<DomainEvidenceType>(["screenshot", "modelEvaluationReport", "experimentLog"]);

export function toPresentationEvidenceType(type: DomainEvidenceType): EvidenceType {
  if (URL_EVIDENCE.has(type)) return "url";
  if (FILE_EVIDENCE.has(type)) return "file";
  if (type === "metricResult") return "metric";
  return "text";
}

export function mapQuest(
  assignment: QuestAssignment,
  quest: Quest,
  resources: readonly Resource[] = [],
): QuestView {
  const primarySkill = SKILL_KEYS.reduce((best, key) =>
    quest.skillWeights[key] > quest.skillWeights[best] ? key : best,
  );
  return {
    id: assignment.id,
    title: quest.title,
    summary: quest.summary,
    difficulty: quest.difficulty,
    estimatedMinutes: quest.estimatedMinutes,
    status: assignment.status,
    primarySkill: SKILL_LABELS[primarySkill],
    acceptanceCriteria: quest.acceptanceCriteria,
    evidenceTypes: [...new Set(quest.evidenceRequirements.map((item) => toPresentationEvidenceType(item.type)))],
    scope: quest.scope,
    dueAt: assignment.dueAt ?? null,
    durationDays: quest.durationDays,
    executionSteps: quest.executionSteps,
    successMetrics: quest.successMetrics,
    outOfScope: quest.outOfScope,
    resources: resources.filter((resource) => quest.resourceIds.includes(resource.id)).map(mapResource),
  };
}

export function mapSkills(state: TrainingState): SkillStatView[] {
  return SKILL_KEYS.map((key) => {
    const stat = state.progress.skills[key];
    return { key, label: SKILL_LABELS[key], value: stat.score, delta: stat.lastDelta };
  });
}

export function mapResource(resource: Resource): ResourceView {
  return {
    id: resource.id,
    title: resource.title,
    summary: resource.summary,
    url: resource.url,
    resourceType: resource.resourceType,
    difficulty: resource.difficulty,
    estimatedMinutes: resource.estimatedMinutes,
    skillTags: resource.skillTags.map((key) => SKILL_LABELS[key]),
    relevance: resource.relevance,
    freshness: resource.freshness,
    credibility: resource.credibility,
    qualityScore: resource.qualityScore,
    source: resource.source,
    availabilityStatus: resource.availabilityStatus,
    lastCheckedAt: resource.lastCheckedAt,
  };
}

export function formatTimestamp(instant: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(instant));
  } catch {
    return "Time unavailable";
  }
}

export function mapAgent(agent: AgentStatus, timezone: string): AgentRunView {
  return {
    id: agent.agentType,
    name: AGENT_LABELS[agent.agentType],
    status: agent.status === "completed" ? "complete" : agent.status,
    lastRun: formatTimestamp(agent.lastRunAt, timezone),
    summary: agent.summary,
    provenance: agent.isMock
      ? "Ready"
      : agent.fallbackUsed || agent.status === "degraded"
        ? "Fallback"
        : "AI",
    model: agent.model,
    promptVersion: agent.promptVersion,
    latencyMs: agent.latencyMs,
    errorCode: agent.errorCode,
  };
}

export function mapFeedback(feedback: SubmissionFeedback): FeedbackView {
  const provenance = {
    demo: "Demo",
    deterministic: "Deterministic",
    ai: "AI",
    ai_fallback: "Deterministic fallback",
  } as const;
  return {
    summary: feedback.summary,
    provenance: provenance[feedback.source],
    strengths: feedback.strengths,
    improvements: feedback.improvements,
    nextActions: feedback.nextActions,
    xpAwarded: feedback.xpAwarded,
    skillGrowth: SKILL_KEYS
      .filter((key) => (feedback.skillDeltas?.[key] ?? 0) > 0)
      .map((key) => ({
        label: SKILL_LABELS[key],
        delta: Number((feedback.skillDeltas?.[key] ?? 0).toFixed(1)),
      })),
    adjustmentExplanation: feedback.adjustmentExplanation,
    confidence: feedback.aiConfidence,
    recommendedQuestId: feedback.recommendedQuestId,
  };
}

export function mapArtifact(artifact: PortfolioArtifact): PortfolioArtifactView {
  return {
    id: artifact.id,
    title: artifact.title,
    artifactType: artifact.artifactType,
    skillKeys: artifact.skillTags,
    skillTags: artifact.skillTags.map((key) => SKILL_LABELS[key]),
    artifactUrl: artifact.artifactUrl,
    qualityScore: artifact.qualityScore,
    verificationStatus: artifact.verificationStatus,
    isPrivate: true,
    summary: artifact.description,
  };
}

export function mapActivity(activity: ActivityEvent, timezone: string): ActivityView {
  return {
    id: activity.id,
    eventType: activity.type,
    title: activity.title,
    occurredAt: formatTimestamp(activity.occurredAt, timezone),
    summary: activity.summary,
  };
}

export function currentLevelXp(state: TrainingState): number {
  return Math.max(0, state.progress.totalXp - (state.progress.level - 1) * 500);
}

export function contractLabel(contract: TrainingContract): string {
  return CONTRACT_LABELS[contract];
}

export function latestBy<T>(items: readonly T[], timestamp: (item: T) => string): T | null {
  return [...items].sort((left, right) => timestamp(right).localeCompare(timestamp(left)))[0] ?? null;
}

export function progressTrend(state: TrainingState): TrendPointView[] {
  if (state.xpEvents.length === 0) return [{ label: "Start", value: 0 }];
  let total = 0;
  return [...state.xpEvents]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((event, index) => ({ label: `Mission ${index + 1}`, value: (total += event.awardedXp) }));
}
