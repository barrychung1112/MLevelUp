import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtifactEnhancementPanel } from "./artifact-enhancement-panel";

describe("ArtifactEnhancementPanel", () => {
  it("generates an editable private draft and approves edited text", async () => {
    const onGenerate = vi.fn(async () => ({ ok: true, draft: { status: "draft" as const, bullets: [
      { id: "b1", text: "First grounded result", source_refs: ["artifact:title"] },
      { id: "b2", text: "Second grounded result", source_refs: ["artifact:type"] },
      { id: "b3", text: "Third grounded result", source_refs: ["artifact:quality_score"] },
    ] } }));
    const onUpdate = vi.fn(async () => ({ ok: true, status: "approved" }));
    render(<ArtifactEnhancementPanel artifactId="a1" onVerify={vi.fn(async () => ({ ok: true, status: "verified" }))} onGenerate={onGenerate} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate achievements" }));
    const first = await screen.findByLabelText("Achievement 1");
    fireEvent.change(first, { target: { value: "Edited grounded result" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve for portfolio" }));
    expect(onUpdate).toHaveBeenCalledWith("a1", "approve", expect.arrayContaining([{ id: "b1", text: "Edited grounded result" }]));
  });
});
