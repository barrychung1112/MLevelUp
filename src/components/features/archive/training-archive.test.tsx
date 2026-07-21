import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { TrainingArchive } from "./training-archive";

const activities = [
  { id: "e1", eventType: "quest", title: "完成 validation baseline", occurredAt: "今天 07:10", summary: "+64 XP" },
  { id: "e2", eventType: "artifact", title: "新增模型評估報告", occurredAt: "昨天 21:40", summary: "Quality 88" },
];

describe("TrainingArchive", () => {
  test("uses one controlled event filter for change and clear", () => {
    const onFiltersChange = vi.fn();
    const filters = { eventType: "level-up" };

    render(
      <TrainingArchive
        activities={activities}
        eventTypes={["quest", "artifact", "level-up"]}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(screen.getByLabelText("Activity type")).toHaveValue("level-up");
    expect(screen.getByText("No training activity matches these filters")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Activity type"), {
      target: { value: "quest" },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({ eventType: "quest" });

    fireEvent.click(screen.getByRole("button", { name: "Clear Archive Filters" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ eventType: "all" });
  });

  test("filters the battle timeline and offers a visible recovery", async () => {
    render(<TrainingArchive activities={activities} eventTypes={["quest", "artifact", "level-up"]} />);

    expect(screen.getByText("完成 validation baseline")).toBeVisible();
    expect(screen.getByText("新增模型評估報告")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Activity type"), { target: { value: "level-up" } });
    expect(screen.getByText("No training activity matches these filters")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear Archive Filters" }));
    expect(screen.getByText("完成 validation baseline")).toBeVisible();
  }, 15_000);

  test("shows a useful empty archive state", () => {
    render(<TrainingArchive activities={[]} />);
    expect(screen.getByText("Complete a mission to create your first battle log entry.")).toBeVisible();
  }, 15_000);
});
