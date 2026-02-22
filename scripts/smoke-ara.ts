/**
 * ARA Daily Smoke Run
 * Single low-cost task (equities only, Grok adapter, maxAttempts=1)
 * Exit 0 = pass, Exit 1 = fail (safe for cron alerting)
 *
 * Usage: npx tsx scripts/smoke-ara.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

import { runResearchTask } from "../lib/research/worker";
import { convexQueue } from "../lib/research/convex-queue";
import type { TaskRecord } from "../lib/research/types";

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const ADAPTER_FAILURE_RATE_THRESHOLD = 0.4;  // alert if >40% of recent adapter calls fail
const QUEUE_BACKLOG_THRESHOLD = 5;            // alert if >5 tasks stuck queued/running
const RECENT_WINDOW = 10;                     // look at last N completed tasks for rate calc

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso() {
  return new Date().toISOString();
}

function log(level: "INFO" | "WARN" | "ERROR", msg: string) {
  console.log(`[${iso()}] [ara-smoke] [${level}] ${msg}`);
}

async function checkAdapterFailureRate(): Promise<{ rate: number; alert: boolean }> {
  const completed = await convexQueue.list({ state: "completed" });
  const recent = completed
    .sort((a, b) => (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0))
    .slice(0, RECENT_WINDOW);

  if (recent.length === 0) return { rate: 0, alert: false };

  const allAdapterResults = recent.flatMap(
    (t: TaskRecord) => (t.result?.adapterResults ?? []) as { ok: boolean }[]
  );
  if (allAdapterResults.length === 0) return { rate: 0, alert: false };

  const failed = allAdapterResults.filter((ar) => !ar.ok).length;
  const rate = failed / allAdapterResults.length;
  return { rate, alert: rate > ADAPTER_FAILURE_RATE_THRESHOLD };
}

async function checkQueueBacklog(): Promise<{ count: number; alert: boolean }> {
  const [queued, running] = await Promise.all([
    convexQueue.list({ state: "queued" }),
    convexQueue.list({ state: "running" }),
  ]);
  const count = queued.length + running.length;
  return { count, alert: count > QUEUE_BACKLOG_THRESHOLD };
}

// ---------------------------------------------------------------------------
// Main smoke run
// ---------------------------------------------------------------------------

async function main() {
  log("INFO", "smoke run started");

  const alerts: string[] = [];
  let smokeOk = false;

  // ── 1. Run the smoke task ──────────────────────────────────────────────
  const start = Date.now();
  try {
    const task = await runResearchTask({
      title: "[smoke] daily ARA health check",
      prompt: "Brief equities market pulse: one key change, one opportunity, one risk, confidence score.",
      domain: "equities",
      requestedBy: "smoke-runner",
      idempotencyKey: `smoke-${new Date().toISOString().slice(0, 10)}`,
      retryPolicy: { maxAttempts: 1, retryableErrorCodes: [] },
      queue: convexQueue,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const adapterResults = (task.result?.adapterResults ?? []) as { adapterId: string; ok: boolean; latencyMs: number; errorCode?: string }[];
    const conf = task.result?.brief?.confidenceAggregate;

    if (task.state === "completed") {
      smokeOk = true;
      log("INFO", `smoke task completed — conf=${conf != null ? (conf * 100).toFixed(0) + "%" : "?"} elapsed=${elapsed}s`);
      for (const ar of adapterResults) {
        log("INFO", `  adapter=${ar.adapterId} ok=${ar.ok} latency=${ar.latencyMs}ms`);
      }
    } else {
      log("ERROR", `smoke task failed — state=${task.state} error=${task.failure?.errorCode} msg=${task.failure?.message}`);
      alerts.push(`smoke task failed: ${task.failure?.errorCode} — ${task.failure?.message}`);
    }
  } catch (err) {
    log("ERROR", `smoke task threw: ${String(err)}`);
    alerts.push(`smoke task threw: ${String(err)}`);
  }

  // ── 2. Adapter failure rate check ─────────────────────────────────────
  try {
    const { rate, alert } = await checkAdapterFailureRate();
    const pct = (rate * 100).toFixed(0);
    if (alert) {
      log("WARN", `adapter failure rate spike: ${pct}% of last ${RECENT_WINDOW} runs (threshold ${ADAPTER_FAILURE_RATE_THRESHOLD * 100}%)`);
      alerts.push(`adapter failure rate ${pct}% exceeds threshold`);
    } else {
      log("INFO", `adapter failure rate: ${pct}% (ok)`);
    }
  } catch (err) {
    log("WARN", `failure rate check skipped: ${String(err)}`);
  }

  // ── 3. Queue backlog check ─────────────────────────────────────────────
  try {
    const { count, alert } = await checkQueueBacklog();
    if (alert) {
      log("WARN", `queue backlog: ${count} tasks stuck (threshold ${QUEUE_BACKLOG_THRESHOLD})`);
      alerts.push(`queue backlog ${count} exceeds threshold`);
    } else {
      log("INFO", `queue backlog: ${count} (ok)`);
    }
  } catch (err) {
    log("WARN", `backlog check skipped: ${String(err)}`);
  }

  // ── 4. Summary ─────────────────────────────────────────────────────────
  if (alerts.length > 0) {
    log("ERROR", `smoke run finished with ${alerts.length} alert(s):`);
    for (const a of alerts) log("ERROR", `  • ${a}`);
    process.exit(1);
  }

  if (!smokeOk) {
    log("ERROR", "smoke run FAIL");
    process.exit(1);
  }

  log("INFO", "smoke run PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error(`[${iso()}] [ara-smoke] [ERROR] unhandled: ${String(err)}`);
  process.exit(1);
});
