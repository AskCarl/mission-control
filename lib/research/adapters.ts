import type {
  ResearchModelAdapter,
  ResearchModelOutput,
  ResearchFinding,
  SentimentRow,
  ResearchDomain,
  PortfolioContext,
  ResearchRunHistoryEntry,
  RetryErrorCode,
} from "./types";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// Keychain helper (macOS) — falls back gracefully if unavailable
// ---------------------------------------------------------------------------

function getKeychainSecret(service: string, account = "carlbot"): string | undefined {
  try {
    return execSync(
      `security find-generic-password -a "${account}" -s "${service}" -w 2>/dev/null`,
      { encoding: "utf-8" }
    ).trim();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Grok (XAI) — live adapter
// ---------------------------------------------------------------------------

const GROK_API_BASE = "https://api.x.ai/v1";
const GROK_MODEL = "grok-3";
const GROK_TIMEOUT_MS = 30_000;

class GrokAdapterError extends Error {
  constructor(
    message: string,
    public readonly errorCode: RetryErrorCode,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "GrokAdapterError";
  }
}

function classifyHttpError(status: number): RetryErrorCode {
  if (status === 429) return "RATE_LIMITED";
  if (status === 401 || status === 403) return "AUTH_FAILED";
  if (status === 408 || status === 504) return "TIMEOUT";
  if (status === 502 || status === 503) return "BACKEND_UNAVAILABLE";
  if (status >= 400 && status < 500) return "VALIDATION_ERROR";
  return "PROVIDER_ERROR";
}

function buildSystemPrompt(): string {
  return `You are a financial markets social pulse analyst embedded in the ARA (Autonomous Research Analyst) system. \
Your role is to surface real-time narrative shifts, sentiment signals, and catalyst chatter across financial markets.

Focus on:
- What has changed in market narrative recently
- Social/sentiment-driven opportunities
- Crowding and sentiment-driven risks
- Signals outside core focus that merit attention

Respond ONLY with a valid JSON object matching the exact schema in the user message. \
No prose, no markdown fences, no commentary outside the JSON.`;
}

function buildUserPrompt(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): string {
  const domainList = input.domains.join(", ");
  const portfolioHints = input.portfolioContext.highlights.length
    ? `Portfolio context: ${input.portfolioContext.highlights.join("; ")}`
    : "No specific portfolio context provided.";
  const priorNote = input.priorRun
    ? `Prior run: confidence ${Math.round(input.priorRun.confidenceAggregate * 100)}% on ${input.priorRun.timestamp}`
    : "No prior run data.";
  const domainUnion = input.domains.map((d) => `"${d}"`).join(" | ");

  return `Domains to analyze: ${domainList}
${portfolioHints}
${priorNote}

Return a JSON object with this exact structure:
{
  "whatChanged": [{ "id": string, "title": string, "detail": string, "domain": ${domainUnion} | "outside-core", "confidence": number }],
  "opportunities": [same shape],
  "risks": [same shape],
  "outsideCoreFocus": [same shape, domain must be "outside-core"],
  "sentiment": [{ "domain": ${domainUnion}, "score": number, "label": "bearish"|"neutral"|"bullish", "rationale": string }],
  "checklist": [string],
  "sources": [{ "label": string, "url"?: string, "confidence": number }]
}

Rules:
- 2–4 items per array (whatChanged, opportunities, risks, outsideCoreFocus)
- sentiment must have exactly one entry per domain: ${domainList}
- confidence and score values are floats: confidence 0.0–1.0, sentiment score -1.0–1.0
- id prefixes: "g-wc-" | "g-op-" | "g-r-" | "g-oc-" followed by a number`;
}

function injectSourceModel(findings: Omit<ResearchFinding, "sourceModel">[]): ResearchFinding[] {
  return findings.map((f) => ({ ...f, sourceModel: "grok" as const }));
}

function requireArray(obj: Record<string, unknown>, key: string): unknown[] {
  if (!Array.isArray(obj[key])) {
    throw new GrokAdapterError(`Missing or invalid field: ${key}`, "VALIDATION_ERROR");
  }
  return obj[key] as unknown[];
}

function validateAndNormalize(raw: unknown): ResearchModelOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new GrokAdapterError("Response is not a JSON object", "VALIDATION_ERROR");
  }
  const r = raw as Record<string, unknown>;

  return {
    model: "grok",
    whatChanged: injectSourceModel(requireArray(r, "whatChanged") as Omit<ResearchFinding, "sourceModel">[]),
    opportunities: injectSourceModel(requireArray(r, "opportunities") as Omit<ResearchFinding, "sourceModel">[]),
    risks: injectSourceModel(requireArray(r, "risks") as Omit<ResearchFinding, "sourceModel">[]),
    outsideCoreFocus: injectSourceModel(requireArray(r, "outsideCoreFocus") as Omit<ResearchFinding, "sourceModel">[]),
    sentiment: requireArray(r, "sentiment") as SentimentRow[],
    checklist: requireArray(r, "checklist") as string[],
    sources: (requireArray(r, "sources") as { label: string; url?: string; confidence: number }[]).map((s) => ({
      label: s.label,
      url: s.url,
      confidence: s.confidence ?? 0.5,
    })),
  };
}

