import { Badge, Panel } from "@/components/ui/primitives";
import { runAutonomousResearchAnalyst } from "@/lib/research/service";

export default async function ResearchPage() {
  const { brief, runHistory } = await runAutonomousResearchAnalyst();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Autonomous Research Analyst</h2>
        <Badge tone={brief.confidenceAggregate >= 0.7 ? "success" : "warning"}>Confidence {(brief.confidenceAggregate * 100).toFixed(0)}%</Badge>
      </div>

      <Panel>
        <p className="text-sm text-slate-300">
          Multi-model brief routed across Grok (social pulse), Perplexity (sourced research), and DeepSeek (scenario framing),
          then synthesized locally.
        </p>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h3 className="mb-2 font-semibold">What Changed (since prior run)</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {brief.whatChanged.map((item) => (
              <li key={item.id}>
                <p className="font-medium text-slate-100">{item.title}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h3 className="mb-2 font-semibold">Sector / Asset Sentiment</h3>
          <div className="space-y-2 text-sm">
            {brief.sectorSentiment.map((row) => (
              <div key={row.domain} className="rounded-lg border border-slate-800 p-2">
                <div className="flex items-center justify-between">
                  <p className="capitalize text-slate-100">{row.domain.replace("-", " ")}</p>
                  <Badge tone={row.label === "bullish" ? "success" : row.label === "bearish" ? "danger" : "default"}>{row.label}</Badge>
                </div>
                <p className="text-slate-400">{row.rationale}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h3 className="mb-2 font-semibold">Top Opportunities</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {brief.topOpportunities.map((item) => (
              <li key={item.id}>
                <p className="font-medium text-slate-100">{item.title}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h3 className="mb-2 font-semibold">Top Risks</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {brief.topRisks.map((item) => (
              <li key={item.id}>
                <p className="font-medium text-slate-100">{item.title}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h3 className="mb-2 font-semibold">Outside Core Focus</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {brief.outsideCoreFocus.map((item) => (
              <li key={item.id}>
                <p className="font-medium text-slate-100">{item.title}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h3 className="mb-2 font-semibold">Action Checklist</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {brief.actionChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h3 className="mb-2 font-semibold">Sources + Confidence</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {brief.sources.map((source, idx) => (
              <li key={`${source.label}-${idx}`} className="rounded-lg border border-slate-800 p-2">
                <p className="font-medium text-slate-100">{source.label}</p>
                {source.url ? <p className="text-slate-400">{source.url}</p> : null}
                <p className="text-slate-400">Confidence {(source.confidence * 100).toFixed(0)}%</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h3 className="mb-2 font-semibold">Run History (scaffold)</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {runHistory.map((run) => (
              <li key={run.id} className="rounded-lg border border-slate-800 p-2">
                <p className="font-medium text-slate-100">{new Date(run.timestamp).toLocaleString()}</p>
                <p>Domains: {run.domains.join(", ")}</p>
                <p>Key findings: {run.keyFindingsCount}</p>
                <p>Confidence {(run.confidenceAggregate * 100).toFixed(0)}%</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <h3 className="mb-2 font-semibold">Portfolio Context Hook</h3>
        <p className="mb-2 text-sm text-slate-400">Source: {brief.portfolioContext.source}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {brief.portfolioContext.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
