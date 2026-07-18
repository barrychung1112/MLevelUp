import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { QuestView } from "../view-models";
import { DashboardOverview } from "./dashboard";

const mainMission: QuestView = {
  id: "main-1",
  title: "建立可重現的模型基線",
  summary: "持續五天完成資料、模型與評估紀錄。",
  difficulty: 4,
  estimatedMinutes: 300,
  status: "in_progress",
  primarySkill: "Modeling",
  acceptanceCriteria: ["提交可重現的程式碼與指標"],
  evidenceTypes: ["url"],
  scope: "main",
  dueAt: "2026-07-20T08:00:00.000Z",
  durationDays: 5,
  executionSteps: ["建立資料切分", "訓練基線", "記錄指標"],
  successMetrics: ["程式碼可以重跑並產生相同驗證結果"],
  outOfScope: ["正式部署"],
  resources: [],
};

const dailyMission: QuestView = {
  ...mainMission,
  id: "daily-1",
  title: "完成今日誤差分析",
  summary: "24 小時內找出一個錯誤切片。",
  scope: "daily",
  durationDays: 1,
};

const baseProps = {
  level: 2,
  currentXp: 120,
  nextLevelXp: 500,
  streakDays: 1,
  skills: [{ key: "modeling", label: "Modeling", value: 42 }],
  feedback: "先完成今日檢查點。",
  resources: [],
  agents: [],
  recentArtifact: null,
  recentActivity: null,
  failureDays: 0,
  recoveryDeadline: null,
  onOpenQuest: vi.fn(),
  onContinueChallenge: vi.fn(),
  onAbandonChallenge: vi.fn(),
};

describe("DashboardOverview", () => {
  test("separates the multi-day mainline, 24-hour daily mission, and penalties", () => {
    render(
      <DashboardOverview
        {...baseProps}
        trainingStatus="normal"
        mainMission={mainMission}
        dailyMission={dailyMission}
        penalties={[{ ...dailyMission, id: "penalty-1", title: "補回逾期檢查點", scope: "penalty" }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "大型主線任務" })).toBeVisible();
    expect(screen.getByText("建立可重現的模型基線")).toBeVisible();
    expect(screen.getByRole("heading", { name: "每日任務（24 小時）" })).toBeVisible();
    expect(screen.getByText("完成今日誤差分析")).toBeVisible();
    expect(screen.getByRole("heading", { name: "懲罰任務" })).toBeVisible();
    expect(screen.getByText("補回逾期檢查點")).toBeVisible();
  });

  test("requires a decision after seven consecutive failed days", () => {
    const onContinue = vi.fn();
    const onAbandon = vi.fn();
    render(
      <DashboardOverview
        {...baseProps}
        trainingStatus="failure_review"
        failureDays={7}
        mainMission={mainMission}
        dailyMission={dailyMission}
        penalties={[]}
        onContinueChallenge={onContinue}
        onAbandonChallenge={onAbandon}
      />,
    );

    expect(screen.getByRole("dialog", { name: "是否放棄挑戰？" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "繼續挑戰" }));
    fireEvent.click(screen.getByRole("button", { name: "放棄並清零" }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onAbandon).toHaveBeenCalledOnce();
  });

  test("shows the three-day recovery deadline and remaining debt", () => {
    render(
      <DashboardOverview
        {...baseProps}
        trainingStatus="recovery"
        recoveryDeadline="2026-07-21 01:00"
        mainMission={null}
        dailyMission={null}
        penalties={[{ ...dailyMission, id: "penalty-1", title: "追回昨日任務", scope: "penalty" }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "三日追回期" })).toBeVisible();
    expect(screen.getByText(/2026-07-21 01:00/)).toBeVisible();
    expect(screen.getByText("待追回 1 項")).toBeVisible();
  });
});
