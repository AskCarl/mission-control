import { deepseekAdapter, grokAdapter, perplexityAdapter } from "./adapters";
import { getPortfolioContext } from "./portfolio-context";
import { mockResearchRunHistory } from "./run-history";
import { ResearchBrief, ResearchDomain, ResearchFinding, ResearchModelOutput, ResearchRunHistoryEntry } from "./types";

function topByConfidence(items: ResearchFinding[], n = 3) {
  return [...items].sort((a, b) => b.confidence - a.confidence).slice(0, n);
}

function mergeSentiment(outputs: ResearchModelOutput[]) {
  const domains: ResearchDomain[] = ["equities", "metals", "crypto", "real-estate"];
  return domains.map((domain) => {
    const rows = outputs.map((o) => o.sentiment.find((s) => s.domain === domain)).filter(Boolean);
    const score = rows.length ? rows.reduce((acc, row) => acc + (row?.score ?? 0), 0) / rows.length : 0;
    return {
      domain,
      score,
      label: score > 0.15 ? ("bullish" as const) : score < -0.15 ? ("bearish" as const) : ("neutral" as const),
      rationale: rows.map((row) => row?.rationale).filter(Boolean).join(" | "),
    };
  });
}

function computeConfidence(outputs: ResearchModelOutput[]) {
  const all = outputs.flatMap((o) => [...o.whatChanged, ...o.opportunities, ...o.risks, ...o.outsideCoreFocus]);
  if (!all.length) return 0;
  return Number((all.reduce((acc, item) => acc + item.confidence, 0) / all.length).toFixed(2));
}

function synthesizeBrief(outputs: ResearchModelOutput[], domains: ResearchDomain[], priorRun?: ResearchRunHistoryEntry): ResearchBrief {
  const whatChanged = topByConfidence(outputs.flatMap((o) => o.whatChanged), 4);
  const topOpportunities = topByConfidence(outputs.flatMap((o) => o.opportunities), 5);
  const topRisks = topByConfidence(outputs.flatMap((o) => o.risks), 5);
  const outsideCoreFocus = topByConfidence(outputs.flatMap((o) => o.outsideCoreFocus), 4);

  const checklist = [
    ...(priorRun ? [`Compare confidence vs prior run (${Math.round(priorRun.confidenceAggregate * 100)}%)`] : []),
    ...outputs.flatMap((o) => o.checklist),
    "Rank opportunities by portfolio fit and downside protection",
  ];

  const dedupedChecklist = Array.from(new Set(checklist));

  return {
    generatedAt: new Date().toISOString(),
    domains,
    whatChanged,
    topOpportunities,
    topRisks,
    outsideCoreFocus,
    sectorSentiment: mergeSentiment(outputs),
    actionChecklist: dedupedChecklist,
    sources: outputs.flatMap((o) => o.sources),
    confidenceAggregate: computeConfidence(outputs),
    portfolioContext: { source: "mock", highlights: [] },
  };
}

export async function runAutonomousResearchAnalyst(input?: { domains?: ResearchDomain[] }) {
  const domains: ResearchDomain[] = input?.domains ?? ["equities", "metals", "crypto", "real-estate"];
  const priorRun = mockResearchRunHistory[0];
  const portfolioContext = await getPortfolioContext();

  // Router responsibilities:
  // - Grok: sentiment/social pulse/catalyst chatter
  // - Perplexity: sourced web research/citations
  // - DeepSeek: deep analysis/scenario framing
  const outputs = await Promise.all([
    grokAdapter.run({ domains, portfolioContext, priorRun }),
    perplexityAdapter.run({ domains, portfolioContext, priorRun }),
    deepseekAdapter.run({ domains, portfolioContext, priorRun }),
  ]);

  // TODO(live): optional final synthesis model adapter can replace this local synthesizer.
  const brief = synthesizeBrief(outputs, domains, priorRun);
  brief.portfolioContext = portfolioContext;

  return {
    brief,
    runHistory: mockResearchRunHistory,
  };
}
