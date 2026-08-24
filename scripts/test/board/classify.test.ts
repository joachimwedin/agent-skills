import { describe, expect, it } from "vitest";

import { classifyNextAction } from "../../src/board/classify.js";
import type { BoardSnapshot, TicketRecord } from "../../src/board/boardSnapshot.js";

/**
 * Pure unit tests for `classifyNextAction` against fixture board snapshots
 * -- no real git or filesystem access anywhere in this file. One case per
 * Priority scan branch from TICKET-FORMAT.md's "Spec board operations".
 */

function ticket(overrides: Partial<TicketRecord> & { number: number }): TicketRecord {
  return {
    number: overrides.number,
    slug: overrides.slug ?? `ticket-${overrides.number}`,
    folder: overrides.folder ?? "todo",
    parent: overrides.parent ?? "Spec #1",
    blockedBy: overrides.blockedBy ?? [],
    flagged: overrides.flagged ?? false,
  };
}

function snapshot(spec: TicketRecord, children: TicketRecord[]): BoardSnapshot {
  return { specNumber: spec.number, spec, children };
}

describe("classifyNextAction", () => {
  it("dispatches spec-review when the Spec itself sits in review, regardless of children state", () => {
    const spec = ticket({ number: 1, folder: "review" });
    const children = [ticket({ number: 2, folder: "in-progress" }), ticket({ number: 3, folder: "todo" })];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "dispatch-spec-review" });
  });

  it("dispatches review-child when a child sits in review, even with other children in flight", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "review" }),
      ticket({ number: 3, folder: "todo" }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "dispatch", ticketNumber: 2, mode: "review-child" });
  });

  it("something in review outranks everything else, including a Spec still todo with all children done", () => {
    const spec = ticket({ number: 1, folder: "todo" });
    const children = [
      ticket({ number: 2, folder: "done" }),
      ticket({ number: 3, folder: "review" }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "dispatch", ticketNumber: 3, mode: "review-child" });
  });

  it("reports execute-spec-ready when the Spec is in-progress and every child is done", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [ticket({ number: 2, folder: "done" }), ticket({ number: 3, folder: "done" })];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "execute-spec-ready" });
  });

  it("reports execute-spec-ready when the Spec is still todo but every child is already done (manually-edited board)", () => {
    const spec = ticket({ number: 1, folder: "todo" });
    const children = [ticket({ number: 2, folder: "done" })];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "execute-spec-ready" });
  });

  it("dispatches work on a child already sitting in in-progress", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "done" }),
      ticket({ number: 3, folder: "in-progress" }),
      ticket({ number: 4, folder: "todo" }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "dispatch", ticketNumber: 3, mode: "work" });
  });

  it("claims the lowest ticket number among multiple simultaneously pickable children", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 4, folder: "todo" }),
      ticket({ number: 2, folder: "todo" }),
      ticket({ number: 3, folder: "todo" }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "execute-claim", ticketNumber: 2 });
  });

  it("excludes a flagged child from pickable, claiming the next unflagged one instead", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "todo", flagged: true }),
      ticket({ number: 3, folder: "todo" }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "execute-claim", ticketNumber: 3 });
  });

  it("excludes a child with an unresolved Blocked by target from pickable", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "todo", blockedBy: [3] }),
      ticket({ number: 3, folder: "todo" }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    // #2 is blocked by #3, which isn't done yet -- #3 itself has no
    // blockers and is pickable.
    expect(verdict).toEqual({ kind: "execute-claim", ticketNumber: 3 });
  });

  it("treats a child as pickable once every Blocked by target has reached done", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "todo", blockedBy: [3] }),
      ticket({ number: 3, folder: "done" }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "execute-claim", ticketNumber: 2 });
  });

  it("reports blocked with a reason when the only remaining child is flagged", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "done" }),
      ticket({ number: 3, folder: "todo", flagged: true }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict.kind).toBe("blocked");
    expect((verdict as { reason: string }).reason.length).toBeGreaterThan(0);
  });

  it("reports blocked with a reason when the only remaining child has an unresolved Blocked by target", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "done" }),
      ticket({ number: 3, folder: "todo", blockedBy: [4] }),
      ticket({ number: 4, folder: "todo", flagged: true }),
    ];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict.kind).toBe("blocked");
    expect((verdict as { reason: string }).reason.length).toBeGreaterThan(0);
  });

  it("reports done once the Spec itself has reached done", () => {
    const spec = ticket({ number: 1, folder: "done" });
    const children = [ticket({ number: 2, folder: "done" })];

    const verdict = classifyNextAction(snapshot(spec, children));

    expect(verdict).toEqual({ kind: "done" });
  });
});
