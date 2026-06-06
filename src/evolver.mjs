import { DEFAULT_MAX_RECALL_TOKENS, DEFAULT_PROJECT, STATUS_TAGS, TYPE_TAGS } from "./constants.mjs";
import { feedbackMemo, policyMemo, projectTag, skillMemo, skillTag, slug, traceMemo } from "./format.mjs";
import { compactLines, estimateTokens, truncateByTokens } from "./token.mjs";

function contentOf(memo) {
  return memo.content || memo.snippet || "";
}

function has(content, tag) {
  return content.includes(tag);
}

function isActive(content) {
  return content.includes(STATUS_TAGS.active) && !content.includes(STATUS_TAGS.superseded);
}

function looksSecret(content) {
  return /(sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|api[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{16,})/i.test(content);
}

function extractSection(content, heading) {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  return content.match(pattern)?.[1]?.trim() || "";
}

function extractSupport(content) {
  const match = content.match(/#support\/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function extractVersion(content) {
  const match = content.match(/#version\/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function extractSkillSlug(content) {
  return content.match(/#skill\/([a-z0-9\u3400-\u9fff-]+)/)?.[1] || "";
}

function extractRating(content) {
  const match = content.match(/#rating\/(-?\d+)/);
  return match ? Number(match[1]) : 0;
}

function extractTarget(content) {
  return content.match(/#target\/([a-z0-9\u3400-\u9fff-]+)/)?.[1] || "";
}

function shouldSkipRecall(task) {
  const text = String(task || "").trim().toLowerCase();
  return /^(what time is it\??|time\??|date\??|pwd|ls|hello|hi|ping)$/i.test(text);
}

function topicCandidates(text) {
  const tags = [...text.matchAll(/#topic\/([a-z0-9\u3400-\u9fff-]+)/g)].map((m) => m[1]);
  if (tags.length) return tags;
  const task = extractSection(text, "Task") || text;
  const words = task
    .toLowerCase()
    .match(/[a-z0-9\u3400-\u9fff]{3,}/g) || [];
  return words.slice(0, 3);
}

function deriveLesson(traces) {
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

function evidenceFor(traces) {
  return traces.slice(0, 5).map((memo) => {
    const task = extractSection(contentOf(memo), "Task").replace(/\s+/g, " ").slice(0, 160);
    const value = extractSection(contentOf(memo), "Value");
    return `${task || "Trace"}${value ? ` (value ${value})` : ""}`;
  });
}

export class EvolveEngine {
  constructor(client) {
    this.client = client;
  }

  async recall({ task, project = DEFAULT_PROJECT, maxTokens = DEFAULT_MAX_RECALL_TOKENS }) {
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
      this.client.listPluginMemos(200),
      this.client.searchMemos(queryTerms, 80)
    ]);
    const merged = dedupe([...taskMemos, ...pluginMemos]);
    const activeProject = merged.filter((memo) => {
      const content = contentOf(memo);
      return content.includes(projectTag(project)) && isActive(content) && !looksSecret(content);
    });
    const feedbacks = activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.feedback));
    const feedbackScore = feedbackIndex(feedbacks);
    const skills = latestBySkill(activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.skill)), feedbackScore).sort(byRecallScore(feedbackScore, task));
    const policies = latestBySkill(activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.policy)), feedbackScore).sort(byRecallScore(feedbackScore, task));
    const environment = activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.environment));
    const traces = activeProject.filter((memo) => has(contentOf(memo), TYPE_TAGS.trace)).slice(0, 5);

    const lines = [
      `# Memos Evolve Recall (${this.client.mode})`,
      `Task: ${task || "unspecified"}`,
      "",
      "## Active Skills",
      ...skills.slice(0, 4).map((memo) => summarizeMemo(memo, "Skill")),
      "",
      "## Policies",
      ...policies.slice(0, 6).map((memo) => summarizeMemo(memo, "Policy")),
      "",
      "## Environment",
      ...environment.slice(0, 3).map((memo) => summarizeMemo(memo, "Environment")),
      "",
      "## Recent Trace Hints",
      ...traces.map((memo) => summarizeMemo(memo, "Trace"))
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

  async recordTrace(input) {
    const content = traceMemo(input);
    if (looksSecret(content)) {
      throw new Error("Refusing to store trace because it appears to contain a secret or API token.");
    }
    const memo = await this.client.createMemo(content);
    return { created: memo.name || memo.id, mode: this.client.mode };
  }

  async reflect({ project = DEFAULT_PROJECT, minSupport = 2 } = {}) {
    const memos = await this.client.listPluginMemos(500);
    const projectMemos = memos.filter((memo) => contentOf(memo).includes(projectTag(project)));
    const traces = projectMemos.filter((memo) => {
      const content = contentOf(memo);
      return has(content, TYPE_TAGS.trace) && isActive(content) && !looksSecret(content);
    });
    const existingSkills = projectMemos.filter((memo) => has(contentOf(memo), TYPE_TAGS.skill));
    const byTopic = new Map();
    for (const trace of traces) {
      for (const topic of topicCandidates(contentOf(trace)).slice(0, 2)) {
        if (!byTopic.has(topic)) byTopic.set(topic, []);
        byTopic.get(topic).push(trace);
      }
    }

    const promoted = [];
    for (const [topic, topicTraces] of byTopic.entries()) {
      if (topicTraces.length < minSupport) continue;
      const prior = existingSkills
        .filter((memo) => contentOf(memo).includes(skillTag(topic)))
        .sort(byVersion)[0];
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
          "After finishing, record whether the skill helped and what should change."
        ]
      }));
      promoted.push({ topic: slug(topic), support, version, policy: policy.name || policy.id, skill: skill.name || skill.id });
    }

    return {
      mode: this.client.mode,
      project,
      traces_seen: traces.length,
      promoted
    };
  }

  async feedback({ project = DEFAULT_PROJECT, target, rating, comment }) {
    if (looksSecret(comment)) {
      throw new Error("Refusing to store feedback because it appears to contain a secret or API token.");
    }
    const memo = await this.client.createMemo(feedbackMemo({ project, target, rating, comment }));
    return { created: memo.name || memo.id, mode: this.client.mode };
  }

  async stats({ project = DEFAULT_PROJECT } = {}) {
    const memos = await this.client.listPluginMemos(500);
    const projectMemos = memos.filter((memo) => contentOf(memo).includes(projectTag(project)));
    const counts = { trace: 0, policy: 0, skill: 0, feedback: 0, environment: 0 };
    for (const memo of projectMemos) {
      const content = contentOf(memo);
      if (has(content, TYPE_TAGS.trace)) counts.trace += 1;
      if (has(content, TYPE_TAGS.policy)) counts.policy += 1;
      if (has(content, TYPE_TAGS.skill)) counts.skill += 1;
      if (has(content, TYPE_TAGS.feedback)) counts.feedback += 1;
      if (has(content, TYPE_TAGS.environment)) counts.environment += 1;
    }
    const allTokens = estimateTokens(projectMemos.map(contentOf).join("\n\n"));
    const skillPolicyTokens = estimateTokens(projectMemos
      .filter((memo) => has(contentOf(memo), TYPE_TAGS.skill) || has(contentOf(memo), TYPE_TAGS.policy))
      .map(contentOf)
      .join("\n\n"));
    return {
      mode: this.client.mode,
      project,
      counts,
      all_tokens_estimate: allTokens,
      skill_policy_tokens_estimate: skillPolicyTokens,
      compression_ratio_estimate: allTokens ? Number((skillPolicyTokens / allTokens).toFixed(3)) : 0
    };
  }
}

