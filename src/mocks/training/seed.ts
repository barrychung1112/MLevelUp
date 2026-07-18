import { SKILL_KEYS } from "@/domain/training/constants";
import { localDateForInstant } from "@/domain/training/calendar";
import { TrainingStateSchema } from "@/domain/training/schemas";
import type {
  Quest,
  QuestAssignment,
  SkillStats,
  TrainingContract,
  TrainingState,
} from "@/domain/training/types";

export const SEED_VERSION = "phase1-2026-07-16.2";
export const DEFAULT_TIMEZONE = "America/Los_Angeles";

const quests: Quest[] = [
  {
    id: "quest-foundation-eda",
    trainingContract: "foundation",
    purpose: "training",
    title: "Inspect a small dataset",
    summary: "Find one data-quality issue and report a metric.",
    instructions: "Inspect missing values, distributions, and one target relationship.",
    questType: "dataPractice",
    difficulty: 1,
    estimatedMinutes: 30,
    baseXp: 17,
    optional: false,
    acceptanceCriteria: ["Report one concrete data-quality observation"],
    evidenceRequirements: [{ id: "metric", type: "metricResult", required: true }],
    reflectionMinChars: 40,
    skillWeights: {
      dataHandling: 0.6,
      modeling: 0,
      evaluation: 0.1,
      engineering: 0.1,
      researchSense: 0,
      productThinking: 0.1,
      communication: 0.1,
    },
    resourceIds: ["resource-eda"],
  },
  {
    id: "quest-foundation-note",
    trainingContract: "foundation",
    purpose: "training",
    title: "Write a validation note",
    summary: "Explain why train and validation data must stay separate.",
    instructions: "Write a concise explanation with one leakage example.",
    questType: "communicationExercise",
    difficulty: 1,
    estimatedMinutes: 15,
    baseXp: 15,
    optional: true,
    acceptanceCriteria: ["Include one leakage example"],
    evidenceRequirements: [
      { id: "note", type: "writtenReflection", required: true },
    ],
    reflectionMinChars: 40,
    skillWeights: {
      dataHandling: 0.1,
      modeling: 0,
      evaluation: 0.3,
      engineering: 0,
      researchSense: 0.1,
      productThinking: 0.1,
      communication: 0.4,
    },
    expectedArtifactType: "technicalWriteup",
    resourceIds: ["resource-validation"],
  },
  {
    id: "quest-standard-baseline",
    trainingContract: "standard",
    purpose: "training",
    title: "Ship a reproducible baseline",
    summary: "Train a baseline, document validation, and commit the experiment.",
    instructions: "Create one reproducible training run and commit the result.",
    questType: "modelExperiment",
    difficulty: 3,
    estimatedMinutes: 70,
    baseXp: 70,
    optional: false,
    acceptanceCriteria: ["Commit code for a reproducible baseline"],
    evidenceRequirements: [
      { id: "commit", type: "githubCommit", required: true },
    ],
    reflectionMinChars: 40,
    skillWeights: {
      dataHandling: 0.1,
      modeling: 0.4,
      evaluation: 0.2,
      engineering: 0.2,
      researchSense: 0,
      productThinking: 0,
      communication: 0.1,
    },
    expectedArtifactType: "githubRepository",
    resourceIds: ["resource-baseline"],
  },
  {
    id: "quest-standard-report",
    trainingContract: "standard",
    purpose: "training",
    title: "Package an evaluation report",
    summary: "Turn experiment results into a concise model evaluation report.",
    instructions: "Include the metric, one error slice, and a next experiment.",
    questType: "evaluationPractice",
    difficulty: 2,
    estimatedMinutes: 30,
    baseXp: 23,
    optional: true,
    acceptanceCriteria: ["Include metric, error slice, and next step"],
    evidenceRequirements: [
      { id: "report", type: "modelEvaluationReport", required: true },
    ],
    reflectionMinChars: 40,
    skillWeights: {
      dataHandling: 0.05,
      modeling: 0.1,
      evaluation: 0.45,
      engineering: 0.05,
      researchSense: 0.05,
      productThinking: 0.1,
      communication: 0.2,
    },
    expectedArtifactType: "modelEvaluationReport",
    resourceIds: ["resource-evaluation"],
  },
  {
    id: "quest-intensive-deploy",
    trainingContract: "intensive",
    purpose: "training",
    title: "Deploy a model inference service",
    summary: "Package a model behind an API and expose a working demo.",
    instructions: "Build, validate, and deploy one inference endpoint.",
    questType: "engineeringBuild",
    difficulty: 4,
    estimatedMinutes: 120,
    baseXp: 150,
    optional: false,
    acceptanceCriteria: ["Expose one working HTTPS inference endpoint"],
    evidenceRequirements: [
      { id: "deployment", type: "deployedApp", required: true },
    ],
    reflectionMinChars: 80,
    skillWeights: {
      dataHandling: 0.05,
      modeling: 0.15,
      evaluation: 0.1,
      engineering: 0.45,
      researchSense: 0,
      productThinking: 0.15,
      communication: 0.1,
    },
    expectedArtifactType: "deployedDemo",
    resourceIds: ["resource-deployment"],
  },
  {
    id: "quest-intensive-design",
    trainingContract: "intensive",
    purpose: "training",
    title: "Design a production ML pipeline",
    summary: "Document data, training, deployment, and monitoring boundaries.",
    instructions: "Write a system design note with failure and rollback paths.",
    questType: "engineeringBuild",
    difficulty: 5,
    estimatedMinutes: 75,
    baseXp: 113,
    optional: true,
    acceptanceCriteria: ["Cover monitoring and rollback"],
    evidenceRequirements: [
      { id: "design", type: "systemDesignNote", required: true },
    ],
    reflectionMinChars: 80,
    skillWeights: {
      dataHandling: 0.1,
      modeling: 0.1,
      evaluation: 0.1,
      engineering: 0.3,
      researchSense: 0.1,
      productThinking: 0.2,
      communication: 0.1,
    },
    expectedArtifactType: "systemDesignNote",
    resourceIds: ["resource-mlops"],
  },
  {
    id: "quest-courage-challenge",
    trainingContract: "intensive",
    purpose: "calibration",
    title: "挑戰的勇氣",
    summary: "用一份真實成果證明你願意踏上成長之路。",
    instructions:
      "檢查小型表格資料、建立可重現 baseline、說明 validation 方法與指標，並記錄完成與未完成的部分。",
    questType: "modelExperiment",
    difficulty: 4,
    estimatedMinutes: 90,
    baseXp: 120,
    optional: false,
    acceptanceCriteria: [
      "指出至少一項資料品質問題",
      "建立 baseline 並回報 validation 指標",
      "說明完成、未完成與下一步",
    ],
    evidenceRequirements: [
      { id: "artifact", type: "githubCommit", required: true },
      { id: "metric", type: "metricResult", required: true },
      { id: "reflection", type: "writtenReflection", required: true },
    ],
    reflectionMinChars: 80,
    skillWeights: {
      dataHandling: 0.2,
      modeling: 0.25,
      evaluation: 0.2,
      engineering: 0.15,
      researchSense: 0,
      productThinking: 0,
      communication: 0.2,
    },
    expectedArtifactType: "githubRepository",
    resourceIds: ["resource-baseline", "resource-validation"],
  },
];

