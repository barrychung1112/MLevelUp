import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, test } from "vitest";

const HAN = /\p{Script=Han}/u;
const SOURCE_ROOT = join(process.cwd(), "src");

function productionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionFiles(path);
    if (![".ts", ".tsx"].includes(extname(entry.name))) return [];
    if (/\.test\.[tj]sx?$/.test(entry.name)) return [];
    return [path];
  });
}

describe("English-only production sources", () => {
  test("contain no system-authored Han characters", () => {
    const violations = productionFiles(SOURCE_ROOT).flatMap((file) =>
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((line, index) => ({ file, line, lineNumber: index + 1 }))
        .filter(({ line }) => HAN.test(line))
        .map(({ file, line, lineNumber }) =>
          `${relative(process.cwd(), file)}:${lineNumber}: ${line.trim()}`,
        ),
    );

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
