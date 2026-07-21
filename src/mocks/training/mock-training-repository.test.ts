import { describe, expect, test } from "vitest";

import type { EvidenceRecord } from "@/domain/training/types";

import {
  LocalTrainingStorage,
  STORAGE_KEY,
  type StorageLike,
} from "./local-storage";
import { MockTrainingRepository } from "./mock-training-repository";
import { SEED_VERSION } from "./seed";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failNextWrite = false;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("storage unavailable");
    }
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const clock = { now: () => "2026-07-16T16:00:00.000Z" };

function createIds() {
  let current = 0;
  return { next: (prefix: string) => `${prefix}-test-${++current}` };
}

function createRepository(memory = new MemoryStorage(), activeClock = clock) {
  const storage = new LocalTrainingStorage(memory, SEED_VERSION);
  return {
    memory,
    repository: new MockTrainingRepository({ storage, clock: activeClock, ids: createIds() }),
  };
}

function validEvidence(): EvidenceRecord[] {
  return [
    {
      id: "evidence-valid",
      requirementId: "artifact",
      type: "githubCommit",
      url: "https://github.com/acme/ml-project/commit/abcdef",
    },
    {
      id: "metric-valid",
      requirementId: "metric",
      type: "metricResult",
      metricName: "f1",
      metricValue: 0.78,
    },
    {
      id: "reflection-valid",
      requirementId: "reflection",
      type: "writtenReflection",
      text: "我完成 baseline 與 validation，下一步會針對錯誤樣本做切片分析。",
    },
  ];
}

const reflection = "我先建立可以重現的基準模型，確認 validation split 沒有資料洩漏，再保存 metric 與錯誤樣本。下一步會比較特徵處理對 recall 的影響。".repeat(
  4,
);

async function startPrimary(repository: MockTrainingRepository) {
  await repository.completeOnboarding({
    displayName: "Demo Hunter",
    targetRole: "machine-learning-engineer",
    timezone: "America/Los_Angeles",
  });
  const state = await repository.getSnapshot();
  const assignment = Object.values(state.assignments).find(
    (candidate) => !state.quests[candidate.questId].optional,
  );
  if (!assignment) throw new Error("missing primary assignment");
  await repository.startQuest(assignment.id);
  return assignment.id;
}

