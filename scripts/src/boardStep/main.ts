import { commit, moveFile } from "git-ts/src/gitClient.js";

import type { BoardState } from "../boardState/main.js";
import { buildBoardState } from "../boardState/main.js";
import type { Folder } from "../board/boardSnapshot.js";
import { readBoardSnapshot } from "../board/boardSnapshot.js";
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
