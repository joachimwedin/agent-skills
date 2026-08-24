import type { BoardSnapshot, TicketRecord } from "./boardSnapshot.js";

/**
 * One action for a Spec's board, per TICKET-FORMAT.md's "Spec board
 * operations" Priority scan. `execute-claim`/`execute-spec-ready` are
 * purely mechanical (no judgment involved -- a caller may perform them
 * directly); `dispatch`/`dispatch-spec-review` need a judgment pass
 * (`spec-pass`) told exactly which ticket and mode.
 */
export type Verdict =
  | { kind: "execute-claim"; ticketNumber: number }
  | { kind: "execute-spec-ready" }
  | { kind: "dispatch"; ticketNumber: number; mode: "work" | "review-child" }
  | { kind: "dispatch-spec-review" }
  | { kind: "done" }
  | { kind: "blocked"; reason: string };

/** Ascending ticket-number order, for deterministic multi-action output. */
function byTicketNumber(a: TicketRecord, b: TicketRecord): number {
  return a.number - b.number;
}

/** True for a `todo/` child with no `## Flagged` section and every `## Blocked by` target already `done/`. */
function isPickable(child: TicketRecord, byNumber: Map<number, TicketRecord>): boolean {
  if (child.folder !== "todo" || child.flagged) {
    return false;
  }
  return child.blockedBy.every((num) => byNumber.get(num)?.folder === "done");
}

/** Why `child` isn't pickable right now -- used to build a `blocked` verdict's reason. */
function whyNotPickable(child: TicketRecord, byNumber: Map<number, TicketRecord>): string {
  const reasons: string[] = [];
  if (child.flagged) {
    reasons.push("flagged");
  }
  const unresolvedBlockers = child.blockedBy.filter((num) => byNumber.get(num)?.folder !== "done");
  if (unresolvedBlockers.length > 0) {
    reasons.push(`blocked by #${unresolvedBlockers.join(", #")}`);
  }
  return reasons.length > 0 ? `#${child.number} is ${reasons.join(" and ")}` : `#${child.number} is not pickable`;
}

/**
 * Pure decision function, no I/O: given a Spec's board snapshot, decides
 * every currently-actionable item on it at once, per TICKET-FORMAT.md's
 * "Spec board operations" Priority scan. Always returns at least one
 * `Verdict`.
 *
 * A Spec itself sitting in `review/` is a hard barrier -- when that's the
 * case the result is exactly one action, `dispatch-spec-review`, no
 * matter what state any child is in. Otherwise the result is the union
 * of every child in `review/` (dispatch review-child), every child in
 * `in-progress/` (dispatch work), and every currently-pickable child in
 * `todo/` (claim) -- no priority ordering or one-at-a-time tie-break
 * among them; each group is sorted by ascending ticket number for
 * deterministic output. When none of that applies, falls back to
 * today's single-action outcomes: `execute-spec-ready` once every child
 * is `done/`, `done` once the Spec itself is, or `blocked` with the same
 * reason-composition logic as before.
 */
export function classifyNextAction(snapshot: BoardSnapshot): Verdict[] {
  const { spec, children } = snapshot;

  // 1. The Spec itself already in review outranks everything else.
  if (spec.folder === "review") {
    return [{ kind: "dispatch-spec-review" }];
  }

  // 2. Union of every currently-actionable item: review children, then
  //    in-progress children, then pickable todo children -- every one of
  //    each, not just one at a time.
  const byNumber = new Map(children.map((c) => [c.number, c]));
  const actions: Verdict[] = [
    ...children
      .filter((c) => c.folder === "review")
      .sort(byTicketNumber)
      .map((c): Verdict => ({ kind: "dispatch", ticketNumber: c.number, mode: "review-child" })),
    ...children
      .filter((c) => c.folder === "in-progress")
      .sort(byTicketNumber)
      .map((c): Verdict => ({ kind: "dispatch", ticketNumber: c.number, mode: "work" })),
    ...children
      .filter((c) => isPickable(c, byNumber))
      .sort(byTicketNumber)
      .map((c): Verdict => ({ kind: "execute-claim", ticketNumber: c.number })),
  ];
  if (actions.length > 0) {
    return actions;
  }

  // 3. Nothing actionable: the Spec is still todo/in-progress and every
  //    child is done -- ready for review.
  if (spec.folder !== "done" && children.length > 0 && children.every((c) => c.folder === "done")) {
    return [{ kind: "execute-spec-ready" }];
  }

  // 4. Otherwise the Spec is done, or blocked with nothing pickable and nothing in flight.
  if (spec.folder === "done") {
    return [{ kind: "done" }];
  }

  const remaining = children.filter((c) => c.folder !== "done");
  const reason =
    remaining.length > 0
      ? remaining.map((c) => whyNotPickable(c, byNumber)).join("; ")
      : "no children on this Spec's board";
  return [{ kind: "blocked", reason }];
}
