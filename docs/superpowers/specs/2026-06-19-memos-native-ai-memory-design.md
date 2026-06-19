# Memos-Native AI Memory Design

## Goal

Redesign `codex-memos-evolve` so it helps AI agents answer three questions quickly:

1. What matters now?
2. What is already decided?
3. What should happen next?

The redesign should reuse native Memos capabilities where possible instead of rebuilding a second task system inside the plugin.

## Problem

The current plugin stores high-quality traces, but too many of them. In practice this makes memory behave like an event log. That is useful for auditability, but not ideal for recall.

The current recall flow is strongest when it returns compact, current, decision-level memory. It is weakest when it surfaces many fragmented task traces that each capture one small step.

## Design Principles

1. Keep one storage system: tagged Markdown memos in Memos.
2. Reuse native Memos features before adding plugin-specific abstractions.
3. Separate record validity from work progress.
4. Prefer durable summaries over fragmented traces.
5. Keep the MCP surface small.
6. Preserve backward compatibility for existing traces when reasonable.

## Native Memos Features To Reuse

The plugin should lean on these Memos capabilities:

- Markdown task lists for plans and checklists.
- `pinned` for high-priority active work.
- `ARCHIVED` memo state for completed but still useful high-level records.
- `relations` to connect high-level work and decisions to supporting traces.
- `shortcuts` for stable project views such as active work and recent decisions.

The plugin should not recreate these features with parallel internal schemas unless there is a clear gap.

## Memory Layers

### Work Memo

Primary unit for active or planned work. This is the first thing recall should surface.

Use cases:

- ongoing feature work
- debugging threads
- experiment campaigns
- release checklists
- handoff notes

Required tags:

- `#codex-memos-evolve`
- `#type/work`
- `#project/<name>`
- one validity tag: `#status/active|superseded|expired`
- one progress tag: `#state/planned|in_progress|blocked|done|cancelled`

Recommended body:

```md
## Summary
One-line summary

## Goal
What this work item is trying to achieve

## Plan
- [ ] step
- [x] step

## Next
Immediate next step

## Outcome
Current result or final outcome

## Evidence
- supporting note
```

### Decision Memo

Primary unit for durable conclusions. This is the second thing recall should surface.

Use cases:

- rejected approaches
- preferred workflows
- environment constraints
- project-specific rules

Required tags:

- `#codex-memos-evolve`
- `#type/decision`
- `#project/<name>`
- one validity tag

Optional progress tag:

- `#state/done` for settled decisions

Recommended body:

```md
## Decision
What was decided

## Why
Why this is the current choice

## Consequences
What this changes going forward

## Evidence
- trace, metric, or file reference
```

### Trace Memo

Supporting evidence only. Traces still exist, but should no longer dominate recall.

Use cases:

- a finished debugging step
- a concrete experiment result
- a one-off verification outcome

Required tags stay compatible with the current plugin:

- `#type/trace`
- `#status/active|superseded|expired`
- `#project/<name>`

Optional progress tag is allowed but not required.

Recommended body becomes shorter and more evidence-oriented.

### Policy And Skill Memo

Remain as the compact distilled layer. Reflection still promotes repeated evidence into policies and skills.

## Tag Model

### Validity Axis

Keep the current meaning:

- `#status/active`
- `#status/superseded`
- `#status/expired`

These tags answer: should this record still be considered valid memory?

### Progress Axis

Add a second tag family:

- `#state/planned`
- `#state/in_progress`
- `#state/blocked`
- `#state/done`
- `#state/cancelled`

These tags answer: what stage is the work in?

This avoids overloading `#status/*` and preserves current maintenance behavior.

## Recall Strategy

Recall should stop treating traces as the default unit.

New ranking order:

1. pinned active work memos
2. active work memos with incomplete task lists
3. active decision memos
4. active policy and skill memos
5. a small number of recent traces as evidence

Recall output should explicitly separate:

- Active Work
- Decisions
- Policies
- Recent Evidence

Recall should prefer fewer, higher-level records over many small traces.

## Maintenance Strategy

Maintenance should distinguish between high-level records and low-level evidence.

- `trace` records remain the main candidates for expiration.
- `work` records in `#state/done` should usually be archived rather than expired.
- `decision` records should usually stay active until superseded.
- `policy` and `skill` keep existing supersede behavior.

Dry-run maintenance should report:

- trace expiry candidates
- completed work archive candidates
- promotion candidates

## Shortcut Strategy

The plugin should create a small fixed set of useful shortcuts. No general shortcut management UI is needed.

Initial shortcuts:

1. `Active Work`
2. `Recent Decisions`
3. `Codex Memory Inbox`

These should be created per user when explicitly requested through a setup/bootstrap tool or install step.

## MCP Tool Strategy

Expose only three MCP tools. Keep behavior richer, but keep the visible surface smaller.

### `memos_evolve_recall`

Read memory for the current task. Recall should prioritize active work, decisions, policies, and a small amount of evidence.

### `memos_evolve_write`

Generic write entry point with a `recordType` field:

- `trace`
- `work`
- `decision`

It should support:

- `state`
- `summary`
- `goal`
- `plan`
- `next`
- `why`
- `consequences`
- `pinned`
- relation targets when supported

The plugin should not expose separate `record_trace`, `feedback`, or `reflect` tools. Those become write or maintenance operations.

### `memos_evolve_maintain`

Single maintenance entry point. It should support:

- cleanup preview/apply
- optional reflection/promotion
- optional stats output
- optional project bootstrap of fixed shortcuts

This keeps operational features available without multiplying tools.

## What The Plugin Should Not Do

- It should not become a full project-management system.
- It should not create a second custom task database.
- It should not require many new tools for ordinary use.
- It should not replace Memos-native task lists with a parallel plan syntax.
- It should not surface all traces during normal recall.

## Success Criteria

The redesign is successful when:

1. AI recall mostly returns current work and decisions instead of fragmented traces.
2. The plugin can record planned, in-progress, blocked, and done work without abusing `#status/*`.
3. High-level memos use native Memos task lists and pinning.
4. Maintenance treats completed work differently from expired trace evidence.
5. Project shortcuts can be bootstrapped automatically.
6. Existing tests are updated and new behavior is covered.
7. The plugin still validates, runs locally, and can be installed into the local Codex marketplace.
