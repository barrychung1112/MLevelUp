import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { QuestDetail } from "./quest-detail";

const quest = {
  id: "quest-1",
  title: "建立模型評估報告",
  summary: "比較 baseline 與改良模型。",
  difficulty: 3,
  estimatedMinutes: 75,
  status: "in-progress" as const,
  primarySkill: "Evaluation",
  acceptanceCriteria: ["包含 validation strategy", "至少一項錯誤分析"],
  evidenceTypes: ["url", "file", "metric", "text"] as const,
};

describe("QuestDetail", () => {
  test("shows acceptance criteria and clear evidence errors", async () => {
    const onSubmit = vi.fn();
    render(<QuestDetail quest={quest} onSubmit={onSubmit} />);

    expect(screen.getByText("包含 validation strategy")).toBeVisible();
    expect(screen.getByText("至少一項錯誤分析")).toBeVisible();
    expect(screen.getByLabelText("證據類型")).toBeVisible();
    expect(screen.getByLabelText("成果網址")).toBeVisible();
    expect(screen.getByLabelText("自我反思")).toBeVisible();

    fireEvent.change(screen.getByLabelText("成果網址"), { target: { value: "not-a-url" } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));

    expect(screen.getByText("請輸入以 http:// 或 https:// 開頭的有效網址")).toBeVisible();
    expect(screen.getByText("請填寫自我反思")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  }, 15_000);

  test("clears URL and reflection errors as each field changes", () => {
    render(<QuestDetail quest={quest} onSubmit={vi.fn()} />);
    const urlField = screen.getByLabelText("成果網址");
    const reflectionField = screen.getByLabelText("自我反思");

    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));
    expect(urlField).toHaveAttribute("aria-invalid", "true");
    expect(reflectionField).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(urlField, { target: { value: "https://example.com/evidence" } });
    expect(screen.queryByText("請輸入以 http:// 或 https:// 開頭的有效網址")).not.toBeInTheDocument();
    expect(urlField).not.toHaveAttribute("aria-invalid");
    expect(reflectionField).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(reflectionField, { target: { value: "我記錄了這次實驗的主要發現。" } });
    expect(screen.queryByText("請填寫自我反思")).not.toBeInTheDocument();
    expect(reflectionField).not.toHaveAttribute("aria-invalid");
  }, 15_000);

  test.each([
    { evidenceType: "metric", label: "指標結果", value: "AUC 0.91", error: "請輸入指標結果" },
    { evidenceType: "text", label: "成果文字", value: "這是一份可展示的實驗摘要。", error: "請輸入成果內容" },
  ] as const)("clears the $evidenceType error when its content changes", ({ evidenceType, label, value, error }) => {
    render(<QuestDetail quest={quest} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("證據類型"), { target: { value: evidenceType } });
    const field = screen.getByLabelText(label);

    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(error)).toBeVisible();

    fireEvent.change(field, { target: { value } });
    expect(screen.queryByText(error)).not.toBeInTheDocument();
    expect(field).not.toHaveAttribute("aria-invalid");
  }, 15_000);

  test("clears the file error after a file is selected", () => {
    render(<QuestDetail quest={quest} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("證據類型"), { target: { value: "file" } });
    const fileField = screen.getByLabelText("成果檔案");

    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));
    expect(fileField).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("請選擇成果檔案")).toBeVisible();

    const file = new File(["result"], "result.txt", { type: "text/plain" });
    fireEvent.change(fileField, { target: { files: [file] } });
    expect(screen.queryByText("請選擇成果檔案")).not.toBeInTheDocument();
    expect(fileField).not.toHaveAttribute("aria-invalid");
  }, 15_000);

  test("converts browser files to metadata before exposing them", async () => {
    const onSubmit = vi.fn();
    const onFileMetadata = vi.fn();
    render(<QuestDetail quest={quest} onSubmit={onSubmit} onFileMetadata={onFileMetadata} />);

    fireEvent.change(screen.getByLabelText("證據類型"), { target: { value: "file" } });
    const file = new File(["metric,score\nauc,0.91"], "report.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("成果檔案"), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("自我反思"), { target: { value: "我比較了兩種 validation strategy，並記錄資料洩漏風險。" } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));

    expect(onFileMetadata).toHaveBeenCalledWith({ name: "report.csv", size: file.size, type: "text/csv", lastModified: file.lastModified });
    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload.fileMetadata).toEqual({ name: "report.csv", size: file.size, type: "text/csv", lastModified: file.lastModified });
    expect(payload.fileMetadata).not.toBeInstanceOf(File);
  }, 15_000);

  test.each([
    {
      evidenceType: "metric" as const,
      label: "指標結果",
      value: "AUC 0.91",
      payloadKey: "metricResult" as const,
    },
    {
      evidenceType: "text" as const,
      label: "成果文字",
      value: "比較兩個 validation split 的錯誤分布。",
      payloadKey: "evidenceText" as const,
    },
  ])("submits $evidenceType evidence through a controlled interaction", ({ evidenceType, label, value, payloadKey }) => {
    const onSubmit = vi.fn();
    render(<QuestDetail quest={quest} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("證據類型"), { target: { value: evidenceType } });
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.change(screen.getByLabelText("自我反思"), { target: { value: "我記錄了結果與下一個實驗假設。" } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ evidenceType, [payloadKey]: value }));
  }, 15_000);

  test("syncs the evidence control when a loading quest becomes ready", () => {
    const onSubmit = vi.fn();
    const fileQuest = { ...quest, id: "quest-file", evidenceTypes: ["file"] as const };
    const { rerender } = render(<QuestDetail quest={null} onSubmit={onSubmit} status="loading" />);

    rerender(<QuestDetail quest={fileQuest} onSubmit={onSubmit} status="ready" />);

    expect(screen.getByLabelText("證據類型")).toHaveValue("file");
    expect(screen.getByLabelText("成果檔案")).toBeVisible();
  }, 15_000);

  test("exposes submit progress, failure, and success from its parent flow", () => {
    render(
      <QuestDetail
        quest={quest}
        onSubmit={vi.fn()}
        isSubmitting
        submitError="成果提交失敗"
        successMessage="成果已提交"
      />,
    );

    const submitButton = screen.getByRole("button", { name: "提交成果" });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("成果提交失敗");
    expect(screen.getByRole("status")).toHaveTextContent("成果已提交");
  }, 15_000);
});
