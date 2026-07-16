import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AgentStatusBoard } from "./agent-status-board";

describe("AgentStatusBoard", () => {
  test("marks every agent state and output as Demo", () => {
    render(
      <AgentStatusBoard
        agents={[
          { id: "coordinator", name: "協調員 Agent", status: "complete", lastRun: "07:30", summary: "每日回饋已整理" },
          { id: "strategist", name: "學習策略 Agent", status: "complete", lastRun: "07:28", summary: "任務已規劃" },
          { id: "collector", name: "資源收集 Agent", status: "idle", lastRun: "02:10", summary: "資源知識庫待命" },
          { id: "adjuster", name: "調整者 Agent", status: "reviewing", lastRun: "07:25", summary: "正在比較表現趨勢" },
        ]}
      />,
    );

    expect(screen.getAllByText("Demo")).toHaveLength(4);
    expect(screen.getByText("協調員 Agent")).toBeVisible();
    expect(screen.getByText("學習策略 Agent")).toBeVisible();
    expect(screen.getByText("資源收集 Agent")).toBeVisible();
    expect(screen.getByText("調整者 Agent")).toBeVisible();
    expect(screen.getAllByText("complete", { selector: "span" })).toHaveLength(2);
    expect(screen.getByText("reviewing", { selector: "span" })).toBeVisible();
  }, 15_000);

  test("announces its loading state", () => {
    render(<AgentStatusBoard agents={[]} status="loading" />);
    expect(screen.getByRole("status")).toHaveTextContent("正在讀取 Agent 狀態");
  }, 15_000);
});
