# HTML report format

The check is rendered as one self-contained HTML file in the OS temp directory. Tailwind comes from its CDN. Every number in the report is computed from `conventions-check`'s findings, never typed by hand.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Conventions check — {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="tally">...</section>
      <section id="findings">...</section>
      <section id="systemic">...</section>
      <section id="not-checked">...</section>
      <section id="restructure">...</section>
    </main>
  </body>
</html>
```

## Sections, in this order

Leave out a section that has nothing to show, except `run info`, `tally` and `findings`.

1. **Header and run info.** Repo name, date, commit, scope (whole-repo or diff, plus any path filter), the modules checked, files covered, subagents used, the exclusions applied.
2. **Tally.** Overall: rules, violated rules, violations. Then a table per document (rules, violated, violations) and per rule (id, source `file:line`, class, violations, applicable). A `not checked` count sits beside these numbers when there is one, so the tally is never read as complete when it is not.
3. **Findings.** Grouped by rule in source order. Each rule shows its verbatim text, source `file:line`, class (mechanical or judgment), and any tags (`systemic`, `unstructured`, `overridden in <subtree>`). A mechanical rule shows the command that ran and its exact count. Every violation shows `file:line`, the quoted line in a monospaced block, and, for judgment rules, its confidence badge (`high` emerald, `medium` amber, `low` slate). A rule with no violations shows as followed, collapsed.
4. **Systemic rules.** Rules broken at most of their applicable sites, with the counts. No verdict on whether the code or the document is wrong.
5. **Not checked.** Each module whose subagent failed twice, with the reason.
6. **Documents to restructure.** Each unstructured document with its path and how many rules were read from prose.

## Style

Plain and dense: tables and monospaced blocks, few paragraphs. No introduction; the header goes straight into the tally.
