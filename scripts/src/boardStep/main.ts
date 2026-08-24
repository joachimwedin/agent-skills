import * as fs from "node:fs";
import * as path from "node:path";

import { addFile, commit, moveFile } from "git-ts/src/gitClient.js";

import type { BoardState } from "../boardState/main.js";
import { buildBoardState } from "../boardState/main.js";
import type { Folder, TicketRecord } from "../board/boardSnapshot.js";
import { findTicket, readBoardSnapshot, specNumberFor } from "../board/boardSnapshot.js";
import { classifyNextAction } from "../board/classify.js";

/**
 * What `runBoardStep` did (or found) for a Spec's board --
 * `claimed`/`spec-ready` are the two mechanical outcomes this function
 * already performed itself (file move plus commit); every other kind is a
 * pass-through report of `classifyNextAction`'s verdict, with no filesystem
 * or git change made. `claimed` carries every child claimed during this
 * same call -- one board-step call claims every currently-pickable child at
 * once, not just one, each still getting its own separate move and commit.
 */
export type Outcome =
  | { kind: "claimed"; claims: { ticketNumber: number; slug: string }[] }
  | { kind: "spec-ready"; ticketNumber: number; slug: string }
  | { kind: "dispatch"; ticketNumber: number; mode: "work" | "review-child" }
  | { kind: "dispatch-spec-review" }
  | { kind: "done" }
  | { kind: "blocked"; reason: string };

/**
 * `board-step`'s full result: the outcome plus the board's current state.
 * Every outcome kind carries a `board` field, always read fresh off disk
 * after any mechanical move -- never patched from the pre-move snapshot
 * already held in memory -- so it always matches what's actually on disk,
 * whether or not this call changed anything.
 */
export type StepResult = { outcome: Outcome; board: BoardState };

/** Path (relative to `boardDir`) of a ticket file, given the kanban folder it currently sits in. */
function ticketPath(folder: Folder, number: number, slug: string): string {
  return `${folder}/${number}-${slug}.md`;
}

/**
 * Executes every `execute-claim` verdict from this same Priority-scan call
 * in one pass -- not just the first -- each child still getting its own
 * separate move and commit (TICKET-FORMAT.md's existing claim commit-message
 * convention, `<n>: claim — <slug>`). The Spec's own todo/ -> in-progress/
 * move happens at most once across the whole pass, on the first claim, one
 * -way and never repeated after (TICKET-FORMAT.md's "Claim") -- its own
 * commit, separate from every child claim.
 */
function executeClaims(
  boardDir: string,
  specNumber: number,
  snapshot: ReturnType<typeof readBoardSnapshot>,
  verdicts: { kind: "execute-claim"; ticketNumber: number }[],
): Outcome {
  const { spec } = snapshot;
  let specStarted = spec.folder !== "todo";
  const claims: { ticketNumber: number; slug: string }[] = [];

  for (const verdict of verdicts) {
    const child = snapshot.children.find((c) => c.number === verdict.ticketNumber);
    if (child === undefined) {
      throw new Error(`classifyNextAction picked unknown ticket #${verdict.ticketNumber} on Spec #${specNumber}'s board`);
    }

    if (!specStarted) {
      moveFile(boardDir, ticketPath("todo", spec.number, spec.slug), ticketPath("in-progress", spec.number, spec.slug));
      commit(boardDir, `${spec.number}: start — ${spec.slug}`);
      specStarted = true;
    }

    moveFile(boardDir, ticketPath("todo", child.number, child.slug), ticketPath("in-progress", child.number, child.slug));
    commit(boardDir, `${child.number}: claim — ${child.slug}`);
    claims.push({ ticketNumber: child.number, slug: child.slug });
  }

  return { kind: "claimed", claims };
}

