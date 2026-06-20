import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin/plugin.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const required = [
    ".codex-plugin/plugin.json",
    ".mcp.json",
    "AGENTS.md",
    "src/mcp-server.ts",
    "src/evolver.ts",
    "src/memos-client.ts",
    "skills/memos-evolve/SKILL.md",
    "docs/evaluation-rubric.md",
    "docs/install.md",
    "docs/maintenance.md",
    "docs/proactive-use.md",
    "docs/subagent-review.md",
    "tests/smoke.ts",
    "tests/mcp-smoke.ts"
];
const checks = [];
for (const rel of required) {
    checks.push({ name: `file:${rel}`, pass: fs.existsSync(path.join(root, rel)), weight: 1 });
}
const evolver = fs.readFileSync(path.join(root, "src/evolver.ts"), "utf8");
checks.push({ name: "trace-to-policy", pass: evolver.includes("recordTrace") && evolver.includes("policyMemo"), weight: 2 });
checks.push({ name: "policy-to-skill", pass: evolver.includes("skillMemo") && evolver.includes("support"), weight: 2 });
checks.push({ name: "memory-search-surface", pass: evolver.includes("async search(") && fs.readFileSync(path.join(root, "src/mcp-server.ts"), "utf8").includes("memos_evolve_search"), weight: 2 });
checks.push({ name: "promotion-evidence-links", pass: fs.readFileSync(path.join(root, "src/format.ts"), "utf8").includes("## Source Memos") && evolver.includes("memoRef"), weight: 2 });
checks.push({ name: "token-aware-recall", pass: evolver.includes("maxTokens") && evolver.includes("estimated_tokens_saved"), weight: 2 });
checks.push({ name: "ai-first-recall", pass: evolver.includes("## Active Work") && evolver.includes("## Decisions"), weight: 2 });
checks.push({ name: "single-write-surface", pass: fs.readFileSync(path.join(root, "src/mcp-server.ts"), "utf8").includes("memos_evolve_write"), weight: 2 });
checks.push({ name: "usememos-api-client", pass: fs.readFileSync(path.join(root, "src/memos-client.ts"), "utf8").includes("/api/v1/memos"), weight: 2 });
checks.push({ name: "secret-safety", pass: fs.readFileSync(path.join(root, "skills/memos-evolve/SKILL.md"), "utf8").includes("Do not store secrets"), weight: 1 });
checks.push({ name: "stale-memory-suppression", pass: evolver.includes("STATUS_TAGS.superseded") && evolver.includes("isActive"), weight: 2 });
checks.push({ name: "short-memory-maintenance", pass: evolver.includes("maintain") && evolver.includes("#memory/short") && fs.readFileSync(path.join(root, "tests/smoke.ts"), "utf8").includes("shortMemoryTtlDays"), weight: 2 });
checks.push({ name: "secret-recall-redaction", pass: evolver.includes("looksSecret") && fs.readFileSync(path.join(root, "tests/smoke.ts"), "utf8").includes("FAKE_API_KEY_VALUE"), weight: 2 });
checks.push({ name: "mcp-client-smoke", pass: fs.readFileSync(path.join(root, "tests/mcp-smoke.ts"), "utf8").includes("callTool"), weight: 2 });
checks.push({ name: "feedback-affects-recall", pass: evolver.includes("feedbackIndex") && fs.readFileSync(path.join(root, "tests/smoke.ts"), "utf8").includes("rating: -5"), weight: 2 });
checks.push({ name: "trivial-task-gate", pass: evolver.includes("shouldSkipRecall") && fs.readFileSync(path.join(root, "tests/mcp-smoke.ts"), "utf8").includes("what time is it?"), weight: 1 });
checks.push({ name: "minimum-savings-assertion", pass: fs.readFileSync(path.join(root, "tests/smoke.ts"), "utf8").includes(">= 0.5"), weight: 1 });
checks.push({ name: "manifest-pure-semver", pass: /^\d+\.\d+\.\d+$/.test(manifest.version || ""), weight: 2 });
checks.push({ name: "manifest-package-version-match", pass: manifest.version === packageJson.version, weight: 2 });
checks.push({ name: "agpl-license", pass: manifest.license === "AGPL-3.0-only" && packageJson.license === "AGPL-3.0-only", weight: 1 });
const mcpConfig = JSON.parse(fs.readFileSync(path.join(root, ".mcp.json"), "utf8"));
const mcpServer = mcpConfig.mcpServers?.["codex-memos-evolve"];
checks.push({
    name: "node-mcp-runtime",
    pass: mcpServer?.command === "node" && (mcpServer.args || []).includes("./dist/src/mcp-server.js"),
    weight: 2
});
const agentsInstructions = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
const proactiveUse = fs.readFileSync(path.join(root, "docs/proactive-use.md"), "utf8");
checks.push({
    name: "proactive-agent-instructions",
    pass: agentsInstructions.includes("memos_evolve_recall") &&
        agentsInstructions.includes("Subagents must also") &&
        proactiveUse.includes("Current Runtime Boundary"),
    weight: 2
});
checks.push({
    name: "four-tool-surface",
    pass: fs.readFileSync(path.join(root, "tests/mcp-smoke.ts"), "utf8").includes("memos_evolve_write") &&
        fs.readFileSync(path.join(root, "tests/mcp-smoke.ts"), "utf8").includes("memos_evolve_search") &&
        !fs.readFileSync(path.join(root, "README.md"), "utf8").includes("memos_evolve_record_trace") &&
        !fs.readFileSync(path.join(root, "README.md"), "utf8").includes("memos_evolve_stats"),
    weight: 2
});
const earned = checks.filter((c) => c.pass).reduce((sum, c) => sum + c.weight, 0);
const total = checks.reduce((sum, c) => sum + c.weight, 0);
const score = Math.round((earned / total) * 100);
const result = { score, earned, total, checks };
console.log(JSON.stringify(result, null, 2));
if (score < 85)
    process.exit(1);