async function runGrokAdapter(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): Promise<ResearchModelOutput> {
  const apiKey = process.env.XAI_API_KEY ?? getKeychainSecret("XAI_API_KEY");
  if (!apiKey) {
    throw new GrokAdapterError("XAI_API_KEY not configured (checked env + Keychain)", "AUTH_FAILED");
  }

  const startMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROK_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${GROK_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(input) },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new GrokAdapterError(
      isAbort ? "Grok request timed out" : `Network error: ${String(err)}`,
      isAbort ? "TIMEOUT" : "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Date.now() - startMs;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const errorCode = classifyHttpError(res.status);
    console.error(`[grok-adapter] HTTP ${res.status} after ${latencyMs}ms`, body.slice(0, 300));
    throw new GrokAdapterError(`Grok API error ${res.status}`, errorCode, res.status);
  }

  const json = await res.json();
  const content: unknown = json?.choices?.[0]?.message?.content;
  const tokensIn: number | undefined = json?.usage?.prompt_tokens;
  const tokensOut: number | undefined = json?.usage?.completion_tokens;

  console.log(`[grok-adapter] ok latency=${latencyMs}ms in=${tokensIn ?? "?"} out=${tokensOut ?? "?"}`);

  let parsed: unknown;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    throw new GrokAdapterError("Failed to parse Grok JSON response", "VALIDATION_ERROR");
  }

  return validateAndNormalize(parsed);
}

// ---------------------------------------------------------------------------
// Perplexity — live adapter (sourced web research + citations)
// ---------------------------------------------------------------------------

const PERPLEXITY_API_BASE = "https://api.perplexity.ai";
const PERPLEXITY_MODEL = "sonar-pro";
const PERPLEXITY_TIMEOUT_MS = 45_000;

class PerplexityAdapterError extends Error {
  constructor(
    message: string,
    public readonly errorCode: RetryErrorCode,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "PerplexityAdapterError";
  }
}

const PERPLEXITY_SYSTEM_PROMPT =
  "You are a JSON API endpoint for financial research. " +
  "Your output is consumed directly by a machine parser. " +
  "You MUST return ONLY a raw JSON object — no prose, no markdown, no code fences, no commentary. " +
  "Your entire response must start with { and end with }. Any other format will cause a hard failure.";

