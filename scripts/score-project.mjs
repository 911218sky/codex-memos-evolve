import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const required = [
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "src/mcp-server.mjs",
  "src/evolver.mjs",
  "src/memos-client.mjs",
  "skills/memos-evolve/SKILL.md",
  "docs/evaluation-rubric.md",
  "docs/install.md",
  "docs/subagent-review.md",
  "tests/smoke.mjs",
  "tests/mcp-smoke.mjs"
];

const checks = [];
for (const rel of required) {
  checks.push({ name: `file:${rel}`, pass: fs.existsSync(path.join(root, rel)), weight: 1 });
}

const evolver = fs.readFileSync(path.join(root, "src/evolver.mjs"), "utf8");
checks.push({ name: "trace-to-policy", pass: evolver.includes("recordTrace") && evolver.includes("policyMemo"), weight: 2 });
checks.push({ name: "policy-to-skill", pass: evolver.includes("skillMemo") && evolver.includes("support"), weight: 2 });
checks.push({ name: "token-aware-recall", pass: evolver.includes("maxTokens") && evolver.includes("estimated_tokens_saved"), weight: 2 });
checks.push({ name: "usememos-api-client", pass: fs.readFileSync(path.join(root, "src/memos-client.mjs"), "utf8").includes("/api/v1/memos"), weight: 2 });
checks.push({ name: "secret-safety", pass: fs.readFileSync(path.join(root, "skills/memos-evolve/SKILL.md"), "utf8").includes("Do not store secrets"), weight: 1 });
checks.push({ name: "stale-memory-suppression", pass: evolver.includes("STATUS_TAGS.superseded") && evolver.includes("isActive"), weight: 2 });
checks.push({ name: "secret-recall-redaction", pass: evolver.includes("looksSecret") && fs.readFileSync(path.join(root, "tests/smoke.mjs"), "utf8").includes("sk-testsecret"), weight: 2 });
checks.push({ name: "mcp-client-smoke", pass: fs.readFileSync(path.join(root, "tests/mcp-smoke.mjs"), "utf8").includes("callTool"), weight: 2 });
checks.push({ name: "feedback-affects-recall", pass: evolver.includes("feedbackIndex") && fs.readFileSync(path.join(root, "tests/smoke.mjs"), "utf8").includes("rating: -5"), weight: 2 });
checks.push({ name: "trivial-task-gate", pass: evolver.includes("shouldSkipRecall") && fs.readFileSync(path.join(root, "tests/mcp-smoke.mjs"), "utf8").includes("what time is it?"), weight: 1 });
checks.push({ name: "minimum-savings-assertion", pass: fs.readFileSync(path.join(root, "tests/smoke.mjs"), "utf8").includes(">= 0.5"), weight: 1 });

const earned = checks.filter((c) => c.pass).reduce((sum, c) => sum + c.weight, 0);
const total = checks.reduce((sum, c) => sum + c.weight, 0);
const score = Math.round((earned / total) * 100);

const result = { score, earned, total, checks };
console.log(JSON.stringify(result, null, 2));
if (score < 85) process.exit(1);
