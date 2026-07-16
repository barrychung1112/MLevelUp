import type {
  ActivityEvent,
  AgentStatus,
  EvidenceType as DomainEvidenceType,
  PortfolioArtifact,
  Quest,
  QuestAssignment,
  Resource,
  SkillKey,
  TrainingContract,
  TrainingState,
} from "@/domain/training/types";
import type {
  ActivityView,
  AgentRunView,
  EvidenceType,
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
  { id: "job-ready", label: "成為可就業的 ML Engineer" },
  { id: "competition", label: "提升競賽與實驗能力" },
  { id: "portfolio", label: "建立 ML Engineer 作品集" },
];

export const CONTRACTS: readonly TrainingContractView[] = [
  { id: "foundation", label: "簡單模式", timeCommitment: "每日 30–45 分鐘", description: "拆小任務、穩定完成並建立基礎。" },
  { id: "standard", label: "普通人模式", timeCommitment: "每日 1–2 小時", description: "實作、閱讀、實驗紀錄與作品集並進。" },
  { id: "intensive", label: "超級戰士模式", timeCommitment: "每日 3 小時以上", description: "以競賽、部署、研究與系統設計進行高強度訓練。" },
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
  foundation: "簡單模式",
  standard: "普通人模式",
  intensive: "超級戰士模式",
};

const AGENT_LABELS: Record<AgentStatus["agentType"], string> = {
  coordinator: "協調員 Agent",
  learningStrategist: "學習策略 Agent",
  resourceCollector: "資源收集 Agent",
  adjuster: "調整者 Agent",
};

const URL_EVIDENCE = new Set<DomainEvidenceType>(["githubCommit", "kaggleNotebook", "deployedApp", "competitionRank"]);
const FILE_EVIDENCE = new Set<DomainEvidenceType>(["screenshot", "modelEvaluationReport", "experimentLog"]);

export function toPresentationEvidenceType(type: DomainEvidenceType): EvidenceType {
  if (URL_EVIDENCE.has(type)) return "url";
  if (FILE_EVIDENCE.has(type)) return "file";
  if (type === "metricResult") return "metric";
  return "text";
}

export function mapQuest(assignment: QuestAssignment, quest: Quest): QuestView {
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
    return "時間無法顯示";
  }
}

export function mapAgent(agent: AgentStatus, timezone: string): AgentRunView {
  return {
    id: agent.agentType,
    name: AGENT_LABELS[agent.agentType],
    status: agent.status === "completed" ? "complete" : agent.status,
    lastRun: formatTimestamp(agent.lastRunAt, timezone),
    summary: agent.summary,
  };
}

export function mapArtifact(artifact: PortfolioArtifact): PortfolioArtifactView {
  return {
    id: artifact.id,
    title: artifact.title,
    artifactType: artifact.artifactType,
    skillTags: artifact.skillTags.map((key) => SKILL_LABELS[key]),
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
  if (state.xpEvents.length === 0) return [{ label: "起點", value: 0 }];
  let total = 0;
  return [...state.xpEvents]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((event, index) => ({ label: `任務 ${index + 1}`, value: (total += event.awardedXp) }));
}
