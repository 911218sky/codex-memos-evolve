# Memory Maintenance

Use maintenance when Memos has accumulated temporary task traces, old failed attempts, or repeated traces that should become compact policies and skills.

## Short Memory

When writing a temporary trace, use:

```json
{
  "memory": "short",
  "ttlDays": 1
}
```

Use short memory for temporary branch state, one-off debugging context, or setup details that help the current task but should not shape future work for long.

Use long memory for durable lessons:

```json
{
  "memory": "long"
}
```

## Maintenance Tool

Preview first:

```json
{
  "project": "codex-memos-evolve",
  "apply": false
}
```

Apply when the preview looks right:

```json
{
  "project": "codex-memos-evolve",
  "apply": true,
  "maxTraceAgeDays": 30,
  "minTraceValue": -3,
  "shortMemoryTtlDays": 1,
  "minSupport": 2
}
```

Apply mode marks expired or old low-value traces with `#status/expired`, runs reflection, and writes a `#type/maintenance` summary. Recall excludes expired records.

`action: "setup"` creates Memos shortcuts for:

- Active Work
- Decisions
- Policies

If a short trace has `#expires/<yyyy-mm-dd>`, maintenance honors that per-record date. `shortMemoryTtlDays` is a fallback for older short traces that have `#memory/short` but no `#expires` tag.

`expiring_tokens_estimate` reports the size of traces that maintenance would remove from active recall. In dry-run mode, `estimated_tokens_saved` is omitted because apply mode can also create policies, skills, and a maintenance summary. In apply mode, `estimated_tokens_saved` is the net active-memory estimate after those writes, so it can be `0` when maintenance also creates useful compact memories.

## Suggested Cadence

- Per task: record durable lessons as long memory and temporary state as short memory.
- Per task: use `recordType: "work"` for live execution state and `recordType: "decision"` for durable choices.
- Daily: preview maintenance with `apply: false`.
- Weekly or after large projects: apply maintenance after checking candidates.
- Before handoff: inspect the maintenance result for token savings and promotion counts.

The plugin does not currently install an automatic Codex runtime hook. Scheduling should be done by the user, Codex project instructions, or an external job that calls the MCP tool.
