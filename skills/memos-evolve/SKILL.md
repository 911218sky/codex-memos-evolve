---
name: memos-evolve
description: Proactively use the codex-memos-evolve MCP memory tools for non-trivial Codex work, repeated workflows, project conventions, MCP/plugin questions, memory recall, reflection, or durable lessons.
---

# Memos Evolve Workflow

Use the `codex-memos-evolve` MCP tools as a small memory loop:

```text
recall -> write -> search when needed -> maintain -> reuse
```

## Default Behavior

For any non-trivial Codex task, start with `memos_evolve_recall` when the tool is available.

This includes code changes, code review, debugging, documentation work, plugin work, MCP work, subagent coordination, project setup, repeated workflows, or anything where prior project memory could affect the answer.

Skip recall only when the task is clearly trivial, such as a simple greeting, a one-command lookup, or a request where memory cannot change the result.

If `memos_evolve_recall` is unavailable, continue normally and mention the missing tool only when it matters to the task.

## Use This Skill When

- The user asks Codex to remember, learn, improve, or preserve a workflow.
- The task involves code edits, code review, documentation edits, project conventions, setup steps, recurring failures, or repeated corrections.
- The task mentions Memos, memory, recall, reflection, feedback, MCP tools, plugins, subagents, or this plugin.
- Prior compact memory could change the answer or save context.

Skip it for trivial one-off questions, quick command lookups, and tasks where memory cannot affect the work.

## Before Work

At the beginning of applicable work, call:

```text
memos_evolve_recall
```

Use:

- `project`: repository or product name, such as `codex-memos-evolve`
- `task`: current user request and the immediate work you are about to do
- `maxTokens`: usually `800` to `1400`

Apply recalled memory only when it directly matches the task. User instructions and system rules always outrank memory.

When delegating to subagents, include a short instruction in the delegated prompt: "If the `memos_evolve_recall` tool is available, call it before non-trivial work and report whether it was used." This makes the expected memory behavior observable.

## After Useful Work

Write memory when the task produced a reusable lesson or active project state:

```text
memos_evolve_write
```

Use:

- `recordType: "work"` for active goals, plans, and next steps
- `recordType: "decision"` for durable choices and why
- `recordType: "trace"` for grounded evidence
- `recordType: "feedback"` for useful, wrong, stale, broad, or noisy memory
- `memory: "short"` and `ttlDays` for temporary task state
- `memory: "long"` for durable lessons

Use maintenance when memory is growing, temporary notes are no longer useful, or a task asks for memory hygiene:

```text
memos_evolve_maintain
```

Use `action: "setup"` once per project to create Memos shortcuts for active work, decisions, and policies.

Start cleanup with `apply: false` to preview candidates. Use `apply: true` when the proposed expired or low-value traces are safe to mark `#status/expired`.

Use targeted search when recall is too compact and you need to pull specific records without widening the default recall context:

```text
memos_evolve_search
```

Prefer:

- `detail: "index"` for a compact hit list
- `detail: "full"` only after filtering down to a few relevant memos

## What To Store

Store reusable signals:

- repeated user preferences
- project-specific workflows
- corrections that should change future behavior
- environment knowledge that saves rediscovery
- verification habits that prevented bugs

Store short-lived signals only when they help the current project but should fade, such as temporary branch state, one-off debugging facts, or setup details that will expire. Mark them `memory: "short"` with a small `ttlDays`.

Do not store secrets, bearer tokens, cookies, API keys, private credentials, full logs, raw transcripts, or one-time details.

If useful evidence contains a secret, redact it and store only the rule. Example: store "Do not commit local `.env` files", not the `.env` value.

## Tags

Use clear tags:

```text
#codex-memos-evolve
#project/<project-name>
#type/work
#type/decision
#type/trace
#type/policy
#type/skill
#type/feedback
#type/maintenance
#topic/testing
#topic/mcp
#topic/security
#status/active
#status/expired
#memory/short
#ttl/<days>
```

Keep one durable idea per memo. Mark old guidance as `#status/superseded` or `#status/deprecated` when a newer rule replaces it.

## Validation

When changing this plugin, run from the repository root:

```bash
npm run validate
```

For local tests without a real Memos token:

```bash
MEMOS_EVOLVE_FORCE_LOCAL=1 npm run validate
```

Normal storage requires `MEMOS_PAT`. Local mode writes JSON records only; it does not update the Memos web UI.

If the MCP tools are missing in Codex, follow `docs/codex-install.md#6-if-mcp-startup-is-incomplete`.
