# Subagent Review

This file records independent review feedback and what changed afterward.

## First Review

Two subagents reviewed the first working implementation.

| Question | Score | Summary |
| --- | ---: | --- |
| Is it close to Reflect2Evolve? | 6.6/10 | It has trace -> policy -> skill behavior, but promotion is still simple. |
| Is token saving credible? | 7/10 | Recall is compact and tested, but ranking is heuristic. |

## Main Issues Found

- Feedback was recorded but not used enough.
- Old versions could compete with newer versions.
- Recall relevance was basic.
- Secret prevention needed to happen before storage too.
- Generated skills were Memos records, not installed Codex skills.
- Lifecycle calls were manual, not automatic.

## Fixes Already Made

- Feedback now affects recall scoring.
- Negative feedback can suppress recall targets.
- Recall keeps the latest version per skill slug.
- Secret-looking traces and feedback are rejected before storage.
- Secret-looking recall candidates are suppressed.
- Smoke tests check compact recall savings.
- MCP smoke tests cover the trivial-task gate.

## Remaining Gaps

- No L3 world-model memory.
- No in-place Memos archive or supersede operation yet.
- No automatic installation of generated skill files.
- No long-history stress test.
- No live authenticated Memos test in CI.

## Current Readability Review

After the documentation refresh, subagents should check:

- Can a new user explain what the plugin does in one minute?
- Can an installer find the exact `.env`, validate, and Codex refresh steps?
- Is the architecture understandable from the image plus short tables?
- Are troubleshooting steps direct enough for `MCP startup incomplete`?

## 2026-06-06 Readability Review

Two subagents simulated human readers after the docs were simplified.

| Reader | Result | Follow-up added |
| --- | --- | --- |
| New Codex user | README explains the plugin in about one minute. | Added bridge text for MemOS, `sky-tools`, MCP tool usage, and policy-vs-skill examples. |
| Plugin installer | Install docs are scannable, but MCP startup troubleshooting needed clearer decisions. | Added smoke-test result tables, plugin-root checks, and missing-tool pointers. |
