/**
 * One-off ARA run with fresh idempotency key.
 * Usage: npx tsx scripts/run-once.ts
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

async function main() {
  const task = await runResearchTask({
    title: "[manual] ARA system check",
    prompt: "Brief equities market pulse: one key change, one opportunity, one risk.",
    domain: "equities",
    requestedBy: "claude-manual",
    idempotencyKey: `manual-${Date.now()}`,
  });

  console.log(`\nSTATE: ${task.state}`);
  console.log(`CONFIDENCE: ${task.result?.brief?.confidenceAggregate}`);
  const ar = (task.result?.adapterResults ?? []) as { adapterId: string; ok: boolean; latencyMs: number; shadow?: boolean; errorCode?: string; errorMessage?: string }[];
  for (const a of ar) {
    console.log(`  adapter=${a.adapterId} ok=${a.ok} latency=${a.latencyMs}ms${a.shadow ? " (shadow)" : ""}${!a.ok ? ` error=${a.errorCode}` : ""}`);
  }
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
