import { randomUUID } from "crypto";
import { grokAdapter, perplexityAdapter, deepseekAdapter, geminiAdapter, claudeAdapter } from "./adapters";
import { getPortfolioContext } from "./portfolio-context";
import { mockResearchRunHistory } from "./run-history";
import { getNextDelayMs } from "./retry";
import { type ITaskQueue } from "./queue";
import { convexQueue } from "./convex-queue";
import type {
  TaskRecord,
  RetryPolicy,
  RetryErrorCode,
  AdapterResult,
  ResearchModelAdapter,
  ResearchDomain,
  ResearchFinding,
  ResearchModelOutput,
  ResearchBrief,
  SentimentRow,
} from "./types";

// ---------------------------------------------------------------------------
// Default retry policy
// ---------------------------------------------------------------------------

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30_000,
  retryableErrorCodes: ["RATE_LIMITED", "NETWORK_ERROR", "TIMEOUT", "BACKEND_UNAVAILABLE"],
  jitter: true,
};

const ADAPTER_SEQUENCE = ["grok", "perplexity", "deepseek"] as const;

// Shadow adapters run in parallel after the main loop — results are logged
// for eval but excluded from brief synthesis. Promote to ADAPTER_SEQUENCE
// once quality/cost validation passes (~20 runs).
const SHADOW_ADAPTER_IDS = ["gemini", "claude"] as const;

const ADAPTERS: Record<string, ResearchModelAdapter> = {
  grok: grokAdapter,
  perplexity: perplexityAdapter,
  deepseek: deepseekAdapter,
  gemini: geminiAdapter,
  claude: claudeAdapter,
};

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Classify unknown errors into RetryErrorCode
// ---------------------------------------------------------------------------

function classifyError(err: unknown): { code: RetryErrorCode; message: string; stack?: string } {
  if (err instanceof Error) {
    const code: RetryErrorCode =
      "errorCode" in err ? (err as { errorCode: RetryErrorCode }).errorCode : "UNKNOWN";
    return { code, message: err.message, stack: err.stack };
  }
  return { code: "UNKNOWN", message: String(err) };
}

// ---------------------------------------------------------------------------
// Run a single adapter with retry, returning a normalized AdapterResult
// ---------------------------------------------------------------------------

async function runAdapterWithRetry(
  adapter: ResearchModelAdapter,
  input: {
    domains: ResearchDomain[];
    portfolioContext: Awaited<ReturnType<typeof getPortfolioContext>>;
    priorRun: (typeof mockResearchRunHistory)[0] | undefined;
  },
  policy: RetryPolicy,
  taskId: string
): Promise<AdapterResult> {
  let attempt = 0;

  while (true) {
    attempt++;
    const startMs = Date.now();

    try {
      const output = await adapter.run(input);
      const latencyMs = Date.now() - startMs;

      console.log(
        `[ara-worker] task=${taskId} adapter=${adapter.name} attempt=${attempt} ok latency=${latencyMs}ms`
      );

      return {
        adapterId: adapter.name,
        ok: true,
        findings: [
          ...output.whatChanged,
          ...output.opportunities,
          ...output.risks,
          ...output.outsideCoreFocus,
        ],
        sentimentRows: output.sentiment,
        latencyMs,
        raw: output,
      };
    } catch (err) {
      const latencyMs = Date.now() - startMs;
      const { code, message, stack } = classifyError(err);
      const isRetryable = policy.retryableErrorCodes.includes(code);
      const delayMs = getNextDelayMs(policy, attempt);
      const canRetry = isRetryable && delayMs !== null;

      console.error(
        `[ara-worker] task=${taskId} adapter=${adapter.name} attempt=${attempt} error=${code} retryable=${isRetryable} delay=${delayMs ?? "none"} msg=${message}`
      );

      if (!canRetry) {
        return {
          adapterId: adapter.name,
          ok: false,
          latencyMs,
          errorCode: code,
          errorMessage: message,
          raw: stack,
        };
      }

      await sleep(delayMs!);
    }
  }
}

// ---------------------------------------------------------------------------
// Brief synthesizer (mirrors service.ts logic, operates on adapter outputs)
// ---------------------------------------------------------------------------

function topByConfidence(items: ResearchFinding[], n: number): ResearchFinding[] {
  return [...items].sort((a, b) => b.confidence - a.confidence).slice(0, n);
}

function synthesizeBrief(outputs: ResearchModelOutput[], domains: ResearchDomain[]): ResearchBrief {
  const allDomains: ResearchDomain[] = ["equities", "metals", "crypto", "real-estate"];

  const sectorSentiment: SentimentRow[] = allDomains.map((domain) => {
    const rows = outputs
      .map((o) => o.sentiment.find((s) => s.domain === domain))
      .filter(Boolean) as SentimentRow[];
    const score = rows.length
      ? rows.reduce((acc, r) => acc + r.score, 0) / rows.length
      : 0;
    return {
      domain,
      score,
      label: score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "neutral",
      rationale: rows.map((r) => r.rationale).join(" | "),
    };
  });

  const all = outputs.flatMap((o) => [
    ...o.whatChanged,
    ...o.opportunities,
    ...o.risks,
    ...o.outsideCoreFocus,
  ]);
  const confidenceAggregate = all.length
    ? Number((all.reduce((acc, f) => acc + f.confidence, 0) / all.length).toFixed(2))
    : 0;

  const checklist = Array.from(
    new Set([
      ...outputs.flatMap((o) => o.checklist),
      "Rank opportunities by portfolio fit and downside protection",
    ])
  );

  return {
    generatedAt: new Date().toISOString(),
    domains,
    whatChanged: topByConfidence(outputs.flatMap((o) => o.whatChanged), 4),
    topOpportunities: topByConfidence(outputs.flatMap((o) => o.opportunities), 5),
    topRisks: topByConfidence(outputs.flatMap((o) => o.risks), 5),
    outsideCoreFocus: topByConfidence(outputs.flatMap((o) => o.outsideCoreFocus), 4),
    sectorSentiment,
    actionChecklist: checklist,
    sources: outputs.flatMap((o) => o.sources),
    confidenceAggregate,
    portfolioContext: { source: "mock", highlights: [] },
  };
}

