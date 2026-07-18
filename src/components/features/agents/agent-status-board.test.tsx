import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AgentStatusBoard } from "./agent-status-board";

describe("AgentStatusBoard", () => {
  test("labels Demo, AI, and fallback agent states from data", () => {
    render(
      <AgentStatusBoard
        agents={[
          { id: "coordinator", name: "Coordinator", status: "complete", lastRun: "07:30", summary: "Feedback ready", provenance: "AI", model: "gpt-5.6-terra", latencyMs: 420 },
          { id: "strategist", name: "Strategist", status: "degraded", lastRun: "07:28", summary: "Fallback used", provenance: "Fallback", errorCode: "rate_limited" },
          { id: "collector", name: "Resource Collector", status: "idle", lastRun: "02:10", summary: "Phase 4", provenance: "Demo" },
        ]}
      />,
    );

    expect(screen.getByText("AI")).toBeVisible();
    expect(screen.getByText("Fallback")).toBeVisible();
    expect(screen.getByText("Demo")).toBeVisible();
    expect(screen.getByText(/gpt-5.6-terra/)).toBeVisible();
    expect(screen.getByText(/rate_limited/)).toBeVisible();
  }, 15_000);

  test("announces its loading state", () => {
    render(<AgentStatusBoard agents={[]} status="loading" />);
    expect(screen.getByRole("status")).toHaveTextContent("正在讀取 Agent 狀態");
  }, 15_000);
});
