import * as path from "node:path";

/**
 * Resolves a CLI's one positional Spec argument, shared by every CLI entry
 * point that takes a Spec the same way (`board-step` and `board-state`) --
 * given as either:
 *   - a bare ticket number, plus a second argument naming the project's
 *     board directory (e.g. `board-step 1 ../boards/agent-tickets`), or
 *   - a path to the Spec's own ticket file, self-describing: both the board
 *     directory and the ticket number are recovered from the path alone
 *     (e.g. `board-step ../boards/agent-tickets/in-progress/1-spec-foo.md`).
 *
 * `commandName` is used only to name the actual command invoked in error
 * messages (e.g. `board-step`, `board-state`), so each caller's usage/error
 * text stays accurate to itself without duplicating this parsing logic.
 */
export function resolveSpecArg(argv: string[], commandName: string): { boardDir: string; specNumber: number } {
  const [specArg, boardDirArg] = argv;
  if (specArg === undefined) {
    throw new Error(`Usage: ${commandName} <spec-number> <board-dir> | ${commandName} <path-to-spec-ticket-file>`);
  }

  if (/^\d+$/.test(specArg)) {
    if (boardDirArg === undefined) {
      throw new Error(
        `A bare ticket number needs a board directory as the second argument, e.g. \`${commandName} ${specArg} boards/agent-tickets\`. ` +
          "Pass a path to the Spec's own ticket file instead to skip this.",
      );
    }
    return { boardDir: boardDirArg, specNumber: Number.parseInt(specArg, 10) };
  }

  const resolved = path.resolve(specArg);
  const match = /^(\d+)-/.exec(path.basename(resolved));
  if (match === null) {
    throw new Error(`Not a valid ticket file path: ${specArg}`);
  }
  // <board-dir>/<folder>/<n>-<slug>.md -- strip the filename and its
  // containing kanban folder to recover the board directory.
  return { boardDir: path.dirname(path.dirname(resolved)), specNumber: Number.parseInt(match[1], 10) };
}
