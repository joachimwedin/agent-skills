---
name: brand-palette
description: Pick a primary and accent color that fit a given project and fit each other, or — given an explicit primary — pick three accent candidates that each fit the primary and the project, then generate the full Tailwind v4 color-token system (raw OKLCH scales plus the semantic layer, light and dark) for all three candidates as copy-paste CSS and a visual HTML report written into the project. Use when the user wants brand colors chosen for a project, a Tailwind color system generated from a repo, or a secondary/accent color picked to pair with a primary they already have.
argument-hint: "<project-path> [primary-hex] [output-path]"
---

Spin up a **background agent** (`general-purpose`; needs Bash, WebSearch, Read, Write) to do this, so you keep working while it reads, researches, and computes. Hand it the Job below verbatim, with `<project-path>`, `<primary-hex>` (if given), and `<output-path>` filled in — leave `<primary-hex>` and `<output-path>` as "(not given)" when the user didn't supply them.

## Job

You are picking a complete Tailwind CSS v4 color token system for the project
at `<project-path>`. The end deliverable is **three candidate (primary, accent)
pairs**, not one — see "Produce three candidates" below. This applies
whether or not `<primary-hex>` was given: a supplied primary does not mean
project-fit is settled, only that the primary's *hex* is settled — the
accent still has to be checked against what this project actually is, not
just against Tailwind's semantic hues.

### The token model you're filling in

Tailwind v4 defines custom colors as CSS custom properties in an `@theme`
block. Each color is an 11-step scale — 50, 100, 200, 300, 400, 500, 600,
700, 800, 900, 950, light to dark — defined with `oklch()`. A smaller
semantic layer of named aliases sits on top and is what components
actually reference: `background`, `foreground`, `surface`,
`surface-foreground`, `card`, `card-foreground`, `primary`,
`primary-foreground`, `secondary`, `secondary-foreground`, `accent`,
`accent-foreground`, `muted`, `muted-foreground`, `destructive`,
`destructive-foreground`, `success`, `success-foreground`, `warning`,
`warning-foreground`, `border`, `ring`. Every fill token that text can sit
on top of is paired with a `-foreground` token tuned for contrast against
it.

For THIS system:
- **primary**: custom — either given directly (`<primary-hex>`) or chosen
  by you from the project (see "Choose a primary" below). Either way,
  generate its 11-step scale.
