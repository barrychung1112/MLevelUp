import {
  initialDemoState,
  isGuidedDemoState,
  type GuidedDemoState,
} from "./state-machine";

export const GUIDED_DEMO_SESSION_KEY = "mlevelup:guided-demo:v1";

export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readDemoSession(storage: DemoStorage): GuidedDemoState {
  try {
    const stored = storage.getItem(GUIDED_DEMO_SESSION_KEY);
    if (!stored) return initialDemoState();
    const parsed: unknown = JSON.parse(stored);
    return isGuidedDemoState(parsed) ? parsed : initialDemoState();
  } catch {
    return initialDemoState();
  }
}

export function writeDemoSession(
  storage: DemoStorage,
  state: GuidedDemoState,
): void {
  try {
    storage.setItem(GUIDED_DEMO_SESSION_KEY, JSON.stringify(state));
  } catch {
    // Demo remains usable with in-memory React state when storage is unavailable.
  }
}

export function clearDemoSession(storage: DemoStorage): void {
  try {
    storage.removeItem(GUIDED_DEMO_SESSION_KEY);
  } catch {
    // Reset still updates in-memory React state when storage is unavailable.
  }
}