/**
 * The I/O seam tying the board-snapshot reader and the pure decision
 * function together: reads `boardDir`'s real board for the Spec numbered
 * `specNumber`, decides the Priority scan's next action(s) via
 * `classifyNextAction`, and -- only when mechanical -- performs the move(s)
 * and commit(s) via `git-ts`, using TICKET-FORMAT.md's existing
 * commit-message conventions (`<n>: start — <slug>`, `<n>: claim — <slug>`,
 * `<n>: ready for review — <slug>`). Every `execute-claim` verdict returned
 * by this same call is claimed in this same pass (see `executeClaims`
 * above); every other verdict kind is still only enacted/reported one at a
 * time -- dispatching every one of them at once is a later ticket's job,
 * not this one's.
 */
function decideAndAct(boardDir: string, specNumber: number): Outcome {
  const snapshot = readBoardSnapshot(boardDir, specNumber);
  const verdicts = classifyNextAction(snapshot);

  const claimVerdicts = verdicts.filter((v): v is { kind: "execute-claim"; ticketNumber: number } => v.kind === "execute-claim");
  if (claimVerdicts.length > 0) {
    return executeClaims(boardDir, specNumber, snapshot, claimVerdicts);
  }

  const [verdict] = verdicts;
  switch (verdict.kind) {
    case "execute-claim":
      // Unreachable: any execute-claim verdict was already filtered into
      // claimVerdicts above, and handled by the early return.
      throw new Error("unreachable");

    case "execute-spec-ready": {
      const { spec } = snapshot;
      moveFile(boardDir, ticketPath(spec.folder, spec.number, spec.slug), ticketPath("review", spec.number, spec.slug));
      commit(boardDir, `${spec.number}: ready for review — ${spec.slug}`);
      return { kind: "spec-ready", ticketNumber: spec.number, slug: spec.slug };
    }

    case "dispatch":
      return { kind: "dispatch", ticketNumber: verdict.ticketNumber, mode: verdict.mode };

    case "dispatch-spec-review":
      return { kind: "dispatch-spec-review" };

    case "done":
      return { kind: "done" };

    case "blocked":
      return { kind: "blocked", reason: verdict.reason };
  }
}

/**
 * `board-step`'s full entry point: performs `decideAndAct` above, then
 * attaches the board's current state to whatever it returned -- one fresh,
 * real filesystem read via `buildBoardState`, after any mutation
 * `decideAndAct` may have made, so a mechanical move's result reflects what
 * was actually written, and a judgment/terminal outcome's board matches the
 * real, unchanged state.
 */
export function runBoardStep(boardDir: string, specNumber: number): StepResult {
  const outcome = decideAndAct(boardDir, specNumber);
  return { outcome, board: buildBoardState(boardDir, specNumber) };
}

/**
 * A fate `spec-pass` or `spec-review` already decided for one ticket,
 * reported back to whoever invoked it rather than enacted directly (see
 * TICKET-FORMAT.md's "Spec board operations", "Report fate"). `board-step
 * report` (`runReportFate` below) is the sole executor of any of these
 * three -- mirroring how `execute-claim`/`execute-spec-ready` above are the
 * sole mechanical actions the Priority scan can trigger on its own.
 *
 * - `ready-for-review`: a child `spec-pass` (`work` mode) finished --
 *   in-progress/ -> review/. Never valid for the Spec itself; a Spec's own
 *   review-readiness is already fully mechanical (`execute-spec-ready`
 *   above), never reported.
 * - `flagged`: more work remains before this ticket can close out. For a
 *   child (`spec-pass`, `work` mode, blocked) that's in-progress/ -> todo/
 *   plus an appended "## Flagged" section explaining why -- `reason` is
 *   required and becomes that section's body. For the Spec itself
 *   (`spec-review`, having filed new child tickets rather than fixing
 *   everything in place) that's review/ -> in-progress/ instead -- no
 *   "## Flagged" section is appended (Specs don't carry one; the new child
 *   tickets already represent the outstanding work), so `reason` is
 *   accepted but ignored.
 * - `done`: review/ -> done/. Used by a child (`spec-pass`,
 *   `review-child` mode, approved) and by the Spec itself (`spec-review`,
 *   nothing left to fix or file) alike.
 */
export type ReportedFate = { kind: "ready-for-review" } | { kind: "flagged"; reason: string } | { kind: "done" };