- **accent**: custom — a second brand hue that fits the primary *and* the
  project. You always produce **three** accent candidates (see "Choose the
  accent" below), each with its own project-fit argument, not one — this
  is true regardless of where primary came from.
- **neutral, destructive (danger), success, and warning**: NOT custom. Use
  Tailwind's real built-in scales directly — reference them by `var()`,
  e.g. `var(--color-neutral-600)`, `var(--color-red-600)`,
  `var(--color-green-600)`, `var(--color-amber-500)`. Never invent oklch
  values for these, and never trust memory for the exact current token
  values — verify them (research step below). Tailwind's real per-family
  palettes are individually hand-tuned, not formula-generated, so a
  guessed value is wrong in ways that are hard to spot.

### Step 0 — read the project & research conventions (always do this)

This step always runs, whether or not `<primary-hex>` was given. What
changes is only whether its output *picks* the primary (0d) or *checks* it
(still needed, so the accent candidates you build in the next section can
each be argued for on project-fit grounds, not just hue math).

**0a. Read the project.** At minimum: `README` (name, tagline, what it
does, who it's for), the package manifest (`package.json`,
`pyproject.toml`, `Cargo.toml`, ...) for its description and keywords, and
enough of the directory structure / a few source files to place it in a
category — a fintech dashboard, a dev tool, a consumer social app, an
internal admin panel, a game, a marketing site. You're building a picture
of what the project *is* and who it's *for*, not an inventory of its code.

**0b. Do not extract or reuse any color already in the project.** Never
search for, read for the purpose of copying, or build on an existing
`--color-primary`, logo file, favicon, Tailwind config, or brand doc — even
if one is sitting right there. The job is to propose colors fresh from
what the project *is*, not from what it already happens to look like. (If
the user wants an existing color kept, that's what the `<primary-hex>`
argument is for.)

**0c. Research, fresh, the color conventions for this project's category.**
Use WebSearch. Look at what real, comparable products in the same space
actually do — fintech tends toward blue/navy for trust, sustainability
brands toward green, developer tools toward dark-mode-first with one vivid
accent, healthcare toward calm blue/teal, luxury toward black/gold,
real estate/proptech toward blue for trust with a restrained neutral-plus-
one-accent palette, consumer/social toward bright saturated hues, and so
on; verify this against real current examples rather than trusting that
list. This research feeds two different decisions depending on the case:
  - If no `<primary-hex>` was given: it justifies the primary hue itself
    (0d below).
  - If `<primary-hex>` **was** given: the primary is fixed, but this
    research still has a job — it tells you what an accent *for this
    category* should be doing (read as trustworthy and on-convention? read
    as differentiated/modern? warm and human? luxury?), which is what lets
    you argue for or against each of the three accent candidates below on
    more than hue-collision math. A candidate that is mathematically clear
    of Tailwind's semantic hues but wrong for the category (e.g. a loud
    nightlife-app magenta on a children's-hospital scheduling tool) is
    still a bad candidate — say so in that candidate's writeup rather than
    presenting all three as equally valid.

Either way, decide deliberately whether the palette should sit inside the
category's convention (reads as trustworthy, legible at a glance) or break
from it (reads as differentiated, at the cost of some of that instant
legibility) — say which each candidate does.

**0d. Decide a specific primary hex — skip only this step if `<primary-hex>`
was given.** Turn the target you just justified (a hue family, a rough
lightness/saturation feel — "a deep, confident teal," not yet a number)
into one real hex value. This becomes `<primary-hex>` for every step
below. When `<primary-hex>` was given, use it as-is here and move on — but
0a-0c above still ran, and still inform the accent work next.

### Choose the accent — always three candidates, each checked against the project

**1. Compute the primary's real OKLCH hue, chroma, and lightness.** Do
this with actual math via Bash (Python or Node), not by eye. Standard
sRGB → linear → OKLab → OKLCH conversion (Björn Ottosson's matrices):

    srgb_to_linear(c): c/=255; return c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4

    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l_, m_, s_ = cbrt(l), cbrt(m), cbrt(s)
    L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_
    a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_
    b2 = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_
    C = sqrt(a^2 + b2^2)
    H = atan2(b2, a) in degrees, normalized to 0-360

Cross-check the result against a known real Tailwind value if the input
looks close to one of their hues — a match is a good sign the conversion
code is right.

**2. Research, fresh, how to choose a second ("accent") hue that reads as
deliberate rather than clashing or arbitrary.** Use WebSearch. Cover at
least: classical hue-harmony relationships (analogous, complementary,
split-complementary, triadic) and how real product/design-system color
systems apply them in practice; and re-verify Tailwind's current actual
default palette values/token names by fetching their real source or docs
— don't rely on memory. Cite what you find.

**3. Find candidate accent hues, using your research.** Try the classical
hue-harmony relationships — complementary, triadic, split-complementary,
analogous (both directions of each) — rotated from the primary's hue, in
order of how much visual contrast they carry. Compute the resulting hex
for each and record **every** relationship you test, so the report can
show the full trail of what was considered — this becomes the report's
hue-relationship table regardless of which end up chosen. Note each
result's distance from Tailwind's conventional semantic hues (red ~25°,
green ~145-150°, amber ~80-85° in OKLCH) as information for the write-up —
a hue that lands in that neighborhood is worth flagging in its candidate's
fit argument, since a reader should know it shares a neighborhood with
"danger" or "warning" — but proximity to a status hue is never, by itself,
a reason to discard a candidate. What decides a candidate is how well it
pairs with the primary and how well it fits the project (per 0c), not
distance from red/green/amber.

**4. Produce three candidates, not one.** From the hues generated in
step 3, pick **three** that are genuinely different from each other — not
three shades of the same idea — and are each defensible for *this* project
using the 0c research. Good spreads to aim for: one that leans into the
category convention (reads as safe/trustworthy/expected), one that
deliberately breaks from it (reads as differentiated/modern), and one
more — e.g. a warmer/human option, or whichever third distinct personality
your research surfaced — so the three actually differ in what they'd
communicate, not just in hue number. If `<primary-hex>` was given, all
three candidates share that same fixed primary and differ only in accent.
If you chose the primary yourself in step 0d, you may instead vary the
*pair* across candidates (e.g. three different primary/accent stories for
the category), but do not present three accents with no argument for why
each one in particular suits this project — every candidate needs its own
one-line "why this one" tied to the 0c research and to how well it pairs
with the primary, not to whether it avoids a status hue. Mark exactly one
candidate **recommended**, with the reasoning for the pick, but generate
and show all three at full strength (step 5-6 below) — the report presents all
three, not just the recommended one.

**5. Generate full 11-step OKLCH scales for the primary and for each of
the three accent candidates.** Use a lightness ladder and chroma curve you
can justify from your research. A defensible starting point if you don't
find something better: lightness roughly
98/95/90/82/72/62/52/44/36/28/18 across the 11 steps, chroma rising to a
peak around the 500-600 step and tapering at both extremes (to avoid
neon-pastel or muddy-near-black results at the ends). Don't copy this
uncritically — if your research surfaces a more defensible curve, or the
real Tailwind scale nearest a computed hue has a chroma-ratio and
hue-drift shape you can borrow and rescale, prefer that over the generic
fallback. The primary's scale is generated once and reused unchanged by
all three candidates; each candidate gets its own accent scale.

**6. Verify contrast, don't assume it — for every candidate.** For every
semantic `-foreground` pairing you emit, in every one of the three
candidates' light and dark sets, compute an actual contrast figure (WCAG
contrast ratio is fine) between the fill step and the foreground step via
your Bash script, and pick whichever foreground step clears a reasonable
text-contrast bar (WCAG AA body-text target, ~4.5:1) rather than assuming
"50 is always light enough" or "950 is always dark enough" — it isn't
always (a light, high-chroma fill like amber often needs a *dark*
foreground; a mid-tone fill like `-500` often fails against white and
needs `-600` or `-700` instead). Only the `accent`/`accent-foreground`
pair differs between candidates — background/foreground/surface/card/
primary/secondary/muted/destructive/success/warning/border/ring are driven
by the (shared) primary and Tailwind's built-ins, so verify those once and
reuse them across all three.

### Output

**a.** Print, in your final response: a short summary — if you chose the
primary yourself, what the project is and the category research that led
to it; the full hue-relationship trail (every relationship tried, per candidate);
the three candidates and, for each, the one-line project-fit argument and
its accent hue/hex; which one is recommended and why; and your best
sources — followed by the full CSS from **b** and **c** for all three
candidates.

**b.** For **each of the three candidates**, one ready-to-paste Tailwind
v4 `@theme` CSS block containing: the full `primary-50…950` scale (shared,
identical across all three), that candidate's full `accent-50…950` scale,
and the complete semantic layer — with neutral/destructive/success/warning
referencing Tailwind's real built-in tokens via `var()`, primary
referencing the shared scale, and accent referencing that candidate's own
scale.

**c.** For **each of the three candidates**, a dark-mode override block
(`[data-theme="dark"] { ... }`) repointing the same semantic names to
different steps — including different steps of Tailwind's built-in
neutral/red/green/amber scales where appropriate for dark backgrounds —
following the same fill/foreground contrast logic as that candidate's
light block. Background/foreground/surface/card/primary/secondary/muted/
destructive/success/warning/border/ring are identical across all three
candidates' dark blocks too — only `accent`/`accent-foreground` differs.

**d.** Also write a visual HTML report, so the result can be looked at,
not just read as CSS. All three candidates must appear in the finished
report — not only the recommended one:

1. Read the template at `report-template.html`, co-located with this file
   (find this skill's own directory — it ships with Claude Code's skill
   system, typically under `~/.claude/skills/brand-palette/`). Don't
   redesign or restyle it: it already carries a complete visual system for
   three side-by-side candidates (fonts, layout, swatch rendering, a
   semantic token table with a live light/dark toggle per candidate, code
   blocks with copy buttons) and Tailwind's real reference scales, and
   always renders in a fixed **light** reading theme regardless of the
   viewer's system preference — so filling it in is purely mechanical.
   `example.html` in the same directory is a worked, filled-in report from
   a real run — check it if you want to see the bar before you start.
2. The template is data-driven: most of it is filled in once (project-wide
   placeholders), and the three candidates are supplied as one JSON array
   consumed by the template's own script, rather than three copies of
   hand-written HTML. Replace every `{{PLACEHOLDER}}` token:
   - `{{REPORT_TITLE}}` — a short, specific name. Include the project's
     name if you have one, e.g. "Acme — Three Accents for Slate", otherwise
     just the colors, e.g. "Blue Primary — Three Accent Candidates".
   - `{{REPORT_DEK}}` — one sentence on what was computed and verified,
     mentioning that three candidates were generated.
   - `{{PROJECT_FIT_SUMMARY}}` — 2-4 sentences: what the project is (from
     0a) and the category conventions you found (0c), used as the shared
     backdrop the three candidates are each argued against. If
     `<primary-hex>` was given directly, say so plainly, but still give the
     real category research — it now drives the three accents' arguments,
     not a primary pick. Never skip this to "primary was given, nothing to
     say" — the project-fit work happens here regardless of where primary
     came from.
   - `{{PRIMARY_HEX}}`, `{{PRIMARY_HCL}}` (e.g. `H 259.8° · C 0.188 · L
     62.3%`) — the one shared primary.
   - `{{CANDIDATES_JSON}}` — a JSON array of exactly three objects, each
     shaped:
     ```
     {
       "id": "a",                          // short slug, unique per candidate
       "label": "Triadic violet",          // short name for tabs/headers
       "recommended": true,                // exactly one candidate true
       "accentHex": "#A44BFF",
       "accentHcl": "H 299.3° · C 0.265 · L 62.7%",
       "relationship": "Triadic (+120°)",
       "fitArgument": "1-2 sentences: why THIS accent suits THIS project, tied to the 0c research and to how well it pairs with the primary — not to distance from red/green/amber.",
       "collisionRows": [
         {"relationship":"Complementary (+180°)","hue":"359.3°","nearest":"Red / danger (~25-27°)","verdict":"Tried — not selected (weaker primary-fit than the chosen candidate)"}
         // one entry per relationship tried FOR THIS CANDIDATE's hue search, regardless of outcome; if candidates share a search trail, repeat it identically rather than omitting it. Nearness to a semantic hue is noted here as information only, never as grounds for rejection — mark the row that matches this candidate's own accentHex as "Selected — used as this candidate".
       ],
       "themeLightInner": "    --color-primary-50: oklch(...);\n    ...\n    --color-ring: var(--color-primary-600);",
       "themeDarkInner": "    --color-background: var(--color-neutral-950);\n    ...\n    --color-ring: var(--color-primary-400);"
     }
     ```
     `themeLightInner`/`themeDarkInner` are the exact inner declaration
     lines from that candidate's **b**/**c** blocks (no surrounding
     `@theme { }` / `[data-theme="dark"] { }`, and no CSS comments inside
     the string — comments are fine in your printed answer (**a**/**b**/
     **c**) but must not appear in this JSON, since the template's own
     script both renders these live and prints them verbatim into a code
     block). Escape embedded quotes/newlines properly for JSON (`\n`
     between lines, `\"` for literal quotes) — this is parsed with
     `JSON.parse` in the browser, so it must be valid JSON, not merely
     valid-looking.
   - `{{SOURCES_ITEMS}}` — one `<li><a href="...">...</a></li>` per
     source.
