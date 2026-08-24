---
name: handoff
description: Compact the current conversation into a handoff document for the next agent to pick up.
argument-hint: "What will the next agent focus on?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so the next agent can continue the work.

1. If the user passed arguments, treat them as a description of what the next agent will focus on and tailor the doc accordingly.
2. Capture the goal, what's been done, the current state, next steps, and any open questions or blockers. Reference the key files/paths and commands the next agent will need.
3. Reference content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs) by path or URL, rather than duplicating it in the handoff document.
4. Redact any sensitive information, such as API keys, passwords, or personally identifiable information.
5. Include a "suggested skills" section naming skills the next agent should invoke.
6. Save the document to the temporary directory of the user's OS — not the current workspace — and report its absolute path back to the user so they can hand it to the next agent.
