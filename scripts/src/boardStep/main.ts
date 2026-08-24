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
 * or git change made.
 */
export type Outcome =
  | { kind: "claimed"; ticketNumber: number; slug: string }
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
 * The I/O seam tying the board-snapshot reader and the pure decision
 * function together: reads `boardDir`'s real board for the Spec numbered
 * `specNumber`, decides the Priority scan's next action via
 * `classifyNextAction`, and -- only when that verdict is mechanical
 * (`execute-claim`/`execute-spec-ready`) -- performs the move and commit via
 * `git-ts`, using TICKET-FORMAT.md's existing commit-message conventions
 * (`<n>: start — <slug>`, `<n>: claim — <slug>`, `<n>: ready for review —
 * <slug>`).
 */
function decideAndAct(boardDir: string, specNumber: number): Outcome {
  const snapshot = readBoardSnapshot(boardDir, specNumber);
  // classifyNextAction now returns every currently-actionable item at
  // once; this call site still only enacts/reports the first one --
  // consuming the full set to claim/dispatch every one of them at once
  // is ticket #4's job, not this ticket's.
  const [verdict] = classifyNextAction(snapshot);

  switch (verdict.kind) {
    case "execute-claim": {
      const { spec } = snapshot;
      const child = snapshot.children.find((c) => c.number === verdict.ticketNumber);
      if (child === undefined) {
        throw new Error(`classifyNextAction picked unknown ticket #${verdict.ticketNumber} on Spec #${specNumber}'s board`);
      }

      // The first child claimed on a Spec's board also moves the Spec
      // itself from todo/ to in-progress/, one-way and never repeated
      // after (TICKET-FORMAT.md's "Claim") -- its own commit, separate
      // from the child's claim below.
      if (spec.folder === "todo") {
        moveFile(boardDir, ticketPath("todo", spec.number, spec.slug), ticketPath("in-progress", spec.number, spec.slug));
        commit(boardDir, `${spec.number}: start — ${spec.slug}`);
      }

      moveFile(boardDir, ticketPath("todo", child.number, child.slug), ticketPath("in-progress", child.number, child.slug));
      commit(boardDir, `${child.number}: claim — ${child.slug}`);
      return { kind: "claimed", ticketNumber: child.number, slug: child.slug };
    }

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