function buildPerplexityPrompt(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): string {
  const domainList = input.domains.join(", ");
  const portfolioHints = input.portfolioContext.highlights.length
    ? `Portfolio context: ${input.portfolioContext.highlights.join("; ")}`
    : "No specific portfolio context provided.";
  const domainUnion = input.domains.map((d) => `"${d}"`).join(" | ");

  return `IMPORTANT: Output raw JSON only. Start with { — no text before or after, no markdown fences.

Research these financial domains using current web sources: ${domainList}.
${portfolioHints}

Required JSON structure:
{
  "whatChanged": [{ "id": string, "title": string, "detail": string, "domain": ${domainUnion} | "outside-core", "confidence": number, "citations": string[] }],
  "opportunities": [same shape],
  "risks": [same shape],
  "outsideCoreFocus": [same shape, domain must be "outside-core"],
  "sentiment": [{ "domain": ${domainUnion}, "score": number, "label": "bearish"|"neutral"|"bullish", "rationale": string }],
  "checklist": [string],
  "sources": [{ "label": string, "url": string, "confidence": number }]
}

Rules:
- 2–4 items per array
- sentiment: exactly one entry per domain (${domainList})
- confidence 0.0–1.0, sentiment score -1.0–1.0
- id prefixes: "p-wc-" | "p-op-" | "p-r-" | "p-oc-"
- citations must be real URLs from your search results

BEGIN JSON OUTPUT:`;
}

/**
 * Robust JSON extractor — handles fenced blocks, leading prose, and trailing text.
 * Returns null if no valid JSON object can be extracted.
 */
function extractJson(raw: string): unknown | null {
  // 1. Direct parse
  try { return JSON.parse(raw); } catch { /* fall through */ }

  // 2. Strip outermost markdown fence and retry
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* fall through */ }
  }

  // 3. Find first { and walk brackets to extract balanced object
  const start = raw.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(raw.slice(start, i + 1)); } catch { break; }
        }
      }
    }
  }

  return null;
}

function injectSourceModelPerplexity(
  findings: Omit<ResearchFinding, "sourceModel">[]
): ResearchFinding[] {
  return findings.map((f) => ({ ...f, sourceModel: "perplexity" as const }));
}

function validatePerplexityOutput(raw: unknown): ResearchModelOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new PerplexityAdapterError("Response is not a JSON object", "VALIDATION_ERROR");
  }
  const r = raw as Record<string, unknown>;

  const requireArr = (key: string): unknown[] => {
    if (!Array.isArray(r[key])) {
      throw new PerplexityAdapterError(`Missing or invalid field: ${key}`, "VALIDATION_ERROR");
    }
    return r[key] as unknown[];
  };

  return {
    model: "perplexity",
    whatChanged: injectSourceModelPerplexity(requireArr("whatChanged") as Omit<ResearchFinding, "sourceModel">[]),
    opportunities: injectSourceModelPerplexity(requireArr("opportunities") as Omit<ResearchFinding, "sourceModel">[]),
    risks: injectSourceModelPerplexity(requireArr("risks") as Omit<ResearchFinding, "sourceModel">[]),
    outsideCoreFocus: injectSourceModelPerplexity(requireArr("outsideCoreFocus") as Omit<ResearchFinding, "sourceModel">[]),
    sentiment: requireArr("sentiment") as SentimentRow[],
    checklist: requireArr("checklist") as string[],
    sources: (requireArr("sources") as { label: string; url?: string; confidence: number }[]).map(
      (s) => ({ label: s.label, url: s.url, confidence: s.confidence ?? 0.5 })
    ),
  };
}

