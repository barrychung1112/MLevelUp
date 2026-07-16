import { DIFFICULTY_FACTORS, SKILL_KEYS } from "./constants";
import type {
  Difficulty,
  SkillScoreDeltas,
  SkillStats,
  SkillWeights,
  SkillXpAllocation,
  VerificationStatus,
} from "./types";

export function qualityMultiplier(qualityScore: number): number {
  if (qualityScore < 60) return 0;
  if (qualityScore < 70) return 0.6;
  if (qualityScore < 80) return 0.8;
  if (qualityScore < 90) return 1;
  return 1.2;
}

export function levelForXp(totalXp: number): number {
  return 1 + Math.floor(Math.max(0, totalXp) / 500);
}

function zeroAllocation(): SkillXpAllocation {
  return Object.fromEntries(SKILL_KEYS.map((key) => [key, 0])) as SkillXpAllocation;
}

export function allocateSkillXp(
  totalXp: number,
  weights: SkillWeights,
): SkillXpAllocation {
  const safeTotal = Math.max(0, Math.round(totalXp));
  const exact = SKILL_KEYS.map((key, index) => ({
    key,
    index,
    value: safeTotal * weights[key],
  }));
  const result = zeroAllocation();
  let assigned = 0;

  for (const item of exact) {
    result[item.key] = Math.floor(item.value);
    assigned += result[item.key];
  }

  const byRemainder = [...exact].sort(
    (left, right) =>
      right.value - Math.floor(right.value) -
        (left.value - Math.floor(left.value)) || left.index - right.index,
  );

  for (let index = 0; index < safeTotal - assigned; index += 1) {
    const item = byRemainder[index % byRemainder.length];
    result[item.key] += 1;
  }

  return result;
}

export function calculateScoreDeltas(
  skillXp: SkillXpAllocation,
  currentSkills: SkillStats,
  difficulty: Difficulty,
): SkillScoreDeltas {
  return Object.fromEntries(
    SKILL_KEYS.map((key) => {
      const headroom = Math.max(0, 1 - currentSkills[key].score / 100);
      const raw =
        (skillXp[key] / 100) * DIFFICULTY_FACTORS[difficulty] * headroom;
      return [key, Number(Math.min(2, raw).toFixed(4))];
    }),
  ) as SkillScoreDeltas;
}

export interface CalculateRewardInput {
  baseXp: number;
  qualityScore: number;
  verificationStatus: VerificationStatus;
  streakDays: number;
  artifactReady: boolean;
  difficulty: Difficulty;
  skillWeights: SkillWeights;
  currentSkills: SkillStats;
}

export interface RewardResult {
  awardedXp: number;
  multipliers: { quality: number; streak: number; artifact: number };
  skillXp: SkillXpAllocation;
  scoreDeltas: SkillScoreDeltas;
}

export function calculateReward(input: CalculateRewardInput): RewardResult {
  const verified = input.verificationStatus === "verified";
  const multipliers = {
    quality: qualityMultiplier(input.qualityScore),
    streak: 1 + Math.min(Math.max(input.streakDays, 0), 10) * 0.01,
    artifact:
      input.artifactReady && input.qualityScore >= 80 ? 1.25 : 1,
  };
  const awardedXp = verified
    ? Math.round(
        input.baseXp *
          multipliers.quality *
          multipliers.streak *
          multipliers.artifact,
      )
    : 0;
  const skillXp = allocateSkillXp(awardedXp, input.skillWeights);

  return {
    awardedXp,
    multipliers,
    skillXp,
    scoreDeltas: calculateScoreDeltas(
      skillXp,
      input.currentSkills,
      input.difficulty,
    ),
  };
}
