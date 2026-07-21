import { describe, expect, it, vi } from "vitest";

import { initialDemoState } from "./state-machine";
import { clearDemoSession, readDemoSession, writeDemoSession } from "./session-store";

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => { value = next; }),
    removeItem: vi.fn(() => { value = null; }),
  };
}

describe("guided Demo session store", () => {
  it("round-trips valid state", () => {
    const storage = memoryStorage();
    const state = { ...initialDemoState(), step: 3 as const, dailyAccepted: true };
    writeDemoSession(storage, state);
    expect(readDemoSession(storage)).toEqual(state);
  });

  it.each(["not-json", JSON.stringify({ ...initialDemoState(), version: "old" }), JSON.stringify({ ...initialDemoState(), step: 5 })])(
    "resets invalid stored state: %s",
    (stored) => expect(readDemoSession(memoryStorage(stored))).toEqual(initialDemoState()),
  );

  it("survives unavailable storage and supports clear", () => {
    const broken = {
      getItem: vi.fn(() => { throw new Error("blocked"); }),
      setItem: vi.fn(() => { throw new Error("blocked"); }),
      removeItem: vi.fn(() => { throw new Error("blocked"); }),
    };
    expect(readDemoSession(broken)).toEqual(initialDemoState());
    expect(() => writeDemoSession(broken, initialDemoState())).not.toThrow();
    expect(() => clearDemoSession(broken)).not.toThrow();
  });
});