async function runPerplexityAdapter(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): Promise<ResearchModelOutput> {
  const apiKey = process.env.PERPLEXITY_API_KEY ?? getKeychainSecret("PERPLEXITY_API_KEY");
  if (!apiKey) {
    throw new PerplexityAdapterError("PERPLEXITY_API_KEY not configured (checked env + Keychain)", "AUTH_FAILED");
  }

  const startMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${PERPLEXITY_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          { role: "system", content: PERPLEXITY_SYSTEM_PROMPT },
          { role: "user", content: buildPerplexityPrompt(input) },
        ],
        temperature: 0.2,
        max_tokens: 4096,
        return_citations: true,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new PerplexityAdapterError(
      isAbort ? "Perplexity request timed out" : `Network error: ${String(err)}`,
      isAbort ? "TIMEOUT" : "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Date.now() - startMs;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const errorCode = classifyHttpError(res.status);
    console.error(`[perplexity-adapter] HTTP ${res.status} after ${latencyMs}ms`, body.slice(0, 300));
    throw new PerplexityAdapterError(`Perplexity API error ${res.status}`, errorCode, res.status);
  }

  const json = await res.json();
  const content: unknown = json?.choices?.[0]?.message?.content;
  const tokensIn: number | undefined = json?.usage?.prompt_tokens;
  const tokensOut: number | undefined = json?.usage?.completion_tokens;

  console.log(
    `[perplexity-adapter] ok latency=${latencyMs}ms in=${tokensIn ?? "?"} out=${tokensOut ?? "?"}`
  );

  const rawStr = typeof content === "string" ? content : JSON.stringify(content);
  const parsed = extractJson(rawStr);

  if (parsed === null) {
    console.error(
      `[perplexity-adapter] JSON extraction failed. Raw excerpt:\n${rawStr.slice(0, 600)}`
    );
    throw new PerplexityAdapterError(
      "Failed to extract valid JSON from Perplexity response",
      "VALIDATION_ERROR"
    );
  }

  return validatePerplexityOutput(parsed);
}

// ---------------------------------------------------------------------------
// DeepSeek — live adapter (deep analysis + scenario framing)
// ---------------------------------------------------------------------------

const DEEPSEEK_API_BASE = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-chat";
const DEEPSEEK_TIMEOUT_MS = 60_000;

class DeepSeekAdapterError extends Error {
  constructor(
    message: string,
    public readonly errorCode: RetryErrorCode,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "DeepSeekAdapterError";
  }
}

function buildDeepSeekSystemPrompt(): string {
  return `You are a quantitative financial analyst specializing in scenario framing, cross-asset correlation analysis, \
and risk/opportunity modeling. Your role in the ARA (Autonomous Research Analyst) system is to provide deep structural \
analysis and probabilistic scenario framing across financial markets.

Focus on:
- Cross-asset regime shifts and correlation changes
- Scenario trees with probabilistic framing (bull/base/bear)
- Structural risks and asymmetric opportunities
- Tail risks that sentiment-focused models may miss

Respond ONLY with a valid JSON object matching the exact schema in the user message. \
No prose, no markdown fences, no commentary outside the JSON.`;
}

function buildDeepSeekUserPrompt(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): string {
  const domainList = input.domains.join(", ");
  const portfolioHints = input.portfolioContext.highlights.length
    ? `Portfolio context: ${input.portfolioContext.highlights.join("; ")}`
    : "No specific portfolio context provided.";
  const priorNote = input.priorRun
    ? `Prior run: confidence ${Math.round(input.priorRun.confidenceAggregate * 100)}% on ${input.priorRun.timestamp}`
    : "No prior run data.";
  const domainUnion = input.domains.map((d) => `"${d}"`).join(" | ");

  return `Domains to analyze: ${domainList}
${portfolioHints}
${priorNote}

Return a JSON object with this exact structure:
{
  "whatChanged": [{ "id": string, "title": string, "detail": string, "domain": ${domainUnion} | "outside-core", "confidence": number }],
  "opportunities": [same shape],
  "risks": [same shape],
  "outsideCoreFocus": [same shape, domain must be "outside-core"],
  "sentiment": [{ "domain": ${domainUnion}, "score": number, "label": "bearish"|"neutral"|"bullish", "rationale": string }],
  "checklist": [string],
  "sources": [{ "label": string, "confidence": number }]
}

Rules:
- 2–4 items per array
- sentiment must have exactly one entry per domain: ${domainList}
- confidence 0.0–1.0, sentiment score -1.0–1.0
- id prefixes: "d-wc-" | "d-op-" | "d-r-" | "d-oc-"`;
}

function injectSourceModelDeepSeek(
  findings: Omit<ResearchFinding, "sourceModel">[]
): ResearchFinding[] {
  return findings.map((f) => ({ ...f, sourceModel: "deepseek" as const }));
}

