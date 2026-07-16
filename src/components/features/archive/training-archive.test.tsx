import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { TrainingArchive } from "./training-archive";

const activities = [
  { id: "e1", eventType: "quest", title: "完成 validation baseline", occurredAt: "今天 07:10", summary: "+64 XP" },
  { id: "e2", eventType: "artifact", title: "新增模型評估報告", occurredAt: "昨天 21:40", summary: "Quality 88" },
];

describe("TrainingArchive", () => {
  test("filters the battle timeline and offers a visible recovery", async () => {
    render(<TrainingArchive activities={activities} eventTypes={["quest", "artifact", "level-up"]} />);

    expect(screen.getByText("完成 validation baseline")).toBeVisible();
    expect(screen.getByText("新增模型評估報告")).toBeVisible();
    fireEvent.change(screen.getByLabelText("紀錄類型"), { target: { value: "level-up" } });
    expect(screen.getByText("沒有符合目前篩選條件的訓練紀錄")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "清除紀錄篩選" }));
    expect(screen.getByText("完成 validation baseline")).toBeVisible();
  }, 15_000);

  test("shows a useful empty archive state", () => {
    render(<TrainingArchive activities={[]} />);
    expect(screen.getByText("完成任務後，戰鬥紀錄會出現在這裡。")).toBeVisible();
  }, 15_000);
});
