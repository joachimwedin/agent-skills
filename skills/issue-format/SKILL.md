---
name: issue-format
description: What an issue looks like in any tracker: title, Why, Do, Done when checklist and dependencies. Use as the reference when judging, shaping or splitting issues.
---

An issue is complete when a reader who was not in the conversation can pick it up and tell when it is finished.

## Parts

**Title.** An imperative verb phrase that states the task, short enough to scan in a list. Details are in the body.

**Why.** Two or three sentences on the problem or risk and why it matters now. Only context the reader needs.

**Do.** The task. Several actions form a numbered list.

**Done when.** A checklist with one checkbox per outcome. Each outcome can be observed by someone else and can fail. It covers the failure case as well as the happy case, and describes the result, not how it is built. A single outcome can be one sentence.

**Blocked by / Blocks.** Issues it depends on or holds up, by identifier. Absent when there are none.

**Optional, present only when they apply:**
- *Not included*: what is out of scope.
- *If it fails*: what happens when the outcome is missed.
- *Checkpoint*: a date, and what is cut if it slips.

## Properties

- It has one outcome. If the Do needs "and then", or there are separate outcomes, it is a parent with sub-issues, each with one owner.
- It is a task. A plan, question or reference lives in a document and is linked.
- Long tables and findings are linked, not pasted into the description.
- It carries no effort estimate. Work is ordered by risk and given dates.
- Source material is quoted and linked, not summarised.
- Other issues are named by identifier, never "the previous one".
- It is not phrased as a user story unless one is asked for.
- Every line changes what the reader does. Lines that do not are absent.

## Existing issues

Reshaping keeps every fact and date. Items that are already true are checked. Overlap between issues, missing dependencies and issues that are really projects are reported, not silently fixed.