function validateDeepSeekOutput(raw: unknown): ResearchModelOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new DeepSeekAdapterError("Response is not a JSON object", "VALIDATION_ERROR");
  }
  const r = raw as Record<string, unknown>;

  const requireArr = (key: string): unknown[] => {
    if (!Array.isArray(r[key])) {
      throw new DeepSeekAdapterError(`Missing or invalid field: ${key}`, "VALIDATION_ERROR");
    }
    return r[key] as unknown[];
  };

  return {
    model: "deepseek",
    whatChanged: injectSourceModelDeepSeek(requireArr("whatChanged") as Omit<ResearchFinding, "sourceModel">[]),
    opportunities: injectSourceModelDeepSeek(requireArr("opportunities") as Omit<ResearchFinding, "sourceModel">[]),
    risks: injectSourceModelDeepSeek(requireArr("risks") as Omit<ResearchFinding, "sourceModel">[]),
    outsideCoreFocus: injectSourceModelDeepSeek(requireArr("outsideCoreFocus") as Omit<ResearchFinding, "sourceModel">[]),
    sentiment: requireArr("sentiment") as SentimentRow[],
    checklist: requireArr("checklist") as string[],
    sources: (requireArr("sources") as { label: string; url?: string; confidence: number }[]).map(
      (s) => ({ label: s.label, url: s.url, confidence: s.confidence ?? 0.5 })
    ),
  };
}

async function runDeepSeekAdapter(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): Promise<ResearchModelOutput> {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? getKeychainSecret("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new DeepSeekAdapterError("DEEPSEEK_API_KEY not configured (checked env + Keychain)", "AUTH_FAILED");
  }

  const startMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildDeepSeekSystemPrompt() },
          { role: "user", content: buildDeepSeekUserPrompt(input) },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new DeepSeekAdapterError(
      isAbort ? "DeepSeek request timed out" : `Network error: ${String(err)}`,
      isAbort ? "TIMEOUT" : "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Date.now() - startMs;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const errorCode = classifyHttpError(res.status);
    console.error(`[deepseek-adapter] HTTP ${res.status} after ${latencyMs}ms`, body.slice(0, 300));
    throw new DeepSeekAdapterError(`DeepSeek API error ${res.status}`, errorCode, res.status);
  }

  const json = await res.json();
  const content: unknown = json?.choices?.[0]?.message?.content;
  const tokensIn: number | undefined = json?.usage?.prompt_tokens;
  const tokensOut: number | undefined = json?.usage?.completion_tokens;

  console.log(
    `[deepseek-adapter] ok latency=${latencyMs}ms in=${tokensIn ?? "?"} out=${tokensOut ?? "?"}`
  );

  let parsed: unknown;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    throw new DeepSeekAdapterError("Failed to parse DeepSeek JSON response", "VALIDATION_ERROR");
  }

  return validateDeepSeekOutput(parsed);
}

// ---------------------------------------------------------------------------
// Gemini (Google AI) — shadow adapter (broad synthesis + cross-asset analysis)
// ---------------------------------------------------------------------------

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_TIMEOUT_MS = 60_000;

class GeminiAdapterError extends Error {
  constructor(
    message: string,
    public readonly errorCode: RetryErrorCode,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "GeminiAdapterError";
  }
}

function buildGeminiSystemPrompt(): string {
  return `You are a broad-market financial synthesis analyst in the ARA (Autonomous Research Analyst) system. \
Your strength is cross-asset correlation analysis, geopolitical context, and synthesizing diverse market signals \
into a coherent macro picture.

Focus on:
- Cross-asset regime shifts (equities, bonds, commodities, crypto correlations)
- Geopolitical and macro drivers behind market moves
- News synthesis: which headlines actually matter and why
- Broad structural opportunities and tail risks

Respond ONLY with a valid JSON object matching the exact schema in the user message. \
No prose, no markdown fences, no commentary outside the JSON.`;
}

