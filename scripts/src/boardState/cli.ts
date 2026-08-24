import { resolveSpecArg } from "../cli/resolveSpecArg.js";
import { buildBoardState } from "./main.js";

/**
 * The CLI surface: a single command taking a Spec (number or path), just
 * like `board-step` -- see the `board-state` shim script at this package's
 * root. Its one positional Spec argument is resolved by the shared
 * `resolveSpecArg` (see `../cli/resolveSpecArg.ts`). Prints the resulting
 * `BoardState` as JSON and nothing else -- no separate human-readable text
 * mode, and no filesystem or git side effects.
 */
export function main(argv: string[]): void {
  const { boardDir, specNumber } = resolveSpecArg(argv, "board-state");
  const state = buildBoardState(boardDir, specNumber);
  console.log(JSON.stringify(state, null, 2));
}

// This module is always the CLI's entry point (run directly via the
// `board-state` shim through tsx, never imported elsewhere), so it owns the
// error-exit boilerplate itself -- matching `board-step`'s cli.ts.
try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