describe("mock training repository", () => {
  test("records the courage oath exactly once", async () => {
    const { repository } = createRepository();

    const accepted = await repository.acceptChallenge();
    const repeated = await repository.acceptChallenge();

    expect(accepted.profile.challengeAcceptedAt).toBe(clock.now());
    expect(repeated.profile.challengeAcceptedAt).toBe(clock.now());
  });

  test("completes onboarding with only the courage calibration assignment", async () => {
    const { repository } = createRepository();

    await repository.acceptChallenge();
    await repository.completeOnboarding({
      displayName: "Barry",
      targetRole: "machine-learning-engineer",
      timezone: "America/Los_Angeles",
    });
    const state = await repository.getSnapshot();

    expect(state.profile).toMatchObject({
      displayName: "Barry",
      onboardingCompleted: true,
      targetRole: "machine-learning-engineer",
      dailyMinutes: 300,
    });
    expect(Object.values(state.assignments)).toHaveLength(1);
    expect(Object.values(state.assignments)[0].questId).toBe("quest-courage-challenge");
  });

  test("regenerates untouched assignments when the profile timezone changes", async () => {
    const { repository } = createRepository();
    await repository.completeOnboarding({
      displayName: "Barry",
      targetRole: "machine-learning-engineer",
      timezone: "America/Los_Angeles",
    });

    const state = await repository.updateProfile({ timezone: "Asia/Tokyo" });

    expect(
      new Set(Object.values(state.assignments).map((item) => item.assignedDate)),
    ).toEqual(new Set(["2026-07-17"]));
  });

  test("requests revision with zero XP for invalid submission", async () => {
    const { repository } = createRepository();
    const assignmentId = await startPrimary(repository);

    const outcome = await repository.submitQuest({
      idempotencyKey: "invalid-first",
      assignmentId,
      evidence: [],
      selfReflection: reflection,
    });

    expect(outcome.submission.revisionNo).toBe(1);
    expect(outcome.submission.verificationStatus).toBe("needs_revision");
    expect(outcome.state.assignments[assignmentId].status).toBe("needs_revision");
    expect(outcome.state.progress.totalXp).toBe(0);
    expect(outcome.state.xpEvents).toHaveLength(0);
    expect(outcome.state.progress.skills.modeling.score).toBeGreaterThan(20);
    expect(outcome.state.progress.skills.modeling.score).toBeLessThan(30);
    expect(
      Object.values(outcome.state.feedback).some(
        (feedback) => feedback.submissionId === outcome.submission.id,
      ),
    ).toBe(true);
    expect(
      Object.values(outcome.state.assignments).some(
        (assignment) => outcome.state.quests[assignment.questId].scope === "daily",
      ),
    ).toBe(true);
  });

  test("atomically adds XP, skills, feedback, artifact, and activity", async () => {
    const { repository } = createRepository();
    const assignmentId = await startPrimary(repository);

    const outcome = await repository.submitQuest({
      idempotencyKey: "valid-first",
      assignmentId,
      evidence: validEvidence(),
      selfReflection: reflection,
    });

    expect(outcome.state.assignments[assignmentId].status).toBe("completed");
    expect(outcome.state.progress.totalXp).toBeGreaterThan(0);
    expect(outcome.state.xpEvents).toHaveLength(1);
    expect(
      Object.values(outcome.state.feedback).some(
        (feedback) => feedback.submissionId === outcome.submission.id,
      ),
    ).toBe(true);
    expect(outcome.state.artifacts).toHaveLength(1);
    expect(outcome.state.activity.some((event) => event.type === "questCompleted")).toBe(
      true,
    );
    expect(outcome.state.progress.skills.modeling.skillXp).toBeGreaterThan(0);
    const activeScopes = Object.values(outcome.state.assignments)
      .filter((assignment) => ["assigned", "in_progress"].includes(assignment.status))
      .map((assignment) => outcome.state.quests[assignment.questId].scope)
      .sort();
    expect(activeScopes).toEqual(["daily", "main"]);
    expect(
      Object.values(outcome.state.assignments).find(
        (assignment) => outcome.state.quests[assignment.questId].scope === "daily",
      )?.dueAt,
    ).toBe("2026-07-17T16:00:00.000Z");
  });

  test("continues with an unused catalog mission after every active training assignment is cleared", async () => {
    const { repository } = createRepository();
    const calibrationId = await startPrimary(repository);
    const calibrated = await repository.submitQuest({
      idempotencyKey: "calibration-for-continuation",
      assignmentId: calibrationId,
      evidence: validEvidence(),
      selfReflection: reflection,
    });
    const initialTrainingAssignments = Object.values(calibrated.state.assignments)
      .filter((assignment) => calibrated.state.quests[assignment.questId].purpose === "training")
      .map((assignment) => assignment.id);
    const initiallyAssignedQuestIds = new Set(
      Object.values(calibrated.state.assignments).map((assignment) => assignment.questId),
    );

    for (const [index, assignmentId] of initialTrainingAssignments.entries()) {
      const started = await repository.startQuest(assignmentId);
      const quest = started.quests[started.assignments[assignmentId].questId];
      const evidence = quest.evidenceRequirements.map((requirement, evidenceIndex) => ({
        id: `continuation-evidence-${index}-${evidenceIndex}`,
        requirementId: requirement.id,
        type: requirement.type,
        ...(requirement.type === "githubCommit"
          ? { url: "https://github.com/barrychung1112/MLevelUp/commit/76f5f7312e25c540e611bf52987ad80445dbdc21" }
          : {}),
        ...(requirement.type === "deployedApp"
          ? { url: "https://m-level-up.vercel.app/" }
          : {}),
        ...(["modelEvaluationReport", "screenshot", "experimentLog"].includes(requirement.type)
          ? { fileName: "validation-report.md", mimeType: "text/markdown", byteSize: 2048 }
          : {}),
        ...(["writtenReflection", "systemDesignNote"].includes(requirement.type)
          ? { text: "This evidence documents a reproducible result, its limitations, and the next measurable engineering decision." }
          : {}),
        ...(requirement.type === "metricResult"
          ? { metricName: "validation_accuracy", metricValue: 0.842 }
          : {}),
      }));
      await repository.submitQuest({
        idempotencyKey: `continuation-submit-${index}`,
        assignmentId,
        evidence,
        selfReflection: reflection,
      });
    }

    const continued = await repository.getSnapshot();
    const next = Object.values(continued.assignments).find(
      (assignment) => assignment.status === "assigned" && !initialTrainingAssignments.includes(assignment.id),
    );
    expect(next).toBeDefined();
    expect(initiallyAssignedQuestIds.has(next!.questId)).toBe(false);
    expect(continued.quests[next!.questId].purpose).toBe("training");
  });

  test("reconciles expired mainline and daily work when the snapshot reloads", async () => {
    let now = clock.now();
    const activeClock = { now: () => now };
    const { repository } = createRepository(new MemoryStorage(), activeClock);
    const assignmentId = await startPrimary(repository);
    await repository.submitQuest({
      idempotencyKey: "ready-for-deadline",
      assignmentId,
      evidence: validEvidence(),
      selfReflection: reflection,
    });

    now = "2026-07-17T16:00:00.000Z";
    const state = await repository.getSnapshot();
    const penalties = Object.values(state.assignments).filter(
      (assignment) => state.quests[assignment.questId].scope === "penalty",
    );

    expect(penalties).toHaveLength(2);
    expect(state.profile.consecutiveFailureDays).toBe(1);
  });

  test("creates revision two and never awards duplicate XP", async () => {
    const { repository } = createRepository();
    const assignmentId = await startPrimary(repository);
    await repository.submitQuest({
      idempotencyKey: "revision-one",
      assignmentId,
      evidence: [],
      selfReflection: reflection,
    });
    await repository.startQuest(assignmentId);

    const second = await repository.submitQuest({
      idempotencyKey: "revision-two",
      assignmentId,
      evidence: validEvidence(),
      selfReflection: reflection,
    });
    await expect(
      repository.submitQuest({
        idempotencyKey: "different-after-complete",
        assignmentId,
        evidence: validEvidence(),
        selfReflection: reflection,
      }),
    ).rejects.toThrow(/terminal|transition/i);
    const state = await repository.getSnapshot();

    expect(second.submission.revisionNo).toBe(2);
    expect(Object.values(state.submissions).map((item) => item.revisionNo)).toEqual([
      1, 2,
    ]);
    expect(state.xpEvents).toHaveLength(1);
  });

  test("reloads persisted state in a new repository instance", async () => {
    const { repository, memory } = createRepository();
    const assignmentId = await startPrimary(repository);
    await repository.submitQuest({
      idempotencyKey: "persisted-submit",
      assignmentId,
      evidence: validEvidence(),
      selfReflection: reflection,
    });

    const reloaded = createRepository(memory).repository;

    expect(await reloaded.getSnapshot()).toEqual(await repository.getSnapshot());
  });

  test("does not mutate in-memory state when persistence fails", async () => {
    const { repository, memory } = createRepository();
    const assignmentId = await startPrimary(repository);
    memory.failNextWrite = true;

    await expect(
      repository.submitQuest({
        idempotencyKey: "failing-write",
        assignmentId,
        evidence: validEvidence(),
        selfReflection: reflection,
      }),
    ).rejects.toThrow("storage unavailable");
    const state = await repository.getSnapshot();

    expect(state.assignments[assignmentId].status).toBe("in_progress");
    expect(state.progress.totalXp).toBe(0);
    expect(state.submissions).toEqual({});
  });

  test("reset restores a deterministic fresh seed", async () => {
    const { repository } = createRepository();
    await repository.completeOnboarding({
      displayName: "Barry",
      targetRole: "machine-learning-engineer",
      timezone: "America/Los_Angeles",
    });

    const reset = await repository.resetDemo();

    expect(reset.profile.onboardingCompleted).toBe(false);
    expect(reset.profile.contract).toBe("standard");
    expect(reset.progress.totalXp).toBe(0);
  });

  test("replays the existing outcome for the same idempotency key without new XP", async () => {
    const { repository, memory } = createRepository();
    const assignmentId = await startPrimary(repository);
    const input = {
      idempotencyKey: "retry-safe-key",
      assignmentId,
      evidence: validEvidence(),
      selfReflection: reflection,
    };
    const first = await repository.submitQuest(input);
    memory.failNextWrite = true;

    const replay = await repository.submitQuest({
      ...input,
      evidence: [
        {
          ...input.evidence[0],
          url: `  ${input.evidence[0].url}  `,
        },
        ...input.evidence.slice(1),
      ],
      selfReflection: `  \n${input.selfReflection}  `,
    });

    expect(replay.submission.id).toBe(first.submission.id);
    expect(replay.evaluation).toEqual(first.evaluation);
    expect(replay.state.xpEvents).toHaveLength(1);
    expect(replay.state.progress.totalXp).toBe(first.state.progress.totalXp);
    expect(memory.failNextWrite).toBe(true);
  });

  test("canonicalizes requirement identity before evaluation, persistence, and replay", async () => {
    const { repository } = createRepository();
    const assignmentId = await startPrimary(repository);
    const evidence = validEvidence();
    const first = await repository.submitQuest({
      idempotencyKey: "canonical-requirement-key",
      assignmentId,
      evidence: [
        {
          ...evidence[0],
          requirementId: "  artifact  ",
        },
        ...evidence.slice(1),
      ],
      selfReflection: reflection,
    });

    const replay = await repository.submitQuest({
      idempotencyKey: "canonical-requirement-key",
      assignmentId,
      evidence,
      selfReflection: reflection,
    });

    expect(first.submission.verificationStatus).toBe("verified");
    expect(first.submission.evidence[0].requirementId).toBe("artifact");
    expect(replay.submission.id).toBe(first.submission.id);
    expect(replay.evaluation).toEqual(first.evaluation);
  });

  test.each([
    ["data URL", "data:text/plain;base64,SGVsbG8="],
    ["blob URL", "blob:https://example.com/1b3f"],
    ["oversized URL", `https://example.com/${"a".repeat(3_000)}`],
  ])("drops a dangerous %s before evaluating and persisting", async (_label, url) => {
    const { repository, memory } = createRepository();
    const assignmentId = await startPrimary(repository);

    const outcome = await repository.submitQuest({
      idempotencyKey: `unsafe-url-${_label}`,
      assignmentId,
      evidence: [
        {
          ...validEvidence()[0],
          url,
        },
      ],
      selfReflection: reflection,
    });

    expect(outcome.submission.verificationStatus).toBe("needs_revision");
    expect(outcome.submission.evidence[0].url).toBeUndefined();
    const persisted = memory.values.get(STORAGE_KEY) ?? "";
    expect(persisted).not.toContain(url);
    expect(persisted).not.toMatch(/data:|blob:|;base64,/iu);
  });

  test("rejects an idempotency key reused for a different assignment", async () => {
    const { repository, memory } = createRepository();
    const assignmentId = await startPrimary(repository);
    await repository.submitQuest({
      idempotencyKey: "assignment-conflict-key",
      assignmentId,
      evidence: validEvidence(),
      selfReflection: reflection,
    });
    memory.failNextWrite = true;

    await expect(
      repository.submitQuest({
        idempotencyKey: "assignment-conflict-key",
        assignmentId: "another-assignment",
        evidence: validEvidence(),
        selfReflection: reflection,
      }),
    ).rejects.toThrow(/idempotency.*different request/i);
    expect(memory.failNextWrite).toBe(true);
  });

  test("rejects an idempotency key reused with different evidence or reflection", async () => {
    const { repository, memory } = createRepository();
    const assignmentId = await startPrimary(repository);
    await repository.submitQuest({
      idempotencyKey: "payload-conflict-key",
      assignmentId,
      evidence: validEvidence(),
      selfReflection: reflection,
    });
    memory.failNextWrite = true;

    await expect(
      repository.submitQuest({
        idempotencyKey: "payload-conflict-key",
        assignmentId,
        evidence: [
          {
            ...validEvidence()[0],
            url: "https://github.com/acme/ml-project/commit/different",
          },
        ],
        selfReflection: `${reflection} different conclusion`,
      }),
    ).rejects.toThrow(/idempotency.*different request/i);
    expect(memory.failNextWrite).toBe(true);
  });

  test("produces identical outcomes from identical clock, ids, and commands", async () => {
    const firstRepository = createRepository().repository;
    const secondRepository = createRepository().repository;
    const firstAssignmentId = await startPrimary(firstRepository);
    const secondAssignmentId = await startPrimary(secondRepository);
    const command = {
      idempotencyKey: "deterministic-command",
      evidence: validEvidence(),
      selfReflection: reflection,
    };

    const first = await firstRepository.submitQuest({
      ...command,
      assignmentId: firstAssignmentId,
    });
    const second = await secondRepository.submitQuest({
      ...command,
      assignmentId: secondAssignmentId,
    });

    expect(first).toEqual(second);
  });
});
