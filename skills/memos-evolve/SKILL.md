---
name: memos-evolve
description: Use when a Codex task may benefit from long-term Memos memory, repeated-work learning, or compact recall.
---

# Memos Evolve Workflow

Use the `codex-memos-evolve` MCP tools as a small memory loop:

```text
recall -> work -> record trace -> reflect -> reuse
```

## Use This Skill When

- The user asks Codex to remember, learn, improve, or preserve a workflow.
- The task involves project conventions, setup steps, recurring failures, or repeated corrections.
- The task mentions Memos, memory, recall, reflection, feedback, MCP tools, or this plugin.
- Prior compact memory could change the answer or save context.

Skip it for trivial one-off questions, quick command lookups, and tasks where memory cannot affect the work.

## Before Work

Call:

```text
memos_evolve_recall
```

Use:

- `project`: repository or product name
- `task`: current user request
- `maxTokens`: usually `800` to `1400`

Apply recalled memory only when it directly matches the task. User instructions and system rules always outrank memory.

## After Useful Work

Record a trace when the task produced a reusable lesson:

```text
memos_evolve_record_trace
```

Store short, grounded facts:

- task
- outcome
- observations
- corrections
- value
- topic tags

Then run reflection when two or more related traces exist:

```text
memos_evolve_reflect
```

Use feedback when a memory was useful, wrong, stale, broad, or noisy:

```text
memos_evolve_feedback
```

Use stats after cleanup or validation:

```text
memos_evolve_stats
```

## What To Store

Store reusable signals:

- repeated user preferences
- project-specific workflows
- corrections that should change future behavior
- environment knowledge that saves rediscovery
- verification habits that prevented bugs

Do not store secrets, bearer tokens, cookies, API keys, private credentials, full logs, raw transcripts, or one-time details.

If useful evidence contains a secret, redact it and store only the rule. Example: store "Do not commit local `.env` files", not the `.env` value.

## Tags

Use clear tags:

```text
#codex-memos-evolve
#project/<project-name>
#type/trace
#type/policy
#type/skill
#type/feedback
#topic/testing
#topic/mcp
#topic/security
#status/active
```

Keep one durable idea per memo. Mark old guidance as `#status/superseded` or `#status/deprecated` when a newer rule replaces it.

## Validation

When changing this plugin, run from the repository root:

```bash
bun run validate
```

For local tests without a real Memos token:

```bash
MEMOS_EVOLVE_FORCE_LOCAL=1 bun run validate
```

Normal storage requires `MEMOS_PAT`. Local mode writes JSON records only; it does not update the Memos web UI.

If the MCP tools are missing in Codex, follow `docs/codex-install.md#5-if-mcp-startup-is-incomplete`.
