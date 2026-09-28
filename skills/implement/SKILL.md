---
name: implement
description: "Implement a piece of work described in the prompt, with a review pass and code conventions built in."
disable-model-invocation: true
---

Implement the work described in the prompt.

Use /tdd where possible. Typecheck and run the relevant test file(s) regularly; run the full test suite once, at the end.

Follow the project's own conventions as you go (CLAUDE.md / code-conventions.md if present, plus the `comment-guidelines` and `test-guidelines` skills).

Once everything is green, dispatch a fresh subagent to review the full diff. Brief it with the original instructions (it has no memory of this conversation) and point it at the same conventions above. It fixes anything wrong or missing itself — rerunning tests as needed — rather than only reporting; it reports back once the diff is actually correct and conventions-compliant, not before.

Commit the result to the current branch, once.
