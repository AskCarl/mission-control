/**
 * ARA Research CLI
 * General-purpose CLI wrapper around runResearchTask() with Telegram-formatted output.
 *
 * Usage:
 *   npx tsx scripts/research-cli.ts --query "What's happening with NVDA?"
 *   npx tsx scripts/research-cli.ts --query "Gold outlook" --domain metals
 *   npx tsx scripts/research-cli.ts --query "NVDA price" --quick
 *   npx tsx scripts/research-cli.ts --query "BTC analysis" --json
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// Load .env.local before any imports that read process.env
// ---------------------------------------------------------------------------

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
import type { ResearchBrief, ResearchDomain, TaskRecord } from "../lib/research/types";

// ---------------------------------------------------------------------------
// Redirect console.log → stderr so adapter progress lines don't pollute stdout.
// Only stdout (process.stdout) is captured by Carl; stderr is debug-only.
// ---------------------------------------------------------------------------

const _origLog = console.log;
console.log = (...args: unknown[]) => {
  console.error(...args);
};

/** Write clean output to stdout — this is what Carl captures for Telegram delivery. */
function stdout(msg: string) {
  process.stdout.write(msg + "\n");
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  query: string;
  domain: ResearchDomain;
  title: string;
  quick: boolean;
  json: boolean;
} {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let query = "";
  let domain: ResearchDomain | "" = "";
  let title = "";
  let quick = false;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--query":
        query = args[++i] ?? "";
        break;
      case "--domain":
        domain = (args[++i] ?? "") as ResearchDomain;
        break;
      case "--title":
        title = args[++i] ?? "";
        break;
      case "--quick":
        quick = true;
        break;
      case "--json":
        json = true;
        break;
    }
  }

  query = query.trim();
  if (!query) {
    console.error("Error: --query is required (must not be empty or whitespace-only)\n");
    printUsage();
    process.exit(1);
  }

  const validDomains: ResearchDomain[] = ["equities", "metals", "crypto", "real-estate"];
  if (domain && !validDomains.includes(domain)) {
    console.error(`Error: --domain must be one of: ${validDomains.join(", ")}\n`);
    process.exit(1);
  }

  return {
    query,
    domain: (domain || inferDomain(query)) as ResearchDomain,
    title: title || generateTitle(query),
    quick,
    json,
  };
}

function printUsage() {
  const msg = `ARA Research CLI

Usage:
  npx tsx scripts/research-cli.ts --query "<question>" [options]

Options:
  --query <text>     Research question (required)
  --domain <domain>  equities | metals | crypto | real-estate (default: inferred)
  --title <text>     Short title for task record (default: auto-generated)
  --quick            Perplexity-only fast mode (~5s vs ~60s)
  --json             Raw JSON output instead of formatted text
  --help             Show this message`;
  console.error(msg);
}

// ---------------------------------------------------------------------------
// Domain inference
// ---------------------------------------------------------------------------

function inferDomain(query: string): ResearchDomain {
  const q = query.toLowerCase();

  if (/\b(gold|silver|platinum|palladium|mining|metal|copper|commodit)/i.test(q)) {
    return "metals";
  }
  if (/\b(bitcoin|btc|ethereum|eth|crypto|solana|sol|defi|nft|blockchain|altcoin)/i.test(q)) {
    return "crypto";
  }
  if (/\b(real.?estate|property|housing|rent|mortgage|reit|residential|commercial.?real)/i.test(q)) {
    return "real-estate";
  }
  return "equities";
}

function generateTitle(query: string): string {
  const trimmed = query.slice(0, 60).replace(/\s+/g, " ").trim();
  return trimmed.length < query.length ? `${trimmed}...` : trimmed;
}

// ---------------------------------------------------------------------------
// Quick mode — Perplexity-only via existing perplexity.py
// ---------------------------------------------------------------------------

async function runQuickMode(query: string): Promise<string> {
  const pyPath = resolve(process.env.HOME ?? "~", ".openclaw/workspace/tools/perplexity.py");
  try {
    readFileSync(pyPath);
  } catch {
    throw new Error(`perplexity.py not found at ${pyPath}`);
  }
  try {
    const result = execSync(`python3 "${pyPath}" search "${query.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
      timeout: 30_000,
    });
    return result.trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Perplexity search failed: ${msg.split("\n")[0]}`);
  }
}

// ---------------------------------------------------------------------------
// Brief formatter — Telegram-friendly plain text
// ---------------------------------------------------------------------------

