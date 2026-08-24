import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The four kanban folders every ticket -- Spec or child -- moves through,
 * per TICKET-FORMAT.md's "Kanban folders".
 */
export type Folder = "todo" | "in-progress" | "review" | "done";

const FOLDERS: Folder[] = ["todo", "in-progress", "review", "done"];

/**
 * One ticket's parsed state, sufficient for `classifyNextAction` to decide
 * the Priority scan's outcome with no further I/O.
 */
export type TicketRecord = {
  number: number;
  slug: string;
  folder: Folder;
  /** Raw, trimmed contents of the ticket's "## Parent" section, e.g. "Spec #1" or "None — this is the Spec." */
  parent: string;
  /** Ticket numbers referenced by "Ticket #<n>" entries under "## Blocked by". Empty when unblocked. */
  blockedBy: number[];
  /** True when the ticket carries a "## Flagged" section. */
  flagged: boolean;
};

/**
 * A Spec's board, narrowed to the one Spec ticket plus every child ticket
 * whose "## Parent" points back at it -- everything `classifyNextAction`
 * needs to decide the Priority scan's next action.
 */
export type BoardSnapshot = {
  specNumber: number;
  spec: TicketRecord;
  children: TicketRecord[];
};

const FILENAME_PATTERN = /^(\d+)-(.+)\.md$/;
const BLOCKED_BY_TICKET_PATTERN = /Ticket #(\d+)/g;
const PARENT_SPEC_PATTERN = /^Spec #(\d+)/;

/**
 * Returns the raw text of the named `## <heading>` section (everything
 * between that heading line and the next `## ` heading, or end of file),
 * trimmed -- or `null` when the file has no such heading at all. Pure
 * string parsing, no I/O.
 */
function extractSection(content: string, heading: string): string | null {
  const lines = content.split("\n");
  const headingLine = `## ${heading}`;
  const startIndex = lines.findIndex((line) => line.trim() === headingLine);
  if (startIndex === -1) {
    return null;
  }

  const rest = lines.slice(startIndex + 1);
  const endOffset = rest.findIndex((line) => line.startsWith("## "));
  const sectionLines = endOffset === -1 ? rest : rest.slice(0, endOffset);
  return sectionLines.join("\n").trim();
}

/** Parses one ticket file's contents into a `TicketRecord`, given the number/slug already recovered from its filename and the folder it was found in. */
function parseTicket(content: string, number: number, slug: string, folder: Folder): TicketRecord {
  const parent = extractSection(content, "Parent") ?? "";

  const blockedBySection = extractSection(content, "Blocked by") ?? "";
  const blockedBy = [...blockedBySection.matchAll(BLOCKED_BY_TICKET_PATTERN)].map((match) => Number.parseInt(match[1], 10));

  const flagged = extractSection(content, "Flagged") !== null;

  return { number, slug, folder, parent, blockedBy, flagged };
}

/** Reads and parses every ticket file across all four kanban folders under `boardDir`, tagging each with the folder it was found in. */
function readAllTickets(boardDir: string): TicketRecord[] {
  const records: TicketRecord[] = [];

  for (const folder of FOLDERS) {
    const folderDir = path.join(boardDir, folder);
    if (!fs.existsSync(folderDir)) {
      continue;
    }

    for (const filename of fs.readdirSync(folderDir)) {
      const match = FILENAME_PATTERN.exec(filename);
      if (match === null) {
        continue;
      }

      const number = Number.parseInt(match[1], 10);
      const slug = match[2];
      const content = fs.readFileSync(path.join(folderDir, filename), "utf8");
      records.push(parseTicket(content, number, slug, folder));
    }
  }

  return records;
}

/**
 * Reads `boardDir` (a project's `agent-tickets/boards/<project>/` folder)
 * and returns the Spec ticket numbered `specNumber` together with every
 * child ticket whose "## Parent" points back at it ("Spec #<specNumber>"),
 * regardless of which of the four kanban folders each currently sits in.
 * Throws if no ticket numbered `specNumber` exists anywhere on the board.
 */
export function readBoardSnapshot(boardDir: string, specNumber: number): BoardSnapshot {
  const allTickets = readAllTickets(boardDir);

  const spec = allTickets.find((ticket) => ticket.number === specNumber);
  if (spec === undefined) {
    throw new Error(`No ticket numbered ${specNumber} found on the board at ${boardDir}`);
  }

  const children = allTickets.filter((ticket) => {
    const match = PARENT_SPEC_PATTERN.exec(ticket.parent);
    return match !== null && Number.parseInt(match[1], 10) === specNumber;
  });

  return { specNumber, spec, children };
}
