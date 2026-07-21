import { GUIDED_DEMO_VERSION } from "./scenario";

export type DemoStep = 1 | 2 | 3 | 4 | 5 | 6;
export type DemoAction =
  | "view_orders"
  | "accept_daily"
  | "submit_evidence"
  | "apply_result"
  | "view_proof";

export interface GuidedDemoState {
  version: typeof GUIDED_DEMO_VERSION;
  step: DemoStep;
  dailyAccepted: boolean;
  evidenceSubmitted: boolean;
  resultApplied: boolean;
}

export function initialDemoState(): GuidedDemoState {
  return {
    version: GUIDED_DEMO_VERSION,
    step: 1,
    dailyAccepted: false,
    evidenceSubmitted: false,
    resultApplied: false,
  };
}

export function advanceDemoState(
  state: GuidedDemoState,
  action: DemoAction,
): GuidedDemoState {
  if (state.step === 1 && action === "view_orders") return { ...state, step: 2 };
  if (state.step === 2 && action === "accept_daily") {
    return { ...state, step: 3, dailyAccepted: true };
  }
  if (state.step === 3 && action === "submit_evidence" && state.dailyAccepted) {
    return { ...state, step: 4, evidenceSubmitted: true };
  }
  if (state.step === 4 && action === "apply_result" && state.evidenceSubmitted) {
    return { ...state, step: 5, resultApplied: true };
  }
  if (state.step === 5 && action === "view_proof" && state.resultApplied) {
    return { ...state, step: 6 };
  }
  return state;
}

export function resetDemoState(state?: GuidedDemoState): GuidedDemoState {
  void state;
  return initialDemoState();
}

export function isGuidedDemoState(value: unknown): value is GuidedDemoState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<GuidedDemoState>;
  if (
    state.version !== GUIDED_DEMO_VERSION ||
    !Number.isInteger(state.step) ||
    Number(state.step) < 1 ||
    Number(state.step) > 6 ||
    typeof state.dailyAccepted !== "boolean" ||
    typeof state.evidenceSubmitted !== "boolean" ||
    typeof state.resultApplied !== "boolean"
  ) return false;
  if (Number(state.step) >= 3 && !state.dailyAccepted) return false;
  if (Number(state.step) >= 4 && !state.evidenceSubmitted) return false;
  if (Number(state.step) >= 5 && !state.resultApplied) return false;
  return true;
}
