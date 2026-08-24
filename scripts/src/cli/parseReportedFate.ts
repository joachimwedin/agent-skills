import type { ReportedFate } from "../boardStep/main.js";

/**
 * Parses a CLI's `--fate`/`--reason` flags into a `ReportedFate`, per
 * `runReportFate`'s three valid kinds (`../boardStep/main.ts`). Shared by
 * every CLI entry point that accepts a reported fate this same way
 * (`board-step report`, `land-child`) -- `commandName` is used only to name
 * the actual command invoked in the `flagged`-with-no-`--reason` error
 * message, so each caller's usage text stays accurate to itself without
 * duplicating this parsing logic, matching `resolveSpecArg`'s existing
 * `commandName` precedent (`./resolveSpecArg.ts`).
 */
export function parseReportedFate(commandName: string, fateArg: string | undefined, reasonArg: string | undefined): ReportedFate {
  switch (fateArg) {
    case "ready-for-review":
      return { kind: "ready-for-review" };
    case "done":
      return { kind: "done" };
    case "flagged":
      if (reasonArg === undefined) {
        throw new Error(`${commandName} ... --fate flagged also needs --reason "<why>"`);
      }
      return { kind: "flagged", reason: reasonArg };
    default:
      throw new Error(`Unknown --fate "${fateArg}" -- expected one of: ready-for-review, flagged, done.`);
  }
}
