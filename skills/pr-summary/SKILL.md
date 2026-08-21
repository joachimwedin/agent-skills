---
name: pr-summary
description: Generate a PR description (overview, changes, per-file table) from the current branch's diff against the repo's default branch.
disable-model-invocation: true
---

Generate a pull request summary for the current branch, in raw markdown, printed directly in the response. Never write it to a file.

## Determine the diff scope

1. Find the repo's default branch: `git symbolic-ref refs/remotes/origin/HEAD` (strip the `refs/remotes/origin` prefix). Fall back to `main` if that fails.
2. Diff the current branch against that default branch: `git log <default>..HEAD --oneline` for the commit list. `git diff <default>..HEAD` for the full content diff.
3. This is the entire scope: every commit since the branch diverged, no matter how many. Don't ask the user for a base ref or commit range.
4. Try to deduce a related ticket: look for a ticket-key pattern (e.g. `PROJ-123`, `#123`) in the branch name and in the subject/body of each commit in scope. If the same key shows up, that's the related ticket. If nothing matches, there is no related ticket - don't guess or fabricate one.
5. Try to deduce related work beyond that one ticket: look for mentions of *other* ticket keys, or explicit references to follow-up/precondition work, in the commit bodies and in comments adjacent to the diff. If something explicitly states a relationship (e.g. a commit body naming another ticket, a "see PROJ-432" style comment), that's related work. If nothing explicitly says so, there is no related work - don't infer a connection that isn't stated somewhere in the commits or code.

## Write the summary

Structure, always in this order, always with every section present regardless of how small the diff is:

1. **`## Pull request overview`** - one heading. If a ticket was deduced, add a line right below it: **`**Ticket:** <key>`** (plain text, no invented URL). Omit this line entirely if no ticket could be deduced.
2. A short overview paragraph: what the PR does and why, written for someone who hasn't seen the diff. Wrap identifiers, config keys, and file/method names that appear in the diff in backticks.
3. **`**Changes:**`** followed by a bullet list of the distinct logical changes. Always include this section, even for a single-commit, single-file diff - a one-bullet list is fine, don't collapse it into the overview paragraph.
4. **`### File summary`** followed by a `File | Description` markdown table listing every file touched in the diff and a one-line description of what changed in it. Always include the table, even for a single changed file. File paths in the table are plain text, not wrapped in backticks.
5. If related work was deduced, a **`**Related work:**`** section after the file summary, summarizing the relationship in a sentence or two (plain text, no invented links). Omit this section entirely if no related work was found.

## Output

Print the raw markdown directly in the response, in a fenced ```markdown code block so it can be copied verbatim into a PR description field. Do not write it to a file in the repo.