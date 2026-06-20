#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MemosClient } from "./memos-client.js";
import { EvolveEngine } from "./evolver.js";

const server = new McpServer({
  name: "codex-memos-evolve",
  version: "0.1.2"
});

server.tool(
  "memos_evolve_recall",
  "Call at the start of non-trivial Codex work to recall compact, token-aware Memos guidance for the current task. Use before code edits, debugging, docs, reviews, plugin/MCP work, subagent coordination, and repeated workflows unless the task is clearly trivial.",
  {
    task: z.string().describe("Current user request plus the immediate work you are about to do."),
    project: z.string().default("default").describe("Project or repository name, for example codex-memos-evolve."),
    maxTokens: z.number().int().min(200).max(4000).default(1400).describe("Approximate token budget for recall output.")
  },
  async (input) => withEngine((engine) => engine.recall(input))
);

server.tool(
  "memos_evolve_write",
  "Write a compact AI-first memory record to Memos. Use work for active plans, decision for durable choices, trace for supporting evidence, and feedback for corrections. For user preferences/facts/statements, keep the existing record types and tag them with values like #subject/user and #kind/preference.",
  {
    project: z.string().default("default"),
    recordType: z.enum(["trace", "work", "decision", "feedback"]).default("trace"),
    state: z.enum(["planned", "in_progress", "blocked", "done", "cancelled"]).optional(),
    summary: z.string().optional(),
    goal: z.string().optional(),
    plan: z.array(z.string()).default([]),
    next: z.string().optional(),
    why: z.string().optional(),
    consequences: z.array(z.string()).default([]),
    pinned: z.boolean().default(false),
    task: z.string().optional(),
    outcome: z.string().default(""),
    observations: z.array(z.string()).default([]),
    corrections: z.array(z.string()).default([]),
    value: z.number().min(-10).max(10).default(0),
    tags: z.array(z.string()).default([]),
    memory: z.enum(["short", "long"]).default("long").describe("Use short for temporary task-only facts; they can expire during maintenance."),
    ttlDays: z.number().int().min(1).max(365).optional().describe("Optional time-to-live in days for short or temporary memories.")
  },
  async (input) => withEngine((engine) => engine.write(input))
);

server.tool(
  "memos_evolve_search",
  "Search project memory by query and tags. Use index detail for compact results and full detail only when you need the full memo bodies.",
  {
    project: z.string().default("default"),
    query: z.string().default(""),
    type: z.enum(["trace", "work", "decision", "policy", "skill", "feedback", "maintenance"]).optional(),
    topic: z.string().default(""),
    status: z.enum(["active", "superseded", "expired"]).optional(),
    state: z.enum(["planned", "in_progress", "blocked", "done", "cancelled"]).optional(),
    filter: z.string().default("").describe("Optional native Memos CEL filter composed with the built-in project/query/type/topic/status/state filters. Native CEL passthrough applies in memos-api mode; local-json keeps simple built-in filtering only."),
    limit: z.number().int().min(1).max(50).default(10),
    detail: z.enum(["index", "full"]).default("index")
  },
  async (input) => withEngine((engine) => engine.search(input))
);

server.tool(
  "memos_evolve_maintain",
  "Maintain AI memory with one tool: setup project shortcuts, preview/apply cleanup, expire low-value traces, and fold repeated evidence into compact policies and skills.",
  {
    project: z.string().default("default"),
    action: z.enum(["cleanup", "setup"]).default("cleanup"),
    username: z.string().default("sky"),
    apply: z.boolean().default(false).describe("False previews candidates only. True marks expired candidates and writes a maintenance summary."),
    maxTraceAgeDays: z.number().int().min(1).max(3650).default(30),
    minTraceValue: z.number().min(-10).max(10).default(-3),
    shortMemoryTtlDays: z.number().int().min(1).max(365).default(1),
    minSupport: z.number().int().min(2).max(20).default(2)
  },
  async (input) => withEngine((engine) => engine.maintain(input))
);

const transport = new StdioServerTransport();
await server.connect(transport);

async function withEngine<T>(callback: (engine: EvolveEngine) => Promise<T>) {
  const engine = new EvolveEngine(new MemosClient());
  return jsonResult(await callback(engine));
}

function jsonResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
