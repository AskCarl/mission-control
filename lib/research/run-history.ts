import { ResearchRunHistoryEntry } from "./types";

export const mockResearchRunHistory: ResearchRunHistoryEntry[] = [
  {
    id: "rr-001",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    domains: ["equities", "metals", "crypto", "real-estate"],
    keyFindingsCount: 9,
    confidenceAggregate: 0.71,
  },
  {
    id: "rr-002",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    domains: ["equities", "crypto"],
    keyFindingsCount: 6,
    confidenceAggregate: 0.67,
  },
];
