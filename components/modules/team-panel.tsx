import { teamAgents } from "@/lib/mock-data";
import { Badge, Panel } from "@/components/ui/primitives";

export function TeamPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {teamAgents.map((agent) => (
        <Panel key={agent.id}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{agent.name}</h3>
            <Badge tone={agent.status === "active" ? "success" : "default"}>{agent.status}</Badge>
          </div>
          <p className="text-sm text-slate-300">{agent.label}</p>
          <p className="mt-2 text-xs text-slate-400">Current: {agent.currentTask ?? "No active task"}</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-slate-300">
            {agent.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
