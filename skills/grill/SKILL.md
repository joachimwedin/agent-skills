---
name: grill
description: Grill the user relentlessly about a plan, decision or idea, then write the result as a spec. Use when the user wants to stress-test their thinking, plan a feature, or uses any 'grill' trigger phrase.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round as plain-text numbered questions, most-unblocking first. Do not use `AskUserQuestion`. Wait for the user's answers before the next round.

## Each question

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

- Ask neutrally. Where there are choices, offer 2-4 distinct options in the body.
- Give the recommended answer after ➡️, with the reason and what a wrong choice costs.
- Give a recommendation only where a real convention or evidence backs it; otherwise lay out the options and write `➡️ No recommendation` with the deciding trade-off.
- Word each question so "yes" accepts your recommended answer.

## Each round

Each answer reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question open in this round belongs to a _later_ round.

When the user accepts a recommendation without comment, ask one follow-up that tests it. Record it as an assumption, not a decision.

## Facts

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, the web), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

## Done

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed.

1. Summarize the settled tree and the assumptions, and ask the user in plain text to confirm you have reached a shared understanding. Do not act before they confirm.
2. After the user confirms, use the `to-spec` skill to write the spec.
