import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { landChild } from "../../src/landing/main.js";

/**
 * Integration tests for `landChild` against real temporary git repos (no
 * mocking) -- two independent repos per test, matching `boardStep/main.
 * test.ts`'s own style: a project repo (the code being landed) and a
 * separate agent-tickets board repo (the ticket being moved), since that's
 * exactly the seam `landChild` sits on -- it composes `git-ts`'s merge
 * primitive against the former with `board-step`'s fate-enactment entry
 * point against the latter, in one call.
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

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** A real project repo with one commit on `main`, ready for child branches to be created off it. */
function makeProjectRepo(): string {
  const dir = makeTempDir("landing-project-repo-");
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "Test"]);
  fs.writeFileSync(path.join(dir, "base.txt"), "base\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-q", "-m", "init"]);
  return dir;
}

/** Creates a new branch off `main`'s current tip and commits one new file on it, then returns to `main`. */
function makeChildBranch(projectRepoDir: string, branch: string, filename: string): void {
  git(projectRepoDir, ["checkout", "-q", "-b", branch, "main"]);
  fs.writeFileSync(path.join(projectRepoDir, filename), `${filename}\n`);
  git(projectRepoDir, ["add", "."]);
  git(projectRepoDir, ["commit", "-q", "-m", `add ${filename}`]);
  git(projectRepoDir, ["checkout", "-q", "main"]);
}

/**
 * Creates a new branch off `main`'s current tip that edits `base.txt` to
 * `content`, then returns to `main` -- paired with `editBaseFile` below
 * (a further edit to the same line on `main` itself) to force a genuine
 * merge conflict, the way two real children's overlapping changes would.
 */
function makeConflictingChildBranch(projectRepoDir: string, branch: string, content: string): void {
  git(projectRepoDir, ["checkout", "-q", "-b", branch, "main"]);
  fs.writeFileSync(path.join(projectRepoDir, "base.txt"), content);
  git(projectRepoDir, ["add", "."]);
  git(projectRepoDir, ["commit", "-q", "-m", `child edits base.txt: ${content.trim()}`]);
  git(projectRepoDir, ["checkout", "-q", "main"]);
}

/** Commits a further edit to `base.txt` directly on whatever branch is currently checked out -- simulates the base moving between landing attempts. */
function editBaseFile(projectRepoDir: string, content: string): void {
  fs.writeFileSync(path.join(projectRepoDir, "base.txt"), content);
  git(projectRepoDir, ["add", "."]);
  git(projectRepoDir, ["commit", "-q", "-m", `edit base.txt: ${content.trim()}`]);
}

function makeBoardRepo(): string {
  const dir = makeTempDir("landing-board-repo-");
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
    "None - can start immediately",
    "",
  ];
  fs.writeFileSync(path.join(boardDir, opts.folder, `${opts.filename}.md`), lines.join("\n"));
  git(boardDir, ["add", "."]);
  git(boardDir, ["commit", "-q", "-m", `seed ${opts.filename}`]);
}

