import { describe, expect, it } from "vitest";

import { STORAGE_KEY as TRAINING_STORAGE_KEY } from "@/mocks/training/local-storage";
import { PORTFOLIO_STORAGE_KEY } from "@/portfolio/demo-portfolio-publication-repository";

import {
  SANDBOX_SESSION_KEY,
  activateSandboxSession,
  exitSandboxSession,
  isSandboxSession,
} from "./sandbox-session";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("sandbox session", () => {
  it("activates a tab-scoped session and resets only demo persistence", () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    local.setItem(TRAINING_STORAGE_KEY, "old training");
    local.setItem(PORTFOLIO_STORAGE_KEY, "old portfolio");
    local.setItem("keep-me", "real preference");

    activateSandboxSession(session, local);

    expect(isSandboxSession(session)).toBe(true);
    expect(session.getItem(SANDBOX_SESSION_KEY)).toBe("active");
    expect(local.getItem(TRAINING_STORAGE_KEY)).toBeNull();
    expect(local.getItem(PORTFOLIO_STORAGE_KEY)).toBeNull();
    expect(local.getItem("keep-me")).toBe("real preference");
  });

  it("exits without deleting the sandbox record until the next entry reset", () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    activateSandboxSession(session, local);
    local.setItem(TRAINING_STORAGE_KEY, "current sandbox");

    exitSandboxSession(session);

    expect(isSandboxSession(session)).toBe(false);
    expect(local.getItem(TRAINING_STORAGE_KEY)).toBe("current sandbox");
  });
});
