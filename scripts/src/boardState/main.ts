import type { Folder, TicketRecord } from "../board/boardSnapshot.js";
import { readBoardSnapshot } from "../board/boardSnapshot.js";

/**
 * One ticket's fields in `board-state`'s JSON output -- narrower than the
 * full `TicketRecord` (drops the raw `## Parent` text, which is only an
 * implementation detail of how `readBoardSnapshot` scopes children to their
 * Spec, not something a consumer of this snapshot needs).
 */
export type BoardStateTicket = {
  number: number;
  slug: string;
  folder: Folder;
  blockedBy: number[];
  flagged: boolean;
};

/**
 * The JSON shape `board-state` prints: the Spec ticket and every child
 * ticket scoped to it via `## Parent`.
 */
export type BoardState = {
  specNumber: number;
  spec: BoardStateTicket;
  children: BoardStateTicket[];
};

function toBoardStateTicket(record: TicketRecord): BoardStateTicket {
  return { number: record.number, slug: record.slug, folder: record.folder, blockedBy: record.blockedBy, flagged: record.flagged };
}

/**
 * A pure, read-only snapshot of a Spec's board, JSON-serializable as-is --
 * the Spec ticket numbered `specNumber` plus every child ticket whose
 * `## Parent` points back at it, regardless of which kanban folder each
 * currently sits in. Reuses `readBoardSnapshot` (the same board-reading
 * logic `board-step` relies on) completely unchanged; makes no filesystem
 * writes and no git operations of its own -- a safe, side-effect-free read,
 * however often it's called.
 */
export function buildBoardState(boardDir: string, specNumber: number): BoardState {
  const snapshot = readBoardSnapshot(boardDir, specNumber);
  return {
    specNumber: snapshot.specNumber,
    spec: toBoardStateTicket(snapshot.spec),
    children: snapshot.children.map(toBoardStateTicket),
  };
}
