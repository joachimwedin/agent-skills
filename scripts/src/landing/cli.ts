import type { ReportedFate } from "../boardStep/main.js";
import { landChild } from "./main.js";

/**
 * Pulls a `--flag <value>` pair out of `argv` wherever it appears, returning
 * that value alongside every remaining argument with the flag and its value
 * removed -- mirrors `boardStep/cli.ts`'s own `extractFlag` (duplicated
 * rather than imported: a `cli.ts` module is always a CLI's own entry point,
 * never imported elsewhere, matching that module's existing convention).
 */
function extractFlag(argv: string[], flag: string): { value: string | undefined; rest: string[] } {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return { value: undefined, rest: argv };
  }
  const value = argv[index + 1];
  return { value, rest: [...argv.slice(0, index), ...argv.slice(index + 2)] };
}

/** Parses `land-child`'s `--fate`/`--reason` flags into a `ReportedFate`, mirroring `boardStep/cli.ts`'s `parseReportedFate`. */
function parseReportedFate(fateArg: string | undefined, reasonArg: string | undefined): ReportedFate {
  switch (fateArg) {
    case "ready-for-review":
      return { kind: "ready-for-review" };
    case "done":
      return { kind: "done" };
    case "flagged":
      if (reasonArg === undefined) {
        throw new Error('land-child ... --fate flagged also needs --reason "<why>"');
      }
      return { kind: "flagged", reason: reasonArg };
    default:
      throw new Error(`Unknown --fate "${fateArg}" -- expected one of: ready-for-review, flagged, done.`);
  }
}

/**
 * The CLI surface `spec-loop`'s driving instructions call to land one
 * finished child's branch through the landing module (`landChild` in
 * `./main.js`) -- the merge onto the Spec's shared base, plus whatever it
 * implies for the ticket's fate -- rather than reimplementing that
 * merge-then-report-fate policy in prose:
 *
 *   land-child <project-repo-dir> <base-branch> <child-branch> <board-dir> <ticket-number> --fate <fate> [--reason "<why>"] [--attempt <n>]
 *
 * `<fate>` is the fate a `spec-pass` work or review-child pass already
 * decided for this ticket (`ready-for-review`, `flagged` with `--reason`,
 * or `done`) -- exactly `board-step report`'s own `--fate` vocabulary,
 * since a clean merge here ends by enacting that same fate. `--attempt`
 * defaults to a ticket's first landing try, matching `landChild`'s own
 * default; pass it explicitly to resume a landing already reported
 * `needs-resolution` once, after a conflict-resolution pass. Prints the
 * resulting `LandOutcome` JSON (`landed`, `needs-resolution`, or
 * `flagged`) and nothing else -- no separate human-readable text mode,
 * matching `board-step`/`board-state`.
 */
export function main(argv: string[]): void {
  const { value: fateArg, rest: afterFate } = extractFlag(argv, "--fate");
  const { value: reasonArg, rest: afterReason } = extractFlag(afterFate, "--reason");
  const { value: attemptArg, rest: positional } = extractFlag(afterReason, "--attempt");
  const fate = parseReportedFate(fateArg, reasonArg);

  const [projectRepoDir, baseBranch, childBranch, boardDir, ticketNumberArg] = positional;
  if (
    projectRepoDir === undefined ||
    baseBranch === undefined ||
    childBranch === undefined ||
    boardDir === undefined ||
    ticketNumberArg === undefined
  ) {
    throw new Error(
      'Usage: land-child <project-repo-dir> <base-branch> <child-branch> <board-dir> <ticket-number> --fate <fate> [--reason "<why>"] [--attempt <n>]',
    );
  }

  const ticketNumber = Number.parseInt(ticketNumberArg, 10);
  const result =
    attemptArg === undefined
      ? landChild(projectRepoDir, baseBranch, childBranch, boardDir, ticketNumber, fate)
      : landChild(projectRepoDir, baseBranch, childBranch, boardDir, ticketNumber, fate, Number.parseInt(attemptArg, 10));

  console.log(JSON.stringify(result, null, 2));
}

// This module is always the CLI's entry point (run directly via the
// `land-child` shim through tsx, never imported elsewhere), so it owns the
// error-exit boilerplate itself -- matching `board-step`/`board-state`'s
// own cli.ts.
try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
