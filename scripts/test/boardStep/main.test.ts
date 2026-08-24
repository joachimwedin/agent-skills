import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runBoardStep } from "../../src/boardStep/main.js";

/**
 * Integration tests for `runBoardStep` against real temporary git repos (no
 * mocking) -- matching `my-scripts`' `syncRepos/main.test.ts` prior art:
 * asserting on real filesystem/git state, not just return values. One case
 * per outcome `board-step` can produce, each also checking the returned
 * `board` field reflects the real, current board state on disk.
 */

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeBoardRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "board-step-repo-"));
  tempDirs.push(dir);
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "Test"]);
  for (const folder of ["todo", "in-progress", "review", "done"]) {
    fs.mkdirSync(path.join(dir, folder));
  }
  fs.writeFileSync(path.join(dir, ".gitkeep"), "");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-q", "-m", "init"]);
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
  git(boardDir, ["add", "."]);
  git(boardDir, ["commit", "-q", "-m", `seed ${opts.filename}`]);
}

function currentBranchLog(repoDir: string): string {
  return git(repoDir, ["log", "-1", "--format=%s"]).trim();
}

describe("runBoardStep", () => {
  it("claims a pickable child: moves it to in-progress, commits, and returns the outcome plus the fresh board", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-add-widget", parent: "Spec #1" });

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome).toEqual({ kind: "claimed", ticketNumber: 2, slug: "add-widget" });
    expect(fs.existsSync(path.join(boardDir, "todo", "2-add-widget.md"))).toBe(false);
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(true);
    expect(currentBranchLog(boardDir)).toBe("2: claim — add-widget");
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");

    // The board field must reflect the ticket's new folder as actually
    // written to disk, not the pre-move in-memory snapshot.
    expect(result.board).toEqual({
      specNumber: 1,
      spec: { number: 1, slug: "spec-widget-overhaul", folder: "in-progress", blockedBy: [], flagged: false },
      children: [{ number: 2, slug: "add-widget", folder: "in-progress", blockedBy: [], flagged: false }],
    });
  });

  it("moves the Spec itself from todo to in-progress, in its own commit, on the first child claim", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "todo", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-add-widget", parent: "Spec #1" });

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome).toEqual({ kind: "claimed", ticketNumber: 2, slug: "add-widget" });
    const messages = git(boardDir, ["log", "--format=%s", "-2"]).trim().split("\n");
    expect(messages).toEqual(["2: claim — add-widget", "1: start — spec-widget-overhaul"]);
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(result.board.spec).toEqual({ number: 1, slug: "spec-widget-overhaul", folder: "in-progress", blockedBy: [], flagged: false });
  });

  it("moves a Spec whose children are all done to review, commits, and returns the outcome plus the fresh board", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "done", filename: "2-add-widget", parent: "Spec #1" });

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome).toEqual({ kind: "spec-ready", ticketNumber: 1, slug: "spec-widget-overhaul" });
    expect(fs.existsSync(path.join(boardDir, "in-progress", "1-spec-widget-overhaul.md"))).toBe(false);
    expect(fs.existsSync(path.join(boardDir, "review", "1-spec-widget-overhaul.md"))).toBe(true);
    expect(currentBranchLog(boardDir)).toBe("1: ready for review — spec-widget-overhaul");
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(result.board).toEqual({
      specNumber: 1,
      spec: { number: 1, slug: "spec-widget-overhaul", folder: "review", blockedBy: [], flagged: false },
      children: [{ number: 2, slug: "add-widget", folder: "done", blockedBy: [], flagged: false }],
    });
  });

  it("makes no changes and returns a dispatch outcome plus the unchanged board when a child needs judgment", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });
    const beforeLog = currentBranchLog(boardDir);

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome).toEqual({ kind: "dispatch", ticketNumber: 2, mode: "work" });
    expect(currentBranchLog(boardDir)).toBe(beforeLog);
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(result.board).toEqual({
      specNumber: 1,
      spec: { number: 1, slug: "spec-widget-overhaul", folder: "in-progress", blockedBy: [], flagged: false },
      children: [{ number: 2, slug: "add-widget", folder: "in-progress", blockedBy: [], flagged: false }],
    });
  });

  it("makes no changes and returns a dispatch-spec-review outcome plus the unchanged board when the Spec itself is in review", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "review", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });
    const beforeLog = currentBranchLog(boardDir);

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome).toEqual({ kind: "dispatch-spec-review" });
    expect(currentBranchLog(boardDir)).toBe(beforeLog);
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(result.board.spec).toEqual({ number: 1, slug: "spec-widget-overhaul", folder: "review", blockedBy: [], flagged: false });
  });

  it("makes no changes and returns done plus the unchanged board once the Spec itself has reached done", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "done", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "done", filename: "2-add-widget", parent: "Spec #1" });
    const beforeLog = currentBranchLog(boardDir);

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome).toEqual({ kind: "done" });
    expect(currentBranchLog(boardDir)).toBe(beforeLog);
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(result.board).toEqual({
      specNumber: 1,
      spec: { number: 1, slug: "spec-widget-overhaul", folder: "done", blockedBy: [], flagged: false },
      children: [{ number: 2, slug: "add-widget", folder: "done", blockedBy: [], flagged: false }],
    });
  });

  it("makes no changes and returns blocked with a reason plus the unchanged board when nothing is pickable or in flight", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-add-widget", parent: "Spec #1", flagged: true });
    const beforeLog = currentBranchLog(boardDir);

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome.kind).toBe("blocked");
    expect((result.outcome as { reason: string }).reason).toContain("#2");
    expect(fs.existsSync(path.join(boardDir, "todo", "2-add-widget.md"))).toBe(true);
    expect(currentBranchLog(boardDir)).toBe(beforeLog);
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(result.board.children).toEqual([{ number: 2, slug: "add-widget", folder: "todo", blockedBy: [], flagged: true }]);
  });
});
