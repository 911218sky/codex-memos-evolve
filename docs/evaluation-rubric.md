# Evaluation Rubric

This page is for judging the prototype, not for setup.

The rubric checks one question: does the plugin make repeated Codex work easier while using less context?

## Score

| Area | Points | Passing evidence |
| --- | ---: | --- |
| Memos integration | 15 | Reads and writes through `MEMOS_BASE_URL` and `MEMOS_PAT`. |
| Trace quality | 15 | Stores task, outcome, observations, corrections, value, project, and tags. |
| Policy promotion | 20 | Repeated traces create policy memos with support counts. |
| Skill creation | 20 | Stable lessons create compact skill memos with workflow and version. |
| Token saving | 15 | Recall is budgeted and smaller than raw matching memory. |
| Feedback | 10 | Useful, wrong, stale, broad, or noisy memory can be rated. |
| Safety | 5 | Secrets are rejected or suppressed; user instructions outrank memory. |

## Passing Bar

| Score | Meaning |
| ---: | --- |
| 85+ | Credible first implementation. |
| 70-84 | Useful memory store, but evolution is still limited. |
| Below 70 | Mostly manual memory or documentation. |

## Local Evidence

Run:

```bash
bun run validate
```

The validation should show:

- smoke tests pass
- MCP smoke tests pass
- score script passes
- all five MCP tools are available

## Token-Saving Checks

A good run should prove that:

- compact recall is at least 50% smaller than naive matching memory on seeded data
- active project facts are kept
- stale, superseded, secret-looking, and unrelated records are suppressed
- repeated traces promote at least one policy or skill
- token estimates and selected candidate counts are reported

## Still Missing

These gaps are expected for the prototype:

- no automatic Codex lifecycle hooks yet
- no embedding or LLM clustering
- no generated skill installation into real Codex skill folders
- no long-history stress test with hundreds of traces
- no dedicated dashboard beyond the Memos UI
