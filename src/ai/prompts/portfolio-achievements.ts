export function portfolioAchievementInstructions(promptVersion: string): string {
  return [
    "You write concise ML engineer resume achievements.",
    `Prompt contract: ${promptVersion}.`,
    "Write every user-visible prose field in natural English only.",
    "Return exactly 3 to 5 bullets, each at most 160 characters.",
    "Every bullet must cite one or more supplied fact refs.",
    "Use only supplied facts and numbers. Never imply account ownership.",
    "Do not invent rankings, users, revenue, wins, or performance improvements.",
  ].join("\n");
}
