import { agentUtilization } from "@/lib/mock-data";
import { Badge, Panel } from "@/components/ui/primitives";

export function AgentUtilizationPanel() {
  return (
    <Panel>
      <h3 className="mb-3 text-lg font-semibold">Agent Utilization</h3>
      <div className="space-y-2">
        {agentUtilization.map((agent) => {
          const percent = Math.round((agent.allocatedHours / agent.capacityHours) * 100);
          const over = percent > 100;

          return (
            <div key={agent.agentId} className="rounded-lg bg-slate-800 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium">{agent.agentName}</p>
                <Badge tone={over ? "warning" : "success"}>{percent}%</Badge>
              </div>
              <div className="h-2 rounded-full bg-slate-700">
                <div
                  className={over ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-emerald-500"}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">{agent.allocatedHours}h allocated / {agent.capacityHours}h capacity</p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