function buildGeminiUserPrompt(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): string {
  const domainList = input.domains.join(", ");
  const portfolioHints = input.portfolioContext.highlights.length
    ? `Portfolio context: ${input.portfolioContext.highlights.join("; ")}`
    : "No specific portfolio context provided.";
  const priorNote = input.priorRun
    ? `Prior run: confidence ${Math.round(input.priorRun.confidenceAggregate * 100)}% on ${input.priorRun.timestamp}`
    : "No prior run data.";
  const domainUnion = input.domains.map((d) => `"${d}"`).join(" | ");

  return `Domains to analyze: ${domainList}
${portfolioHints}
${priorNote}

Return a JSON object with this exact structure:
{
  "whatChanged": [{ "id": string, "title": string, "detail": string, "domain": ${domainUnion} | "outside-core", "confidence": number }],
  "opportunities": [same shape],
  "risks": [same shape],
  "outsideCoreFocus": [same shape, domain must be "outside-core"],
  "sentiment": [{ "domain": ${domainUnion}, "score": number, "label": "bearish"|"neutral"|"bullish", "rationale": string }],
  "checklist": [string],
  "sources": [{ "label": string, "confidence": number }]
}

Rules:
- 2–4 items per array
- sentiment must have exactly one entry per domain: ${domainList}
- confidence 0.0–1.0, sentiment score -1.0–1.0
- id prefixes: "gem-wc-" | "gem-op-" | "gem-r-" | "gem-oc-" followed by a number`;
}

function injectSourceModelGemini(
  findings: Omit<ResearchFinding, "sourceModel">[]
): ResearchFinding[] {
  return findings.map((f) => ({ ...f, sourceModel: "gemini" as const }));
}

function validateGeminiOutput(raw: unknown): ResearchModelOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new GeminiAdapterError("Response is not a JSON object", "VALIDATION_ERROR");
  }
  const r = raw as Record<string, unknown>;

  const requireArr = (key: string): unknown[] => {
    if (!Array.isArray(r[key])) {
      throw new GeminiAdapterError(`Missing or invalid field: ${key}`, "VALIDATION_ERROR");
    }
    return r[key] as unknown[];
  };

  return {
    model: "gemini",
    whatChanged: injectSourceModelGemini(requireArr("whatChanged") as Omit<ResearchFinding, "sourceModel">[]),
    opportunities: injectSourceModelGemini(requireArr("opportunities") as Omit<ResearchFinding, "sourceModel">[]),
    risks: injectSourceModelGemini(requireArr("risks") as Omit<ResearchFinding, "sourceModel">[]),
    outsideCoreFocus: injectSourceModelGemini(requireArr("outsideCoreFocus") as Omit<ResearchFinding, "sourceModel">[]),
    sentiment: requireArr("sentiment") as SentimentRow[],
    checklist: requireArr("checklist") as string[],
    sources: (requireArr("sources") as { label: string; url?: string; confidence: number }[]).map(
      (s) => ({ label: s.label, url: s.url, confidence: s.confidence ?? 0.5 })
    ),
  };
}

async function runGeminiAdapter(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): Promise<ResearchModelOutput> {
  const apiKey = process.env.GEMINI_API_KEY ?? getKeychainSecret("GEMINI_API_KEY");
  if (!apiKey) {
    throw new GeminiAdapterError("GEMINI_API_KEY not configured (checked env + Keychain)", "AUTH_FAILED");
  }

  const startMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildGeminiSystemPrompt() }],
          },
          contents: [
            { role: "user", parts: [{ text: buildGeminiUserPrompt(input) }] },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
        signal: controller.signal,
      }
    );
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new GeminiAdapterError(
      isAbort ? "Gemini request timed out" : `Network error: ${String(err)}`,
      isAbort ? "TIMEOUT" : "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Date.now() - startMs;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const errorCode = classifyHttpError(res.status);
    console.error(`[gemini-adapter] HTTP ${res.status} after ${latencyMs}ms`, body.slice(0, 300));
    throw new GeminiAdapterError(`Gemini API error ${res.status}`, errorCode, res.status);
  }

  const json = await res.json();
  const content: unknown = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  const tokensIn: number | undefined = json?.usageMetadata?.promptTokenCount;
  const tokensOut: number | undefined = json?.usageMetadata?.candidatesTokenCount;

  console.log(`[gemini-adapter] ok latency=${latencyMs}ms in=${tokensIn ?? "?"} out=${tokensOut ?? "?"}`);

  const rawStr = typeof content === "string" ? content : JSON.stringify(content);
  const parsed = extractJson(rawStr);

  if (parsed === null) {
    console.error(
      `[gemini-adapter] JSON extraction failed. Raw excerpt:\n${rawStr.slice(0, 600)}`
    );
    throw new GeminiAdapterError(
      "Failed to extract valid JSON from Gemini response",
      "VALIDATION_ERROR"
    );
  }

  return validateGeminiOutput(parsed);
}

