import { extractFlag } from "../cli/extractFlag.js";
import { parseReportedFate } from "../cli/parseReportedFate.js";
import { landChild } from "./main.js";

/**
 * The CLI surface `run-spec`'s driving instructions call to land one
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
  const fate = parseReportedFate("land-child", fateArg, reasonArg);

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
