import { describe, expect, it } from "vitest";

import { advanceDemoState, initialDemoState, resetDemoState } from "./state-machine";

describe("guided Demo state machine", () => {
  it("moves through the only valid six-step path", () => {
    let state = initialDemoState();
    state = advanceDemoState(state, "view_orders");
    state = advanceDemoState(state, "accept_daily");
    state = advanceDemoState(state, "submit_evidence");
    state = advanceDemoState(state, "apply_result");
    state = advanceDemoState(state, "view_proof");

    expect(state).toEqual({
      version: "guided-demo-v1", step: 6, dailyAccepted: true,
      evidenceSubmitted: true, resultApplied: true,
    });
  });

  it("ignores impossible and repeated transitions without duplicating results", () => {
    const initial = initialDemoState();
    expect(advanceDemoState(initial, "submit_evidence")).toEqual(initial);
    const orders = advanceDemoState(initial, "view_orders");
    expect(advanceDemoState(orders, "view_orders")).toEqual(orders);
  });

  it("always resets to an independent initial state", () => {
    const changed = advanceDemoState(initialDemoState(), "view_orders");
    expect(resetDemoState(changed)).toEqual(initialDemoState());
    expect(resetDemoState(changed)).not.toBe(changed);
  });
});
