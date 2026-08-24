import { resolveSpecArg } from "../cli/resolveSpecArg.js";
import { runBoardStep } from "./main.js";

/**
 * The CLI surface: a single command taking a Spec (number or path), just
 * like `board-state` -- see the `board-step` shim script at this package's
 * root. Its one positional Spec argument is resolved by the shared
 * `resolveSpecArg` (see `../cli/resolveSpecArg.ts`). Prints the resulting
 * `StepResult` (outcome plus board) as JSON and nothing else -- no separate
 * human-readable text mode, matching `board-state`.
 */
export function main(argv: string[]): void {
  const { boardDir, specNumber } = resolveSpecArg(argv, "board-step");
  const result = runBoardStep(boardDir, specNumber);
  console.log(JSON.stringify(result, null, 2));
}

// This module is always the CLI's entry point (run directly via the
// `board-step` shim through tsx, never imported elsewhere), so it owns the
// error-exit boilerplate itself -- matching `board-state`'s cli.ts.
try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
