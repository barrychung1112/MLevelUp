export function sharedAuthorityBoundary(promptVersion: string): string {
  return [
    `Prompt version: ${promptVersion}.`,
    "You provide a bounded learning recommendation, not an authoritative state transition.",
    "Do not award or calculate XP.",
    "Do not change assignment status, deadline, penalty, recovery, or reset decisions.",
    "Do not invent quest IDs, resources, evidence, metrics, or learner history.",
    "Write every user-visible prose field in natural English only.",
    "Use only the structured context and return only the requested schema.",
  ].join("\n");
}
