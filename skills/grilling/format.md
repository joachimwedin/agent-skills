# Gutter frames — question format

A layout for rendering a round of grilling questions as plain CommonMark text
in a monospace, dark-theme terminal (~70–90 columns). Structure comes only
from box-drawing characters, indentation, line breaks, bold, inline code, and
one emoji. No colors, backgrounds, or images — and no code fence around the
output: it must render as live CommonMark so bold and inline code actually
render, not as literal `**`/`` ` `` characters.

## Shape of one question — lettered (multiple choice)

```
╭─ **Q1 · Cleanup trigger** ──────────────────────────────────────
│
│  How should stale rows get picked up? The table is ~40M rows,
│  so a full scan is not free.
│
│    (a) Scheduled sweep — nightly cron over the whole table
│    (b) On write — purge neighbours when a row is touched
│    (c) Hybrid — on-write for hot partitions, weekly sweep
│
╰─ ✅ **(a) Scheduled sweep** — predictable cost, easy to disable.
```

## Shape of one question — open-ended (no discrete options)

Some questions don't reduce to 2–3 choices. Drop the options block entirely;
the box is just body text and a recommendation.

```
╭─ **Q5 · Rollout timeline** ─────────────────────────────────────
│
│  When do you want this live? Support hasn't set a hard
│  deadline, but every week the sweep stays off is more manual
│  cleanup for on-call.
│
╰─ ✅ Ship as soon as the dry run from Q4 comes back clean.
```

## Rules

**Header line.** `╭─ ` then the bold label and title as `**Qn · Title**`, one
space, then `─` repeated to about 70 columns. If a long title makes the
padding awkward, stop the rule short. Rules do not need to align across
questions.

**No right or bottom edge.** The frame is open on the right, so any terminal
width simply wraps text into the gutter instead of breaking a box.

**Gutter.** Every line inside the question begins with `│`.

- body text: `│` + 2 spaces
- options: `│` + 4 spaces
- spacer lines: a bare `│`

**Body.** Zero or more paragraphs, wrapped by hand at ~70 columns, separated by
a bare `│`.

**Options** (lettered questions only). Two or three, labelled `(a)`, `(b)`,
`(c)`. Each is a short name, an em dash, and one clause of description. Keep
each on a single line where possible. Open-ended questions omit this block.

**Recommendation.** The closing line of the frame, replacing the bottom edge:

```
╰─ ✅ **(a) Option name** — one line saying why.
```

or, for an open-ended question:

```
╰─ ✅ One line stating the recommended answer directly.
```

This makes the recommendation the visual exit of every question — the eye
always leaves a block on the answer. It is the only place emoji appears.

**Emphasis discipline.**

- Bold: question title, and the recommended choice's label for lettered
  questions (`**(a) Option name**`). An open-ended recommendation isn't
  bolded — it's already the whole line.
- Inline code: real identifiers only (`updated_at`, `cleanup.enabled`).
- Nothing else is emphasized. The design must read correctly whatever accent
  color the user's theme assigns to inline code.

**Between questions.** One blank line. Nothing else separates them; the frame
does the work.

**Numbering.** Global across the whole session, never restarts. If round 1
was Q1–Q4, round 2 continues at Q5, whether it has one question or five —
this keeps every question a stable, unambiguous reference for the rest of the
conversation.

**Round framing.** Open with a single plain-text line stating how many
questions are in *this* round (not the session total) — including when it's
just one:

```
Four open questions on the cleanup plan.
```
```
One open question on the cleanup plan.
```

Close with a single plain-text line on how to reply: each question gets one
token in the reply key — a number for a lettered question suffixed with its
letter, or a bare number for an open-ended one. Add a short trailing clause
only when the round contains at least one open-ended question:

```
Reply like `1a 2c 3b 4a`, or say "go with the recommendations".
```
```
Reply like `1a 2c 3b 4`, answering 4 in your own words.
```

Apply this framing even to a single-question round — don't strip it down just
because there's nothing to disambiguate. Consistency across the session beats
trimming a technically-unneeded line.

## Degradation

If the terminal is narrower than the header rule, the rule wraps onto a
second line of dashes — harmless. Body and option lines wrap without a
leading `│`, which is this direction's one real cost compared to full-width
ruled separators.

## Full example round

First round of a session:

```
Four open questions on the cleanup plan.

╭─ **Q1 · Cleanup trigger** ──────────────────────────────────────
│
│  How should stale rows get picked up? The table is ~40M rows,
│  so a full scan is not free.
│
│    (a) Scheduled sweep — nightly cron over the whole table
│    (b) On write — purge neighbours when a row is touched
│    (c) Hybrid — on-write for hot partitions, weekly sweep
│
╰─ ✅ **(a) Scheduled sweep** — predictable cost, easy to disable.

╭─ **Q2 · Definition of stale** ──────────────────────────────────
│
│    (a) `updated_at` older than 90 days
│    (b) `archived_at` is set, regardless of age
│    (c) Either of the above
│
╰─ ✅ **(c) Either** — archived rows are dead weight at any age.

╭─ **Q3 · Delete or soft-delete** ────────────────────────────────
│
│  Support asks for undo about twice a month, which argues
│  against a hard delete. The cost is a second purge job.
│
│    (a) Hard delete — row is gone, no recovery
│    (b) Soft delete — set `deleted_at`, purge 30 days later
│
╰─ ✅ **(b) Soft delete** — 30 days covers every undo we've logged.

╭─ **Q4 · Rollout** ──────────────────────────────────────────────
│
│    (a) Dry run first — log deletions only, for one week
│    (b) Ship behind `cleanup.enabled`, flip tenant by tenant
│
╰─ ✅ **(a) Dry run** — the first sweep is the risky one.

Reply like `1a 2c 3b 4a`, or say "go with the recommendations".
```

Second round of the same session — numbering continues, and one question is
open-ended:

```
Two open questions on the cleanup plan.

╭─ **Q5 · Rollout timeline** ─────────────────────────────────────
│
│  When do you want this live? Support hasn't set a hard
│  deadline, but every week the sweep stays off is more manual
│  cleanup for on-call.
│
╰─ ✅ Ship as soon as the dry run from Q4 comes back clean.

╭─ **Q6 · Alerting** ─────────────────────────────────────────────
│
│    (a) Page on-call if the sweep deletes >1% of the table
│    (b) No automated alert — check the dashboard weekly
│
╰─ ✅ **(a) Page on-call** — a runaway sweep is worth waking up for.

Reply like `5 6a`, answering 5 in your own words.
```
