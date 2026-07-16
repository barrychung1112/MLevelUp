import type {
  ArtifactType,
  EvidenceRecord,
  EvidenceRequirement,
  EvidenceType,
  Quest,
  SubmissionEvaluation,
} from "./types";

export interface EvaluateSubmissionInput {
  quest: Quest;
  evidence: EvidenceRecord[];
  selfReflection: string;
}

export const ARTIFACT_EVIDENCE: Record<ArtifactType, EvidenceType> = {
  kaggleNotebook: "kaggleNotebook",
  githubRepository: "githubCommit",
  modelEvaluationReport: "modelEvaluationReport",
  deployedDemo: "deployedApp",
  technicalWriteup: "writtenReflection",
  experimentLog: "experimentLog",
  competitionSubmission: "competitionRank",
  systemDesignNote: "systemDesignNote",
  projectRetrospective: "writtenReflection",
};

const URL_EVIDENCE = new Set<EvidenceType>([
  "githubCommit",
  "kaggleNotebook",
  "deployedApp",
  "competitionRank",
]);

const FILE_EVIDENCE = new Set<EvidenceType>([
  "screenshot",
  "modelEvaluationReport",
  "experimentLog",
]);

function normalizedLength(value: string | undefined): number {
  return value?.replace(/\s/gu, "").length ?? 0;
}

function validHttpsUrl(value: string | undefined): URL | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isValidEvidence(
  evidence: EvidenceRecord,
  requirement: EvidenceRequirement,
): boolean {
  if (URL_EVIDENCE.has(evidence.type)) {
    const url = validHttpsUrl(evidence.url);
    if (!url) return false;

    if (evidence.type === "githubCommit") {
      return url.hostname === "github.com" && url.pathname.includes("/commit/");
    }

    if (evidence.type === "kaggleNotebook") {
      return (
        ["kaggle.com", "www.kaggle.com"].includes(url.hostname) &&
        url.pathname.includes("/code/")
      );
    }

    if (
      requirement.acceptedHosts &&
      !requirement.acceptedHosts.includes(url.hostname)
    ) {
      return false;
    }

    return true;
  }

  if (FILE_EVIDENCE.has(evidence.type)) {
    return Boolean(
      evidence.fileName?.trim() &&
        evidence.mimeType?.trim() &&
        evidence.byteSize &&
        evidence.byteSize > 0,
    );
  }

  if (evidence.type === "metricResult") {
    return Boolean(
      evidence.metricName?.trim() &&
        typeof evidence.metricValue === "number" &&
        Number.isFinite(evidence.metricValue),
    );
  }

  return normalizedLength(evidence.text) >= 20;
}

export function findArtifactEvidence(
  quest: Quest,
  evidence: EvidenceRecord[],
): EvidenceRecord | undefined {
  if (!quest.expectedArtifactType) return undefined;
  const expectedType = ARTIFACT_EVIDENCE[quest.expectedArtifactType];

  for (const requirement of quest.evidenceRequirements) {
    if (requirement.type !== expectedType) continue;
    const matches = evidence.filter(
      (item) =>
        item.requirementId === requirement.id && item.type === requirement.type,
    );
    if (matches.length === 1 && isValidEvidence(matches[0], requirement)) {
      return matches[0];
    }
  }

  return undefined;
}

function reflectionScore(reflection: string): number {
  const length = normalizedLength(reflection);
  if (length >= 180) return 20;
  if (length >= 100) return 15;
  if (length >= 40) return 10;
  return 0;
}

export function evaluateSubmission({
  quest,
  evidence,
  selfReflection,
}: EvaluateSubmissionInput): SubmissionEvaluation {
  const required = quest.evidenceRequirements.filter((item) => item.required);
  const evidenceByRequirement = new Map<string, EvidenceRecord[]>();
  for (const item of evidence) {
    const matches = evidenceByRequirement.get(item.requirementId) ?? [];
    matches.push(item);
    evidenceByRequirement.set(item.requirementId, matches);
  }
  const requirementsById = new Map(
    quest.evidenceRequirements.map((item) => [item.id, item] as const),
  );
  const present = required.filter(
    (item) => (evidenceByRequirement.get(item.id)?.length ?? 0) > 0,
  );
  const valid = required.filter((item) => {
    const submitted = evidenceByRequirement.get(item.id) ?? [];
    return (
      submitted.length === 1 &&
      submitted[0].type === item.type &&
      isValidEvidence(submitted[0], item)
    );
  });

  const hardFailures: string[] = [];
  for (const requirement of required) {
    const submitted = evidenceByRequirement.get(requirement.id) ?? [];
    if (submitted.length === 0) {
      hardFailures.push(`Missing required evidence: ${requirement.id}`);
    } else if (submitted.length > 1) {
      hardFailures.push(`Duplicate evidence for requirement: ${requirement.id}`);
    } else if (submitted[0].type !== requirement.type) {
      hardFailures.push(`Evidence type mismatch for requirement: ${requirement.id}`);
    } else if (!isValidEvidence(submitted[0], requirement)) {
      hardFailures.push(`Invalid evidence: ${requirement.id}`);
    }
  }

  for (const item of [...evidence].sort((left, right) =>
    left.requirementId.localeCompare(right.requirementId) || left.id.localeCompare(right.id),
  )) {
    if (!requirementsById.has(item.requirementId)) {
      hardFailures.push(`Unknown evidence requirement: ${item.requirementId}`);
    }
  }

  if (normalizedLength(selfReflection) < quest.reflectionMinChars) {
    hardFailures.push(
      `Reflection must contain at least ${quest.reflectionMinChars} characters`,
    );
  }

  const denominator = Math.max(required.length, 1);
  const evidenceCompleteness = Math.round((present.length / denominator) * 45);
  const evidenceValidity = Math.round((valid.length / denominator) * 25);
  const artifactReady = Boolean(findArtifactEvidence(quest, evidence));
  const scoreBreakdown = {
    evidenceCompleteness,
    evidenceValidity,
    reflection: reflectionScore(selfReflection),
    artifactReadiness: quest.expectedArtifactType ? (artifactReady ? 10 : 0) : 10,
  };
  const rawScore = Object.values(scoreBreakdown).reduce(
    (sum, value) => sum + value,
    0,
  );
  const qualityScore = hardFailures.length > 0 ? Math.min(rawScore, 59) : rawScore;

  return {
    qualityScore,
    verificationStatus:
      hardFailures.length > 0 || qualityScore < 60
        ? "needs_revision"
        : "verified",
    verificationMethod: "mock",
    scoreBreakdown,
    artifactReady,
    hardFailures,
  };
}
