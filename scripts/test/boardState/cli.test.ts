import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * End-to-end tests running the actual `board-state` CLI as a subprocess
 * against a real git repo -- matching `boardStep/cli.test.ts`'s prior art
 * of asserting on real git/filesystem state rather than mocking. This is
 * the test proving the ticket's own acceptance criterion literally:
 * running the tool against a real board makes no change to any file and
 * creates no git commit.
 */

const CLI_PATH = path.join(__dirname, "../../src/boardState/cli.ts");
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "board-state-repo-"));
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

describe("board-state CLI", () => {
  it("prints the board state as JSON and makes no filesystem or git change against a real repo", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "in-progress", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });
    writeTicket(boardDir, { folder: "done", filename: "2-add-widget", parent: "Spec #1" });

    const beforeHead = git(boardDir, ["log", "-1", "--format=%H"]).trim();

    const stdout = run(["1", boardDir]);

    expect(() => JSON.parse(stdout)).not.toThrow();
    const parsed = JSON.parse(stdout);
    expect(parsed).toEqual({
      specNumber: 1,
      spec: { number: 1, slug: "spec-widget-overhaul", folder: "in-progress", blockedBy: [], flagged: false },
      children: [{ number: 2, slug: "add-widget", folder: "done", blockedBy: [], flagged: false }],
    });

    expect(git(boardDir, ["status", "--porcelain"]).trim()).toBe("");
    expect(git(boardDir, ["log", "-1", "--format=%H"]).trim()).toBe(beforeHead);
  });

  it("also accepts a self-describing path to the Spec's own ticket file", () => {
    const boardDir = makeBoardRepo();
    writeTicket(boardDir, { folder: "todo", filename: "1-spec-widget-overhaul", parent: "None — this is the Spec." });

    const stdout = run([path.join(boardDir, "todo", "1-spec-widget-overhaul.md")]);
    const parsed = JSON.parse(stdout);

    expect(parsed.specNumber).toBe(1);
    expect(parsed.children).toEqual([]);
  });
});
