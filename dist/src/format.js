import { DEFAULT_PROJECT, MEMORY_TAG, STATUS_TAGS, TYPE_TAGS } from "./constants.js";
export function projectTag(project = DEFAULT_PROJECT) {
    return `#project/${slug(project)}`;
}
export function skillTag(name) {
    return `#skill/${slug(name)}`;
}
export function slug(value) {
    return String(value || "default")
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64) || "default";
}
export function frontMatter(tags) {
    return [MEMORY_TAG, ...tags].filter(Boolean).join(" ");
}
export function traceMemo({ project = DEFAULT_PROJECT, task, outcome, observations = [], corrections = [], value = 0, tags = [], memory = "long", ttlDays }) {
    const date = new Date().toISOString().slice(0, 10);
    const normalizedTags = tags.map((tag) => (tag.startsWith("#") ? tag : `#topic/${slug(tag)}`));
    const normalizedTtl = ttlDays && ttlDays > 0 ? Math.ceil(ttlDays) : undefined;
    const memoryTags = [`#memory/${memory}`];
    if (normalizedTtl) {
        memoryTags.push(`#ttl/${normalizedTtl}`, `#expires/${dateAfterDays(normalizedTtl)}`);
    }
    return `${frontMatter([TYPE_TAGS.trace, STATUS_TAGS.active, projectTag(project), `#date/${date}`, ...memoryTags, ...normalizedTags])}

## Task
${task}

## Outcome
${outcome || "Unspecified"}

## Observations
${asBullets(observations)}

## Corrections
${asBullets(corrections)}

## Value
${Number(value) || 0}
`;
}
export function policyMemo({ project, slugName, title, support, lesson, evidence, version }) {
    const date = new Date().toISOString().slice(0, 10);
    return `${frontMatter([TYPE_TAGS.policy, STATUS_TAGS.active, projectTag(project), skillTag(slugName), `#support/${support}`, `#version/${version}`, `#date/${date}`])}

## Policy
${title}

## Rule
${lesson}

## Evidence
${asBullets(evidence)}

## Use When
The current task matches ${slugName} or repeats the evidence pattern.
`;
}
export function skillMemo({ project, slugName, title, support, workflow, version }) {
    const date = new Date().toISOString().slice(0, 10);
    return `${frontMatter([TYPE_TAGS.skill, STATUS_TAGS.active, projectTag(project), skillTag(slugName), `#support/${support}`, `#version/${version}`, `#date/${date}`])}

## Skill
${title}

## Trigger
Use this when the task resembles ${slugName} and the recall phase selected this memory.

## Workflow
${asNumbered(workflow)}

## Token Rule
Prefer this compact skill over replaying raw traces. Only fetch trace evidence when the skill is ambiguous or contradicted.
`;
}
export function feedbackMemo({ project = DEFAULT_PROJECT, target, rating, comment }) {
    const date = new Date().toISOString().slice(0, 10);
    return `${frontMatter([TYPE_TAGS.feedback, STATUS_TAGS.active, projectTag(project), `#target/${slug(target)}`, `#rating/${rating}`, `#date/${date}`])}

## Feedback
${comment || "No comment"}

## Target
${target}
`;
}
export function maintenanceMemo({ project = DEFAULT_PROJECT, expired, lowValue, promoted, expiringTokens, netTokensSaved, applied }) {
    const date = new Date().toISOString().slice(0, 10);
    return `${frontMatter([TYPE_TAGS.maintenance, STATUS_TAGS.active, projectTag(project), `#date/${date}`])}

## Maintenance
${applied ? "Applied memory maintenance." : "Previewed memory maintenance."}

## Summary
- Expired memories: ${expired}
- Low-value traces: ${lowValue}
- Promotions: ${promoted}
- Expiring tokens estimate: ${expiringTokens}
- Net active tokens saved estimate: ${netTokensSaved}
`;
}
function dateAfterDays(days) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
function asBullets(items) {
    const list = Array.isArray(items) ? items : String(items || "").split(/\n+/);
    const clean = list.map((item) => String(item).trim()).filter(Boolean);
    return clean.length ? clean.map((item) => `- ${item}`).join("\n") : "- None";
}
function asNumbered(items) {
    const list = Array.isArray(items) ? items : String(items || "").split(/\n+/);
    const clean = list.map((item) => String(item).trim()).filter(Boolean);
    return clean.length ? clean.map((item, index) => `${index + 1}. ${item}`).join("\n") : "1. Apply the policy directly.";
}
