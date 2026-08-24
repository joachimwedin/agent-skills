import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runBoardStep, runReportFate } from "../../src/boardStep/main.js";

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

    expect(result.outcome).toEqual({ kind: "claimed", claims: [{ ticketNumber: 2, slug: "add-widget" }] });
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

  it("claims every simultaneously-pickable child in one pass, each with its own commit", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-add-widget", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "todo", filename: "3-add-gadget", parent: "Spec #1" });

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome).toEqual({
      kind: "claimed",
      claims: [
        { ticketNumber: 2, slug: "add-widget" },
        { ticketNumber: 3, slug: "add-gadget" },
      ],
    });
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(true);
    expect(fs.existsSync(path.join(boardDir, "in-progress", "3-add-gadget.md"))).toBe(true);
    // Each claimed child gets its own separate commit, using the existing
    // claim commit-message convention -- most recent first.
    const messages = git(boardDir, ["log", "--format=%s", "-2"]).trim().split("\n");
    expect(messages).toEqual(["3: claim — add-gadget", "2: claim — add-widget"]);
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");

    // The board field reflects every claim made during this same call.
    expect(result.board).toEqual({
      specNumber: 1,
      spec: { number: 1, slug: "spec-widget-overhaul", folder: "in-progress", blockedBy: [], flagged: false },
      children: [
        { number: 2, slug: "add-widget", folder: "in-progress", blockedBy: [], flagged: false },
        { number: 3, slug: "add-gadget", folder: "in-progress", blockedBy: [], flagged: false },
      ],
    });
  });

  it("moves the Spec itself from todo to in-progress, in its own commit, on the first child claim", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "todo", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-add-widget", parent: "Spec #1" });

    const result = runBoardStep(boardDir, 1);

    expect(result.outcome).toEqual({ kind: "claimed", claims: [{ ticketNumber: 2, slug: "add-widget" }] });
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

describe("runReportFate", () => {
  it("moves a child reported ready-for-review from in-progress to review and commits", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    const result = runReportFate(boardDir, 2, { kind: "ready-for-review" });

    expect(result.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "ready-for-review", folder: "review" });
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(false);
    expect(fs.existsSync(path.join(boardDir, "review", "2-add-widget.md"))).toBe(true);
    expect(currentBranchLog(boardDir)).toBe("2: review — add-widget");
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(result.board).toEqual({
      specNumber: 1,
      spec: { number: 1, slug: "spec-widget-overhaul", folder: "in-progress", blockedBy: [], flagged: false },
      children: [{ number: 2, slug: "add-widget", folder: "review", blockedBy: [], flagged: false }],
    });
  });

  it("moves a child reported done from review to done and commits", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "review", filename: "2-add-widget", parent: "Spec #1" });

    const result = runReportFate(boardDir, 2, { kind: "done" });

    expect(result.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "done", folder: "done" });
    expect(fs.existsSync(path.join(boardDir, "done", "2-add-widget.md"))).toBe(true);
    expect(currentBranchLog(boardDir)).toBe("2: done — add-widget");
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
  });

  it("carries an on-disk edit made before reporting (e.g. a review-child pass ticking boxes) into the move commit, for both done and ready-for-review", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "review", filename: "2-add-widget", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "in-progress", filename: "3-add-gadget", parent: "Spec #1" });

    // Per TICKET-FORMAT.md's "Report fate", a spec-pass pass edits the
    // ticket file's content directly (ticking boxes) but never commits that
    // edit itself -- it's left sitting as an uncommitted working-tree diff
    // when runReportFate is called, exactly like a real spec-pass subagent
    // leaves it.
    const reviewTicketPath = path.join(boardDir, "review", "2-add-widget.md");
    fs.writeFileSync(reviewTicketPath, fs.readFileSync(reviewTicketPath, "utf8").replace("- [ ] ...", "- [x] ..."));
    const inProgressTicketPath = path.join(boardDir, "in-progress", "3-add-gadget.md");
    fs.writeFileSync(inProgressTicketPath, fs.readFileSync(inProgressTicketPath, "utf8").replace("- [ ] ...", "- [x] ..."));

    const doneResult = runReportFate(boardDir, 2, { kind: "done" });
    const reviewResult = runReportFate(boardDir, 3, { kind: "ready-for-review" });

    expect(doneResult.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "done", folder: "done" });
    expect(fs.readFileSync(path.join(boardDir, "done", "2-add-widget.md"), "utf8")).toContain("- [x] ...");
    expect(reviewResult.outcome).toEqual({ ticketNumber: 3, slug: "add-gadget", fate: "ready-for-review", folder: "review" });
    expect(fs.readFileSync(path.join(boardDir, "review", "3-add-gadget.md"), "utf8")).toContain("- [x] ...");
    // Both edits landed in their own commit -- nothing left uncommitted.
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
  });

  it("moves the Spec itself reported done from review to done and commits", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "review", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "done", filename: "2-add-widget", parent: "Spec #1" });

    const result = runReportFate(boardDir, 1, { kind: "done" });

    expect(result.outcome).toEqual({ ticketNumber: 1, slug: "spec-widget-overhaul", fate: "done", folder: "done" });
    expect(fs.existsSync(path.join(boardDir, "done", "1-spec-widget-overhaul.md"))).toBe(true);
    expect(currentBranchLog(boardDir)).toBe("1: done — spec-widget-overhaul");
    expect(result.board.spec.folder).toBe("done");
  });

  it("flags a blocked child: appends a Flagged section, moves in-progress to todo, and commits with the reason", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    const result = runReportFate(boardDir, 2, { kind: "flagged", reason: "sandbox blocks npm install" });

    expect(result.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "flagged", folder: "todo" });
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(false);
    const content = fs.readFileSync(path.join(boardDir, "todo", "2-add-widget.md"), "utf8");
    expect(content).toContain("## Flagged");
    expect(content).toContain("sandbox blocks npm install");
    expect(currentBranchLog(boardDir)).toBe("2: flag — add-widget (sandbox blocks npm install)");
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(result.board.children).toEqual([{ number: 2, slug: "add-widget", folder: "todo", blockedBy: [], flagged: true }]);
  });

  it("reopens the Spec itself when reported flagged: moves review to in-progress, no Flagged section, and commits", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "review", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-add-widget", parent: "Spec #1" });

    const result = runReportFate(boardDir, 1, { kind: "flagged", reason: "filed 2 new child tickets" });

    expect(result.outcome).toEqual({ ticketNumber: 1, slug: "spec-widget-overhaul", fate: "flagged", folder: "in-progress" });
    expect(fs.existsSync(path.join(boardDir, "in-progress", "1-spec-widget-overhaul.md"))).toBe(true);
    const content = fs.readFileSync(path.join(boardDir, "in-progress", "1-spec-widget-overhaul.md"), "utf8");
    expect(content).not.toContain("## Flagged");
    expect(currentBranchLog(boardDir)).toBe("1: reopened — spec-widget-overhaul");
    expect(result.board.spec.folder).toBe("in-progress");
  });

  it("throws when ready-for-review is reported for the Spec itself", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });

    expect(() => runReportFate(boardDir, 1, { kind: "ready-for-review" })).toThrow(/Spec/);
  });

  it("throws when the reported ticket number doesn't exist on the board", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });

    expect(() => runReportFate(boardDir, 99, { kind: "done" })).toThrow(/99/);
  });
});