function initialSkills(): SkillStats {
  return Object.fromEntries(
    SKILL_KEYS.map((key) => [key, { score: 20, skillXp: 0, lastDelta: 0 }]),
  ) as SkillStats;
}

export function createAssignmentsForContract(
  contract: TrainingContract,
  now: string,
  timezone = DEFAULT_TIMEZONE,
): Record<string, QuestAssignment> {
  const assignedDate = localDateForInstant(now, timezone);
  const plan = quests.filter(
    (quest) => quest.purpose === "training" && quest.trainingContract === contract,
  );

  return Object.fromEntries(
    plan.map((quest, index) => {
      const id = `assignment-${quest.id}-${assignedDate}`;
      const slot = index === 0 ? "primary" : quest.optional ? "optional" : "secondary";
      return [
        id,
        {
          id,
          questId: quest.id,
          assignedDate,
          slot,
          status: "assigned",
          assignedAt: now,
        } satisfies QuestAssignment,
      ];
    }),
  );
}

export function createCourageAssignment(
  now: string,
  timezone = DEFAULT_TIMEZONE,
): Record<string, QuestAssignment> {
  const assignedDate = localDateForInstant(now, timezone);
  const questId = "quest-courage-challenge";
  const id = `assignment-${questId}-${assignedDate}`;
  return {
    [id]: {
      id,
      questId,
      assignedDate,
      slot: "primary",
      status: "assigned",
      assignedAt: now,
    },
  };
}

