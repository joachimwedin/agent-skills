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
  it("returns only dispatch-spec-review when the Spec itself sits in review, regardless of any child's state", () => {
    const spec = ticket({ number: 1, folder: "review" });
    const children = [
      ticket({ number: 2, folder: "in-progress" }),
      ticket({ number: 3, folder: "todo" }),
      ticket({ number: 4, folder: "review" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "dispatch-spec-review" }]);
  });

  it("dispatches review-child for a child sitting in review, alongside a done child that isn't actionable", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "review" }),
      ticket({ number: 3, folder: "done" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "dispatch", ticketNumber: 2, mode: "review-child" }]);
  });

  it("something in review outranks a spec-ready check, even with a Spec still todo and every other child done", () => {
    const spec = ticket({ number: 1, folder: "todo" });
    const children = [
      ticket({ number: 2, folder: "done" }),
      ticket({ number: 3, folder: "review" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "dispatch", ticketNumber: 3, mode: "review-child" }]);
  });

  it("reports execute-spec-ready when the Spec is in-progress and every child is done", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [ticket({ number: 2, folder: "done" }), ticket({ number: 3, folder: "done" })];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "execute-spec-ready" }]);
  });

  it("reports execute-spec-ready when the Spec is still todo but every child is already done (manually-edited board)", () => {
    const spec = ticket({ number: 1, folder: "todo" });
    const children = [ticket({ number: 2, folder: "done" })];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "execute-spec-ready" }]);
  });

  it("dispatches work for a child already sitting in in-progress, alongside a flagged todo child that isn't pickable", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "done" }),
      ticket({ number: 3, folder: "in-progress" }),
      ticket({ number: 4, folder: "todo", flagged: true }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "dispatch", ticketNumber: 3, mode: "work" }]);
  });

  it("dispatches a work action for every child simultaneously sitting in in-progress, not just one", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 4, folder: "in-progress" }),
      ticket({ number: 2, folder: "in-progress" }),
      ticket({ number: 3, folder: "in-progress" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([
      { kind: "dispatch", ticketNumber: 2, mode: "work" },
      { kind: "dispatch", ticketNumber: 3, mode: "work" },
      { kind: "dispatch", ticketNumber: 4, mode: "work" },
    ]);
  });

  it("dispatches a review-child action for every child simultaneously sitting in review, not just one", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 4, folder: "review" }),
      ticket({ number: 2, folder: "review" }),
      ticket({ number: 3, folder: "review" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([
      { kind: "dispatch", ticketNumber: 2, mode: "review-child" },
      { kind: "dispatch", ticketNumber: 3, mode: "review-child" },
      { kind: "dispatch", ticketNumber: 4, mode: "review-child" },
    ]);
  });

  it("returns dispatch actions for a mix of in-progress and review children together", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "in-progress" }),
      ticket({ number: 3, folder: "review" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([
      { kind: "dispatch", ticketNumber: 3, mode: "review-child" },
      { kind: "dispatch", ticketNumber: 2, mode: "work" },
    ]);
  });

  it("claims every simultaneously pickable child at once, not just the lowest-numbered", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 4, folder: "todo" }),
      ticket({ number: 2, folder: "todo" }),
      ticket({ number: 3, folder: "todo" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([
      { kind: "execute-claim", ticketNumber: 2 },
      { kind: "execute-claim", ticketNumber: 3 },
      { kind: "execute-claim", ticketNumber: 4 },
    ]);
  });

  it("excludes a flagged child from pickable, claiming only the other one", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "todo", flagged: true }),
      ticket({ number: 3, folder: "todo" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "execute-claim", ticketNumber: 3 }]);
  });

  it("excludes a child with an unresolved Blocked by target from pickable", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "todo", blockedBy: [3] }),
      ticket({ number: 3, folder: "todo" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    // #2 is blocked by #3, which isn't done yet -- #3 itself has no
    // blockers and is pickable.
    expect(verdicts).toEqual([{ kind: "execute-claim", ticketNumber: 3 }]);
  });

  it("treats a child as pickable once every Blocked by target has reached done", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "todo", blockedBy: [3] }),
      ticket({ number: 3, folder: "done" }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "execute-claim", ticketNumber: 2 }]);
  });

  it("reports blocked with a reason when the only remaining child is flagged", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "done" }),
      ticket({ number: 3, folder: "todo", flagged: true }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toHaveLength(1);
    expect(verdicts[0].kind).toBe("blocked");
    expect((verdicts[0] as { reason: string }).reason.length).toBeGreaterThan(0);
  });

  it("reports blocked with a reason when the only remaining child has an unresolved Blocked by target", () => {
    const spec = ticket({ number: 1, folder: "in-progress" });
    const children = [
      ticket({ number: 2, folder: "done" }),
      ticket({ number: 3, folder: "todo", blockedBy: [4] }),
      ticket({ number: 4, folder: "todo", flagged: true }),
    ];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toHaveLength(1);
    expect(verdicts[0].kind).toBe("blocked");
    expect((verdicts[0] as { reason: string }).reason.length).toBeGreaterThan(0);
  });

  it("reports done once the Spec itself has reached done", () => {
    const spec = ticket({ number: 1, folder: "done" });
    const children = [ticket({ number: 2, folder: "done" })];

    const verdicts = classifyNextAction(snapshot(spec, children));

    expect(verdicts).toEqual([{ kind: "done" }]);
  });
});
