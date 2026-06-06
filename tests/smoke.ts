import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemosClient } from "../src/memos-client.ts";
import { EvolveEngine } from "../src/evolver.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-memos-evolve-"));

const originalMemosPat = process.env.MEMOS_PAT;
const originalMemosBaseUrl = process.env.MEMOS_BASE_URL;
const originalForceLocal = process.env.MEMOS_EVOLVE_FORCE_LOCAL;
delete process.env.MEMOS_PAT;
delete process.env.MEMOS_BASE_URL;
delete process.env.MEMOS_EVOLVE_FORCE_LOCAL;
assert.throws(
  () => new MemosClient({ envFile: path.join(dir, "missing.env"), localFile: path.join(dir, "should-not-exist.json") }),
  /MEMOS_PAT is required/
);
const envFile = path.join(dir, ".env");
fs.writeFileSync(envFile, "MEMOS_BASE_URL=http://memos.test:5230\nMEMOS_PAT=from-dotenv\n");
const dotEnvClient = new MemosClient({ envFile });
assert.equal(dotEnvClient.baseUrl, "http://memos.test:5230");
assert.equal(dotEnvClient.mode, "memos-api");
if (originalMemosPat === undefined) {
  delete process.env.MEMOS_PAT;
} else {
  process.env.MEMOS_PAT = originalMemosPat;
}
if (originalMemosBaseUrl === undefined) {
  delete process.env.MEMOS_BASE_URL;
} else {
  process.env.MEMOS_BASE_URL = originalMemosBaseUrl;
}
if (originalForceLocal === undefined) {
  delete process.env.MEMOS_EVOLVE_FORCE_LOCAL;
} else {
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
assert.equal(recall.recall.includes("FAKE_API_KEY_VALUE"), false);
assert.equal(recall.recall.includes("docs strategy"), false);
assert.match(recall.recall, /version=2/);

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
assert.equal(stats.counts.trace, 2);
assert.equal(stats.counts.skill >= 1, true);
assert.equal(stats.compression_ratio_estimate > 0, true);

console.log(JSON.stringify({ ok: true, reflection, recall_tokens: recall.recall_tokens_estimate, stats }, null, 2));
