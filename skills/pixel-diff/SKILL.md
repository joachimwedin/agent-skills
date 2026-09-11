---
name: pixel-diff
description: Verify a live UI implementation against a reference design via pixel-level screenshot diffing, reporting a mismatch percentage and localizing each differing region to a DOM selector. Use when implementing UI meant to match a design pixel-for-pixel, or when asked to check or verify visual fidelity against an HTML mock or a screenshot.
argument-hint: "<reference> <repo-path> [route]"
---

# Pixel Diff

Diffs one screenshot against another and reports where they differ. It does not implement fixes itself — that's a separate step you take afterward with the report in hand.

Invoked with a reference (an HTML file path — a screenshot image also works, see below), the path to the repo holding the live implementation, and an optional route (default `/`). The repo must already have a `playwright.config.ts` with a `webServer` block — read it first; if `webServer` isn't configured, say so and stop rather than starting the dev server yourself.

## Procedure

1. **Read `playwright.config.ts`.** Confirm `webServer` exists and note its `url` — the base the live implementation is reachable at. If the reference is a screenshot image rather than HTML, read [RASTER-REFERENCE.md](RASTER-REFERENCE.md) before continuing; it changes how the viewport gets sized.

2. **Write a throwaway spec file** (wherever the config's `testDir` expects test files) that:
   - Opens the reference at `file://<reference-path>`, sets the viewport to 1440×900 (`deviceScaleFactor: 1`) unless told otherwise, and takes a `fullPage` screenshot.
   - Navigates to `<webServer.url><route>` in a second page, performs whatever clicks, fills, or hovers get it into the state described in the invocation (a modal open, a tab selected — infer these from what you're asked to verify; there's no separate argument for them), then takes a `fullPage` screenshot at the same viewport.
   - If the invocation names elements with non-deterministic content (a randomized hero image, rotating testimonials, ads) — pass their selectors to both screenshots' `mask` option (`page.screenshot({ mask: [...], maskColor: '#000000' })`), so that content never enters the diff. Only mask what's explicitly named; don't mask every image by default, since a wrong image or broken sizing is still a real mismatch worth catching. Check what a candidate selector actually bounds before using it — inspect its `getBoundingClientRect()` and children, don't infer scope from a class name or from it merely containing an image. A selector that resolves to a whole card (image *and* the price/text beneath it) masks that real, comparable text too, not just the photo; the fix is the narrower element (the image's own wrapper, e.g. `:first-child` of the card). A too-broad mask turns the reference into a bigger black rectangle than its counterpart on the live side, and that asymmetry itself gets counted as mismatch — it can dominate the whole report and bury genuine findings underneath it.
   - Compares both images' raw dimensions before diffing. If they differ by more than a few pixels, report that mismatch directly (e.g. "reference is 2140px tall, implementation is 3400px — check for a missing height/overflow constraint") and stop; don't attempt a pixel diff on mismatched canvases.
   - Diffs matching-dimension images with `pixelmatch`, threshold from the invocation or 1% mismatch by default. For a plain pass/fail plus a diff image, its CLI works standalone with no install (`npx pixelmatch reference.png current.png diff.png <threshold>`). For localization (next bullet), you need `pixelmatch` and `pngjs` as real, resolvable packages instead — `npx -p pixelmatch -p pngjs node script.js` does *not* make them import-resolvable from a separate script. Scratch-install them (`npm install --no-save pixelmatch pngjs` in a throwaway directory outside the target repo) and put the diff script alongside that `node_modules`, so plain `node script.js` resolves them.
   - For each contiguous mismatched region, compute its bounding box — grid-bin the mismatched pixels from `pixelmatch`'s diff buffer (`pngjs` gives you that buffer read/write), flood-fill adjacent cells into clusters — and call `elementFromPoint` at its center against the live page to report a DOM selector, not raw coordinates. When scanning the diff buffer for mismatched pixels, match on the exact `diffColor` you passed in (default `[255, 0, 0]`) — don't just check that the red channel is 255. Anti-aliasing-only differences (excluded from `mismatchedPixels` when `includeAA` is left at its `false` default) are drawn in a *different* option, `aaColor` (defaults to yellow), not `diffColorAlt` — `diffColorAlt` is unrelated to AA at all; it recolors some *counted* mismatches to distinguish "added" from "removed" content, and defaults to `null` (off). Passing a color to `diffColorAlt` by mistake (easy to do, given the name) makes some real mismatches share a color with excluded AA pixels, throwing off any pixel count you compute from the buffer yourself. Leave `diffColorAlt` unset and match on `diffColor` exactly, and your own count will equal `mismatchedPixels`.

3. **Run it**: `npx playwright test <spec-file>`. This starts, or reuses, the dev server via the project's own `webServer` config.

4. **Delete the spec file and both screenshots** once you've read the results. Nothing from this skill gets committed.

## Report

State, in the conversation:
- Pass or fail against the threshold, and the mismatch percentage.
- Each mismatched region as a DOM selector (or coordinates, if nothing resolved at that point), with its own local mismatch estimate. If a region resolves to an `<img>` or an element with a `background-image`, flag it as possibly non-deterministic content rather than a real mismatch, and suggest re-running with it masked.
- The diff image's path, if it's worth a follow-up look.
