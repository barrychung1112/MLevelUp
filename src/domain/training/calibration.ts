import type { SkillStat, SkillStats, SubmissionEvaluation } from "./types";

function boundedScore(value: number): number {
  return Math.max(10, Math.min(80, Math.round(10 + value * 70)));
}

function calibrated(current: SkillStat, ratio: number): SkillStat {
  const score = boundedScore(ratio);
  return {
    ...current,
    score,
    lastDelta: score === current.score ? 0 : 2,
  };
}

export function calibrateSkills(
  current: SkillStats,
  evaluation: SubmissionEvaluation,
): SkillStats {
  const { evidenceCompleteness, evidenceValidity, reflection, artifactReadiness } =
    evaluation.scoreBreakdown;
  const completeness = evidenceCompleteness / 45;
  const validity = evidenceValidity / 25;
  const reflectionQuality = reflection / 20;
  const artifact = artifactReadiness / 10;
  const overall = evaluation.qualityScore / 100;

  return {
    ...current,
    dataHandling: calibrated(current.dataHandling, completeness * 0.6 + validity * 0.4),
    modeling: calibrated(current.modeling, overall),
    evaluation: calibrated(current.evaluation, completeness * 0.4 + validity * 0.6),
    engineering: calibrated(current.engineering, completeness * 0.5 + artifact * 0.5),
    communication: calibrated(current.communication, reflectionQuality),
  };
}
