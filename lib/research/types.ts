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
  sourceModel: "grok" | "perplexity" | "deepseek" | "synth";
  citations?: string[];
};

export type SentimentRow = {
  domain: ResearchDomain;
  score: number;
  label: "bearish" | "neutral" | "bullish";
  rationale: string;
};

export type ResearchModelOutput = {
  model: "grok" | "perplexity" | "deepseek";
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
  name: "grok" | "perplexity" | "deepseek";
  run: (input: {
    domains: ResearchDomain[];
    portfolioContext: PortfolioContext;
    priorRun?: ResearchRunHistoryEntry;
  }) => Promise<ResearchModelOutput>;
};