/** What `runReportFate` did for the one ticket it was told about, plus the board's current state. */
export type ReportResult = {
  outcome: { ticketNumber: number; slug: string; fate: ReportedFate["kind"]; folder: Folder };
  board: BoardState;
};

/** True when `ticket` is a Spec itself -- i.e. not some child pointing back at one via "## Parent". */
function isSpecTicket(ticket: TicketRecord): boolean {
  return specNumberFor(ticket) === ticket.number;
}

/** Appends a "## Flagged" section (TICKET-FORMAT.md's "Flagged tickets") carrying `reason` to a ticket file's content. */
function appendFlaggedSection(content: string, reason: string): string {
  return `${content.replace(/\s+$/, "")}\n\n## Flagged\n\n${reason}\n`;
}

/**
 * `board-step report`'s full entry point: enacts one fate `spec-pass` or
 * `spec-review` already decided for ticket `ticketNumber` -- the move and
 * commit those skills used to perform themselves (see TICKET-FORMAT.md's
 * "Spec board operations", "Report fate") -- using the same `git-ts`
 * move-plus-commit primitives and commit-message conventions
 * `decideAndAct` above already uses, then returns the board state for
 * whichever Spec the reported ticket belongs to (itself, when the ticket
 * *is* a Spec). Ticket lookup is board-wide, not scoped to a Spec already
 * known to the caller -- unlike `runBoardStep`, this never needs a Spec
 * number as input, only the reported ticket's own number.
 */
export function runReportFate(boardDir: string, ticketNumber: number, fate: ReportedFate): ReportResult {
  const ticket = findTicket(boardDir, ticketNumber);
  const isSpec = isSpecTicket(ticket);
  const srcPath = ticketPath(ticket.folder, ticket.number, ticket.slug);

  let destFolder: Folder;
  let message: string;
  let appendFlagReason: string | null = null;

  switch (fate.kind) {
    case "ready-for-review":
      if (isSpec) {
        throw new Error(
          `Ticket #${ticketNumber} is a Spec -- "ready-for-review" only applies to a child ticket; a Spec's own review-readiness is mechanical (see "execute-spec-ready" above), never reported.`,
        );
      }
      destFolder = "review";
      message = `${ticket.number}: review — ${ticket.slug}`;
      break;

    case "done":
      destFolder = "done";
      message = `${ticket.number}: done — ${ticket.slug}`;
      break;

    case "flagged":
      if (isSpec) {
        destFolder = "in-progress";
        message = `${ticket.number}: reopened — ${ticket.slug}`;
      } else {
        destFolder = "todo";
        message = `${ticket.number}: flag — ${ticket.slug} (${fate.reason})`;
        appendFlagReason = fate.reason;
      }
      break;
  }

  // Move first, then append a "## Flagged" section at the new path (when
  // this fate calls for it). Either way, explicitly `addFile` the
  // destination before committing: `moveFile`'s `git mv` alone only ever
  // stages the rename using whatever content was already in the index, not
  // the working tree -- so it would silently drop any edit already sitting
  // on disk before this call ever ran (e.g. a `spec-pass` review-child pass
  // ticking `## Acceptance criteria` boxes per TICKET-FORMAT.md's "Child
  // review", before reporting `done` rather than committing that edit
  // itself), on top of dropping a "## Flagged" section appended here. A
  // plain `git add` after the move picks up both cases in the same one
  // commit, and is a no-op when the caller made no edit at all.
  const destPath = ticketPath(destFolder, ticket.number, ticket.slug);
  moveFile(boardDir, srcPath, destPath);
  if (appendFlagReason !== null) {
    const absDestPath = path.join(boardDir, destPath);
    fs.writeFileSync(absDestPath, appendFlaggedSection(fs.readFileSync(absDestPath, "utf8"), appendFlagReason));
  }
  addFile(boardDir, destPath);
  commit(boardDir, message);

  return {
    outcome: { ticketNumber: ticket.number, slug: ticket.slug, fate: fate.kind, folder: destFolder },
    board: buildBoardState(boardDir, specNumberFor(ticket)),
  };
}