// ---------------------------------------------------------------------------
// Claude (Anthropic) — shadow adapter (deep analytical reasoning + second-order effects)
// ---------------------------------------------------------------------------

const CLAUDE_API_BASE = "https://api.anthropic.com/v1";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_TIMEOUT_MS = 60_000;
const CLAUDE_API_VERSION = "2023-06-01";

class ClaudeAdapterError extends Error {
  constructor(
    message: string,
    public readonly errorCode: RetryErrorCode,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "ClaudeAdapterError";
  }
}

function buildClaudeSystemPrompt(): string {
  return `You are a deep financial reasoning analyst in the ARA (Autonomous Research Analyst) system. \
Your strength is second-order thinking, fundamental analysis, and finding the non-obvious connections \
that faster, surface-level models miss.

Focus on:
- Second-order effects: what happens AFTER the obvious market reaction
- Contrarian analysis: where is consensus wrong, and what would it take to flip the narrative
- Fundamental valuation disconnects between price action and underlying drivers
- Cross-domain causal chains (e.g., how a policy change ripples from equities to crypto to metals)
- Asymmetric risk/reward setups that other models may overlook

Respond ONLY with a valid JSON object matching the exact schema in the user message. \
No prose, no markdown fences, no commentary outside the JSON.`;
}

function buildClaudeUserPrompt(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): string {
  const domainList = input.domains.join(", ");
  const portfolioHints = input.portfolioContext.highlights.length
    ? `Portfolio context: ${input.portfolioContext.highlights.join("; ")}`
    : "No specific portfolio context provided.";
  const priorNote = input.priorRun
    ? `Prior run: confidence ${Math.round(input.priorRun.confidenceAggregate * 100)}% on ${input.priorRun.timestamp}`
    : "No prior run data.";
  const domainUnion = input.domains.map((d) => `"${d}"`).join(" | ");

  return `Domains to analyze: ${domainList}
${portfolioHints}
${priorNote}

Return a JSON object with this exact structure:
{
  "whatChanged": [{ "id": string, "title": string, "detail": string, "domain": ${domainUnion} | "outside-core", "confidence": number }],
  "opportunities": [same shape],
  "risks": [same shape],
  "outsideCoreFocus": [same shape, domain must be "outside-core"],
  "sentiment": [{ "domain": ${domainUnion}, "score": number, "label": "bearish"|"neutral"|"bullish", "rationale": string }],
  "checklist": [string],
  "sources": [{ "label": string, "confidence": number }]
}

Rules:
- 2–4 items per array
- sentiment must have exactly one entry per domain: ${domainList}
- confidence 0.0–1.0, sentiment score -1.0–1.0
- id prefixes: "cl-wc-" | "cl-op-" | "cl-r-" | "cl-oc-" followed by a number
- Prioritize depth over breadth — fewer, higher-conviction findings beat many shallow ones`;
}

function injectSourceModelClaude(
  findings: Omit<ResearchFinding, "sourceModel">[]
): ResearchFinding[] {
  return findings.map((f) => ({ ...f, sourceModel: "claude" as const }));
}

