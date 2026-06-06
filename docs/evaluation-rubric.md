# Evaluation Rubric

This rubric scores whether the plugin is moving toward the X-post goal: a memory system that becomes more useful with repeated use while saving context tokens.

## Score Areas

| Area | Points | Evidence |
| --- | ---: | --- |
| Memos integration | 15 | Uses the original usememos/memos API for create/search and can run against `MEMOS_BASE_URL` + `MEMOS_PAT`. |
| Trace grounding | 15 | Stores task, outcome, observations, corrections, value, date, project, and topic tags. |
| Policy induction | 20 | Promotes repeated traces into explicit policy memos with support counts and evidence. |
| Skill crystallization | 20 | Creates reusable skill memos with trigger, workflow, version, support, and token rule. |
| Token saving | 15 | Recall returns a compact budgeted brief and reports raw-vs-compact token estimates. |
| Feedback loop | 10 | User or agent feedback can be recorded and considered by future reflection. |
| Safety and control | 5 | Secrets are excluded and explicit user instructions outrank memory. |

## Subagent Review Notes

Two independent review agents evaluated the design target before validation. Their stricter criteria are incorporated here:

- The plugin must not be a raw chat dump. It needs a visible chain from trace to policy to skill.
- Token saving must be measured against a naive baseline and enforced with a hard recall budget.
- Stale and superseded memories must be demoted or suppressed.
- Secrets must not be stored or surfaced.
- A credible "越用越好用" claim requires replayable evidence that repeated tasks create better compact guidance.

## Reflect2Evolve Compatibility Checklist

| Layer | Required Local Evidence |
| --- | --- |
| L1 trace | `memos_evolve_record_trace` stores task, outcome, observations, corrections, value, project, tags, and date. |
| L2 policy | `memos_evolve_reflect` requires repeated support and creates `#type/policy` memos with evidence. |
| Skill | Reflection creates `#type/skill` memos with trigger, workflow, support, version, and token rule. |
| Retrieval | `memos_evolve_recall` ranks compact skills/policies before traces and enforces `maxTokens`. |
| Feedback | `memos_evolve_feedback` records target, rating, and comment for future reflection. |
| Observability | `memos_evolve_stats` reports counts and compression estimates. |

## Token-Saving Rubric

Score out of 10:

- 2 points: compact recall is at least 50% smaller than naive matching memory on seeded data.
- 2 points: recall keeps required active facts for a matching project.
- 1.5 points: stale, superseded, secret-contaminated, and unrelated memos are suppressed.
- 1 point: repeated traces promote a newer policy or skill.
- 1 point: tests run without external LLM calls or production memory.
- 1 point: token estimates and selected candidate counts are reported.
- 1 point: plugin manifest, MCP config, and skill files validate.
- 0.5 points: install instructions are complete.

## Local Passing Bar

- 85+ means the project has a credible first implementation.
- 70-84 means it is a memory store with some evolution, but not yet close to the X-post behavior.
- Below 70 means it is mostly manual memory or documentation.

## What Would Make It Truly Better Over Time

- Skills are used more often than raw traces for repeated tasks.
- New feedback creates a newer policy or skill version instead of silently accumulating stale rules.
- Bad memories are superseded or demoted, not merely buried.
- Recall size stays bounded as trace count grows.
- The agent can explain which policy or skill affected a decision.

## Smoke Tests

1. Record two traces with the same topic and correction.
2. Run reflection with `minSupport=2`.
3. Confirm one or more policy and skill memos are created.
4. Run recall for a related task.
5. Confirm recall contains compact skill or policy guidance and stays within the token budget.
6. Confirm stats show traces, policies, skills, and compression ratio.
