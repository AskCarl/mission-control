export type ResearchDomain = "equities" | "metals" | "crypto" | "real-estate";

export type PortfolioContext = {
  source: "memory-file" | "mock";
  highlights: string[];
  rawExcerpt?: string;
};

export type ResearchFinding = {
  id: string;
  title: string;
  detail: string;
  domain: ResearchDomain | "outside-core";
  confidence: number;
  sourceModel: "grok" | "perplexity" | "deepseek" | "gemini" | "claude" | "synth";
  citations?: string[];
};

export type SentimentRow = {
  domain: ResearchDomain;
  score: number;
  label: "bearish" | "neutral" | "bullish";
  rationale: string;
};

export type ResearchModelOutput = {
  model: "grok" | "perplexity" | "deepseek" | "gemini" | "claude";
  whatChanged: ResearchFinding[];
  opportunities: ResearchFinding[];
  risks: ResearchFinding[];
  outsideCoreFocus: ResearchFinding[];
  sentiment: SentimentRow[];
  checklist: string[];
  sources: { label: string; url?: string; confidence: number }[];
};

export type ResearchBrief = {
  generatedAt: string;
  domains: ResearchDomain[];
  whatChanged: ResearchFinding[];
  topOpportunities: ResearchFinding[];
  topRisks: ResearchFinding[];
  outsideCoreFocus: ResearchFinding[];
  sectorSentiment: SentimentRow[];
  actionChecklist: string[];
  sources: { label: string; url?: string; confidence: number }[];
  confidenceAggregate: number;
  portfolioContext: PortfolioContext;
};

export type ResearchRunHistoryEntry = {
  id: string;
  timestamp: string;
  domains: ResearchDomain[];
  keyFindingsCount: number;
  confidenceAggregate: number;
};

export type ResearchModelAdapter = {
  name: "grok" | "perplexity" | "deepseek" | "gemini" | "claude";
  run: (input: {
    domains: ResearchDomain[];
    portfolioContext: PortfolioContext;
    priorRun?: ResearchRunHistoryEntry;
  }) => Promise<ResearchModelOutput>;
};

// ---------------------------------------------------------------------------
// ARA orchestration primitives (additive — do not replace above)
// ---------------------------------------------------------------------------

export type TaskState = "queued" | "running" | "completed" | "failed";

export type RetryErrorCode =
  | "RATE_LIMITED"
  | "AUTH_FAILED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "VALIDATION_ERROR"
  | "BACKEND_UNAVAILABLE"
  | "UNKNOWN";

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableErrorCodes: RetryErrorCode[];
  jitter?: boolean;
}

export interface AdapterResult {
  adapterId: string;
  model?: string;
  ok: boolean;
  shadow?: boolean;
  findings?: ResearchFinding[];
  brief?: ResearchBrief;
  sentimentRows?: SentimentRow[];
  providerRequestId?: string;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  raw?: unknown;
  errorCode?: RetryErrorCode;
  errorMessage?: string;
  httpStatus?: number;
}

export interface TaskRecord {
  id: string;
  taskType: "autonomous_research";
  state: TaskState;
  title: string;
  prompt: string;
  domain?: ResearchDomain;
  portfolioContext?: PortfolioContext;
  requestedBy?: string;
  assignedWorkerId?: string;
  adapterSequence: string[];
  currentAdapterId?: string;
  retryPolicy: RetryPolicy;
  attempt: number;
  maxAttempts: number;
  idempotencyKey?: string;
  createdAtMs: number;
  queuedAtMs?: number;
  startedAtMs?: number;
  updatedAtMs: number;
  completedAtMs?: number;
  failedAtMs?: number;
  nextRetryAtMs?: number;
  result?: {
    modelOutput?: ResearchModelOutput;
    brief?: ResearchBrief;
    findings?: ResearchFinding[];
    adapterResults?: AdapterResult[];
  };
  failure?: {
    errorCode: RetryErrorCode;
    message: string;
    retryable: boolean;
    adapterId?: string;
    attempt: number;
    stack?: string;
  };
  history?: ResearchRunHistoryEntry[];
}
