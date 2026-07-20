import type {
  AchievementBulletCandidate,
  AchievementSourceFact,
  AchievementValidationError,
} from "./contracts";

const NUMBER_PATTERN = /\b\d+(?:\.\d+)?%?/gu;
const UNSUPPORTED_CLAIM_PATTERN =
  /\b(?:owned|authored by|won|production users|revenue|top\s+\d+(?:\.\d+)?%)\b/iu;

function normalize(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

export function validateAchievementBullets(
  bullets: readonly AchievementBulletCandidate[],
  facts: readonly AchievementSourceFact[],
):
  | { ok: true; bullets: readonly AchievementBulletCandidate[] }
  | { ok: false; errors: AchievementValidationError[] } {
  const errors: AchievementValidationError[] = [];
  const factsByRef = new Map(facts.map((source) => [source.ref, source.value]));
  const seen = new Set<string>();

  if (bullets.length < 3 || bullets.length > 5) {
    errors.push({ code: "bullet_count" });
  }

  bullets.forEach((bullet, bulletIndex) => {
    const text = bullet.text.trim();
    if (text.length === 0 || text.length > 160) {
      errors.push({ code: "bullet_length", bulletIndex });
    }
    if (bullet.sourceRefs.length === 0) {
      errors.push({ code: "source_required", bulletIndex });
    }

    const referencedValues: string[] = [];
    for (const ref of bullet.sourceRefs) {
      const value = factsByRef.get(ref);
      if (value === undefined) {
        errors.push({ code: "unknown_source", bulletIndex });
      } else {
        referencedValues.push(value);
      }
    }

    const normalizedText = normalize(text);
    if (seen.has(normalizedText)) {
      errors.push({ code: "duplicate_bullet", bulletIndex });
    }
    seen.add(normalizedText);

    const referenceText = normalize(referencedValues.join(" "));
    for (const numericClaim of text.match(NUMBER_PATTERN) ?? []) {
      if (!referenceText.includes(normalize(numericClaim))) {
        errors.push({ code: "ungrounded_number", bulletIndex });
        break;
      }
    }

    const unsupportedClaim = text.match(UNSUPPORTED_CLAIM_PATTERN)?.[0];
    if (
      unsupportedClaim &&
      !referenceText.includes(normalize(unsupportedClaim))
    ) {
      errors.push({ code: "unsupported_claim", bulletIndex });
    }
  });

  return errors.length === 0 ? { ok: true, bullets } : { ok: false, errors };
}
