import type { BoardSnapshot, TicketRecord } from "./boardSnapshot.js";

/**
 * The single next action for a Spec's board, per TICKET-FORMAT.md's
 * "Spec board operations" Priority scan. `execute-claim`/`execute-spec-
 * ready` are purely mechanical (no judgment involved -- a caller may
 * perform them directly); `dispatch`/`dispatch-spec-review` need a
 * judgment pass (`spec-pass`) told exactly which ticket and mode.
 */
export type Verdict =
  | { kind: "execute-claim"; ticketNumber: number }
  | { kind: "execute-spec-ready" }
  | { kind: "dispatch"; ticketNumber: number; mode: "work" | "review-child" }
  | { kind: "dispatch-spec-review" }
  | { kind: "done" }
  | { kind: "blocked"; reason: string };

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
 * the Priority scan's single next action. Mirrors TICKET-FORMAT.md's
 * "Spec board operations" order exactly, with the claim tie-break among
 * simultaneously pickable children set to lowest ticket number.
 */
export function classifyNextAction(snapshot: BoardSnapshot): Verdict {
  const { spec, children } = snapshot;

  // 1. Something already in review outranks everything else.
  if (spec.folder === "review") {
    return { kind: "dispatch-spec-review" };
  }
  const childInReview = children.find((c) => c.folder === "review");
  if (childInReview !== undefined) {
    return { kind: "dispatch", ticketNumber: childInReview.number, mode: "review-child" };
  }

  // 2. The Spec is still todo/in-progress and every child is done: ready for review.
  if (spec.folder !== "done" && children.length > 0 && children.every((c) => c.folder === "done")) {
    return { kind: "execute-spec-ready" };
  }

  // 3. A child already sits in in-progress: work it.
  const childInProgress = children.find((c) => c.folder === "in-progress");
  if (childInProgress !== undefined) {
    return { kind: "dispatch", ticketNumber: childInProgress.number, mode: "work" };
  }

  // 4. A pickable child sits in todo: claim the lowest-numbered one.
  const byNumber = new Map(children.map((c) => [c.number, c]));
  const pickable = children.filter((c) => isPickable(c, byNumber));
  if (pickable.length > 0) {
    const lowest = pickable.reduce((min, c) => (c.number < min.number ? c : min));
    return { kind: "execute-claim", ticketNumber: lowest.number };
  }

  // 5. Otherwise the Spec is done, or blocked with nothing pickable and nothing in flight.
  if (spec.folder === "done") {
    return { kind: "done" };
  }

  const remaining = children.filter((c) => c.folder !== "done");
  const reason =
    remaining.length > 0
      ? remaining.map((c) => whyNotPickable(c, byNumber)).join("; ")
      : "no children on this Spec's board";
  return { kind: "blocked", reason };
}
