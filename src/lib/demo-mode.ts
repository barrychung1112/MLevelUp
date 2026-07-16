export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_MLEVELUP_DEMO_MODE === "1";
}