3. Write the filled-in file into `<project-path>` (default:
   `<project-path>/brand-palette-report.html` at its root) unless
   `<output-path>` overrides the location.
4. Sanity-check your own output before finishing:
   - grep the written file for `{{` — if anything matches, you missed a
     placeholder; go back and fill it in rather than shipping a broken
     page.
   - Validate `{{CANDIDATES_JSON}}` actually parses as JSON before writing
     it in (e.g. `python3 -c "import json,sys; json.load(sys.stdin)"` fed
     the array literal, or a quick Node `JSON.parse`) — a template literal
     that merely *looks* like JSON but has a stray trailing comma or an
     unescaped quote will silently fail in the browser and blank the whole
     candidates section with no visible error.
   - Never hand-splice one candidate's CSS text into a spot that is
     itself inside another CSS comment, and never let a placeholder's
     substituted value itself contain the literal three-character sequence
     that closes a CSS comment early — that mistake has silently broken
     this report before (a `/* ... */` nested inside a value spliced into
     an already-open outer comment prematurely closed it, spilling raw CSS
     out as invalid top-level declarations and blanking every swatch on
     the page with no error). The `{{CANDIDATES_JSON}}` design above sidesteps
     this — the raw CSS text lives inside a JSON string the template's
     script renders programmatically, never pasted directly next to a
     hand-written comment — so keep it that way rather than reverting to
     hand-spliced HTML/CSS text.

Project path: `<project-path>`
Primary color (skip only step 0d if given): `<primary-hex>`
Output path (optional override): `<output-path>`
