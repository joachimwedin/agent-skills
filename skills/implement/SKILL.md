---
name: implement
description: "Implement a piece of work described in the prompt, with a review pass and code conventions built in."
disable-model-invocation: true
---

Implement the work described in the prompt.

Use /tdd where possible. Typecheck and run the relevant test file(s) regularly; run the full test suite once, at the end.

Follow the project's own conventions as you go: read CLAUDE.md / code-conventions.md if present. Load the `comment-guidelines` and `test-guidelines` skills, plus every other skill those documents point to (a line like "this project follows the `X` skill" names one) — before writing any code, not just at the point of citing it: a pointer that's only referenced and never actually loaded doesn't get applied.

Once everything is green, dispatch a fresh subagent to review the full diff. Brief it with the original instructions (it has no memory of this conversation). It runs `deep-review` against the diff and fixes everything that review finds itself — rerunning tests as needed — rather than only reporting. Once that's done, the same subagent runs `conventions-check` against the diff (no task-instructions context needed for this part) and fixes what it finds there too, the same way. Anything either pass finds that can't be safely fixed is stated plainly in its final report back, rather than silently dropped or left to block the commit.

Commit the result to the current branch, once.