export function createTrainingSeed(
  now: string,
  timezone = DEFAULT_TIMEZONE,
): TrainingState {
  const questRecord = Object.fromEntries(quests.map((quest) => [quest.id, quest]));
  const state: TrainingState = {
    schemaVersion: 1,
    seedVersion: SEED_VERSION,
    profile: {
      id: "user-demo",
      displayName: "Demo Hunter",
      goal: "Become a machine learning engineer",
      contract: "standard",
      weeklyMinutes: 600,
      timezone,
      onboardingCompleted: false,
      challengeAcceptedAt: null,
    },
    progress: {
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastQualifiedDate: null,
      skills: initialSkills(),
    },
    quests: questRecord,
    assignments: createAssignmentsForContract("standard", now, timezone),
    submissions: {},
    feedback: {},
    resources: [
      {
        id: "resource-eda",
        title: "Practical exploratory data analysis",
        summary: "A compact checklist for finding data-quality risks.",
        url: "https://example.com/resources/eda",
        resourceType: "article",
        difficulty: 1,
        estimatedMinutes: 15,
        skillTags: ["dataHandling"],
        relevance: 90,
        freshness: 82,
        credibility: 84,
      },
      {
        id: "resource-validation",
        title: "Validation strategies",
        summary: "Choose a split that matches the product decision.",
        url: "https://example.com/resources/validation",
        resourceType: "article",
        difficulty: 2,
        estimatedMinutes: 20,
        skillTags: ["evaluation"],
        relevance: 94,
        freshness: 78,
        credibility: 91,
      },
      {
        id: "resource-baseline",
        title: "Reproducible baselines",
        summary: "Turn the first model into a trustworthy experiment.",
        url: "https://example.com/resources/baseline",
        resourceType: "repository",
        difficulty: 3,
        estimatedMinutes: 25,
        skillTags: ["modeling", "engineering"],
        relevance: 96,
        freshness: 86,
        credibility: 89,
      },
      {
        id: "resource-evaluation",
        title: "Model error analysis",
        summary: "Move from one metric to actionable error slices.",
        url: "https://example.com/resources/error-analysis",
        resourceType: "article",
        difficulty: 3,
        estimatedMinutes: 30,
        skillTags: ["evaluation", "communication"],
        relevance: 93,
        freshness: 85,
        credibility: 88,
      },
      {
        id: "resource-deployment",
        title: "Model API deployment",
        summary: "Package inference behind a production-minded API.",
        url: "https://example.com/resources/deployment",
        resourceType: "course",
        difficulty: 4,
        estimatedMinutes: 45,
        skillTags: ["engineering", "productThinking"],
        relevance: 91,
        freshness: 90,
        credibility: 87,
      },
      {
        id: "resource-mlops",
        title: "ML system design patterns",
        summary: "Design data, training, serving, and monitoring boundaries.",
        url: "https://example.com/resources/mlops",
        resourceType: "paper",
        difficulty: 5,
        estimatedMinutes: 40,
        skillTags: ["engineering", "researchSense"],
        relevance: 89,
        freshness: 80,
        credibility: 92,
      },
    ],
    artifacts: [],
    agents: [
      {
        agentType: "coordinator",
        status: "completed",
        lastRunAt: now,
        summary: "Demo daily plan assembled.",
        isMock: true,
      },
      {
        agentType: "learningStrategist",
        status: "completed",
        lastRunAt: now,
        summary: "Demo quest path prepared.",
        isMock: true,
      },
      {
        agentType: "resourceCollector",
        status: "idle",
        lastRunAt: now,
        summary: "Using the Phase 1 mock resource library.",
        isMock: true,
      },
      {
        agentType: "adjuster",
        status: "idle",
        lastRunAt: now,
        summary: "Waiting for the next submission signal.",
        isMock: true,
      },
    ],
    activity: [],
    xpEvents: [],
  };

  return TrainingStateSchema.parse(state);
}
