import { attemptMerge, checkout } from "git-ts/src/gitClient.js";

import type { ReportedFate, ReportResult } from "../boardStep/main.js";
import { runReportFate } from "../boardStep/main.js";

/**
 * What `landChild` did for one finished child: `landed` when its branch
 * merged cleanly onto the base and its already-decided fate was enacted via
 * `board-step`'s fate-enactment entry point (`runReportFate`) in this same
 * call -- carrying that call's own result, so a caller can inspect exactly
 * what happened to the ticket without a second lookup. `conflict` is a bare
 * signal only: this module's own scope (Spec #1's "clean merge" child
 * ticket) never attempts to resolve or retry a conflicting merge, or touch
 * the board at all when one occurs -- a later ticket owns that retry/attempt
 * -counting/flag-and-recycle policy on top of this same signal.
 */
export type LandOutcome = { kind: "landed"; report: ReportResult } | { kind: "conflict" };

/**
 * Lands one finished child's branch onto a Spec's shared base in a single
 * call -- the merge and the fate-enactment that follows it are never split
 * across two calls a caller has to sequence itself, matching Spec #1's
 * "the module performs the merge and the fate-enactment call itself" design
 * decision.
 *
 * Checks out `baseBranch` in the project repo at `projectRepoDir` (the
 * single shared checkout `spec-loop`'s orchestrating process alone writes
 * into -- never a child's own isolated worktree), then attempts merging
 * `childBranch` onto it via `git-ts`'s `attemptMerge`. On a clean result,
 * enacts `fate` -- already decided by the `spec-pass` work pass that
 * finished this child -- against the ticket numbered `ticketNumber` on the
 * board at `boardDir`, via `board-step`'s `runReportFate`. On a conflicting
 * result, the base is left exactly as it stood before the attempt (per
 * `attemptMerge`'s own contract) and neither the board nor `fate` is
 * touched at all -- reported back as a bare `{ kind: "conflict" }` for a
 * caller to act on.
 */
export function landChild(
  projectRepoDir: string,
  baseBranch: string,
  childBranch: string,
  boardDir: string,
  ticketNumber: number,
  fate: ReportedFate,
): LandOutcome {
  checkout(projectRepoDir, baseBranch);
  const merge = attemptMerge(projectRepoDir, childBranch);
  if (merge.outcome === "conflict") {
    return { kind: "conflict" };
  }

  const report = runReportFate(boardDir, ticketNumber, fate);
  return { kind: "landed", report };
}
