import { render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { DashboardOverview } from "./dashboard";

describe("DashboardOverview", () => {
  test("presents the full command snapshot with one primary action", () => {
    render(
      <DashboardOverview
        level={7}
        currentXp={320}
        nextLevelXp={500}
        streakDays={6}
        contractLabel="普通人模式"
        primaryQuest={{
          id: "quest-1",
          title: "建立可靠的 validation baseline",
          summary: "完成一份可重現的模型評估 notebook。",
          difficulty: 3,
          estimatedMinutes: 90,
          status: "assigned",
          primarySkill: "Evaluation",
          acceptanceCriteria: ["比較兩種 validation strategy"],
          evidenceTypes: ["url"],
        }}
        skills={[
          { key: "data", label: "Data Handling", value: 42 },
          { key: "modeling", label: "Modeling", value: 51 },
          { key: "evaluation", label: "Evaluation", value: 63 },
          { key: "engineering", label: "Engineering", value: 47 },
          { key: "research", label: "Research Sense", value: 36 },
          { key: "product", label: "Product Thinking", value: 29 },
          { key: "communication", label: "Communication", value: 55 },
        ]}
        feedback="Demo：你的錯誤分析已變得更具體，下一步請補上資料洩漏檢查。"
        resources={[{
          id: "resource-1",
          title: "Cross-validation field guide",
          resourceType: "article",
          relevance: 94,
          difficulty: 3,
          freshness: 88,
          credibility: 91,
          estimatedMinutes: 20,
          skillTags: ["Evaluation"],
        }]}
        agents={[
          { id: "coordinator", name: "協調員", status: "complete", lastRun: "07:30", summary: "每日回饋已整理" },
          { id: "strategist", name: "學習策略", status: "complete", lastRun: "07:28", summary: "今日任務已規劃" },
          { id: "collector", name: "資源收集", status: "idle", lastRun: "02:10", summary: "知識庫使用 mock data" },
          { id: "adjuster", name: "調整者", status: "complete", lastRun: "07:25", summary: "難度維持不變" },
        ]}
        recentArtifact={{
          id: "artifact-1",
          title: "Titanic error analysis",
          artifactType: "notebook",
          skillTags: ["Evaluation"],
          qualityScore: 86,
          verificationStatus: "demo-verified",
          isPrivate: true,
        }}
        recentActivity={{ id: "event-1", eventType: "quest", title: "完成資料品質檢查", occurredAt: "今天 07:10", summary: "+64 XP" }}
        onOpenPrimaryQuest={vi.fn()}
      />,
    );

    expect(screen.getByText("Level 7")).toBeVisible();
    expect(screen.getByText("320 / 500 XP")).toBeVisible();
    expect(screen.getByText("連續 6 天")).toBeVisible();
    expect(screen.getByText("普通人模式")).toBeVisible();
    expect(screen.getByText("Demo：你的錯誤分析已變得更具體，下一步請補上資料洩漏檢查。")).toBeVisible();
    expect(screen.getAllByText("Demo")).toHaveLength(5);
    expect(screen.getByText("42 / 100")).toBeVisible();
    expect(screen.getByText("51 / 100")).toBeVisible();
    expect(screen.getByText("63 / 100")).toBeVisible();
    expect(screen.getByText("47 / 100")).toBeVisible();
    expect(screen.getByText("36 / 100")).toBeVisible();
    expect(screen.getByText("29 / 100")).toBeVisible();
    expect(screen.getByText("55 / 100")).toBeVisible();

    const primaryQuest = screen.getByRole("article", { name: "今日主要任務" });
    expect(within(primaryQuest).getByText("90 分鐘")).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "開始主要任務" })).toBeVisible();
  }, 15_000);
});
