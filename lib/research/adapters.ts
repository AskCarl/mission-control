import { ResearchModelAdapter, ResearchModelOutput } from "./types";

function buildMockOutput(model: ResearchModelOutput["model"]): ResearchModelOutput {
  if (model === "grok") {
    return {
      model,
      whatChanged: [
        { id: "g-wc-1", title: "Semiconductor chatter re-accelerating", detail: "Social pulse shows renewed upside momentum in AI supply chain names.", domain: "equities", confidence: 0.67, sourceModel: "grok" },
      ],
      opportunities: [
        { id: "g-op-1", title: "Gold breakout narrative strengthening", detail: "Risk-off chatter aligns with bullish precious metals positioning.", domain: "metals", confidence: 0.64, sourceModel: "grok" },
      ],
      risks: [
        { id: "g-r-1", title: "Crypto leverage crowded", detail: "Funding-rate discourse suggests crowded longs in majors.", domain: "crypto", confidence: 0.58, sourceModel: "grok" },
      ],
      outsideCoreFocus: [
        { id: "g-oc-1", title: "Shipping equities quietly trending", detail: "Freight-cycle discussion may indicate rotation into global logistics names.", domain: "outside-core", confidence: 0.52, sourceModel: "grok" },
      ],
      sentiment: [
        { domain: "equities", score: 0.3, label: "bullish", rationale: "Catalyst chatter positive" },
        { domain: "metals", score: 0.25, label: "bullish", rationale: "Defensive bid strengthening" },
        { domain: "crypto", score: -0.1, label: "neutral", rationale: "Conflicted momentum" },
        { domain: "real-estate", score: -0.2, label: "neutral", rationale: "Rate sensitivity still heavy" },
      ],
      checklist: ["Monitor social momentum divergence vs price in AI equities"],
      sources: [{ label: "Grok social pulse (mock)", confidence: 0.62 }],
    };
  }

  if (model === "perplexity") {
    return {
      model,
      whatChanged: [
        { id: "p-wc-1", title: "Rate-cut odds repriced", detail: "Recent macro coverage indicates shifting expectations for easing path.", domain: "real-estate", confidence: 0.74, sourceModel: "perplexity", citations: ["https://example.com/macro"] },
      ],
      opportunities: [
        { id: "p-op-1", title: "Copper demand forecasts revised up", detail: "Industrial demand and electrification trend both support medium-term upside.", domain: "metals", confidence: 0.72, sourceModel: "perplexity", citations: ["https://example.com/copper"] },
      ],
      risks: [
        { id: "p-r-1", title: "Office RE delinquency creep", detail: "Credit-stress reporting still concentrated in office subsector.", domain: "real-estate", confidence: 0.77, sourceModel: "perplexity", citations: ["https://example.com/cre"] },
      ],
      outsideCoreFocus: [
        { id: "p-oc-1", title: "Uranium supply constraints", detail: "Sourced reports suggest tightness could persist under demand growth assumptions.", domain: "outside-core", confidence: 0.61, sourceModel: "perplexity", citations: ["https://example.com/uranium"] },
      ],
      sentiment: [
        { domain: "equities", score: 0.1, label: "neutral", rationale: "Mixed earnings revisions" },
        { domain: "metals", score: 0.35, label: "bullish", rationale: "Stronger medium-term demand evidence" },
        { domain: "crypto", score: 0.05, label: "neutral", rationale: "Policy headlines offset inflow strength" },
        { domain: "real-estate", score: -0.25, label: "neutral", rationale: "Split between residential and office" },
      ],
      checklist: ["Validate sourced thesis links before execution"],
      sources: [{ label: "Perplexity sourced brief (mock)", url: "https://example.com/perplexity", confidence: 0.74 }],
    };
  }

  return {
    model: "deepseek",
    whatChanged: [
      { id: "d-wc-1", title: "Cross-asset correlation regime shifting", detail: "Scenario framing indicates weaker stock-bond diversification support.", domain: "equities", confidence: 0.7, sourceModel: "deepseek" },
    ],
    opportunities: [
      { id: "d-op-1", title: "Barbell: quality equities + hard assets", detail: "Scenario trees favor resilient cash-flow assets paired with inflation hedges.", domain: "equities", confidence: 0.75, sourceModel: "deepseek" },
    ],
    risks: [
      { id: "d-r-1", title: "Liquidity shock tail risk", detail: "Stress scenario highlights fragility in high-beta crypto beta names.", domain: "crypto", confidence: 0.68, sourceModel: "deepseek" },
    ],
    outsideCoreFocus: [
      { id: "d-oc-1", title: "Agriculture inputs asymmetry", detail: "Non-core ag inputs show favorable upside/downside in inflation resurgence case.", domain: "outside-core", confidence: 0.57, sourceModel: "deepseek" },
    ],
    sentiment: [
      { domain: "equities", score: 0.2, label: "bullish", rationale: "Selective risk-on with guardrails" },
      { domain: "metals", score: 0.2, label: "bullish", rationale: "Inflation hedge role intact" },
      { domain: "crypto", score: -0.15, label: "neutral", rationale: "Tail-risk skew elevated" },
      { domain: "real-estate", score: -0.1, label: "neutral", rationale: "Financing pressure still binding" },
    ],
    checklist: ["Run downside stress test before reallocating into high-beta buckets"],
    sources: [{ label: "DeepSeek scenario analysis (mock)", confidence: 0.69 }],
  };
}

export const grokAdapter: ResearchModelAdapter = {
  name: "grok",
  async run() {
    // TODO(live): wire xAI/Grok endpoint and map response into ResearchModelOutput.
    return buildMockOutput("grok");
  },
};

export const perplexityAdapter: ResearchModelAdapter = {
  name: "perplexity",
  async run() {
    // TODO(live): wire Perplexity API endpoint with citation extraction.
    return buildMockOutput("perplexity");
  },
};

export const deepseekAdapter: ResearchModelAdapter = {
  name: "deepseek",
  async run() {
    // TODO(live): wire DeepSeek API endpoint for scenario analysis framing.
    return buildMockOutput("deepseek");
  },
};
