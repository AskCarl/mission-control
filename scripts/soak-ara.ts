/**
 * ARA 5-run soak test — validates Perplexity parser robustness
 * Usage: npx tsx scripts/soak-ara.ts
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
import { JsonFileQueue } from "../lib/research/json-file-queue";
import type { AdapterResult } from "../lib/research/types";

const RUNS = 5;
const TASK_TITLE = "Market pulse: equities, metals, crypto, real-estate";
const TASK_PROMPT =
  "Provide a concise market intelligence brief across equities, metals, crypto, and real-estate. " +
  "Focus on what changed in the last week, top opportunity, top risk, and sector sentiment.";

interface RunResult {
  run: number;
  state: string;
  durationMs: number;
  confidence: number | null;
  adapterResults: { id: string; ok: boolean; errorCode?: string; latencyMs: number }[];
}

async function main() {
  const queue = new JsonFileQueue();
  const results: RunResult[] = [];

  console.log(`\n${"━".repeat(60)}`);
  console.log(`  ARA Soak Test — ${RUNS} runs`);
  console.log(`${"━".repeat(60)}\n`);

  for (let i = 1; i <= RUNS; i++) {
    console.log(`── Run ${i}/${RUNS} ──`);
    const start = Date.now();

    try {
      const task = await runResearchTask({
        title: TASK_TITLE,
        prompt: TASK_PROMPT,
        requestedBy: "soak-test",
        idempotencyKey: `soak-v1-run-${i}-${Date.now()}`,
        queue,
      });

      const durationMs = Date.now() - start;
      const adapterResults = (task.result?.adapterResults ?? []) as AdapterResult[];

      results.push({
        run: i,
        state: task.state,
        durationMs,
        confidence: task.result?.brief?.confidenceAggregate ?? null,
        adapterResults: adapterResults.map((ar) => ({
          id: ar.adapterId,
          ok: ar.ok,
          errorCode: ar.errorCode,
          latencyMs: ar.latencyMs,
        })),
      });

      const adapterLine = adapterResults
        .map((ar) => `${ar.adapterId}:${ar.ok ? "✅" : `❌(${ar.errorCode})`}`)
        .join("  ");
      const conf = task.result?.brief?.confidenceAggregate;
      console.log(
        `  ${task.state.padEnd(10)} ${conf != null ? `conf=${(conf * 100).toFixed(0)}%` : "       "} ` +
        `${(durationMs / 1000).toFixed(1)}s  ${adapterLine}`
      );
    } catch (err) {
      const durationMs = Date.now() - start;
      console.log(`  UNHANDLED ERROR after ${(durationMs / 1000).toFixed(1)}s: ${String(err)}`);
      results.push({
        run: i,
        state: "unhandled_error",
        durationMs,
        confidence: null,
        adapterResults: [],
      });
    }

    // small gap between runs to avoid rate limiting
    if (i < RUNS) await new Promise((r) => setTimeout(r, 2000));
  }

  // ── Summary ────────────────────────────────────────────────
  console.log(`\n${"━".repeat(60)}`);
  console.log("  SOAK SUMMARY");
  console.log(`${"━".repeat(60)}`);

  const completed = results.filter((r) => r.state === "completed");
  const failed = results.filter((r) => r.state === "failed");
  const unhandled = results.filter((r) => r.state === "unhandled_error");

  const adapterStats: Record<string, { ok: number; fail: number }> = {};
  for (const r of results) {
    for (const ar of r.adapterResults) {
      if (!adapterStats[ar.id]) adapterStats[ar.id] = { ok: 0, fail: 0 };
      ar.ok ? adapterStats[ar.id].ok++ : adapterStats[ar.id].fail++;
    }
  }

  const avgConf =
    completed.length
      ? (completed.reduce((a, r) => a + (r.confidence ?? 0), 0) / completed.length * 100).toFixed(0)
      : "n/a";

  const avgDuration =
    completed.length
      ? (completed.reduce((a, r) => a + r.durationMs, 0) / completed.length / 1000).toFixed(1)
      : "n/a";

  console.log(`\n  Runs:        ${RUNS}`);
  console.log(`  Completed:   ${completed.length}/${RUNS}`);
  console.log(`  Failed:      ${failed.length}/${RUNS}`);
  console.log(`  Unhandled:   ${unhandled.length}/${RUNS}`);
  console.log(`  Avg conf:    ${avgConf}%`);
  console.log(`  Avg duration: ${avgDuration}s`);

  console.log("\n  Per-adapter success rate:");
  for (const [id, stats] of Object.entries(adapterStats)) {
    const total = stats.ok + stats.fail;
    const rate = ((stats.ok / total) * 100).toFixed(0);
    console.log(`    ${id.padEnd(12)} ${stats.ok}/${total} (${rate}%)`);
  }

  const parseErrors = results.flatMap((r) =>
    r.adapterResults
      .filter((ar) => !ar.ok && ar.errorCode === "VALIDATION_ERROR")
      .map((ar) => ({ run: r.run, adapter: ar.id }))
  );

  if (parseErrors.length === 0) {
    console.log("\n  ✅ 0 unhandled parse failures");
  } else {
    console.log(`\n  ⚠️  Parse errors: ${parseErrors.length}`);
    for (const e of parseErrors) console.log(`    run ${e.run} adapter=${e.adapter}`);
  }

  const verdict = unhandled.length === 0 && parseErrors.length === 0 ? "PASS" : "NEEDS REVIEW";
  console.log(`\n  Verdict: ${verdict}`);
  console.log(`${"━".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
