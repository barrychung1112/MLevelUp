import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Page from "./page";

describe("root entry", () => {
  test("identifies the MLevelUp training system", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: "MLevelUp" }),
    ).toBeInTheDocument();
  });
});
