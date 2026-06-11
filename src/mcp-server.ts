#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MemosClient } from "./memos-client.ts";
import { EvolveEngine } from "./evolver.ts";

const server = new McpServer({
  name: "codex-memos-evolve",
  version: "0.1.0"
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
  "memos_evolve_record_trace",
  "Store a grounded task trace in usememos/memos for later promotion into policies and skills.",
  {
    project: z.string().default("default"),
    task: z.string(),
    outcome: z.string().default(""),
    observations: z.array(z.string()).default([]),
    corrections: z.array(z.string()).default([]),
    value: z.number().min(-10).max(10).default(0),
    tags: z.array(z.string()).default([]),
    memory: z.enum(["short", "long"]).default("long").describe("Use short for temporary task-only facts; they can expire during maintenance."),
    ttlDays: z.number().int().min(1).max(365).optional().describe("Optional time-to-live in days for short or temporary memories.")
  },
  async (input) => withEngine((engine) => engine.recordTrace(input))
);

server.tool(
  "memos_evolve_reflect",
  "Promote repeated traces into compact policy and skill memos.",
  {
    project: z.string().default("default"),
    minSupport: z.number().int().min(2).max(20).default(2)
  },
  async (input) => withEngine((engine) => engine.reflect(input))
);

server.tool(
  "memos_evolve_feedback",
  "Record human or agent feedback about an evolved memory, policy, or skill.",
  {
    project: z.string().default("default"),
    target: z.string().describe("Memo name, skill slug, or policy title."),
    rating: z.number().int().min(-5).max(5),
    comment: z.string().default("")
  },
  async (input) => withEngine((engine) => engine.feedback(input))
);

server.tool(
  "memos_evolve_stats",
  "Summarize trace/policy/skill counts and rough token compression.",
  {
    project: z.string().default("default")
  },
  async (input) => withEngine((engine) => engine.stats(input))
);

server.tool(
  "memos_evolve_maintain",
  "Preview or apply memory maintenance: expire short-lived or low-value traces, promote repeated traces, and report estimated token savings.",
  {
    project: z.string().default("default"),
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
