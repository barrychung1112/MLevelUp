import { describe, expect, test } from "vitest";

import { executeSubmitQuest } from "@/application/training/submit-quest";

import { createTrainingSeed, SEED_VERSION } from "./seed";
import {
  LocalTrainingStorage,
  STORAGE_KEY,
  type StorageLike,
} from "./local-storage";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failRead = false;

  getItem(key: string) {
    if (this.failRead) throw new Error("storage read unavailable");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const now = "2026-07-16T16:00:00.000Z";

describe("local training storage", () => {
  test.each([
    ["missing data", null],
    ["corrupt JSON", "{broken"],
  ])("falls back deterministically for %s", (_label, raw) => {
    const memory = new MemoryStorage();
    if (raw !== null) memory.setItem(STORAGE_KEY, raw);
    const storage = new LocalTrainingStorage(memory, SEED_VERSION);

    expect(storage.load(() => createTrainingSeed(now))).toEqual(
      createTrainingSeed(now),
    );
  });

  test("falls back when the stored seed version is stale", () => {
    const memory = new MemoryStorage();
    memory.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        seedVersion: "old-seed",
        savedAt: now,
        state: createTrainingSeed(now),
      }),
    );
    const storage = new LocalTrainingStorage(memory, SEED_VERSION);

    expect(storage.load(() => createTrainingSeed(now))).toEqual(
      createTrainingSeed(now),
    );
  });

  test("falls back when the envelope is structurally valid but state invariants are corrupt", () => {
    const memory = new MemoryStorage();
    const corrupt = createTrainingSeed(now);
    corrupt.progress.totalXp = 25;
    memory.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        seedVersion: SEED_VERSION,
        savedAt: now,
        state: corrupt,
      }),
    );
    const storage = new LocalTrainingStorage(memory, SEED_VERSION);

    expect(storage.load(() => createTrainingSeed(now))).toEqual(
      createTrainingSeed(now),
    );
  });

  test("falls back when a forged XP event preserves the ledger total but breaks reward math", () => {
    const memory = new MemoryStorage();
    const state = createTrainingSeed(now);
    const assignment = Object.values(state.assignments).find(
      (candidate) => !state.quests[candidate.questId].optional,
    );
    if (!assignment) throw new Error("missing primary assignment");
    assignment.status = "in_progress";
    let sequence = 0;
    const completed = executeSubmitQuest(
      state,
      {
        idempotencyKey: "forged-ledger-source",
        assignmentId: assignment.id,
        evidence: [
          {
            id: "forged-ledger-evidence",
            requirementId: "commit",
            type: "githubCommit",
            url: "https://github.com/acme/ml-project/commit/abcdef",
          },
        ],
        selfReflection:
          "This reflection explains the baseline, validation split, result, and next experiment in sufficient detail.",
      },
      {
        now,
        ids: { next: (prefix) => `${prefix}-forged-${++sequence}` },
      },
    ).state;
    completed.xpEvents[0].awardedXp += 1;
    completed.progress.totalXp += 1;
    const rewardFeedback = Object.values(completed.feedback).find(
      (item) => item.submissionId === completed.xpEvents[0].sourceSubmissionId,
    );
    if (!rewardFeedback) throw new Error("missing reward feedback");
    rewardFeedback.xpAwarded += 1;
    memory.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        seedVersion: SEED_VERSION,
        savedAt: now,
        state: completed,
      }),
    );
    const storage = new LocalTrainingStorage(memory, SEED_VERSION);

    expect(storage.load(() => createTrainingSeed(now))).toEqual(
      createTrainingSeed(now),
    );
  });

  test("falls back when storage access itself throws", () => {
    const memory = new MemoryStorage();
    memory.failRead = true;
    const storage = new LocalTrainingStorage(memory, SEED_VERSION);

    expect(storage.load(() => createTrainingSeed(now))).toEqual(
      createTrainingSeed(now),
    );
  });

  test("persists and reloads a strict envelope without browser file payloads", () => {
    const memory = new MemoryStorage();
    const storage = new LocalTrainingStorage(memory, SEED_VERSION);
    const state = createTrainingSeed(now);

    storage.save(state, now);

    expect(storage.load(() => createTrainingSeed("1999-01-01T00:00:00.000Z"))).toEqual(
      state,
    );
    const raw = memory.getItem(STORAGE_KEY) ?? "";
    expect(raw).not.toMatch(/data:|blob:|base64/i);
  });

  test("reset removes only the exact Phase 1 key", () => {
    const memory = new MemoryStorage();
    memory.setItem(STORAGE_KEY, "phase-one");
    memory.setItem(`${STORAGE_KEY}:other`, "keep");
    const storage = new LocalTrainingStorage(memory, SEED_VERSION);

    storage.reset();

    expect(memory.getItem(STORAGE_KEY)).toBeNull();
    expect(memory.getItem(`${STORAGE_KEY}:other`)).toBe("keep");
  });
});
