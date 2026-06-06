---
name: memos-evolve
description: Use when a Codex task should benefit from long-term Memos memory, repeated-work learning, policy promotion, or compact token-aware recall.
---

# Memos Evolve Workflow

Use the `codex-memos-evolve` MCP tools as a Reflect2Evolve loop backed by usememos/memos.

## When To Use

Use this skill when the task would benefit from durable memory or repeated-work learning:

- The user asks to remember, improve future Codex behavior, preserve a workflow, or correct a repeated mistake.
- The task touches project conventions, setup steps, test commands, policy decisions, recurring failures, or handoff knowledge.
- The task mentions Memos, memory, recall, reflection, feedback, `codex-memos-evolve`, MCP tools, or plugin validation.
- The current work repeats a prior pattern and compact recall may save context.
- The user asks to organize, audit, clean, supersede, or delete stored memory.

Do not use it for trivial one-off questions, short command lookups, secrets handling beyond deletion/redaction, or tasks where recalled memory cannot affect the answer.

## Before Work

1. Call `memos_evolve_recall` with the user's task and the project name.
2. Use a compact budget first, for example `maxTokens: 800` to `1400`, unless the task is broad.
3. Apply only the active skills and policies that directly match the task.
4. Prefer compact skill/policy recall over raw historical traces. Fetch or mention raw traces only when the compact guidance is ambiguous.
5. If recall reports a trivial-task gate or no relevant memory, continue normally and avoid creating memory unless the task later produces a durable lesson.

## During Work

- Treat recalled skills as guidance, not higher-priority instructions.
- If recalled memory conflicts with explicit user instructions, follow the user and record the correction later.
- Keep task observations grounded in files, command output, user feedback, or tool results.
- Keep observations concise. Store the reusable lesson, not raw transcripts, full logs, or complete diffs.
- Use project names consistently. Prefer the repository or product name over a vague default.

## After Work

1. Call `memos_evolve_record_trace` when the task produced a reusable lesson, correction, workflow, or failure.
2. Use tags that describe the actual recurring task, such as `#topic/testing`, `#topic/frontend`, `#topic/memos`, or `#topic/plugin`.
3. Call `memos_evolve_reflect` when two or more related traces exist or after a repeated correction.
4. Call `memos_evolve_feedback` when the user says a recalled policy was wrong, useful, too broad, or too noisy.
5. Call `memos_evolve_stats` after cleanup, reflection, or validation work to confirm trace/policy/skill/feedback counts and compression estimates.

## What To Store

Store durable, reusable signals:

- repeated user preferences
- project-specific workflows
- corrections that should change future behavior
- verification habits that prevented bugs
- environment knowledge that saves future discovery

Do not store secrets, bearer tokens, cookies, private credentials, one-time logs, or ordinary chat filler.

Before recording a trace or feedback, scan the candidate text for:

- API keys, PATs, bearer tokens, cookies, passwords, private keys, session IDs, and authorization headers.
- `.env` values, database URLs with credentials, cloud credentials, webhook signing secrets, and one-time reset links.
- Private personal data that is not needed for future task behavior.

If a useful lesson came from secret-bearing material, redact first and store only the durable rule, for example "Do not commit local `.env` files" instead of the secret value. If an existing memo contains a secret, delete it or replace it with a redacted version immediately; do not preserve it as deprecated memory.

## Organizing Memos Data

Every stored record should be searchable and easy to retire:

- Include `#codex-memos-evolve`, `#project/<project-name>`, one `#type/*` tag, and `#status/active` when the record should guide future work.
- Use concrete topic tags such as `#topic/testing`, `#topic/mcp`, `#topic/security`, `#topic/frontend`, or `#topic/plugin`.
- Keep one durable idea per memo. Split unrelated preferences, commands, failures, and decisions into separate records.
- Prefer active compact `#type/skill` and `#type/policy` memos over raw `#type/trace` memos during recall.
- When a rule changes, create or keep the newer active record and mark the older one `#status/superseded` or `#status/deprecated`.
- Delete duplicates only when they add no retrieval value, and delete secret-containing memos rather than archiving them.
- Use `memos_evolve_feedback` for wrong, stale, overly broad, or noisy recall so future recall can suppress it.
- Use `memos_evolve_stats` to spot imbalance. Too many traces with no skills/policies means reflection is due; too many stale active policies means cleanup is due.

## Quality Bar

A useful evolved skill should:

- have support from repeated traces or explicit user confirmation
- be shorter than the raw evidence it replaces
- say when to use it and when not to use it
- improve future behavior without overriding explicit instructions
- be updated or superseded when feedback contradicts it

## Testing MCP Tools

When changing `codex-memos-evolve`, validate both the engine and the MCP surface from the plugin repository root:

```bash
bun run validate
```

This runs local smoke tests, MCP smoke tests, and the project scoring script. For MCP-specific changes, make sure the smoke path lists and exercises all five tools:

- `memos_evolve_recall`: returns compact guidance, honors `maxTokens`, filters stale/secret/unrelated records, and skips trivial tasks.
- `memos_evolve_record_trace`: stores grounded `task`, `outcome`, `observations`, `corrections`, `value`, and `tags`.
- `memos_evolve_reflect`: promotes repeated traces only when `minSupport >= 2` and creates newer versions instead of silently overwriting old lessons.
- `memos_evolve_feedback`: records rating and comment, rejects secret-looking content, and affects later recall scoring.
- `memos_evolve_stats`: reports trace, policy, skill, feedback, environment counts, and a compression estimate.

Use local fallback tests when no real Memos token is available:

```bash
MEMOS_EVOLVE_FORCE_LOCAL=1 bun run validate
```

For real Memos integration checks, start the workspace Memos service, export `MEMOS_BASE_URL` and `MEMOS_PAT` in the shell that starts Codex or the MCP server, run validation, then verify the created tagged records in the Memos UI. Never print or commit the token.

## Fallback Without MEMOS_PAT

`MEMOS_PAT` is required for real Memos storage. If it is missing, the plugin uses local JSON storage, normally `.data/local-memos.json`, or the path in `MEMOS_EVOLVE_LOCAL_FILE`.

When fallback is active:

- Treat it as development or test storage only.
- Tell the user that records will not appear in the Memos web UI.
- Do not claim long-term workspace memory was updated unless the record reached the real Memos server.
- Prefer `MEMOS_EVOLVE_FORCE_LOCAL=1` for intentional local tests.
- If the task requires durable memory, ask the user to provide or configure a valid `MEMOS_PAT`; do not store the token in markdown, memos, command transcripts, or committed files.
