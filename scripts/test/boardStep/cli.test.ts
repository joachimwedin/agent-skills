import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * End-to-end tests running the actual `board-step` CLI as a subprocess
 * against a real git repo -- matching `boardState/cli.test.ts`'s prior art
 * of asserting on real git/filesystem state rather than mocking. Covers
 * both the mechanical case (a real commit lands, JSON carries the fresh
 * board) and the judgment case (no change, JSON still carries both
 * `outcome` and `board`).
 */

const CLI_PATH = path.join(__dirname, "../../src/boardStep/cli.ts");
const TSX_BIN = path.join(__dirname, "../../node_modules/.bin/tsx");

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "board-step-cli-repo-"));
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

function run(args: string[]): string {
  return execFileSync(TSX_BIN, [CLI_PATH, ...args], { encoding: "utf8" });
}

describe("board-step CLI", () => {
  it("performs a mechanical claim, commits, and prints JSON with both outcome and the fresh board", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "todo", filename: "2-add-widget", parent: "Spec #1" });

    const stdout = run(["1", boardDir]);
    const parsed = JSON.parse(stdout);

    expect(parsed).toEqual({
      outcome: { kind: "claimed", ticketNumber: 2, slug: "add-widget" },
      board: {
        specNumber: 1,
        spec: { number: 1, slug: "spec-widget-overhaul", folder: "in-progress", blockedBy: [], flagged: false },
        children: [{ number: 2, slug: "add-widget", folder: "in-progress", blockedBy: [], flagged: false }],
      },
    });
    expect(fs.existsSync(path.join(boardDir, "in-progress", "2-add-widget.md"))).toBe(true);
    expect(git(boardDir, ["log", "-1", "--format=%s"]).trim()).toBe("2: claim — add-widget");
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
  });

  it("makes no filesystem or git change for a judgment outcome, and still prints both outcome and board", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "in-progress", filename: "2-add-widget", parent: "Spec #1" });
    const beforeHead = git(boardDir, ["log", "-1", "--format=%H"]).trim();

    const stdout = run(["1", boardDir]);
    const parsed = JSON.parse(stdout);

    expect(parsed.outcome).toEqual({ kind: "dispatch", ticketNumber: 2, mode: "work" });
    expect(parsed.board.spec.folder).toBe("in-progress");
    expect(parsed.board.children).toEqual([{ number: 2, slug: "add-widget", folder: "in-progress", blockedBy: [], flagged: false }]);
    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(git(boardDir, ["log", "-1", "--format=%H"]).trim()).toBe(beforeHead);
  });

  it("also accepts a self-describing path to the Spec's own ticket file", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "done", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });

    const stdout = run([path.join(boardDir, "done", "1-spec-widget-overhaul.md")]);
    const parsed = JSON.parse(stdout);

    expect(parsed.outcome).toEqual({ kind: "done" });
    expect(parsed.board.specNumber).toBe(1);
  });
});