// ---------------------------------------------------------------------------
// Core task processor
// ---------------------------------------------------------------------------

export async function processTask(
  task: TaskRecord,
  queue: ITaskQueue = convexQueue
): Promise<TaskRecord> {
  const portfolioContext = await getPortfolioContext();
  const priorRun = mockResearchRunHistory[0];
  const domains: ResearchDomain[] = task.domain
    ? [task.domain]
    : ["equities", "metals", "crypto", "real-estate"];

  // queued -> running
  let current = await queue.update(task.id, {
    state: "running",
    startedAtMs: Date.now(),
  });

  console.log(`[ara-worker] task=${task.id} state=running adapters=${task.adapterSequence.join(",")}`);

  const adapterResults: AdapterResult[] = [];
  const successOutputs: ResearchModelOutput[] = [];

  for (const adapterId of task.adapterSequence) {
    const adapter = ADAPTERS[adapterId];
    if (!adapter) {
      console.warn(`[ara-worker] task=${task.id} unknown adapter=${adapterId}, skipping`);
      continue;
    }

    // track which adapter is currently running
    current = await queue.update(task.id, { currentAdapterId: adapterId });

    const result = await runAdapterWithRetry(
      adapter,
      { domains, portfolioContext, priorRun },
      task.retryPolicy,
      task.id
    );

    adapterResults.push(result);

    if (result.ok && result.raw) {
      successOutputs.push(result.raw as ResearchModelOutput);
    }
  }

  // Run shadow adapters in parallel — eval only, excluded from brief synthesis
  if (SHADOW_ADAPTER_IDS.length > 0) {
    const shadowPromises = SHADOW_ADAPTER_IDS.map((adapterId) => {
      const adapter = ADAPTERS[adapterId];
      if (!adapter) return Promise.resolve(null);
      return runAdapterWithRetry(
        adapter,
        { domains, portfolioContext, priorRun },
        task.retryPolicy,
        task.id
      )
        .then((result): AdapterResult => ({ ...result, shadow: true }))
        .catch((err): null => {
          console.error(
            `[ara-worker] [shadow] task=${task.id} adapter=${adapterId} unhandled: ${String(err)}`
          );
          return null;
        });
    });

    const shadowResults = await Promise.all(shadowPromises);
    for (const sr of shadowResults) {
      if (sr) {
        adapterResults.push(sr);
        console.log(
          `[ara-worker] [shadow] task=${task.id} adapter=${sr.adapterId} ok=${sr.ok} latency=${sr.latencyMs}ms`
        );
      }
    }
  }

  // require at least one successful main (non-shadow) adapter to produce a brief
  const mainResults = adapterResults.filter((r) => !r.shadow);
  const terminalFailure = mainResults.every((r) => !r.ok);

  if (terminalFailure) {
    const lastError = adapterResults[adapterResults.length - 1];
    console.error(`[ara-worker] task=${task.id} all adapters failed — marking failed`);

    return queue.update(task.id, {
      state: "failed",
      currentAdapterId: undefined,
      failedAtMs: Date.now(),
      failure: {
        errorCode: lastError.errorCode ?? "UNKNOWN",
        message: lastError.errorMessage ?? "All adapters failed",
        retryable: false,
        adapterId: lastError.adapterId,
        attempt: task.attempt,
      },
    });
  }

  const brief = synthesizeBrief(successOutputs, domains);
  // Keep portfolio context local — strip rawExcerpt before persisting to Convex
  brief.portfolioContext = portfolioContext
    ? { source: portfolioContext.source, highlights: portfolioContext.highlights }
    : undefined;

  console.log(
    `[ara-worker] task=${task.id} state=completed confidence=${brief.confidenceAggregate} adapters_ok=${successOutputs.length}/${adapterResults.length}`
  );

  return queue.update(task.id, {
    state: "completed",
    currentAdapterId: undefined,
    completedAtMs: Date.now(),
    result: {
      brief,
      findings: brief.whatChanged,
      adapterResults,
    },
  });
}

// ---------------------------------------------------------------------------
// Public entry point — create task + run immediately (in-process)
// ---------------------------------------------------------------------------

export interface RunResearchTaskInput {
  title: string;
  prompt: string;
  domain?: ResearchDomain;
  requestedBy?: string;
  idempotencyKey?: string;
  retryPolicy?: Partial<RetryPolicy>;
  queue?: ITaskQueue;
}

export async function runResearchTask(input: RunResearchTaskInput): Promise<TaskRecord> {
  const q = input.queue ?? convexQueue;
  const now = Date.now();
  const policy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...input.retryPolicy };

  const task: TaskRecord = {
    id: randomUUID(),
    taskType: "autonomous_research",
    state: "queued",
    title: input.title,
    prompt: input.prompt,
    domain: input.domain,
    requestedBy: input.requestedBy,
    idempotencyKey: input.idempotencyKey,
    adapterSequence: [...ADAPTER_SEQUENCE],
    retryPolicy: policy,
    attempt: 1,
    maxAttempts: policy.maxAttempts,
    createdAtMs: now,
    queuedAtMs: now,
    updatedAtMs: now,
  };

  await q.enqueue(task);
  console.log(`[ara-worker] task=${task.id} queued title="${input.title}"`);

  return processTask(task, q);
}