function formatBrief(task: TaskRecord): string {
  const brief = task.result?.brief;
  if (!brief) return "No brief generated.";

  const adapterResults = (task.result?.adapterResults ?? []) as {
    adapterId: string;
    ok: boolean;
    shadow?: boolean;
  }[];
  const mainAdapters = adapterResults.filter((r) => !r.shadow);
  const okCount = mainAdapters.filter((r) => r.ok).length;
  const confPct = Math.round(brief.confidenceAggregate * 100);

  const lines: string[] = [];

  lines.push("📊 ARA Research Brief");
  lines.push(
    `Domain: ${capitalize(brief.domains[0] ?? "unknown")} | Confidence: ${confPct}% | ${okCount} adapter${okCount === 1 ? "" : "s"}`
  );
  lines.push("");

  if (brief.whatChanged.length > 0) {
    lines.push("WHAT CHANGED");
    for (const f of brief.whatChanged) {
      lines.push(`• ${f.title} (${Math.round(f.confidence * 100)}%)`);
    }
    lines.push("");
  }

  if (brief.topOpportunities.length > 0) {
    lines.push("OPPORTUNITIES");
    for (const f of brief.topOpportunities) {
      lines.push(`• ${f.title} (${Math.round(f.confidence * 100)}%)`);
    }
    lines.push("");
  }

  if (brief.topRisks.length > 0) {
    lines.push("RISKS");
    for (const f of brief.topRisks) {
      lines.push(`• ${f.title} (${Math.round(f.confidence * 100)}%)`);
    }
    lines.push("");
  }

  if (brief.sectorSentiment.length > 0) {
    const relevant = brief.sectorSentiment.filter((s) =>
      brief.domains.includes(s.domain)
    );
    if (relevant.length > 0) {
      lines.push("SENTIMENT");
      for (const s of relevant) {
        const sign = s.score >= 0 ? "+" : "";
        lines.push(
          `• ${capitalize(s.domain)}: ${s.label} (${sign}${s.score.toFixed(2)}) — ${s.rationale.slice(0, 80)}`
        );
      }
      lines.push("");
    }
  }

  if (brief.actionChecklist.length > 0) {
    lines.push("ACTION ITEMS");
    for (const item of brief.actionChecklist) {
      lines.push(`• ${item}`);
    }
    lines.push("");
  }

  lines.push(`Sources: ${brief.sources.length} citation${brief.sources.length === 1 ? "" : "s"}`);

  return lines.join("\n");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { query, domain, title, quick, json: jsonOutput } = parseArgs();
  const start = Date.now();

  // ── Quick mode ───────────────────────────────────────────────────────────
  if (quick) {
    console.error(`[research-cli] quick mode — query="${query}"`);
    try {
      const result = await runQuickMode(query);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      if (jsonOutput) {
        stdout(JSON.stringify({ mode: "quick", query, result, elapsedSeconds: Number(elapsed) }));
      } else {
        const shortTitle = query.length > 40 ? query.slice(0, 40) + "..." : query;
        stdout(`🔍 Quick Research — ${shortTitle}\n`);
        stdout(result);
        stdout(`\n⏱ ${elapsed}s | Perplexity sonar`);
      }
      process.exit(0);
    } catch (err) {
      console.error(`[research-cli] quick mode failed: ${String(err)}`);
      process.exit(1);
    }
  }

  // ── Full ARA pipeline ───────────────────────────────────────────────────
  console.error(`[research-cli] full ARA — query="${query}" domain=${domain}`);

  try {
    const task = await runResearchTask({
      title,
      prompt: query,
      domain,
      requestedBy: "research-cli",
      queue: convexQueue,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (task.state !== "completed") {
      console.error(
        `[research-cli] task failed — state=${task.state} error=${task.failure?.errorCode} msg=${task.failure?.message}`
      );
      if (jsonOutput) {
        stdout(JSON.stringify({ error: true, state: task.state, failure: task.failure }));
      } else {
        stdout(`❌ Research failed: ${task.failure?.message ?? "unknown error"}`);
      }
      process.exit(1);
    }

    const adapterResults = (task.result?.adapterResults ?? []) as {
      adapterId: string;
      ok: boolean;
      shadow?: boolean;
    }[];
    const mainOk = adapterResults.filter((r) => !r.shadow && r.ok).length;
    const mainTotal = adapterResults.filter((r) => !r.shadow).length;

    console.error(`[research-cli] completed in ${elapsed}s — ${mainOk}/${mainTotal} adapters OK`);

    if (jsonOutput) {
      stdout(JSON.stringify(task.result, null, 2));
    } else {
      const formatted = formatBrief(task);
      stdout(formatted);
      stdout(`⏱ ${elapsed}s | ${mainOk}/${mainTotal} adapters OK`);
    }

    process.exit(0);
  } catch (err) {
    console.error(`[research-cli] unhandled error: ${String(err)}`);
    if (jsonOutput) {
      stdout(JSON.stringify({ error: true, message: String(err) }));
    } else {
      stdout(`❌ Research failed: ${String(err)}`);
    }
    process.exit(1);
  }
}

main();
