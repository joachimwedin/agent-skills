import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildBoardState } from "../../src/boardState/main.js";

/**
 * Integration tests for `buildBoardState` against real temporary board
 * folders (no mocking) -- matching `boardSnapshot.test.ts`'s prior art,
 * since `buildBoardState` is a thin, JSON-shaping wrapper around
 * `readBoardSnapshot` itself. No real git repo is needed: `buildBoardState`
 * only ever reads the filesystem, never writes to it and never touches git.
 */

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeBoardDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "board-state-"));
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
  fs.writeFileSync(path.join(boardDir, opts.folder, `${opts.filename}.md`), lines.join("\n"));
}

/** Every file present anywhere under `boardDir`, relative to it, sorted -- for asserting a read left no trace. */
function listAllFiles(boardDir: string): string[] {
  const results: string[] = [];
  for (const folder of ["todo", "in-progress", "review", "done"]) {
    const folderDir = path.join(boardDir, folder);
    for (const filename of fs.readdirSync(folderDir)) {
      results.push(`${folder}/${filename}`);
    }
  }
  return results.sort();
}

describe("buildBoardState", () => {
  it("returns the Spec ticket alone, with an empty children array, for a Spec with no children yet", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "todo", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });

    const state = buildBoardState(boardDir, 1);

    expect(state).toEqual({
      specNumber: 1,
      spec: { number: 1, slug: "spec-widget-overhaul", folder: "todo", blockedBy: [], flagged: false },
      children: [],
    });
  });

  it("returns the Spec plus every child scoped to it, one whose children span all four kanban folders", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "done", filename: "2-scaffold-package", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "review", filename: "3-add-primitives", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "in-progress", filename: "4-wire-it-up", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "todo", filename: "5-polish-output", parent: "Spec #1" });

    const state = buildBoardState(boardDir, 1);

    expect(state.specNumber).toBe(1);
    expect(state.spec).toEqual({ number: 1, slug: "spec-widget-overhaul", folder: "in-progress", blockedBy: [], flagged: false });
    expect(state.children).toEqual(
      expect.arrayContaining([
        { number: 2, slug: "scaffold-package", folder: "done", blockedBy: [], flagged: false },
        { number: 3, slug: "add-primitives", folder: "review", blockedBy: [], flagged: false },
        { number: 4, slug: "wire-it-up", folder: "in-progress", blockedBy: [], flagged: false },
        { number: 5, slug: "polish-output", folder: "todo", blockedBy: [], flagged: false },
      ]),
    );
    expect(state.children).toHaveLength(4);
  });

  it("includes Blocked by targets as ticket numbers and whether each ticket carries a Flagged section", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, {
      folder: "todo",
      filename: "2-needs-two-things",
      parent: "Spec #1",
      blockedBy: "- Ticket #3 (needs the scaffold)\n- Ticket #4 (needs the primitives)",
    });
    writeTicket(boardDir, { folder: "done", filename: "3-scaffold", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "todo", filename: "4-flagged-child", parent: "Spec #1", flagged: true });

    const state = buildBoardState(boardDir, 1);

    expect(state.children.find((c) => c.number === 2)).toMatchObject({ blockedBy: [3, 4], flagged: false });
    expect(state.children.find((c) => c.number === 3)).toMatchObject({ blockedBy: [], flagged: false });
    expect(state.children.find((c) => c.number === 4)).toMatchObject({ blockedBy: [], flagged: true });
  });

  it("scopes children to the requested Spec only, unaffected by other Specs' tickets sharing the same board", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-child-of-one", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "done", filename: "10-spec-other-thing", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "11-child-of-ten", parent: "Spec #10" });

    const state = buildBoardState(boardDir, 1);

    expect(state.children.map((c) => c.number)).toEqual([2]);
  });

  it("makes no filesystem writes -- the board's files are identical before and after", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "done", filename: "2-scaffold-package", parent: "Spec #1" });
    const before = listAllFiles(boardDir);

    buildBoardState(boardDir, 1);

    expect(listAllFiles(boardDir)).toEqual(before);
  });

  it("produces JSON-serializable output", () => {
    const boardDir = makeBoardDir();
    writeTicket(boardDir, { folder: "todo", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-child", parent: "Spec #1" });

    const state = buildBoardState(boardDir, 1);

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
