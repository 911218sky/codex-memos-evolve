import { DEFAULT_MAX_RECALL_TOKENS, DEFAULT_PROJECT, STATE_TAGS, STATUS_TAGS, TYPE_TAGS } from "./constants.js";
import { feedbackMemo, maintenanceMemo, policyMemo, projectTag, skillMemo, skillTag, slug, traceMemo } from "./format.js";
import { MemosClient } from "./memos-client.js";
import { compactLines, estimateTokens, truncateByTokens } from "./token.js";
import type {
  FeedbackInput,
  MaintainInput,
  MemoRecord,
  MemoryCounts,
  PromotionResult,
  RecallInput,
  ReflectInput,
  SearchInput,
  SearchResultItem,
  StatsInput,
  TraceInput
} from "./types.js";

function contentOf(memo: MemoRecord): string {
  return memo.content || memo.snippet || "";
}

function has(content: string, tag: string): boolean {
  return content.includes(tag);
}

function hasTag(content: string, tag: string): boolean {
  return content.split(/\s+/).includes(tag);
}

function celContains(value: string): string {
  return `content.contains("${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}")`;
}

function joinClauses(clauses: Array<string | undefined>): string {
  return clauses.map((item) => String(item || "").trim()).filter(Boolean).join(" && ");
}

function isActive(content: string): boolean {
  return has(content, STATUS_TAGS.active) && !has(content, STATUS_TAGS.superseded) && !has(content, STATUS_TAGS.expired);
}