function dedupe(memos) {
  const seen = new Set();
  return memos.filter((memo) => {
    const key = memo.name || memo.id || contentOf(memo);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bySupport(a, b) {
  return extractSupport(contentOf(b)) - extractSupport(contentOf(a));
}

function byVersion(a, b) {
  return extractVersion(contentOf(b)) - extractVersion(contentOf(a));
}

function feedbackIndex(feedbacks) {
  const scores = new Map();
  for (const memo of feedbacks) {
    const content = contentOf(memo);
    const target = extractTarget(content);
    if (!target) continue;
    scores.set(target, (scores.get(target) || 0) + extractRating(content));
  }
  return scores;
}

function latestBySkill(memos, feedbackScore) {
  const groups = new Map();
  for (const memo of memos) {
    const content = contentOf(memo);
    const slugName = extractSkillSlug(content) || slug(extractSection(content, "Skill") || extractSection(content, "Policy"));
    if ((feedbackScore.get(slugName) || 0) <= -3) continue;
    const prior = groups.get(slugName);
    if (!prior || extractVersion(content) > extractVersion(contentOf(prior))) groups.set(slugName, memo);
  }
  return [...groups.values()];
}

function byRecallScore(feedbackScore, task) {
  const taskTerms = new Set(topicCandidates(task || ""));
  return (a, b) => recallScore(b, feedbackScore, taskTerms) - recallScore(a, feedbackScore, taskTerms);
}

function recallScore(memo, feedbackScore, taskTerms) {
  const content = contentOf(memo);
  const slugName = extractSkillSlug(content);
  const relevance = slugName && taskTerms.has(slugName) ? 10 : 0;
  return extractSupport(content) * 2 + extractVersion(content) + (feedbackScore.get(slugName) || 0) * 3 + relevance;
}

function summarizeMemo(memo, label) {
  const content = contentOf(memo);
  const title = extractSection(content, label) || extractSection(content, "Policy") || extractSection(content, "Task") || content;
  const support = extractSupport(content);
  const version = extractVersion(content);
  return `- ${title.replace(/\s+/g, " ").slice(0, 220)} [support=${support}, version=${version}]`;
}
