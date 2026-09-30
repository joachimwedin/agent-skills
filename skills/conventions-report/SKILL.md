---
name: conventions-report
description: Runs `conventions-check` against a repo and renders its findings as a self-contained HTML report — the same read-only conventions check, presented as a shareable artifact instead of structured findings. Use when asked to audit, check or measure a repo's conformance with its code conventions for a person to read, or to find out where the code and its convention documents disagree.
---

# Conventions report

Run [`conventions-check`](../conventions-check/SKILL.md) in full, exactly as written — same discovery, rule extraction, per-module checking, merge, and the same call to `ReportFindings` at the end. Then, using that exact findings list (the one just passed to `ReportFindings` — don't recompute or re-derive it), render it as the HTML report below and open it.

Arguments: same as `conventions-check` — scope defaults to whole-repo, or pass `diff`/a path filter exactly as you would to `conventions-check`. The report reflects whatever scope the check actually ran with.

## Render the report

Write the HTML report per [HTML-REPORT.md](./HTML-REPORT.md) to `<tmpdir>/conventions-check-<timestamp>.html`, with the temp dir from `$TMPDIR`, falling back to `/tmp` (`%TEMP%` on Windows). Open it (`xdg-open` on Linux, `open` on macOS, `start` on Windows), then tell the person the absolute path and the headline tally: rules, violated rules, violations, modules not checked, documents to restructure.

Done when: the file exists and its path has been reported.
