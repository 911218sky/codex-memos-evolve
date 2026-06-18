import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemosClient } from "../src/memos-client.js";
import { EvolveEngine } from "../src/evolver.js";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-memos-evolve-"));
const originalMemosPat = process.env.MEMOS_PAT;
const originalMemosBaseUrl = process.env.MEMOS_BASE_URL;
const originalForceLocal = process.env.MEMOS_EVOLVE_FORCE_LOCAL;
delete process.env.MEMOS_PAT;
delete process.env.MEMOS_BASE_URL;
delete process.env.MEMOS_EVOLVE_FORCE_LOCAL;
assert.throws(() => new MemosClient({ envFile: path.join(dir, "missing.env"), localFile: path.join(dir, "should-not-exist.json") }), /MEMOS_PAT is required/);
const envFile = path.join(dir, ".env");
fs.writeFileSync(envFile, "MEMOS_BASE_URL=http://memos.test:5230\nMEMOS_PAT=from-dotenv\n");
const dotEnvClient = new MemosClient({ envFile });
assert.equal(dotEnvClient.baseUrl, "http://memos.test:5230");
assert.equal(dotEnvClient.mode, "memos-api");
const originalCwd = process.cwd();
const cwdEnvDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-memos-evolve-cwd-"));
fs.writeFileSync(path.join(cwdEnvDir, ".env"), "MEMOS_BASE_URL=http://cwd-memos.test:5230\nMEMOS_PAT=from-cwd-dotenv\nMEMOS_EVOLVE_LOCAL_FILE=relative-memos.json\n");
try {
    process.chdir(cwdEnvDir);
    const cwdDotEnvClient = new MemosClient();
    assert.equal(cwdDotEnvClient.baseUrl, "http://cwd-memos.test:5230");
    assert.equal(cwdDotEnvClient.localFile, path.join(cwdEnvDir, "relative-memos.json"));
}
finally {
    process.chdir(originalCwd);
}
if (originalMemosPat === undefined) {
    delete process.env.MEMOS_PAT;
}
else {
    process.env.MEMOS_PAT = originalMemosPat;
}
if (originalMemosBaseUrl === undefined) {
    delete process.env.MEMOS_BASE_URL;
}
else {
    process.env.MEMOS_BASE_URL = originalMemosBaseUrl;
}
if (originalForceLocal === undefined) {
    delete process.env.MEMOS_EVOLVE_FORCE_LOCAL;
}
else {
    process.env.MEMOS_EVOLVE_FORCE_LOCAL = originalForceLocal;
}
const client = new MemosClient({ forceLocal: true, localFile: path.join(dir, "memos.json") });
const engine = new EvolveEngine(client);
await engine.recordTrace({
    project: "smoke",
    task: "Write a Codex plugin README",
    outcome: "README was useful",
    observations: ["README should include install env vars"],
    corrections: ["Avoid raw chat dumps; write compact policy"],
    value: 4,
    tags: ["plugin", "docs"]
});
await engine.recordTrace({
    project: "smoke",
    task: "Improve a Codex plugin README",
    outcome: "README became clearer",
    observations: ["Document smoke tests before handoff"],
    corrections: ["Avoid raw chat dumps; write compact policy"],
    value: 5,
    tags: ["plugin", "docs"]
});
await engine.recordTrace({
    project: "smoke",
    task: "Temporary branch note",
    outcome: "Only useful during this task",
    observations: ["Drop this short memory after maintenance"],
    corrections: [],
    value: 1,
    tags: ["temporary"],
    memory: "short",
    ttlDays: 1
});
await client.createMemo(`#codex-memos-evolve #type/trace #status/active #project/smoke #date/2020-01-01 #memory/long #topic/cleanup

## Task
Old failed cleanup attempt

## Outcome
No longer useful

## Observations
- This low-value trace should expire during maintenance.

## Corrections
- None

## Value
-5
`);
await client.createMemo(`#codex-memos-evolve #type/trace #status/active #project/smoke #date/2020-01-01 #memory/short #ttl/1 #expires/2020-01-02 #topic/expired

## Task
Expired scratch note

## Outcome
No longer useful

## Observations
- This expired short memory should not appear in recall.

## Corrections
- None

## Value
1
`);
await client.createMemo(`#codex-memos-evolve #type/trace #status/active #project/smoke #date/2020-01-01 #memory/short #topic/legacy

## Task
Legacy scratch note

## Outcome
No ttl tag was recorded

## Observations
- This legacy short memory should use the maintenance fallback TTL.

## Corrections
- None

## Value
1
`);
await client.createMemo(`#codex-memos-evolve #type/policy #status/superseded #project/smoke #support/99 #version/99

## Policy
stale plugin strategy

## Rule
Always dump every raw memo into context.
`);
await client.createMemo(`#codex-memos-evolve #type/policy #status/active #project/other #support/99 #version/1

## Policy
unrelated project strategy

## Rule
This belongs to a different project and should not appear.
`);
await client.createMemo(`#codex-memos-evolve #type/trace #status/active #project/smoke-extra #date/2020-01-01 #memory/long #topic/prefix

## Task
Prefix project trace

## Outcome
This belongs to a project whose tag only starts with smoke.

## Observations
- Exact project tag matching should exclude this from smoke.

## Corrections
- Do not match project tags by prefix.

## Value
-9
`);
await client.createMemo(`#codex-memos-evolve #type/policy #status/active #project/smoke #support/99 #version/1

## Policy
secret contaminated policy

## Rule
Use api_key = FAKE_API_KEY_VALUE_123456
`);
const reflection = await engine.reflect({ project: "smoke", minSupport: 2 });
assert.equal(reflection.promoted.length >= 1, true);
const reflection2 = await engine.reflect({ project: "smoke", minSupport: 2 });
assert.equal(reflection2.promoted.some((item) => item.version === 2), true);
const afterReflectionMemos = await client.searchMemos("#codex-memos-evolve #project/smoke", 100);
const activePluginPolicies = afterReflectionMemos.filter((memo) => String(memo.content || "").includes("#type/policy") && String(memo.content || "").includes("#skill/plugin") && String(memo.content || "").includes("#status/active"));
const activePluginSkills = afterReflectionMemos.filter((memo) => String(memo.content || "").includes("#type/skill") && String(memo.content || "").includes("#skill/plugin") && String(memo.content || "").includes("#status/active"));
assert.equal(activePluginPolicies.length, 1);
assert.equal(activePluginSkills.length, 1);
assert.equal(String(activePluginPolicies[0]?.content || "").includes("#version/2"), true);
assert.equal(String(activePluginSkills[0]?.content || "").includes("#version/2"), true);
await engine.feedback({
    project: "smoke",
    target: "docs",
    rating: -5,
    comment: "The docs skill was too broad for this task."
});
const recall = await engine.recall({ project: "smoke", task: "Create plugin docs", maxTokens: 900 });
assert.match(recall.recall, /Active Skills|Policies/);
assert.equal(recall.recall_tokens_estimate <= 900, true);
assert.equal(recall.estimated_tokens_saved / recall.raw_tokens_estimate >= 0.5, true);
assert.equal(recall.recall.includes("Always dump every raw memo"), false);
assert.equal(recall.recall.includes("different project"), false);
assert.equal(recall.recall.includes("Prefix project trace"), false);
assert.equal(recall.recall.includes("FAKE_API_KEY_VALUE"), false);
assert.equal(recall.recall.includes("docs strategy"), false);
assert.match(recall.recall, /version=2/);
assert.equal(recall.recall.includes("Expired scratch note"), false);
const dryRunMaintenance = await engine.maintain({ project: "smoke", apply: false, shortMemoryTtlDays: 1 });
assert.equal(dryRunMaintenance.applied, false);
assert.equal(dryRunMaintenance.candidates.total_to_expire >= 2, true);
assert.equal(dryRunMaintenance.candidates.total_to_expire, 3);
assert.equal(dryRunMaintenance.marked_expired, 0);
assert.equal(dryRunMaintenance.maintenance_memo, undefined);
assert.equal(dryRunMaintenance.estimated_tokens_saved, undefined);
assert.equal(dryRunMaintenance.expiring_tokens_estimate > 0, true);
assert.equal(dryRunMaintenance.promotion_candidates.some((item) => item.topic === "legacy"), false);
assert.equal(dryRunMaintenance.promotion_candidates.some((item) => item.topic === "prefix"), false);
const appliedMaintenance = await engine.maintain({
    project: "smoke",
    apply: true,
    maxTraceAgeDays: 30,
    minTraceValue: -3,
    shortMemoryTtlDays: 1,
    minSupport: 2
});
assert.equal(appliedMaintenance.applied, true);
assert.equal(appliedMaintenance.marked_expired >= 2, true);
assert.ok(appliedMaintenance.maintenance_memo);
assert.equal(appliedMaintenance.expiring_tokens_estimate > 0, true);
assert.equal(appliedMaintenance.active_tokens_before_estimate > 0, true);
assert.equal(appliedMaintenance.active_tokens_after_estimate > 0, true);
assert.equal(typeof appliedMaintenance.estimated_tokens_saved, "number");
assert.equal((appliedMaintenance.estimated_tokens_saved || 0) >= 0, true);
const postMaintenanceRecall = await engine.recall({ project: "smoke", task: "Clean scratch memory", maxTokens: 900 });
assert.equal(postMaintenanceRecall.recall.includes("Old failed cleanup attempt"), false);
assert.equal(postMaintenanceRecall.recall.includes("Legacy scratch note"), false);
const temporaryRecall = await engine.recall({ project: "smoke", task: "Temporary branch note", maxTokens: 900 });
assert.equal(temporaryRecall.recall.includes("Temporary branch note"), true);
const trivial = await engine.recall({ project: "smoke", task: "what time is it?", maxTokens: 900 });
assert.equal(trivial.skipped, true);
await assert.rejects(() => engine.recordTrace({
    project: "smoke",
    task: "Store a token",
    outcome: "bad",
    observations: [`Bearer ${"FAKE_BEARER_TOKEN_1234567890"}`],
    corrections: [],
    value: -10,
    tags: ["security"]
}), /Refusing to store trace/);
const stats = await engine.stats({ project: "smoke" });
assert.equal(stats.counts.trace, 6);
assert.equal(stats.counts.skill >= 1, true);
assert.equal(stats.counts.maintenance, 1);
assert.equal(stats.counts.expired >= 3, true);
assert.equal(stats.inactive_tokens_estimate > 0, true);
assert.equal(stats.compression_ratio_estimate > 0, true);
const prefixStats = await engine.stats({ project: "smoke-extra" });
assert.equal(prefixStats.counts.trace, 1);
assert.equal(prefixStats.counts.maintenance, 0);
console.log(JSON.stringify({ ok: true, reflection, recall_tokens: recall.recall_tokens_estimate, stats }, null, 2));
