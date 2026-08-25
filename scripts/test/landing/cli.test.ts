import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * End-to-end tests running the actual `land-child` CLI as a subprocess
 * against two real temporary git repos -- matching `boardStep/cli.test.ts`'s
 * and `landing/main.test.ts`'s own style (real git/filesystem state, no
 * mocking). `land-child` is the CLI surface `run-spec`'s driving
 * instructions call to land one finished child's branch through the
 * landing module (`../../src/landing/main.ts`'s `landChild`) rather than
 * reimplementing its merge-then-report-fate policy in prose.
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
  const dir = makeTempDir("land-child-cli-project-repo-");
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

/** Edits `base.txt` on whatever branch is currently checked out, forcing a real merge conflict against `child-2` below. */
function editBaseFile(projectRepoDir: string, content: string): void {
  fs.writeFileSync(path.join(projectRepoDir, "base.txt"), content);
  git(projectRepoDir, ["add", "."]);
  git(projectRepoDir, ["commit", "-q", "-m", `edit base.txt: ${content.trim()}`]);
}

function makeConflictingChildBranch(projectRepoDir: string, branch: string, content: string): void {
  git(projectRepoDir, ["checkout", "-q", "-b", branch, "main"]);
  fs.writeFileSync(path.join(projectRepoDir, "base.txt"), content);
  git(projectRepoDir, ["add", "."]);
  git(projectRepoDir, ["commit", "-q", "-m", `child edits base.txt: ${content.trim()}`]);
  git(projectRepoDir, ["checkout", "-q", "main"]);
}

function makeBoardRepo(): string {
  const dir = makeTempDir("land-child-cli-board-repo-");
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

type WriteTicketOpts = { folder: string; filename: string; parent: string };

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

const CLI_PATH = path.join(__dirname, "../../src/landing/cli.ts");
const TSX_BIN = path.join(__dirname, "../../node_modules/.bin/tsx");

function run(args: string[]): string {
  return execFileSync(TSX_BIN, [CLI_PATH, ...args], { encoding: "utf8" });
}

describe("land-child CLI", () => {
  it("merges a clean child branch onto the base and enacts the reported fate, printing JSON", () => {
    const projectRepoDir = makeProjectRepo();
    makeChildBranch(projectRepoDir, "child-2", "widget.txt");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    const stdout = run([projectRepoDir, "main", "child-2", boardDir, "2", "--fate", "ready-for-review"]);
    const parsed = JSON.parse(stdout);

    expect(parsed.kind).toBe("landed");
    expect(parsed.report.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "ready-for-review", folder: "review" });
    expect(fs.existsSync(path.join(projectRepoDir, "widget.txt"))).toBe(true);
    expect(fs.existsSync(path.join(boardDir, "review", "2-add-widget.md"))).toBe(true);
    expect(git(boardDir, ["log", "-1", "--format=%s"]).trim()).toBe("2: review — add-widget");
  });

  it("reports needs-resolution with the conflicting diff and touches neither repo's board state", () => {
    const projectRepoDir = makeProjectRepo();
    makeConflictingChildBranch(projectRepoDir, "child-2", "from child\n");
    editBaseFile(projectRepoDir, "from main\n");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    const stdout = run([projectRepoDir, "main", "child-2", boardDir, "2", "--fate", "ready-for-review"]);
    const parsed = JSON.parse(stdout);

    expect(parsed.kind).toBe("needs-resolution");
    expect(parsed.attempt).toBe(1);
    expect(parsed.diff).toContain("-from main");
    expect(parsed.diff).toContain("+from child");
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(true);
  });

  it("accepts an explicit --attempt to resume a retried landing past its first try", () => {
    const projectRepoDir = makeProjectRepo();
    makeConflictingChildBranch(projectRepoDir, "child-2", "from child\n");
    editBaseFile(projectRepoDir, "from main v1\n");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    editBaseFile(projectRepoDir, "from main v2\n");
    const stdout = run([projectRepoDir, "main", "child-2", boardDir, "2", "--fate", "ready-for-review", "--attempt", "3"]);
    const parsed = JSON.parse(stdout);

    // Attempt 3 is the cap -- a still-conflicting branch is flagged and
    // recycled to todo/ rather than reported needs-resolution again.
    expect(parsed.kind).toBe("flagged");
    expect(parsed.report.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "flagged", folder: "todo" });
    expect(fs.existsSync(path.join(boardDir, "todo", "2-add-widget.md"))).toBe(true);
  });

  it("supports a done fate, e.g. a review-child pass whose fix also needed landing", () => {
    const projectRepoDir = makeProjectRepo();
    makeChildBranch(projectRepoDir, "child-2", "widget.txt");

    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "review", filename: "2-add-widget", parent: "Spec #1" });

    const stdout = run([projectRepoDir, "main", "child-2", boardDir, "2", "--fate", "done"]);
    const parsed = JSON.parse(stdout);

    expect(parsed.kind).toBe("landed");
    expect(parsed.report.outcome).toEqual({ ticketNumber: 2, slug: "add-widget", fate: "done", folder: "done" });
  });

  it("errors out when --fate flagged is given with no --reason", () => {
    const projectRepoDir = makeProjectRepo();
    makeChildBranch(projectRepoDir, "child-2", "widget.txt");
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });

    expect(() => run([projectRepoDir, "main", "child-2", boardDir, "2", "--fate", "flagged"])).toThrow();
  });

  it("errors out when a required positional argument is missing", () => {
    expect(() => run(["--fate", "ready-for-review"])).toThrow();
  });
});
