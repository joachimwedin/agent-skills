import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // A src/test tree with zero test files should report zero passing, not
    // fail the run (e.g. right after scaffolding, before any tests exist).
    passWithNoTests: true,
  },
});
