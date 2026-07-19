import type { Difficulty, SkillKey, TrainingContract } from "./types";

export const SKILL_KEYS = [
  "dataHandling",
  "modeling",
  "evaluation",
  "engineering",
  "researchSense",
  "productThinking",
  "communication",
] as const satisfies readonly SkillKey[];

export const TRAINING_CONTRACTS = {
  foundation: {
    label: "簡單模式",
    dailyMinutes: { min: 30, max: 45 },
  },
  standard: {
    label: "普通人模式",
    dailyMinutes: { min: 60, max: 120 },
  },
  intensive: {
    label: "超級戰士模式",
    dailyMinutes: { min: 180, max: null },
  },
} as const satisfies Record<
  TrainingContract,
  { label: string; dailyMinutes: { min: number; max: number | null } }
>;

export const DIFFICULTY_FACTORS = {
  1: 0.55,
  2: 0.75,
  3: 1,
  4: 1.25,
  5: 1.5,
} as const satisfies Record<Difficulty, number>;

export const PENALTY_DUE_HOURS = 24;
export const RECOVERY_WINDOW_HOURS = 72;
export const FAILURE_REVIEW_THRESHOLD_DAYS = 7;
export const MAINLINE_DAILY_MINUTES = 300;
export const DAILY_QUEST_MAX_MINUTES = 60;
