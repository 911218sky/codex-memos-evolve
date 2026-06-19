export type StorageMode = "memos-api" | "local-json";

export interface MemoRecord {
  name?: string;
  id?: string | number;
  uid?: number;
  content?: string;
  snippet?: string;
  visibility?: string;
  state?: string;
  pinned?: boolean;
  relations?: Array<{ relatedMemo?: string; type?: string }>;
  property?: {
    hasTaskList?: boolean;
    hasIncompleteTasks?: boolean;
    [key: string]: unknown;
  };
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export interface ShortcutRecord {
  name?: string;
  title: string;
  filter: string;
}

export interface MemosClientOptions {
  baseUrl?: string;
  token?: string;
  localFile?: string;
  forceLocal?: boolean;
  envFile?: string;
}

export type RecordType = "trace" | "work" | "decision" | "feedback";
export type WorkState = "planned" | "in_progress" | "blocked" | "done" | "cancelled";
export type MaintainAction = "cleanup" | "setup";

export interface WriteInput {
  project?: string;
  recordType?: RecordType;
  state?: WorkState;
  summary?: string;
  goal?: string;
  plan?: string[];
  next?: string;
  why?: string;
  consequences?: string[];
  pinned?: boolean;
  task?: string;
  outcome?: string;
  observations?: string[];
  corrections?: string[];
  value?: number;
  tags?: string[];
  memory?: "short" | "long";
  ttlDays?: number;
}

export type TraceInput = WriteInput;

export interface PolicyMemoInput {
  project: string;
  slugName: string;
  title: string;
  support: number;
  lesson: string;
  evidence: string[];
  version: number;
}

export interface SkillMemoInput {
  project: string;
  slugName: string;
  title: string;
  support: number;
  workflow: string[];
  version: number;
}

export interface FeedbackInput {
  project?: string;
  target: string;
  rating: number;
  comment?: string;
}

export interface RecallInput {
  task: string;
  project?: string;
  maxTokens?: number;
}

export interface ReflectInput {
  project?: string;
  minSupport?: number;
}

export interface StatsInput {
  project?: string;
}

export interface MemoryCounts {
  trace: number;
  work: number;
  decision: number;
  policy: number;
  skill: number;
  feedback: number;
  environment: number;
  maintenance: number;
  expired: number;
  short: number;
  state_planned: number;
  state_in_progress: number;
  state_blocked: number;
  state_done: number;
  state_cancelled: number;
}

export interface PromotionResult {
  topic: string;
  support: number;
  version: number;
  policy: string | number | undefined;
  skill: string | number | undefined;
}

export interface MaintainInput {
  project?: string;
  action?: MaintainAction;
  username?: string;
  apply?: boolean;
  maxTraceAgeDays?: number;
  minTraceValue?: number;
  shortMemoryTtlDays?: number;
  minSupport?: number;
}
