import { workflowCards } from "@/lib/mock-data";
import { Panel } from "@/components/ui/primitives";

export function WorkflowCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {workflowCards.map((card) => (
        <Panel key={card.id}>
          <p className="text-xs text-cyan-300">{card.period} Workflow</p>
          <h3 className="mt-1 font-semibold">{card.title}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {card.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
