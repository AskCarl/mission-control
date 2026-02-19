import { officePresence } from "@/lib/mock-data";
import { Badge, Panel } from "@/components/ui/primitives";

const toneByState = {
  working: "success",
  idle: "default",
  blocked: "danger",
  offline: "warning",
} as const;

export function OfficePanel() {
  const active = officePresence.filter((a) => a.state === "working").length;
  const idle = officePresence.filter((a) => a.state === "idle").length;
  const blocked = officePresence.filter((a) => a.state === "blocked").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Panel><p>Active agents: {active}</p></Panel>
        <Panel><p>Idle agents: {idle}</p></Panel>
        <Panel><p>Blocked tasks: {blocked}</p></Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {officePresence.map((agent) => (
          <Panel key={agent.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{agent.agentName}</h3>
              <Badge tone={toneByState[agent.state]}>{agent.state}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-300">Desk {agent.workstationPosition}</p>
            <p className="text-xs text-slate-400">{agent.currentTask ?? "No current task"}</p>
            <div className="mt-3 flex gap-2 text-xs">
              <button className="rounded bg-slate-700 px-2 py-1">Assign task</button>
              <button className="rounded bg-slate-700 px-2 py-1">Nudge</button>
              <button className="rounded bg-slate-700 px-2 py-1">Reassign</button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
