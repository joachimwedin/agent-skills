import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { readBoardSnapshot } from "../../src/board/boardSnapshot.js";

/**
 * Integration tests for `readBoardSnapshot` against real temporary board
 * folders (no mocking) -- a plain `{todo,in-progress,review,done}/` tree on
 * disk, exactly as `agent-tickets/boards/<project>/` looks in practice. No
 * real git repo is needed here since the reader only ever touches the
 * filesystem, never git itself.
 */

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeBoardDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "board-"));
  tempDirs.push(dir);
  for (const folder of ["todo", "in-progress", "review", "done"]) {
    fs.mkdirSync(path.join(dir, folder));
  }
  return dir;
}

type WriteTicketOpts = {
  folder: string;
  filename: string;
  parent: string;
  blockedBy?: string;
  flagged?: boolean;
  extraSections?: string;
};

function writeTicket(boardDir: string, opts: WriteTicketOpts): void {
  const lines = [
    `# ${opts.filename}`,
    "",
    "## Parent",
    "",
    opts.parent,
    "",
    "## What to build",
    "",
    "...",
    "",
    "## Acceptance criteria",
    "",
    "- [ ] ...",
    "",
    "## Blocked by",
    "",
    opts.blockedBy ?? "None - can start immediately",
    "",
  ];
  if (opts.flagged) {
    lines.push("## Flagged", "", "needs a human", "");
  }
  if (opts.extraSections) {
    lines.push(opts.extraSections);
  }
  fs.writeFileSync(path.join(boardDir, opts.folder, `${opts.filename}.md`), lines.join("\n"));
}

describe("readBoardSnapshot", () => {
  it("reads a board with tickets spread across all four kanban folders into the expected per-ticket records", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "done", filename: "2-scaffold-package", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "review", filename: "3-add-primitives", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "in-progress", filename: "4-wire-it-up", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "todo", filename: "5-polish-output", parent: "Spec #1" });

    const snapshot = readBoardSnapshot(boardDir, 1);

    expect(snapshot.specNumber).toBe(1);
    expect(snapshot.spec).toMatchObject({ number: 1, slug: "spec-widget-overhaul", folder: "in-progress" });
    expect(snapshot.children).toHaveLength(4);
    expect(snapshot.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ number: 2, slug: "scaffold-package", folder: "done" }),
        expect.objectContaining({ number: 3, slug: "add-primitives", folder: "review" }),
        expect.objectContaining({ number: 4, slug: "wire-it-up", folder: "in-progress" }),
        expect.objectContaining({ number: 5, slug: "polish-output", folder: "todo" }),
      ]),
    );
  });

  it("detects Blocked by targets, parsing every referenced ticket number", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, {
      folder: "todo",
      filename: "2-needs-two-things",
      parent: "Spec #1",
      blockedBy: "- Ticket #3 (needs the scaffold)\n- Ticket #4 (needs the primitives)",
    });
    writeTicket(boardDir, { folder: "done", filename: "3-scaffold", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "done", filename: "4-primitives", parent: "Spec #1" });

    const snapshot = readBoardSnapshot(boardDir, 1);

    const needsTwoThings = snapshot.children.find((c) => c.number === 2);
    expect(needsTwoThings?.blockedBy).toEqual([3, 4]);

    const scaffold = snapshot.children.find((c) => c.number === 3);
    expect(scaffold?.blockedBy).toEqual([]);
  });

  it("detects a Flagged section's presence", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-flagged-child", parent: "Spec #1", flagged: true });
    writeTicket(boardDir, { folder: "todo", filename: "3-unflagged-child", parent: "Spec #1" });

    const snapshot = readBoardSnapshot(boardDir, 1);

    expect(snapshot.children.find((c) => c.number === 2)?.flagged).toBe(true);
    expect(snapshot.children.find((c) => c.number === 3)?.flagged).toBe(false);
  });

  it("only includes children whose Parent points at the requested Spec, ignoring other Specs on the same board", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-child-of-one", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "done", filename: "10-spec-other-thing", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "11-child-of-ten", parent: "Spec #10" });

    const snapshot = readBoardSnapshot(boardDir, 1);

    expect(snapshot.children.map((c) => c.number)).toEqual([2]);
  });
});
