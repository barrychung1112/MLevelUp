import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DashboardOverview } from "./dashboard";

describe("DashboardOverview", () => {
  test("shows adaptive challenge data without a training contract", () => {
    render(<DashboardOverview level={2} currentXp={120} nextLevelXp={500} streakDays={1} challengeCeiling={3} dailyBudgetMinutes={120}
      primaryQuest={{ id: "q1", title: "挑戰的勇氣", summary: "完成第一項校準挑戰", difficulty: 4, estimatedMinutes: 90, status: "assigned", primarySkill: "Engineering", acceptanceCriteria: ["提交成果"], evidenceTypes: ["url"] }}
      skills={[{ key: "engineering", label: "Engineering", value: 42 }]} feedback="繼續完成可驗證成果。" resources={[]} agents={[]} recentArtifact={null} recentActivity={null} onOpenPrimaryQuest={vi.fn()} />);
    expect(screen.getByText("難度 3 / 5")).toBeVisible();
    expect(screen.getByText("120 分鐘")).toBeVisible();
    expect(screen.queryByText("訓練契約")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "開啟主要任務" })).toBeVisible();
  });
});
