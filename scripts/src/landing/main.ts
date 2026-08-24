import { attemptMerge, checkout, diffRefs } from "git-ts/src/gitClient.js";

import type { ReportedFate, ReportResult } from "../boardStep/main.js";
import { runReportFate } from "../boardStep/main.js";

/**
 * How many times `landChild` attempts landing a single ticket's branch
 * before giving up on inline conflict resolution and falling back to the
 * existing flagged-and-recycled-to-`todo/` fate instead (Spec #1's "inline
 * conflict resolution capped at 3 attempts" decision). `attempt` (see
 * `landChild` below) is 1-indexed, so a ticket that still conflicts on
 * `attempt === MAX_LANDING_ATTEMPTS` has had every one of its three tries --
 * including whatever the base did in between them -- exhausted.
 */
const MAX_LANDING_ATTEMPTS = 3;

/**
 * What `landChild` did for one finished child on this one call:
 *
 * - `landed`: the branch merged cleanly onto the base, and its
 *   already-decided `fate` was enacted via `board-step`'s fate-enactment
 *   entry point (`runReportFate`) in this same call -- carrying that call's
 *   own result, so a caller can inspect exactly what happened to the ticket
 *   without a second lookup.
 * - `needs-resolution`: the branch conflicts with the base as it stands
 *   right now, and fewer than `MAX_LANDING_ATTEMPTS` attempts have been
 *   spent on this ticket so far -- neither the board nor `fate` is touched.
 *   Carries `diff` (the change `childBranch` couldn't apply, recovered via
 *   `git-ts`'s `diffRefs` against the same two refs `attemptMerge` just
 *   compared) for a conflict-resolution `spec-pass` work-mode pass to act
 *   on, and this call's own 1-indexed `attempt` number, so a caller can pass
 *   `attempt + 1` back into the next `landChild` call once that pass
 *   reports a resolution.
 * - `flagged`: the branch still conflicted on attempt `MAX_LANDING_ATTEMPTS`
 *   -- inline resolution is abandoned, and the existing
 *   flagged-and-recycled-to-`todo/` fate was enacted for this ticket
 *   directly instead of `fate` (no further `needs-resolution` round is ever
 *   reported past the cap), carrying that call's own `runReportFate` result
 *   the same way `landed` does.
 */
export type LandOutcome =
  | { kind: "landed"; report: ReportResult }
  | { kind: "needs-resolution"; diff: string; attempt: number }
  | { kind: "flagged"; report: ReportResult };

/**
 * Lands one finished child's branch onto a Spec's shared base in a single
 * call -- the merge and whatever it implies for the ticket's fate (landing
 * it, asking for a conflict-resolution pass, or giving up and flagging it)
 * are never split across two calls a caller has to sequence itself, matching
 * Spec #1's "the module performs the merge and the fate-enactment call
 * itself" design decision.
 *
 * Checks out `baseBranch` in the project repo at `projectRepoDir` (the
 * single shared checkout `spec-loop`'s orchestrating process alone writes
 * into -- never a child's own isolated worktree), then attempts merging
 * `childBranch` onto it via `git-ts`'s `attemptMerge`. On a clean result,
 * enacts `fate` -- already decided by the `spec-pass` work pass that
 * finished this child -- against the ticket numbered `ticketNumber` on the
 * board at `boardDir`, via `board-step`'s `runReportFate`.
 *
 * On a conflicting result, the base is left exactly as it stood before the
 * attempt (per `attemptMerge`'s own contract). Below `MAX_LANDING_ATTEMPTS`
 * (`attempt`, 1-indexed, defaults to a ticket's first try), this reports
 * `needs-resolution` -- for `spec-loop`'s orchestrator to hand the
 * conflicting diff to a fresh conflict-resolution `spec-pass` work-mode
 * pass, then call `landChild` again with `attempt + 1` once that pass
 * reports back; each retry re-attempts the merge against whatever
 * `baseBranch` looks like at that point, covering the case where the base
 * has moved again in between. On `attempt === MAX_LANDING_ATTEMPTS`, inline
 * resolution is abandoned instead: this enacts the existing
 * flagged-and-recycled-to-`todo/` fate itself (no caller-supplied `fate`
 * involved) and reports `flagged`.
 */
export function landChild(
  projectRepoDir: string,
  baseBranch: string,
  childBranch: string,
  boardDir: string,
  ticketNumber: number,
  fate: ReportedFate,
  attempt = 1,
): LandOutcome {
  checkout(projectRepoDir, baseBranch);
  const merge = attemptMerge(projectRepoDir, childBranch);
  if (merge.outcome === "clean") {
    const report = runReportFate(boardDir, ticketNumber, fate);
    return { kind: "landed", report };
  }

  const diff = diffRefs(projectRepoDir, baseBranch, childBranch);
  if (attempt < MAX_LANDING_ATTEMPTS) {
    return { kind: "needs-resolution", diff, attempt };
  }

  const report = runReportFate(boardDir, ticketNumber, {
    kind: "flagged",
    reason: `Branch "${childBranch}" still conflicts with "${baseBranch}" after ${MAX_LANDING_ATTEMPTS} landing attempts -- needs manual conflict resolution.`,
  });
  return { kind: "flagged", report };
}
