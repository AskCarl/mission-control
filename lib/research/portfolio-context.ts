import { promises as fs } from "node:fs";
import { PortfolioContext } from "./types";

const portfolioMemoryPath = "/Users/carlbot/.openclaw/workspace/memory/sean-portfolio.md";

export async function getPortfolioContext(): Promise<PortfolioContext> {
  try {
    const raw = await fs.readFile(portfolioMemoryPath, "utf8");
    const highlights = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-") || line.startsWith("*"))
      .slice(0, 6)
      .map((line) => line.replace(/^[-*]\s*/, ""));

    return {
      source: "memory-file",
      highlights: highlights.length ? highlights : ["Portfolio file found; parsing hook active (TODO: richer parser)."],
      rawExcerpt: raw.slice(0, 500),
    };
  } catch {
    return {
      source: "mock",
      highlights: [
        "~$1.95M multi-asset allocation with tech concentration",
        "Core interests include equities, metals, crypto, and macro-sensitive assets",
        "Risk discipline emphasizes asymmetric opportunities",
      ],
    };
  }
}
