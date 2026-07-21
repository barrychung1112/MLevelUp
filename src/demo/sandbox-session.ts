import { STORAGE_KEY as TRAINING_STORAGE_KEY } from "@/mocks/training/local-storage";
import { PORTFOLIO_STORAGE_KEY } from "@/portfolio/demo-portfolio-publication-repository";

export const SANDBOX_SESSION_KEY = "mlevelup:sandbox-session:v1";

export function activateSandboxSession(session: Storage, local: Storage): void {
  local.removeItem(TRAINING_STORAGE_KEY);
  local.removeItem(PORTFOLIO_STORAGE_KEY);
  session.setItem(SANDBOX_SESSION_KEY, "active");
}

export function isSandboxSession(storage?: Storage): boolean {
  try {
    const session = storage ?? (typeof window === "undefined" ? null : window.sessionStorage);
    return session?.getItem(SANDBOX_SESSION_KEY) === "active";
  } catch {
    return false;
  }
}

export function exitSandboxSession(storage?: Storage): void {
  try {
    const session = storage ?? (typeof window === "undefined" ? null : window.sessionStorage);
    session?.removeItem(SANDBOX_SESSION_KEY);
  } catch {
    // A blocked storage API must not prevent the user from leaving the sandbox.
  }
}
