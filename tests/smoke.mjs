import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemosClient } from "../src/memos-client.mjs";
import { EvolveEngine } from "../src/evolver.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-memos-evolve-"));
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
Use api_key = sk-testsecretsecretsecretsecretsecret
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
assert.equal(recall.recall.includes("sk-testsecret"), false);
assert.equal(recall.recall.includes("docs strategy"), false);
assert.match(recall.recall, /version=2/);

const trivial = await engine.recall({ project: "smoke", task: "what time is it?", maxTokens: 900 });
assert.equal(trivial.skipped, true);

await assert.rejects(() => engine.recordTrace({
  project: "smoke",
  task: "Store a token",
  outcome: "bad",
  observations: ["Bearer abcdefghijklmnopqrstuvwxyz123456"],
  corrections: [],
  value: -10,
  tags: ["security"]
}), /Refusing to store trace/);

const stats = await engine.stats({ project: "smoke" });
assert.equal(stats.counts.trace, 2);
assert.equal(stats.counts.skill >= 1, true);
assert.equal(stats.compression_ratio_estimate > 0, true);

console.log(JSON.stringify({ ok: true, reflection, recall_tokens: recall.recall_tokens_estimate, stats }, null, 2));
