/**
 * ARA E2E test — success run + forced failure run
 * Usage: npx tsx scripts/test-ara.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local before any adapter code reads process.env
const envPath = resolve(__dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

import { runResearchTask, processTask } from "../lib/research/worker";
import { convexQueue } from "../lib/research/convex-queue";
import type { TaskRecord } from "../lib/research/types";
import { DEFAULT_RETRY_POLICY } from "../lib/research/worker";
import { randomUUID } from "crypto";

function divider(label?: string) {
  const line = "━".repeat(60);
  console.log(label ? `\n${line}\n  ${label}\n${line}` : `\n${line}`);
}

function printBrief(task: TaskRecord) {
  if (task.state !== "completed" || !task.result?.brief) return;
  const brief = task.result.brief;
  console.log(`\nConfidence: ${(brief.confidenceAggregate * 100).toFixed(0)}%`);

  console.log("\n── Sentiment ──");
  for (const s of brief.sectorSentiment) {
    console.log(`  ${s.domain.padEnd(14)} ${s.label.padEnd(8)} score=${s.score.toFixed(2)}`);
  }

  console.log("\n── What Changed (top 3) ──");
  for (const f of brief.whatChanged.slice(0, 3)) {
    console.log(`  [${f.sourceModel}] ${f.title} (${(f.confidence * 100).toFixed(0)}%)`);
  }

  console.log("\n── Top Opportunities ──");
  for (const f of brief.topOpportunities.slice(0, 3)) {
    console.log(`  [${f.sourceModel}] ${f.title} (${(f.confidence * 100).toFixed(0)}%)`);
  }

  console.log("\n── Top Risks ──");
  for (const f of brief.topRisks.slice(0, 3)) {
    console.log(`  [${f.sourceModel}] ${f.title} (${(f.confidence * 100).toFixed(0)}%)`);
  }

  console.log("\n── Adapter Results ──");
  for (const ar of task.result.adapterResults ?? []) {
    const icon = ar.ok ? "✅" : "❌";
    const err = ar.ok ? "" : `  error=${ar.errorCode} msg=${ar.errorMessage}`;
    console.log(`  ${icon} ${ar.adapterId.padEnd(12)} latency=${ar.latencyMs}ms${err}`);
  }

  console.log("\n── Sources (sample) ──");
  for (const s of brief.sources.slice(0, 4)) {
    console.log(`  ${s.label}${s.url ? " — " + s.url : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Run 1: Success — all three live adapters
// ---------------------------------------------------------------------------

async function runSuccess() {
  divider("RUN 1 — SUCCESS (live adapters)");

  const start = Date.now();
  const task = await runResearchTask({
    title: "AI coding copilots for kids (6–8): safe learning modes",
    prompt:
      "Research the current landscape of AI coding tools designed for children aged 6–8. " +
      "Identify leading products, safety features, learning modes, risks, and provide a confidence score.",
    requestedBy: "e2e-test",
    idempotencyKey: "e2e-kids-coding-v1",
    queue: convexQueue,
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nState:    ${task.state}`);
  console.log(`Task ID:  ${task.id}`);
  console.log(`Duration: ${elapsed}s`);
  printBrief(task);

  // verify it persisted
  const persisted = await convexQueue.get(task.id);
  console.log(`\nPersisted to disk: ${persisted?.state === task.state ? "✅ yes" : "❌ no"}`);
  return task;
}

// ---------------------------------------------------------------------------
// Run 2: Forced failure — bad API keys, maxAttempts=1
// ---------------------------------------------------------------------------

async function runForcedFailure() {
  divider("RUN 2 — FORCED FAILURE (bad keys, maxAttempts=1)");

  // temporarily override API keys to force auth failures
  const savedGrok = process.env.XAI_API_KEY;
  const savedPplx = process.env.PERPLEXITY_API_KEY;
  const savedDs = process.env.DEEPSEEK_API_KEY;
  process.env.XAI_API_KEY = "xai-invalid-key-for-test";
  process.env.PERPLEXITY_API_KEY = "pplx-invalid-key-for-test";
  process.env.DEEPSEEK_API_KEY = "sk-invalid-key-for-test";

  const now = Date.now();
  const task: TaskRecord = {
    id: randomUUID(),
    taskType: "autonomous_research",
    state: "queued",
    title: "Forced failure test",
    prompt: "This task is designed to fail.",
    requestedBy: "e2e-test",
    adapterSequence: ["grok", "perplexity", "deepseek"],
    retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 1, retryableErrorCodes: [] },
    attempt: 1,
    maxAttempts: 1,
    createdAtMs: now,
    queuedAtMs: now,
    updatedAtMs: now,
  };

  await convexQueue.enqueue(task);

  const start = Date.now();
  const result = await processTask(task, convexQueue);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // restore keys
  process.env.XAI_API_KEY = savedGrok;
  process.env.PERPLEXITY_API_KEY = savedPplx;
  process.env.DEEPSEEK_API_KEY = savedDs;

  console.log(`\nState:    ${result.state}`);
  console.log(`Task ID:  ${result.id}`);
  console.log(`Duration: ${elapsed}s`);

  if (result.failure) {
    console.log(`\nFailure envelope:`);
    console.log(`  errorCode:  ${result.failure.errorCode}`);
    console.log(`  message:    ${result.failure.message}`);
    console.log(`  retryable:  ${result.failure.retryable}`);
    console.log(`  adapterId:  ${result.failure.adapterId}`);
    console.log(`  attempt:    ${result.failure.attempt}`);
  }

  const persisted = await convexQueue.get(result.id);
  console.log(`\nPersisted to disk: ${persisted?.state === "failed" ? "✅ yes" : "❌ no"}`);
  return result;
}

// ---------------------------------------------------------------------------
// Sample persisted record (redacted)
// ---------------------------------------------------------------------------

function printSampleRecord(task: TaskRecord) {
  divider("SAMPLE PERSISTED RECORD (redacted)");
  const sample = {
    id: task.id,
    taskType: task.taskType,
    state: task.state,
    title: task.title,
    attempt: task.attempt,
    maxAttempts: task.maxAttempts,
    createdAtMs: task.createdAtMs,
    completedAtMs: task.completedAtMs,
    adapterSequence: task.adapterSequence,
    confidenceAggregate: task.result?.brief?.confidenceAggregate ?? null,
    findingsCount: (task.result?.findings ?? []).length,
    adapterResults: (task.result?.adapterResults ?? []).map((ar: { adapterId: string; ok: boolean; latencyMs: number; errorCode?: string }) => ({
      adapterId: ar.adapterId,
      ok: ar.ok,
      latencyMs: ar.latencyMs,
      errorCode: ar.errorCode ?? null,
    })),
    sourcesCount: (task.result?.brief?.sources ?? []).length,
    retryPolicy: task.retryPolicy,
  };
  console.log(JSON.stringify(sample, null, 2));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  divider("ARA E2E v1.1 — Convex Persistence Run");
  console.log("  Queue: ConvexQueue (calculating-walrus-194.convex.cloud)");

  const successTask = await runSuccess();
  const failTask = await runForcedFailure();

  printSampleRecord(successTask);

  const all = await convexQueue.list();
  divider("QUEUE STATE");
  console.log(`  Total tasks: ${all.length}`);
  for (const t of all) {
    const conf = t.result?.brief?.confidenceAggregate;
    const confStr = conf != null ? ` confidence=${(conf * 100).toFixed(0)}%` : "";
    console.log(`  ${t.state.padEnd(10)} ${t.id.slice(0, 8)}  "${t.title.slice(0, 45)}"${confStr}`);
  }

  divider("Done");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
