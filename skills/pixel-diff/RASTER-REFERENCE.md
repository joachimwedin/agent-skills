# Raster reference fallback

When the reference is a screenshot image instead of HTML, dimension-matching isn't automatic — the two renders aren't produced from the same explicit viewport, so reconcile them by hand:

1. Read the reference image's raw pixel dimensions straight from its PNG header — bytes 16 and 20 (big-endian `UInt32`) after the 8-byte signature and IHDR chunk header, no dependency needed:
   ```js
   const buf = fs.readFileSync(referencePath);
   const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20);
   ```
2. Divide by a scale factor — default **2** (the real-world default for a direct macOS screen capture; a non-Retina external display or a 1x export is 1, a Figma 3x export is 3 — ask if it's ambiguous) — to get the CSS viewport size: `{ width: width / scale, height: height / scale }`.
3. Set that as the live page's viewport, with `deviceScaleFactor: <scale>`. This reproduces the same pixel density Playwright-side, so the two screenshots come out dimension-identical with no lossy resizing.

Everything else in the main procedure — the dimension check, `pixelmatch`, localization, the report — is unchanged.
