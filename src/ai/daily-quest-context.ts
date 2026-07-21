import { difficultyCeiling } from "@/domain/training/adaptive-selector";
import { SKILL_KEYS } from "@/domain/training/constants";
import type {
  ArtifactType,
  Resource,
  SkillKey,
  TrainingState,
} from "@/domain/training/types";

const MAX_RECENT_DAILY_QUESTS = 7;
const MAX_AVAILABLE_RESOURCES = 10;

export interface DailyQuestGenerationResource {
  id: string;
  title: string;
  resourceType: Resource["resourceType"];
  difficulty: Resource["difficulty"];
  estimatedMinutes: number;
  skillTags: SkillKey[];
  costTier: Resource["costTier"];
  availabilityStatus: Resource["availabilityStatus"];
}

export interface DailyQuestGenerationContext {
  targetRole: "machine-learning-engineer";
  trainingStatus: TrainingState["profile"]["trainingStatus"];
  difficultyCeiling: ReturnType<typeof difficultyCeiling>;
  weakestSkills: SkillKey[];
  skills: Record<SkillKey, number>;
  recentDailyQuests: Array<{
    title: string;
    status: TrainingState["assignments"][string]["status"];
    qualityScore: number | null;
  }>;
  portfolioArtifactCounts: Partial<Record<ArtifactType, number>>;
  availableResources: DailyQuestGenerationResource[];
}

export function buildDailyQuestGenerationContext(
  state: TrainingState,
): DailyQuestGenerationContext {
  const skills = Object.fromEntries(
    SKILL_KEYS.map((key) => [key, state.progress.skills[key].score]),
  ) as Record<SkillKey, number>;
  const weakestSkills = [...SKILL_KEYS]
    .sort((left, right) => skills[left] - skills[right] || left.localeCompare(right))
    .slice(0, 2);
  const recentDailyQuests = Object.values(state.assignments)
    .filter((assignment) => state.quests[assignment.questId]?.scope === "daily")
    .sort((left, right) => right.assignedAt.localeCompare(left.assignedAt))
    .slice(0, MAX_RECENT_DAILY_QUESTS)
    .map((assignment) => ({
      title: state.quests[assignment.questId].title,
      status: assignment.status,
      qualityScore: assignment.latestSubmissionId
        ? state.submissions[assignment.latestSubmissionId]?.qualityScore ?? null
        : null,
    }));
  const portfolioArtifactCounts = state.artifacts.reduce<Partial<Record<ArtifactType, number>>>(
    (counts, artifact) => {
      counts[artifact.artifactType] = (counts[artifact.artifactType] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const availableResources = state.resources
    .filter((resource) => resource.availabilityStatus === "available")
    .sort((left, right) =>
      (right.taskFit ?? right.relevance) - (left.taskFit ?? left.relevance) ||
      left.id.localeCompare(right.id),
    )
    .slice(0, MAX_AVAILABLE_RESOURCES)
    .map((resource) => ({
      id: resource.id,
      title: resource.title,
      resourceType: resource.resourceType,
      difficulty: resource.difficulty,
      estimatedMinutes: resource.estimatedMinutes,
      skillTags: resource.skillTags,
      costTier: resource.costTier,
      availabilityStatus: resource.availabilityStatus,
    }));

  return {
    targetRole: state.profile.targetRole,
    trainingStatus: state.profile.trainingStatus,
    difficultyCeiling: difficultyCeiling(state.progress.skills),
    weakestSkills,
    skills,
    recentDailyQuests,
    portfolioArtifactCounts,
    availableResources,
  };
}
