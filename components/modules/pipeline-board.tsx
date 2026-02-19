"use client";

import { contentCards } from "@/lib/mock-data";
import { ContentStage } from "@/lib/types";
import { Badge, Panel } from "@/components/ui/primitives";

const stages: ContentStage[] = ["Idea", "Script Draft", "Thumbnail", "Filming", "Editing", "Scheduled", "Published"];

export function PipelineBoard() {
  const todayItems = contentCards.filter((c) => c.priority === "high" || c.stage === "Idea");

  return (
    <div className="space-y-4">
      <Panel>
        <h2 className="text-lg font-semibold">Today view</h2>
        <p className="mb-3 text-sm text-slate-400">Items that need immediate attention and Carl automation hints.</p>
        <div className="grid gap-2 md:grid-cols-2">
          {todayItems.map((item) => (
            <div key={item.id} className="rounded-lg bg-slate-800 p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-slate-400">{item.stage} · Owner {item.owner}</p>
              <p className="mt-1 text-xs text-cyan-300">
                {item.stage === "Idea"
                  ? "Carl can draft script today"
                  : item.stage === "Thumbnail"
                    ? "Carl can generate thumbnail prompt"
                    : "Review and advance stage"}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-4">
        {stages.map((stage) => (
          <Panel key={stage} className="min-h-40">
            <h3 className="mb-3 font-semibold">{stage}</h3>
            <div className="space-y-2">
              {contentCards
                .filter((card) => card.stage === stage)
                .map((card) => (
                  <div key={card.id} className="rounded-lg bg-slate-800 p-3 text-sm">
                    <p className="font-medium">{card.title}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <Badge tone={card.priority === "high" ? "danger" : "default"}>{card.priority}</Badge>
                      <span className="text-xs text-slate-400">{card.owner}</span>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