function looksSecret(content = ""): boolean {
  return /(sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|api[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{16,})/i.test(content);
}

function extractSection(content: string, heading: string): string {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  return content.match(pattern)?.[1]?.trim() || "";
}

function extractSupport(content: string): number {
  return Number(content.match(/#support\/(\d+)/)?.[1] || 1);
}

function extractVersion(content: string): number {
  return Number(content.match(/#version\/(\d+)/)?.[1] || 1);
}

function extractSkillSlug(content: string): string {
  return content.match(/#skill\/([a-z0-9\u3400-\u9fff-]+)/)?.[1] || "";
}

function extractRating(content: string): number {
  return Number(content.match(/#rating\/(-?\d+)/)?.[1] || 0);
}

function extractTarget(content: string): string {
  return content.match(/#target\/([a-z0-9\u3400-\u9fff-]+)/)?.[1] || "";
}

function extractDateTag(content: string, tag: "date" | "expires"): string {
  return content.match(new RegExp(`#${tag}/(\\d{4}-\\d{2}-\\d{2})`))?.[1] || "";
}

function extractValue(content: string): number {
  const value = extractSection(content, "Value").match(/-?\d+(?:\.\d+)?/)?.[0];
  return value ? Number(value) : 0;
}

function extractTaskListStatus(memo: MemoRecord, content: string) {
  const taskMatches = content.match(/^- \[(?: |x)\] /gmu) || [];
  const openMatches = content.match(/^- \[ \] /gmu) || [];
  const hasTaskList = memo.property?.hasTaskList ?? taskMatches.length > 0;
  const hasIncompleteTasks = memo.property?.hasIncompleteTasks ?? openMatches.length > 0;
  return { hasTaskList, hasIncompleteTasks };
}

function extractPinned(memo: MemoRecord, content: string): boolean {
  return Boolean(memo.pinned || has(content, "#pinned/true"));
}

function extractState(content: string): string {
  if (has(content, STATE_TAGS.planned)) return "planned";
  if (has(content, STATE_TAGS.in_progress)) return "in_progress";
  if (has(content, STATE_TAGS.blocked)) return "blocked";
  if (has(content, STATE_TAGS.done)) return "done";
  if (has(content, STATE_TAGS.cancelled)) return "cancelled";
  return "";
}

function extractTagValue(content: string, key: string): string {
  return content.match(new RegExp(`#${key}/([^\\s#]+)`))?.[1] || "";
}

function extractTitle(content: string): string {
  return (
    extractSection(content, "Summary") ||
    extractSection(content, "Decision") ||
    extractSection(content, "Policy") ||
    extractSection(content, "Skill") ||
    extractSection(content, "Task") ||
    extractSection(content, "Feedback") ||
    "Unspecified"
  ).replace(/\s+/g, " ").slice(0, 180);
}

function isUserKnowledgeMemo(content: string): boolean {
  return hasTag(content, "#subject/user");
}

function extractKind(content: string): string {
  return extractTagValue(content, "kind") || "note";
}

function daysSince(date: string, now = new Date()): number {
  if (!date) return 0;
  const time = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(time)) return 0;
  return Math.floor((now.getTime() - time) / 86_400_000);
}

function isExpired(content: string, now = new Date()): boolean {
  if (has(content, STATUS_TAGS.expired)) return true;
  const expires = extractDateTag(content, "expires");
  return Boolean(expires && Date.parse(`${expires}T23:59:59.999Z`) < now.getTime());
}

function markExpired(content: string): string {
  if (has(content, STATUS_TAGS.expired)) return content;
  if (has(content, STATUS_TAGS.active)) return content.replace(STATUS_TAGS.active, STATUS_TAGS.expired);
  return `${content.trim()}\n\n${STATUS_TAGS.expired}\n`;
}

function markSuperseded(content: string): string {
  if (has(content, STATUS_TAGS.superseded)) return content;
  if (has(content, STATUS_TAGS.active)) return content.replace(STATUS_TAGS.active, STATUS_TAGS.superseded);
  return `${content.trim()}\n\n${STATUS_TAGS.superseded}\n`;
}

function shouldSkipRecall(task: string): boolean {
  const text = String(task || "").trim().toLowerCase();
  return /^(what time is it\??|time\??|date\??|pwd|ls|hello|hi|ping)$/i.test(text);
}

function topicCandidates(text: string): string[] {
  const tags = [...text.matchAll(/#topic\/([a-z0-9\u3400-\u9fff-]+)/g)]
    .map((m) => m[1])
    .filter((tag): tag is string => Boolean(tag));
  if (tags.length) return tags;
  const task = extractSection(text, "Task") || extractSection(text, "Summary") || extractSection(text, "Decision") || text;
  return (task.toLowerCase().match(/[a-z0-9\u3400-\u9fff]{3,}/g) || []).slice(0, 3);
}

function deriveLesson(traces: MemoRecord[]): string {
  const corrections = traces
    .map((memo) => extractSection(contentOf(memo), "Corrections"))
    .filter((text) => text && !text.includes("- None"));
  const observations = traces
    .map((memo) => extractSection(contentOf(memo), "Observations"))
    .filter((text) => text && !text.includes("- None"));
  const source = corrections[0] || observations[0] || "Prefer the proven workflow from repeated successful traces.";
  return source
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

function evidenceFor(traces: MemoRecord[]): string[] {
  return traces.slice(0, 5).map((memo) => {
    const content = contentOf(memo);
    const task = extractSection(content, "Task") || extractSection(content, "Summary") || extractSection(content, "Decision");
    const value = extractSection(content, "Value");
    const memoRef = String(memo.name || memo.id || "");
    return `${memoRef}: ${(task || "Trace").replace(/\s+/g, " ").slice(0, 160)}${value ? ` (value ${value})` : ""}`;
  });
}

function sameMemo(a: MemoRecord, b: MemoRecord): boolean {
  const aKey = a.name || a.id;
  const bKey = b.name || b.id;
  return Boolean(aKey && bKey && aKey === bKey);
}

function dedupe(memos: MemoRecord[]): MemoRecord[] {
  const seen = new Set<string | number>();
  return memos.filter((memo) => {
    const key = memo.name || memo.id || contentOf(memo);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function feedbackIndex(feedbacks: MemoRecord[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const memo of feedbacks) {
    const content = contentOf(memo);
    const target = extractTarget(content);
    if (!target) continue;
    scores.set(target, (scores.get(target) || 0) + extractRating(content));
  }
  return scores;
}

function latestBySkill(memos: MemoRecord[], feedbackScore: Map<string, number>): MemoRecord[] {
  const groups = new Map<string, MemoRecord>();
  for (const memo of memos) {
    const content = contentOf(memo);
    const slugName = extractSkillSlug(content) || slug(extractSection(content, "Skill") || extractSection(content, "Policy"));
    if ((feedbackScore.get(slugName) || 0) <= -3) continue;
    const prior = groups.get(slugName);
    if (!prior || extractVersion(content) > extractVersion(contentOf(prior))) groups.set(slugName, memo);
  }
  return [...groups.values()];
}

function byRecallScore(feedbackScore: Map<string, number>, task: string) {
  const taskTerms = new Set(topicCandidates(task || ""));
  return (a: MemoRecord, b: MemoRecord) => recallScore(b, feedbackScore, taskTerms) - recallScore(a, feedbackScore, taskTerms);
}

function recallScore(memo: MemoRecord, feedbackScore: Map<string, number>, taskTerms: Set<string>): number {
  const content = contentOf(memo);
  const slugName = extractSkillSlug(content);
  const relevance = slugName && taskTerms.has(slugName) ? 10 : 0;
  return extractSupport(content) * 2 + extractVersion(content) + (feedbackScore.get(slugName) || 0) * 3 + relevance;
}

function summarizeMemo(memo: MemoRecord, label: string): string {
  const content = contentOf(memo);
  const title = extractSection(content, label) || extractSection(content, "Policy") || extractSection(content, "Task") || content;
  const support = extractSupport(content);
  const version = extractVersion(content);
  return `- ${title.replace(/\s+/g, " ").slice(0, 220)} [support=${support}, version=${version}]`;
}

function summarizeWorkMemo(memo: MemoRecord): string {
  const content = contentOf(memo);
  const summary = extractSection(content, "Summary") || extractSection(content, "Task") || "Unspecified";
  const goal = extractSection(content, "Goal");
  const next = extractSection(content, "Next");
  const state = extractState(content) || "in_progress";
  const pinned = extractPinned(memo, content) ? " pinned" : "";
  const taskState = extractTaskListStatus(memo, content);
  const checklist = taskState.hasIncompleteTasks ? " open-tasks" : taskState.hasTaskList ? " checklist" : "";
  const details = [state, `${pinned}${checklist}`.trim(), goal ? `goal=${goal.replace(/\s+/g, " ").slice(0, 80)}` : "", next ? `next=${next.replace(/\s+/g, " ").slice(0, 80)}` : ""].filter(Boolean);
  return `- ${summary.replace(/\s+/g, " ").slice(0, 180)}${details.length ? ` [${details.join(", ")}]` : ""}`;
}

function summarizeDecisionMemo(memo: MemoRecord): string {
  const content = contentOf(memo);
  const summary = extractSection(content, "Decision") || "Unspecified";
  const why = extractSection(content, "Why");
  return `- ${summary.replace(/\s+/g, " ").slice(0, 180)}${why ? ` [why=${why.replace(/\s+/g, " ").slice(0, 100)}]` : ""}`;
}

function summarizeTraceMemo(memo: MemoRecord): string {
  const content = contentOf(memo);
  const task = extractSection(content, "Task") || "Trace";
  const value = extractValue(content);
  return `- ${task.replace(/\s+/g, " ").slice(0, 180)} [value=${value}]`;
}

function extractRecordType(content: string): string {
  if (has(content, TYPE_TAGS.work)) return "work";
  if (has(content, TYPE_TAGS.decision)) return "decision";
  if (has(content, TYPE_TAGS.policy)) return "policy";
  if (has(content, TYPE_TAGS.skill)) return "skill";
  if (has(content, TYPE_TAGS.feedback)) return "feedback";
  if (has(content, TYPE_TAGS.maintenance)) return "maintenance";
  return "trace";
}

function summarizeSearchMemo(memo: MemoRecord): string {
  const content = contentOf(memo);
  return (
    extractSection(content, "Summary") ||
    extractSection(content, "Decision") ||
    extractSection(content, "Policy") ||
    extractSection(content, "Skill") ||
    extractSection(content, "Task") ||
    extractSection(content, "Feedback") ||
    "Unspecified"
  ).replace(/\s+/g, " ").slice(0, 180);
}

function extractAllTags(content: string): string[] {
  return (content.match(/#[^\s#]+/g) || []).slice(0, 20);
}

function countOccurrences(content: string, term: string): number {
  if (!term) return 0;
  return content.split(term).length - 1;
}

function highSignalSearchText(content: string): string {
  return [
    extractSection(content, "Summary"),
    extractSection(content, "Decision"),
    extractSection(content, "Policy"),
    extractSection(content, "Skill"),
    extractSection(content, "Task"),
    extractSection(content, "Feedback")
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function memoScore(memo: MemoRecord, queryTerms: string[], topic: string): number {
  const rawContent = contentOf(memo);
  const content = rawContent.toLowerCase();
  const highSignal = highSignalSearchText(rawContent);
  const phrase = queryTerms.join(" ").trim();
  const matchedTerms = new Set<string>();
  let score = 0;

  if (phrase && content.includes(phrase)) score += 30;
  if (phrase && highSignal.includes(phrase)) score += 20;

  for (const term of queryTerms) {
    if (!term) continue;
    if (content.includes(term)) {
      matchedTerms.add(term);
      score += 4;
      score += Math.min(3, countOccurrences(content, term));
    }
    if (highSignal.includes(term)) score += 8;
  }

  score += matchedTerms.size * 6;
  if (topic && (hasTag(contentOf(memo), `#topic/${slug(topic)}`) || hasTag(contentOf(memo), skillTag(topic)))) score += 8;
  if (isActive(rawContent)) score += 4;
  if (extractPinned(memo, contentOf(memo))) score += 3;
  score += Math.min(6, extractSupport(rawContent));
  return score;
}

function toSearchResultItem(memo: MemoRecord, score: number): SearchResultItem {
  const content = contentOf(memo);
  return {
    memo: String(memo.name || memo.id || ""),
    record_type: extractRecordType(content),
    summary: summarizeSearchMemo(memo),
    tags: extractAllTags(content),
    score
  };
}

function promotionTopics(traces: MemoRecord[], minSupport: number): Array<{ topic: string; support: number }> {
  const byTopic = new Map<string, number>();
  for (const trace of traces) {
    for (const topic of topicCandidates(contentOf(trace)).slice(0, 2)) {
      byTopic.set(topic, (byTopic.get(topic) || 0) + 1);
    }
  }
  return [...byTopic.entries()]
    .filter(([, support]) => support >= minSupport)
    .map(([topic, support]) => ({ topic: slug(topic), support }))
    .sort((a, b) => b.support - a.support || a.topic.localeCompare(b.topic));
}

export class EvolveEngine {
  readonly client: MemosClient;

  constructor(client: MemosClient) {
    this.client = client;
  }

  async recall({ task, project = DEFAULT_PROJECT, maxTokens = DEFAULT_MAX_RECALL_TOKENS }: RecallInput) {
    if (shouldSkipRecall(task)) {
      return {
        mode: this.client.mode,
        project,
        skipped: true,
        reason: "trivial-task-gate",
        raw_candidates: 0,
        raw_tokens_estimate: 0,
        recall_tokens_estimate: 0,
        estimated_tokens_saved: 0,
        recall: "Memory recall skipped for a trivial task."
      };
    }

    const queryTerms = [projectTag(project), ...topicCandidates(task || "")].join(" ");
    const [pluginMemos, taskMemos] = await Promise.all([
      this.client.listPluginMemos(300),
      this.client.searchMemos(queryTerms, 100)
    ]);
    const merged = dedupe([...taskMemos, ...pluginMemos]);
    const projectMemos = merged.filter((memo) => hasTag(contentOf(memo), projectTag(project)));
    const activeProject = projectMemos.filter((memo) => {
      const content = contentOf(memo);
      return isActive(content) && !isExpired(content) && !looksSecret(content);
    });

    const feedbacks = activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.feedback));
    const feedbackScore = feedbackIndex(feedbacks);
    const works = activeProject
      .filter((memo) => has(contentOf(memo), TYPE_TAGS.work))
      .sort((a, b) => {
        const aContent = contentOf(a);
        const bContent = contentOf(b);
        const aTask = extractTaskListStatus(a, aContent);
        const bTask = extractTaskListStatus(b, bContent);
        const aScore = Number(extractPinned(a, aContent)) * 100 + Number(aTask.hasIncompleteTasks) * 50 + Number(aTask.hasTaskList) * 10;
        const bScore = Number(extractPinned(b, bContent)) * 100 + Number(bTask.hasIncompleteTasks) * 50 + Number(bTask.hasTaskList) * 10;
        return bScore - aScore;
      });
    const decisions = activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.decision) && !isUserKnowledgeMemo(contentOf(memo)));
    const skills = latestBySkill(activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.skill)), feedbackScore).sort(byRecallScore(feedbackScore, task));
    const policies = latestBySkill(activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.policy)), feedbackScore).sort(byRecallScore(feedbackScore, task));
    const traces = activeProject
      .filter((memo) => has(contentOf(memo), TYPE_TAGS.trace) && !isUserKnowledgeMemo(contentOf(memo)))
      .slice(0, 5);
    const userKnowledge = activeProject
      .filter((memo) => isUserKnowledgeMemo(contentOf(memo)))
      .sort((a, b) => {
        const aType = extractRecordType(contentOf(a)) === "decision" ? 1 : 0;
        const bType = extractRecordType(contentOf(b)) === "decision" ? 1 : 0;
        return bType - aType || String(b.updateTime || "").localeCompare(String(a.updateTime || ""));
      })
      .slice(0, 4);

    const lines = [
      `# Memos Evolve Recall (${this.client.mode})`,
      `Task: ${task || "unspecified"}`,
      "",
      "## Active Work",
      ...(works.length ? works.slice(0, 6).map(summarizeWorkMemo) : ["- None"]),
      "",
      "## Decisions",
      ...(decisions.length ? decisions.slice(0, 5).map(summarizeDecisionMemo) : ["- None"]),
      "",
      "## User Knowledge",
      ...(userKnowledge.length
        ? userKnowledge.map((memo) => `- [${extractKind(contentOf(memo))}] ${extractTitle(contentOf(memo))}`)
        : ["- None"]),
      "",
      "## Policies",
      ...(policies.length ? policies.slice(0, 5).map((memo) => summarizeMemo(memo, "Policy")) : ["- None"]),
      "",
      "## Skills",
      ...(skills.length ? skills.slice(0, 4).map((memo) => summarizeMemo(memo, "Skill")) : ["- None"]),
      "",
      "## Trace Evidence",
      ...(traces.length ? traces.map(summarizeTraceMemo) : ["- None"])
    ];

    const compact = compactLines(lines, maxTokens).join("\n");
    const rawTokens = estimateTokens(merged.map(contentOf).join("\n\n"));
    const recallTokens = estimateTokens(compact);
    return {
      mode: this.client.mode,
      project,
      raw_candidates: merged.length,
      raw_tokens_estimate: rawTokens,
      recall_tokens_estimate: recallTokens,
      estimated_tokens_saved: Math.max(0, rawTokens - recallTokens),
      recall: truncateByTokens(compact || "No matching Memos Evolve memory found.", maxTokens)
    };
  }

  async search({
    project = DEFAULT_PROJECT,
    query = "",
    type,
    topic = "",
    status,
    state,
    filter = "",
    limit = 10,
    detail = "index"
  }: SearchInput = {}) {
    const queryTerms = String(query || "").split(/\s+/).filter(Boolean);
    const normalizedQueryTerms = queryTerms.map((term) => term.toLowerCase());
    const remoteFilter = joinClauses([
      celContains("#codex-memos-evolve"),
      celContains(projectTag(project)),
      ...queryTerms.map(celContains),
      type ? celContains(`#type/${type}`) : "",
      topic ? `(${celContains(`#topic/${slug(topic)}`)} || ${celContains(skillTag(topic))})` : "",
      status ? celContains(`#status/${status}`) : "",
      state ? celContains(`#state/${state}`) : "",
      filter ? `(${filter})` : ""
    ]);
    const memos = this.client.mode === "memos-api"
      ? await this.client.listMemos({ filter: remoteFilter, orderBy: "pinned desc, update_time desc", pageSize: 500 })
      : await this.client.listPluginMemos(500);
    const filtered = memos
      .filter((memo) => hasTag(contentOf(memo), projectTag(project)))
      .filter((memo) => !looksSecret(contentOf(memo)))
      .filter((memo) => !type || extractRecordType(contentOf(memo)) === type)
      .filter((memo) => !topic || hasTag(contentOf(memo), `#topic/${slug(topic)}`) || hasTag(contentOf(memo), skillTag(topic)))
      .filter((memo) => !status || has(contentOf(memo), `#status/${status}`))
      .filter((memo) => !state || has(contentOf(memo), `#state/${state}`))
      .map((memo) => ({ memo, score: memoScore(memo, normalizedQueryTerms, topic) }))
      .filter(({ memo, score }) => queryTerms.length === 0 || score > 0 || normalizedQueryTerms.every((term) => contentOf(memo).toLowerCase().includes(term)))
      .sort((a, b) => b.score - a.score || String(b.memo.updateTime || "").localeCompare(String(a.memo.updateTime || "")))
      .slice(0, Math.max(1, Math.min(limit, 50)));

    const results = filtered.map(({ memo, score }) => toSearchResultItem(memo, score));
    const output = detail === "full"
      ? [
          "# Search Results",
          ...filtered.map(({ memo }, index) => `\n## Memo ${index + 1}\n${contentOf(memo)}`)
        ].join("\n")
      : [
          "# Search Results",
          ...results.map((item) => `- ${item.summary} [type=${item.record_type}, score=${item.score}, memo=${item.memo}]`)
        ].join("\n");

    return {
      mode: this.client.mode,
      project,
      query,
      detail,
      results,
      output
    };
  }

  async write(input: TraceInput) {
    return this.recordTrace(input);
  }

  async recordTrace(input: TraceInput) {
    const content = traceMemo(input);
    if (looksSecret(content)) {
      throw new Error("Refusing to store trace because it appears to contain a secret or API token.");
    }
    const memo = await this.client.createMemo(content);
    return { created: memo.name || memo.id, mode: this.client.mode, record_type: input.recordType || "trace" };
  }

  async reflect({ project = DEFAULT_PROJECT, minSupport = 2 }: ReflectInput = {}) {
    const memos = await this.client.listPluginMemos(500);
    const projectMemos = memos.filter((memo) => hasTag(contentOf(memo), projectTag(project)));
    const traces = projectMemos.filter((memo) => {
      const content = contentOf(memo);
      return has(content, TYPE_TAGS.trace) && isActive(content) && !isExpired(content) && !looksSecret(content);
    });
    const existingSkills = projectMemos.filter((memo) => has(contentOf(memo), TYPE_TAGS.skill));
    const existingPolicies = projectMemos.filter((memo) => has(contentOf(memo), TYPE_TAGS.policy));
    const byTopic = new Map<string, MemoRecord[]>();
    for (const trace of traces) {
      for (const topic of topicCandidates(contentOf(trace)).slice(0, 2)) {
        if (!byTopic.has(topic)) byTopic.set(topic, []);
        byTopic.get(topic)?.push(trace);
      }
    }

    const promoted: PromotionResult[] = [];
    for (const [topic, topicTraces] of byTopic.entries()) {
      if (topicTraces.length < minSupport) continue;
      const prior = existingSkills.filter((memo) => hasTag(contentOf(memo), skillTag(topic))).sort((a, b) => extractVersion(contentOf(b)) - extractVersion(contentOf(a)))[0];
      const version = prior ? extractVersion(contentOf(prior)) + 1 : 1;
      const support = topicTraces.length;
      const lesson = deriveLesson(topicTraces);
      const title = `${topic} strategy`;
      const evidence = evidenceFor(topicTraces);
      const policy = await this.client.createMemo(policyMemo({
        project,
        slugName: topic,
        title,
        support,
        lesson,
        evidence,
        version
      }));
      const skill = await this.client.createMemo(skillMemo({
        project,
        slugName: topic,
        title,
        support,
        version,
        workflow: [
          `Recall this skill when the task mentions ${topic} or nearby wording.`,
          lesson,
          "Prefer the compact workflow over retrieving every historical trace.",
          "After finishing, record whether the skill helped and what should change.",
          ...evidence
        ]
      }));
      for (const oldMemo of [...existingPolicies, ...existingSkills].filter((memo) => {
        const content = contentOf(memo);
        return hasTag(content, skillTag(topic)) && isActive(content) && !isExpired(content);
      })) {
        await this.client.updateMemo(oldMemo, markSuperseded(contentOf(oldMemo)));
      }
      promoted.push({ topic: slug(topic), support, version, policy: policy.name || policy.id, skill: skill.name || skill.id });
    }

    return {
      mode: this.client.mode,
      project,
      traces_seen: traces.length,
      promoted
    };
  }

  async feedback({ project = DEFAULT_PROJECT, target, rating, comment = "" }: FeedbackInput) {
    if (looksSecret(comment)) {
      throw new Error("Refusing to store feedback because it appears to contain a secret or API token.");
    }
    const memo = await this.client.createMemo(feedbackMemo({ project, target, rating, comment }));
    return { created: memo.name || memo.id, mode: this.client.mode };
  }

  async stats({ project = DEFAULT_PROJECT }: StatsInput = {}) {
    const memos = await this.client.listPluginMemos(500);
    const projectMemos = memos.filter((memo) => hasTag(contentOf(memo), projectTag(project)));
    const counts: MemoryCounts = {
      trace: 0,
      work: 0,
      decision: 0,
      policy: 0,
      skill: 0,
      feedback: 0,
      environment: 0,
      maintenance: 0,
      expired: 0,
      short: 0,
      state_planned: 0,
      state_in_progress: 0,
      state_blocked: 0,
      state_done: 0,
      state_cancelled: 0
    };
    for (const memo of projectMemos) {
      const content = contentOf(memo);
      if (has(content, TYPE_TAGS.trace)) counts.trace += 1;
      if (has(content, TYPE_TAGS.work)) counts.work += 1;
      if (has(content, TYPE_TAGS.decision)) counts.decision += 1;
      if (has(content, TYPE_TAGS.policy)) counts.policy += 1;
      if (has(content, TYPE_TAGS.skill)) counts.skill += 1;
      if (has(content, TYPE_TAGS.feedback)) counts.feedback += 1;
      if (has(content, TYPE_TAGS.environment)) counts.environment += 1;
      if (has(content, TYPE_TAGS.maintenance)) counts.maintenance += 1;
      if (isExpired(content)) counts.expired += 1;
      if (has(content, "#memory/short")) counts.short += 1;
      if (has(content, STATE_TAGS.planned)) counts.state_planned += 1;
      if (has(content, STATE_TAGS.in_progress)) counts.state_in_progress += 1;
      if (has(content, STATE_TAGS.blocked)) counts.state_blocked += 1;
      if (has(content, STATE_TAGS.done)) counts.state_done += 1;
      if (has(content, STATE_TAGS.cancelled)) counts.state_cancelled += 1;
    }
    const activeProjectMemos = projectMemos.filter((memo) => isActive(contentOf(memo)) && !isExpired(contentOf(memo)) && !looksSecret(contentOf(memo)));
    const allTokens = estimateTokens(projectMemos.map(contentOf).join("\n\n"));
    const activeTokens = estimateTokens(activeProjectMemos.map(contentOf).join("\n\n"));
    const skillPolicyTokens = estimateTokens(
      activeProjectMemos
        .filter((memo) => has(contentOf(memo), TYPE_TAGS.skill) || has(contentOf(memo), TYPE_TAGS.policy))
        .map(contentOf)
        .join("\n\n")
    );
    return {
      mode: this.client.mode,
      project,
      counts,
      all_tokens_estimate: allTokens,
      active_tokens_estimate: activeTokens,
      skill_policy_tokens_estimate: skillPolicyTokens,
      compression_ratio_estimate: activeTokens ? Number((skillPolicyTokens / activeTokens).toFixed(3)) : 0,
      inactive_tokens_estimate: Math.max(0, allTokens - activeTokens)
    };
  }

  async maintain({
    project = DEFAULT_PROJECT,
    action = "cleanup",
    username = "sky",
    apply = false,
    maxTraceAgeDays = 30,
    minTraceValue = -3,
    shortMemoryTtlDays = 1,
    minSupport = 2
  }: MaintainInput = {}) {
    if (action === "setup") {
      return this.setupShortcuts(project, username);
    }

    const memos = await this.client.listPluginMemos(500);
    const projectMemos = memos.filter((memo) => hasTag(contentOf(memo), projectTag(project)));
    const traces = projectMemos.filter((memo) => has(contentOf(memo), TYPE_TAGS.trace) && !looksSecret(contentOf(memo)));
    const activeBefore = projectMemos.filter((memo) => {
      const content = contentOf(memo);
      return isActive(content) && !isExpired(content) && !looksSecret(content);
    });

    const expired = traces.filter((memo) => {
      const content = contentOf(memo);
      if (!isActive(content)) return false;
      if (isExpired(content)) return true;
      if (has(content, "#memory/short")) {
        if (extractDateTag(content, "expires")) return false;
        return daysSince(extractDateTag(content, "date")) >= shortMemoryTtlDays;
      }
      return false;
    });
    const lowValue = traces.filter((memo) => {
      const content = contentOf(memo);
      if (!isActive(content) || isExpired(content)) return false;
      return daysSince(extractDateTag(content, "date")) >= maxTraceAgeDays && extractValue(content) <= minTraceValue;
    });
    const toExpire = dedupe([...expired, ...lowValue]);
    const activeTokensBefore = estimateTokens(activeBefore.map(contentOf).join("\n\n"));
    const expiringTokens = estimateTokens(toExpire.map(contentOf).join("\n\n"));
    let markedExpired = 0;

    if (apply) {
      for (const memo of toExpire) {
        await this.client.updateMemo(memo, markExpired(contentOf(memo)));
        markedExpired += 1;
      }
    }

    const promotionCandidates = promotionTopics(
      traces.filter((memo) => {
        const content = contentOf(memo);
        return isActive(content) && !isExpired(content) && !toExpire.some((expiredMemo) => sameMemo(expiredMemo, memo));
      }),
      minSupport
    );
    const reflection = apply ? await this.reflect({ project, minSupport }) : { promoted: [] as PromotionResult[] };
    const activeAfter = apply
      ? (await this.client.listPluginMemos(500))
          .filter((memo) => hasTag(contentOf(memo), projectTag(project)))
          .filter((memo) => {
            const content = contentOf(memo);
            return isActive(content) && !isExpired(content) && !looksSecret(content);
          })
      : activeBefore.filter((memo) => !toExpire.some((expiredMemo) => sameMemo(expiredMemo, memo)));
    const activeTokensAfter = estimateTokens(activeAfter.map(contentOf).join("\n\n"));
    const estimatedTokensSaved = apply ? Math.max(0, activeTokensBefore - activeTokensAfter) : undefined;
    const maintenance = apply
      ? await this.client.createMemo(
          maintenanceMemo({
            project,
            expired: expired.length,
            lowValue: lowValue.length,
            promoted: reflection.promoted.length,
            expiringTokens,
            netTokensSaved: estimatedTokensSaved || 0,
            applied: apply
          })
        )
      : undefined;

    return {
      mode: this.client.mode,
      project,
      action,
      applied: apply,
      candidates: {
        expired: expired.length,
        low_value: lowValue.length,
        total_to_expire: toExpire.length
      },
      marked_expired: markedExpired,
      promotion_candidates: promotionCandidates,
      promoted: reflection.promoted,
      maintenance_memo: maintenance ? maintenance.name || maintenance.id : undefined,
      expiring_tokens_estimate: expiringTokens,
      active_tokens_before_estimate: activeTokensBefore,
      active_tokens_after_estimate: activeTokensAfter,
      estimated_tokens_saved: estimatedTokensSaved,
      shortcuts: {
        created: [],
        existing: [],
        total: 0
      },
      note: apply
        ? "Expired candidates were marked #status/expired and excluded from future recall."
        : "Dry run only. Pass apply: true to mark candidates #status/expired and compute net active-token savings after reflection."
    };
  }

  async setupShortcuts(project = DEFAULT_PROJECT, username = "sky") {
    const desired = [
      {
        title: "Active Work",
        filter: `"${projectTag(project)}" && "${TYPE_TAGS.work}" && "${STATUS_TAGS.active}"`
      },
      {
        title: "Decisions",
        filter: `"${projectTag(project)}" && "${TYPE_TAGS.decision}" && "${STATUS_TAGS.active}"`
      },
      {
        title: "Policies",
        filter: `"${projectTag(project)}" && ("${TYPE_TAGS.policy}" || "${TYPE_TAGS.skill}") && "${STATUS_TAGS.active}"`
      }
    ];
    const existing = await this.client.listShortcuts(username);
    const created: string[] = [];
    const reused: string[] = [];
    for (const shortcut of desired) {
      const match = existing.find((item) => item.title === shortcut.title);
      if (match) {
        reused.push(shortcut.title);
        continue;
      }
      await this.client.createShortcut(username, shortcut);
      created.push(shortcut.title);
    }
    return {
      mode: this.client.mode,
      project,
      action: "setup",
      applied: false,
      candidates: {
        expired: 0,
        low_value: 0,
        total_to_expire: 0
      },
      marked_expired: 0,
      promotion_candidates: [],
      promoted: [],
      maintenance_memo: undefined,
      expiring_tokens_estimate: 0,
      active_tokens_before_estimate: 0,
      active_tokens_after_estimate: 0,
      estimated_tokens_saved: undefined,
      username,
      shortcuts: {
        created,
        existing: reused,
        total: desired.length
      },
      note: "Shortcuts created for Active Work, Decisions, and Policies."
    };
  }
}
