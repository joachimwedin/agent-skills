import { resolveSpecArg } from "../cli/resolveSpecArg.js";
import type { ReportedFate } from "./main.js";
import { runBoardStep, runReportFate } from "./main.js";

/**
 * Pulls a `--flag <value>` pair out of `argv` wherever it appears, returning
 * that value alongside every remaining argument with the flag and its value
 * removed -- so a caller can strip every recognized flag before handing the
 * rest to `resolveSpecArg`, which only ever expects its own two positional
 * forms.
 */
function extractFlag(argv: string[], flag: string): { value: string | undefined; rest: string[] } {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return { value: undefined, rest: argv };
  }
  const value = argv[index + 1];
  return { value, rest: [...argv.slice(0, index), ...argv.slice(index + 2)] };
}

/** Parses `board-step report`'s `--fate`/`--reason` flags into a `ReportedFate`, per `runReportFate`'s three valid kinds. */
function parseReportedFate(fateArg: string | undefined, reasonArg: string | undefined): ReportedFate {
  switch (fateArg) {
    case "ready-for-review":
      return { kind: "ready-for-review" };
    case "done":
      return { kind: "done" };
    case "flagged":
      if (reasonArg === undefined) {
        throw new Error('board-step report ... --fate flagged also needs --reason "<why>"');
      }
      return { kind: "flagged", reason: reasonArg };
    default:
      throw new Error(`Unknown --fate "${fateArg}" -- expected one of: ready-for-review, flagged, done.`);
  }
}

/**
 * The CLI surface: either the plain decide-and-act command taking a Spec
 * (number or path), just like `board-state` -- see the `board-step` shim
 * script at this package's root -- or, when the first argument is
 * `report`, the report-then-enact command that carries out one fate
 * `spec-pass`/`spec-review` already decided for a single ticket (see
 * `runReportFate` in `./main.js`):
 *
 *   board-step <spec-number> <board-dir> | <path-to-spec-ticket-file>
 *   board-step report <ticket-number> <board-dir> --fate <fate> [--reason "<why>"]
 *   board-step report <path-to-ticket-file> --fate <fate> [--reason "<why>"]
 *
 * The reported ticket's own positional argument is resolved by the same
 * shared `resolveSpecArg` (`../cli/resolveSpecArg.ts`) the plain command
 * uses -- it only ever recovers a ticket number and board directory from
 * either form, with no assumption that the ticket is a Spec. Prints the
 * resulting JSON (outcome plus board, either shape) and nothing else -- no
 * separate human-readable text mode, matching `board-state`.
 */
export function main(argv: string[]): void {
  if (argv[0] === "report") {
    const { value: fateArg, rest: afterFate } = extractFlag(argv.slice(1), "--fate");
    const { value: reasonArg, rest: ticketArgv } = extractFlag(afterFate, "--reason");
    const fate = parseReportedFate(fateArg, reasonArg);
    const { boardDir, specNumber: ticketNumber } = resolveSpecArg(ticketArgv, "board-step report");
    const result = runReportFate(boardDir, ticketNumber, fate);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

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
