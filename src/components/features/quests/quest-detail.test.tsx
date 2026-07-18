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

    expect(screen.getByRole("heading", { name: "執行步驟" })).toBeVisible();
    expect(screen.getByText("建立固定資料切分")).toBeVisible();
    expect(screen.getByRole("heading", { name: "成功衡量標準" })).toBeVisible();
    expect(screen.getByText("重跑後的驗證分數誤差小於 0.01")).toBeVisible();
    expect(screen.getByRole("heading", { name: "本次不做" })).toBeVisible();
    expect(screen.getByText("正式環境部署")).toBeVisible();
    expect(screen.getByText(/截止：2026-07-20 23:59/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Scikit-learn 模型評估指南" })).toHaveAttribute(
      "href",
      "https://example.com/evaluation",
    );
  });

  test("blocks invalid evidence and submits a valid URL with reflection", () => {
    const onSubmit = vi.fn();
    render(<QuestDetail quest={{ ...quest, evidenceTypes: ["url"] }} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("成果連結"), { target: { value: "not-a-url" } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));
    expect(screen.getByText("請輸入以 http:// 或 https:// 開頭的有效網址")).toBeVisible();
    expect(screen.getByText("請填寫自我反思")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("成果連結"), { target: { value: "https://github.com/example/commit" } });
    fireEvent.change(screen.getByLabelText("自我反思"), { target: { value: "我固定了資料切分，並確認實驗可以重跑。" } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      evidenceType: "url",
      evidenceUrl: "https://github.com/example/commit",
    }));
  });

  test("converts a browser file to serializable metadata", () => {
    const onSubmit = vi.fn();
    render(<QuestDetail quest={{ ...quest, evidenceTypes: ["file"] }} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("證據類型"), { target: { value: "file" } });
    const file = new File(["metric,score\nauc,0.91"], "report.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("成果檔案"), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("自我反思"), { target: { value: "我記錄了評估結果與下一步。" } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));

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

    const url = screen.getByRole("textbox", { name: /成果連結/u });
    const metric = screen.getByRole("textbox", { name: /指標結果/u });
    const reflection = screen.getByRole("textbox", { name: /自我反思/u });
    fireEvent.change(url, { target: { value: "https://github.com/example/commit/abc" } });
    fireEvent.change(reflection, {
      target: { value: "I compared the validation result and documented why this baseline is reproducible." },
    });
    fireEvent.click(screen.getByRole("button", { name: /提交成果/u }));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(metric, { target: { value: "validation_accuracy: 0.82" } });
    fireEvent.click(screen.getByRole("button", { name: /提交成果/u }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      evidenceUrl: "https://github.com/example/commit/abc",
      metricResult: "validation_accuracy: 0.82",
    }));
  });
});
