# Proactive Use

Use this guide when you want Codex agents and subagents to use Memos Evolve without being reminded every turn.

## What The Plugin Can Control

The plugin can provide:

- MCP tools
- skill instructions
- plugin default prompts
- documentation snippets for project instructions

The plugin cannot force the Codex runtime or every subagent to call a tool. Tool use still depends on the active Codex surface, available MCP tools, and the model's decision.

## Recommended Project Instruction

This repository includes an `AGENTS.md` file with the proactive memory rule. For other repositories, add this snippet to the workspace `AGENTS.md` or another instruction file that new Codex threads and subagents inherit:

```text
For non-trivial work, proactively use the Codex Memos Evolve memory loop when available:

1. Before code changes, debugging, reviews, docs, plugin/MCP work, subagent coordination, or repeated workflows, call `memos_evolve_recall` with:
   - `project`: the repository or product name
   - `task`: the user request and immediate work plan
   - `maxTokens`: 800-1400
2. Apply recalled memory only when it directly matches the task. User and system instructions outrank memory.
3. After useful reusable work, call `memos_evolve_record_trace` with short durable lessons. Do not store secrets.
4. Subagents must also follow this rule when the tools are available. If delegating, require each subagent to report whether it used any `memos_evolve_*` tool.
5. If the tools are unavailable, continue normally and report that the memory tools were not exposed in that session.
```

## Subagent Prompt Pattern

When spawning a subagent, include:

```text
If the `memos_evolve_recall` tool is available, call it before this non-trivial work. In your final answer, report whether you used any `memos_evolve_*` tools and list the tools you actually used.
```

This makes proactive memory use measurable. Without this prompt or an inherited `AGENTS.md`, current Codex subagents may complete explorer tasks with shell tools only.

## Current Runtime Boundary

If a subagent says `memos_evolve_recall` is not exposed, the plugin instructions are loaded but that subagent session did not receive the MCP tool. In that case, the correct behavior is to continue the task and report that the memory tools were unavailable.

## Verification Loop

After changing the plugin:

```bash
bun run validate
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" "$PWD"
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py" "$PWD"
codex plugin add codex-memos-evolve@sky-tools
```

Then open a new Codex thread and test with:

```text
For this non-trivial plugin task, use the normal memory workflow if available. Report whether `memos_evolve_recall` was called.
```
