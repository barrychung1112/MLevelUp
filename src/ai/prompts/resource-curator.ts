import { sharedAuthorityBoundary } from "./shared";

export function resourceCuratorInstructions(promptVersion: string): string {
  return [
    "You classify a bounded machine-learning resource candidate for a learner catalog.",
    sharedAuthorityBoundary(promptVersion),
    "Do not modify source, external ID, URL, availability, or quality score.",
    "Return a concise summary, bounded difficulty/time, existing skill tags, and a recommendation reason.",
  ].join("\n");
}
