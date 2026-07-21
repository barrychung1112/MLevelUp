import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { QuestView } from "../view-models";
import { QuestDetail } from "./quest-detail";

const quest: QuestView = {
  id: "quest-1",
  title: "建立可重現的模型基線",
  summary: "完成一個可重跑、可衡量的基線實驗。",
  difficulty: 3,
  estimatedMinutes: 300,
  status: "in_progress",
  primarySkill: "Evaluation",
  acceptanceCriteria: ["程式碼可重跑", "驗證指標已記錄"],
  evidenceTypes: ["url", "file", "metric", "text"],
  scope: "main",
  dueAt: "2026-07-20 23:59",
  durationDays: 5,
  executionSteps: ["建立固定資料切分", "訓練基線模型", "記錄驗證指標", "提交程式碼"],
  successMetrics: ["重跑後的驗證分數誤差小於 0.01"],
  outOfScope: ["正式環境部署", "大規模調參"],
  resources: [{
    id: "resource-1",
    title: "Scikit-learn 模型評估指南",
    resourceType: "article",
    relevance: 95,
    difficulty: 2,
    freshness: 90,
    credibility: 98,
    estimatedMinutes: 20,
    skillTags: ["Evaluation"],
    url: "https://example.com/evaluation",
  }],
};

describe("QuestDetail", () => {
  test("shows executable steps, measurable success, boundaries, deadline, and resources", () => {
    render(<QuestDetail quest={quest} onSubmit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Execution Steps" })).toBeVisible();
    expect(screen.getByText("建立固定資料切分")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Success Criteria" })).toBeVisible();
    expect(screen.getByText("重跑後的驗證分數誤差小於 0.01")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Out of Scope" })).toBeVisible();
    expect(screen.getByText("正式環境部署")).toBeVisible();
    expect(screen.getByText(/Due: 2026-07-20 23:59/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Scikit-learn 模型評估指南" })).toHaveAttribute(
      "href",
      "https://example.com/evaluation",
    );
  });

  test("blocks invalid evidence and submits a valid URL with reflection", () => {
    const onSubmit = vi.fn();
    render(<QuestDetail quest={{ ...quest, evidenceTypes: ["url"] }} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Evidence URL"), { target: { value: "not-a-url" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Evidence" }));
    expect(screen.getByText("Enter a valid URL beginning with http:// or https://")).toBeVisible();
    expect(screen.getByText("Write a self-reflection")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Evidence URL"), { target: { value: "https://github.com/example/commit" } });
    fireEvent.change(screen.getByLabelText("Self-reflection"), { target: { value: "I fixed the data split and confirmed the experiment is reproducible." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Evidence" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      evidenceType: "url",
      evidenceUrl: "https://github.com/example/commit",
    }));
  });

  test("converts a browser file to serializable metadata", () => {
    const onSubmit = vi.fn();
    render(<QuestDetail quest={{ ...quest, evidenceTypes: ["file"] }} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Evidence type"), { target: { value: "file" } });
    const file = new File(["metric,score\nauc,0.91"], "report.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Evidence file"), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Self-reflection"), { target: { value: "I recorded the evaluation result and next step." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Evidence" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      evidenceType: "file",
      fileMetadata: expect.objectContaining({ name: "report.csv", type: "text/csv" }),
    }));
  });

  test("requires and submits every field for a multi-evidence quest", () => {
    const onSubmit = vi.fn();
    render(
      <QuestDetail
        quest={{ ...quest, evidenceTypes: ["url", "metric"] }}
        onSubmit={onSubmit}
      />,
    );

    const url = screen.getByRole("textbox", { name: /Evidence URL/u });
    const metric = screen.getByRole("textbox", { name: /Metric result/u });
    const reflection = screen.getByRole("textbox", { name: /Self-reflection/u });
    fireEvent.change(url, { target: { value: "https://github.com/example/commit/abc" } });
    fireEvent.change(reflection, {
      target: { value: "I compared the validation result and documented why this baseline is reproducible." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit Evidence/u }));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(metric, { target: { value: "validation_accuracy: 0.82" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Evidence/u }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      evidenceUrl: "https://github.com/example/commit/abc",
      metricResult: "validation_accuracy: 0.82",
    }));
  });

  test("loads deterministic Sandbox evidence through the normal submission form", () => {
    const onSubmit = vi.fn();
    const sampleEvidence = {
      evidenceType: "url" as const,
      evidenceUrl: "https://github.com/barrychung1112/MLevelUp/commit/example",
      metricResult: "validation_accuracy: 0.842",
      evidenceText: "The reproducible baseline records its split, metric, and result.",
      selfReflection: "I selected a validation strategy, measured the result, and documented the next experiment.",
    };
    render(
      <QuestDetail
        quest={{ ...quest, evidenceTypes: ["url", "metric", "text"] }}
        onSubmit={onSubmit}
        sampleEvidence={sampleEvidence}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load sample evidence" }));
    expect(screen.getByLabelText("Evidence URL")).toHaveValue(sampleEvidence.evidenceUrl);
    expect(screen.getByLabelText("Metric result")).toHaveValue(sampleEvidence.metricResult);
    expect(screen.getByLabelText("Evidence notes")).toHaveValue(sampleEvidence.evidenceText);
    expect(screen.getByLabelText("Self-reflection")).toHaveValue(sampleEvidence.selfReflection);

    fireEvent.click(screen.getByRole("button", { name: "Submit Evidence" }));
    expect(onSubmit).toHaveBeenCalledWith(sampleEvidence);
  });
});
