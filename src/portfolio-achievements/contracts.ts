export type AchievementSourceFact = {
  ref: string;
  value: string;
};

export type AchievementBulletCandidate = {
  text: string;
  sourceRefs: readonly string[];
};

export type AchievementValidationErrorCode =
  | "bullet_count"
  | "bullet_length"
  | "source_required"
  | "unknown_source"
  | "ungrounded_number"
  | "duplicate_bullet"
  | "unsupported_claim";

export type AchievementValidationError = {
  code: AchievementValidationErrorCode;
  bulletIndex?: number;
};
