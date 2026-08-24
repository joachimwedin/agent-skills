import * as path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveSpecArg } from "../../src/cli/resolveSpecArg.js";

/**
 * Unit tests for the shared Spec-argument resolution -- covers both
 * accepted input shapes and every error case, since this module is depended
 * on by more than one CLI entry point (`board-step`, `board-state`).
 */
describe("resolveSpecArg", () => {
  it("resolves a bare ticket number plus a board directory", () => {
    expect(resolveSpecArg(["1", "boards/agent-tickets"], "board-step")).toEqual({
      boardDir: "boards/agent-tickets",
      specNumber: 1,
    });
  });

  it("resolves a self-describing path to the Spec's own ticket file", () => {
    const result = resolveSpecArg(["boards/agent-tickets/in-progress/8-spec-widget-overhaul.md"], "board-step");
    expect(result.specNumber).toBe(8);
    expect(result.boardDir).toBe(path.resolve("boards/agent-tickets"));
  });

  it("throws with a usage message naming the command when no argument is given", () => {
    expect(() => resolveSpecArg([], "board-step")).toThrowError(
      "Usage: board-step <spec-number> <board-dir> | board-step <path-to-spec-ticket-file>",
    );
  });

  it("throws naming the command when a bare number is given without a board directory", () => {
    expect(() => resolveSpecArg(["1"], "board-step")).toThrowError(
      "A bare ticket number needs a board directory as the second argument, e.g. `board-step 1 boards/agent-tickets`. " +
        "Pass a path to the Spec's own ticket file instead to skip this.",
    );
  });

  it("throws when the argument is neither a bare number nor a valid ticket file path", () => {
    expect(() => resolveSpecArg(["not-a-number-or-path"], "board-step")).toThrowError(
      "Not a valid ticket file path: not-a-number-or-path",
    );
  });
});
