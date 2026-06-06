# Subagent Review

Two independent subagents reviewed the project after the first working implementation.

## Reflect2Evolve Closeness

Score: **6.6/10**

Summary:

- The project is a working trace -> policy -> skill prototype, not merely a Memos client.
- MCP tools, Memos-backed persistence, compact recall, local fallback, smoke tests, and Codex skill workflow are present.

Top gaps reported:

- Feedback was recorded but not used.
- Policy induction was shallow.
- Old versions could remain active and compete.
- L3/world-model memory was mostly absent.
- Generated skills were memo records, not installed Codex skills.
- Lifecycle invocation was manual.
- Observability was basic.

Follow-up fixes already made after this review:

- Feedback ratings now affect policy/skill recall.
- Negative feedback can suppress a target from recall.
- Recall keeps only the latest version per skill slug.
- Secret-looking trace/feedback content is rejected before storage.
- Trivial tasks can skip recall.

Remaining major gaps:

- L3 world-model generation is still not implemented.
- Old versions are not patched or archived inside Memos; latest-version recall suppresses older versions at retrieval time.
- Generated skill memos are not written as installed Codex skill files.
- Lifecycle is still skill-guided, not automatic hooks.

## Token-Saving Credibility

Score: **7/10**

Summary:

- The project has capped recall, raw-vs-compact token estimates, local replay tests, Memos API support, MCP smoke coverage, stale/project/secret suppression, and validation wiring.

Top gaps reported:

- Recall relevance was weak.
- Feedback was recorded but not used.
- Old versions stayed active.
- Token saving was estimated but not enforced by a minimum savings test.
- Memos search could be brittle.
- No trivial-task retrieval gate existed.
- Secret prevention was recall-side only.

Follow-up fixes already made after this review:

- Recall now includes feedback-aware scoring.
- Recall now prefers task-relevant skill slugs and higher support/version.
- Smoke tests now assert at least 50% compact-recall savings over naive candidates.
- MCP smoke tests cover the trivial-task gate.
- Secret-looking traces and feedback are rejected before storage.

Remaining major gaps:

- Ranking is still heuristic rather than embedding or LLM based.
- There is no long-history 100-500 trace stress test yet.
- Real usememos/memos API integration is implemented but not tested against a live authenticated server in CI.
- Feedback affects recall, but it does not yet trigger in-place Memos updates, archive operations, or full policy rewrites.
