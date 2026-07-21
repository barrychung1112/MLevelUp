export const NAVIGATION_COPY = [
  { href: "/dashboard", label: "Command Center" },
  { href: "/quests", label: "Missions" },
  { href: "/resources", label: "Resources" },
  { href: "/progress", label: "Progress" },
  { href: "/agents", label: "Agent Status" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/archive", label: "Training Archive" },
  { href: "/profile", label: "Profile" },
] as const;

export const SKILL_LABELS = {
  dataHandling: "Data Handling",
  modeling: "Modeling",
  evaluation: "Evaluation",
  engineering: "Engineering",
  researchSense: "Research Sense",
  productThinking: "Product Thinking",
  communication: "Communication",
} as const;

export const AGENT_LABELS = {
  coordinator: "Coordinator",
  learningStrategist: "Learning Strategist",
  resourceCollector: "Resource Collector",
  adjuster: "Adjuster",
} as const;

export const EVIDENCE_TYPE_LABELS = {
  githubCommit: "GitHub commit",
  kaggleNotebook: "Kaggle notebook",
  screenshot: "Screenshot",
  writtenReflection: "Written reflection",
  metricResult: "Metric result",
  deployedApp: "Deployed app",
  competitionRank: "Competition rank",
  modelEvaluationReport: "Model evaluation report",
  experimentLog: "Experiment log",
  systemDesignNote: "System design note",
} as const;

export const COMMON_COPY = {
  loading: "Loading…",
  retry: "Try Again",
  cancel: "Cancel",
  save: "Save Changes",
  close: "Close",
} as const;
