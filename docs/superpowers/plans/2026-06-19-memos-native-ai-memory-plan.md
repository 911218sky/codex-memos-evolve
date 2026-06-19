# Memos-Native AI Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `codex-memos-evolve` so AI recall prioritizes pinned work and decisions, supports progress states, reuses native Memos features, and collapses the exposed MCP surface to three tools.

**Architecture:** Keep one tagged-Markdown memory system and the current six-tool core. Extend the existing write path to support `work` and `decision` records, add one setup tool for shortcuts, and update recall and maintenance to treat traces as evidence rather than the primary memory unit.

**Tech Stack:** TypeScript, Node.js, MCP SDK, Memos REST API, local JSON smoke mode

## Global Constraints

- Keep tagged Markdown as the single storage format.
- Preserve `#status/active|superseded|expired` for validity only.
- Add a separate `#state/*` progress axis.
- Reuse native Memos task lists, `pinned`, `ARCHIVED`, `relations`, and `shortcuts`.
- Keep the MCP surface minimal; expose only three tools.
- Maintain local smoke coverage and MCP smoke coverage.

---

### Task 1: Add failing tests for work, decision, state, shortcut, and three-tool behavior

**Files:**
- Modify: `tests/smoke.ts`
- Modify: `tests/mcp-smoke.ts`

**Interfaces:**
- Consumes: existing `EvolveEngine`, MCP client tool calls
- Produces: failing tests that define the new behavior

- [ ] **Step 1: Add local-engine tests for work and decision records**

- [ ] **Step 2: Run smoke test and verify failure**

Run: `npm run smoke`
Expected: FAIL because the new record fields and behavior do not exist yet

- [ ] **Step 3: Add MCP smoke assertions for the three-tool interface and generic writer**

- [ ] **Step 4: Run MCP smoke and verify failure**

Run: `npm run mcp:smoke`
Expected: FAIL because the new tool and fields do not exist yet

### Task 2: Extend the type model and formatting layer

**Files:**
- Modify: `src/constants.ts`
- Modify: `src/types.ts`
- Modify: `src/format.ts`

**Interfaces:**
- Consumes: current tag constants and trace formatter
- Produces: typed support for `work`, `decision`, `state`, setup input, and new markdown formatters

- [ ] **Step 1: Add the failing type/formatter-driven tests implicitly covered by Task 1**

- [ ] **Step 2: Implement the smallest type additions**

- [ ] **Step 3: Implement formatters for work and decision memos plus shared state tags**

- [ ] **Step 4: Re-run smoke tests to move failures deeper into engine logic**

Run: `npm run smoke`
Expected: FAIL in engine behavior, not type parsing

### Task 3: Extend the Memos client for shortcuts and richer memo updates

**Files:**
- Modify: `src/memos-client.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: existing REST client
- Produces: list/create/update shortcut helpers and memo update support for pinned/state/archive fields when available

- [ ] **Step 1: Add client-side expectations from the failing tests**

- [ ] **Step 2: Implement minimal shortcut API helpers**

- [ ] **Step 3: Implement memo write/update support for pinned and archive-capable fields**

- [ ] **Step 4: Re-run smoke tests**

Run: `npm run smoke`
Expected: FAIL only in engine orchestration or recall behavior

### Task 4: Rework engine behavior around work, decisions, recall, and maintenance

**Files:**
- Modify: `src/evolver.ts`

**Interfaces:**
- Consumes: new type model, formatters, and client helpers
- Produces: generic record creation, new recall ranking, setup flow, and archive-aware maintenance

- [ ] **Step 1: Implement generic record writing through the existing record tool path**

- [ ] **Step 2: Implement recall ranking for pinned work, incomplete work, decisions, policies, then traces**

- [ ] **Step 3: Implement maintenance rules that archive done work and expire trace evidence**

- [ ] **Step 4: Implement setup/bootstrap logic for fixed shortcuts inside maintenance**

- [ ] **Step 5: Re-run local smoke tests**

Run: `npm run smoke`
Expected: PASS

### Task 5: Expose the simplified three-tool MCP contract

**Files:**
- Modify: `src/mcp-server.ts`

**Interfaces:**
- Consumes: `EvolveEngine` methods
- Produces: `memos_evolve_recall`, `memos_evolve_write`, and `memos_evolve_maintain`

- [ ] **Step 1: Replace the old write tool with `memos_evolve_write`**

- [ ] **Step 2: Fold stats, reflection, feedback, and setup operations into maintain/write inputs**

- [ ] **Step 3: Re-run MCP smoke**

Run: `npm run mcp:smoke`
Expected: PASS

### Task 6: Update score script and documentation

**Files:**
- Modify: `scripts/score-project.ts`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/install.md`
- Modify: `docs/proactive-use.md`
- Modify: `docs/evaluation-rubric.md`
- Modify: `skills/memos-evolve/SKILL.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: implemented behavior
- Produces: documentation and scoring aligned with the redesign

- [ ] **Step 1: Update score assertions for work/decision/state/setup behavior**

- [ ] **Step 2: Update docs to explain Memos-native-first usage**

- [ ] **Step 3: Re-run full validation**

Run: `npm run validate`
Expected: PASS

### Task 7: Install the updated plugin locally and verify bootstrap

**Files:**
- Modify: local marketplace plugin copy if needed

**Interfaces:**
- Consumes: built plugin output and local Codex marketplace
- Produces: installed local plugin and verified tool availability

- [ ] **Step 1: Build the plugin**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Reinstall the local Codex plugin**

Run: local Codex plugin install/refresh command for the user's `sky-tools` marketplace
Expected: plugin reinstall succeeds

- [ ] **Step 3: Run a local MCP smoke verification after install**

Run: `npm run mcp:smoke`
Expected: PASS