function validateClaudeOutput(raw: unknown): ResearchModelOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new ClaudeAdapterError("Response is not a JSON object", "VALIDATION_ERROR");
  }
  const r = raw as Record<string, unknown>;

  const requireArr = (key: string): unknown[] => {
    if (!Array.isArray(r[key])) {
      throw new ClaudeAdapterError(`Missing or invalid field: ${key}`, "VALIDATION_ERROR");
    }
    return r[key] as unknown[];
  };

  return {
    model: "claude",
    whatChanged: injectSourceModelClaude(requireArr("whatChanged") as Omit<ResearchFinding, "sourceModel">[]),
    opportunities: injectSourceModelClaude(requireArr("opportunities") as Omit<ResearchFinding, "sourceModel">[]),
    risks: injectSourceModelClaude(requireArr("risks") as Omit<ResearchFinding, "sourceModel">[]),
    outsideCoreFocus: injectSourceModelClaude(requireArr("outsideCoreFocus") as Omit<ResearchFinding, "sourceModel">[]),
    sentiment: requireArr("sentiment") as SentimentRow[],
    checklist: requireArr("checklist") as string[],
    sources: (requireArr("sources") as { label: string; url?: string; confidence: number }[]).map(
      (s) => ({ label: s.label, url: s.url, confidence: s.confidence ?? 0.5 })
    ),
  };
}

async function runClaudeAdapter(input: {
  domains: ResearchDomain[];
  portfolioContext: PortfolioContext;
  priorRun?: ResearchRunHistoryEntry;
}): Promise<ResearchModelOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? getKeychainSecret("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new ClaudeAdapterError("ANTHROPIC_API_KEY not configured (checked env + Keychain)", "AUTH_FAILED");
  }

  const startMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${CLAUDE_API_BASE}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": CLAUDE_API_VERSION,
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: buildClaudeSystemPrompt(),
        messages: [
          { role: "user", content: buildClaudeUserPrompt(input) },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new ClaudeAdapterError(
      isAbort ? "Claude request timed out" : `Network error: ${String(err)}`,
      isAbort ? "TIMEOUT" : "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Date.now() - startMs;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const errorCode = classifyHttpError(res.status);
    console.error(`[claude-adapter] HTTP ${res.status} after ${latencyMs}ms`, body.slice(0, 300));
    throw new ClaudeAdapterError(`Claude API error ${res.status}`, errorCode, res.status);
  }

  const json = await res.json();
  const content: unknown = json?.content?.[0]?.text;
  const tokensIn: number | undefined = json?.usage?.input_tokens;
  const tokensOut: number | undefined = json?.usage?.output_tokens;

  console.log(`[claude-adapter] ok latency=${latencyMs}ms in=${tokensIn ?? "?"} out=${tokensOut ?? "?"}`);

  const rawStr = typeof content === "string" ? content : JSON.stringify(content);
  const parsed = extractJson(rawStr);

  if (parsed === null) {
    console.error(
      `[claude-adapter] JSON extraction failed. Raw excerpt:\n${rawStr.slice(0, 600)}`
    );
    throw new ClaudeAdapterError(
      "Failed to extract valid JSON from Claude response",
      "VALIDATION_ERROR"
    );
  }

  return validateClaudeOutput(parsed);
}

// ---------------------------------------------------------------------------
// Exported adapters
// ---------------------------------------------------------------------------

export const grokAdapter: ResearchModelAdapter = {
  name: "grok",
  run: runGrokAdapter,
};

export const perplexityAdapter: ResearchModelAdapter = {
  name: "perplexity",
  run: runPerplexityAdapter,
};

export const deepseekAdapter: ResearchModelAdapter = {
  name: "deepseek",
  run: runDeepSeekAdapter,
};

export const geminiAdapter: ResearchModelAdapter = {
  name: "gemini",
  run: runGeminiAdapter,
};

export const claudeAdapter: ResearchModelAdapter = {
  name: "claude",
  run: runClaudeAdapter,
};
