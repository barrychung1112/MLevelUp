import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChallengerSilhouette } from "./challenger-silhouette";

describe("ChallengerSilhouette", () => {
  it("is decorative and excluded from the accessible reading order", () => {
    render(<ChallengerSilhouette />);
    const figure = screen.getByTestId("challenger-silhouette");
    expect(figure).toHaveAttribute("aria-hidden", "true");
    expect(figure).toHaveClass("pointer-events-none");
  });
});