describe("landChild", () => {
  it("merges a single finished child's branch onto the base and lands the ticket via the fate-enactment entry point", () => {
    const projectRepoDir = makeProjectRepo();
    makeChildBranch(projectRepoDir, "child-2", "widget.txt");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    const result = landChild(projectRepoDir, "main", "child-2", boardDir, 2, { kind: "ready-for-review" });

    expect(result.kind).toBe("landed");
    // The merge landed on the base branch itself.
    expect(git(projectRepoDir, ["rev-parse", "--abbrev-ref", "HEAD"]).trim()).toBe("main");
    expect(fs.existsSync(path.join(projectRepoDir, "widget.txt"))).toBe(true);
    expect(git(projectRepoDir, ["status", "--porcelain"]).trim()).toBe("");

    // The fate-enactment entry point was called: the ticket moved and the
    // board commit happened -- no separate caller had to trigger it.
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(false);
    expect(fs.existsSync(path.join(boardDir, "review", "2-add-widget.md"))).toBe(true);
    expect(git(boardDir, ["log", "-1", "--format=%s"]).trim()).toBe("2: review — add-widget");

    if (result.kind === "landed") {
      expect(result.report.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "ready-for-review", folder: "review" });
    }
  });

  it("lands a second finished child cleanly on top of the first's already-merged change", () => {
    const projectRepoDir = makeProjectRepo();
    // Both child branches fork off the same original base, before either
    // lands -- exactly the "finished in sequence" scenario the ticket
    // describes, so the second's merge must still succeed against the base
    // as it stands *after* the first has already landed on it.
    makeChildBranch(projectRepoDir, "child-2", "widget.txt");
    makeChildBranch(projectRepoDir, "child-3", "gadget.txt");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });
    writeTicket(boardDir, { folder: "in-progress", filename: "3-add-gadget", parent: "Spec #1" });

    const firstResult = landChild(projectRepoDir, "main", "child-2", boardDir, 2, { kind: "ready-for-review" });
    const secondResult = landChild(projectRepoDir, "main", "child-3", boardDir, 3, { kind: "ready-for-review" });

    expect(firstResult.kind).toBe("landed");
    expect(secondResult.kind).toBe("landed");

    // The base branch carries both children's changes.
    expect(fs.existsSync(path.join(projectRepoDir, "widget.txt"))).toBe(true);
    expect(fs.existsSync(path.join(projectRepoDir, "gadget.txt"))).toBe(true);
    expect(git(projectRepoDir, ["status", "--porcelain"]).trim()).toBe("");

    // Both tickets landed on the board.
    expect(fs.existsSync(path.join(boardDir, "review", "2-add-widget.md"))).toBe(true);
    expect(fs.existsSync(path.join(boardDir, "review", "3-add-gadget.md"))).toBe(true);
  });

  it("reports needs-resolution with the conflicting diff, on the ticket's first attempt, without touching the board", () => {
    const projectRepoDir = makeProjectRepo();
    makeConflictingChildBranch(projectRepoDir, "child-2", "from child\n");
    editBaseFile(projectRepoDir, "from main\n");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    const result = landChild(projectRepoDir, "main", "child-2", boardDir, 2, { kind: "ready-for-review" });

    expect(result.kind).toBe("needs-resolution");
    if (result.kind === "needs-resolution") {
      expect(result.attempt).toBe(1);
      expect(result.diff).toContain("-from main");
      expect(result.diff).toContain("+from child");
    }

    // The base is left exactly as it stood before the attempt.
    expect(fs.readFileSync(path.join(projectRepoDir, "base.txt"), "utf8")).toBe("from main\n");
    expect(git(projectRepoDir, ["status", "--porcelain"]).trim()).toBe("");

    // Neither the board nor the fate was touched.
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(true);
    expect(fs.existsSync(path.join(boardDir, "review", "2-add-widget.md"))).toBe(false);
  });

  it("retries landing after a reported resolution, against the base as it currently stands, and lands once the conflict is actually resolved", () => {
    const projectRepoDir = makeProjectRepo();
    makeConflictingChildBranch(projectRepoDir, "child-2", "from child\n");
    editBaseFile(projectRepoDir, "from main\n");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    const firstResult = landChild(projectRepoDir, "main", "child-2", boardDir, 2, { kind: "ready-for-review" });
    expect(firstResult.kind).toBe("needs-resolution");

    // Simulate a conflict-resolution coding pass: the child branch is
    // updated so it no longer disagrees with the base.
    git(projectRepoDir, ["checkout", "-q", "child-2"]);
    fs.writeFileSync(path.join(projectRepoDir, "base.txt"), "from main\n");
    git(projectRepoDir, ["add", "."]);
    git(projectRepoDir, ["commit", "-q", "-m", "resolve conflict with base"]);
    git(projectRepoDir, ["checkout", "-q", "main"]);

    const secondResult = landChild(projectRepoDir, "main", "child-2", boardDir, 2, { kind: "ready-for-review" }, 2);

    expect(secondResult.kind).toBe("landed");
    expect(fs.readFileSync(path.join(projectRepoDir, "base.txt"), "utf8")).toBe("from main\n");
    expect(fs.existsSync(path.join(boardDir, "review", "2-add-widget.md"))).toBe(true);
  });

  it("caps retries at 3 attempts total, covering the base moving again between attempts, then flags and recycles to todo/ instead of retrying further", () => {
    const projectRepoDir = makeProjectRepo();
    makeConflictingChildBranch(projectRepoDir, "child-2", "from child\n");
    editBaseFile(projectRepoDir, "from main v1\n");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    const firstResult = landChild(projectRepoDir, "main", "child-2", boardDir, 2, { kind: "ready-for-review" }, 1);
    expect(firstResult.kind).toBe("needs-resolution");
    if (firstResult.kind === "needs-resolution") {
      expect(firstResult.attempt).toBe(1);
    }

    // The base moves again in between attempts (e.g. a sibling child landed
    // on it) -- the child branch still conflicts with it either way.
    editBaseFile(projectRepoDir, "from main v2\n");

    const secondResult = landChild(projectRepoDir, "main", "child-2", boardDir, 2, { kind: "ready-for-review" }, 2);
    expect(secondResult.kind).toBe("needs-resolution");
    if (secondResult.kind === "needs-resolution") {
      expect(secondResult.attempt).toBe(2);
    }

    editBaseFile(projectRepoDir, "from main v3\n");

    const thirdResult = landChild(projectRepoDir, "main", "child-2", boardDir, 2, { kind: "ready-for-review" }, 3);

    expect(thirdResult.kind).toBe("flagged");
    if (thirdResult.kind === "flagged") {
      expect(thirdResult.report.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "flagged", folder: "todo" });
    }

    // The ticket was recycled to todo/ with a "## Flagged" section, per the
    // existing flagged-and-recycled fate -- not left sitting in-progress/.
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(false);
    expect(fs.existsSync(path.join(boardDir, "todo", "2-add-widget.md"))).toBe(true);
    const ticketContent = fs.readFileSync(path.join(boardDir, "todo", "2-add-widget.md"), "utf8");
    expect(ticketContent).toContain("## Flagged");
    expect(ticketContent).toContain("3 landing attempts");

    // The merge really was attempted against the base's latest content each
    // time, not a stale snapshot -- the base is left exactly as its third,
    // most recent edit left it.
    expect(fs.readFileSync(path.join(projectRepoDir, "base.txt"), "utf8")).toBe("from main v3\n");
  });
});
