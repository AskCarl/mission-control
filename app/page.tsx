import { AgentUtilizationPanel } from "@/components/modules/agent-utilization-panel";
import { FlowAlertsPanel } from "@/components/modules/flow-alerts-panel";
import { FocusThreeWidget } from "@/components/modules/focus-three-widget";
import { ProjectProgressPanel } from "@/components/modules/project-progress-panel";
import { WorkflowCards } from "@/components/modules/workflow-cards";
import { Panel } from "@/components/ui/primitives";
import { contentCards, memoryEntries, officePresence, scheduledTasks, teamAgents } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Mission Control Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-5">
        <Panel><p className="text-sm text-slate-400">Pipeline Cards</p><p className="text-2xl font-bold">{contentCards.length}</p></Panel>
        <Panel><p className="text-sm text-slate-400">Scheduled Tasks</p><p className="text-2xl font-bold">{scheduledTasks.length}</p></Panel>
        <Panel><p className="text-sm text-slate-400">Memories Indexed</p><p className="text-2xl font-bold">{memoryEntries.length}</p></Panel>
        <Panel><p className="text-sm text-slate-400">Team Agents</p><p className="text-2xl font-bold">{teamAgents.length}</p></Panel>
        <Panel><p className="text-sm text-slate-400">Active Office</p><p className="text-2xl font-bold">{officePresence.filter((a) => a.state === "working").length}</p></Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <FocusThreeWidget />
        <ProjectProgressPanel />
        <FlowAlertsPanel />
      </div>

      <WorkflowCards />
      <AgentUtilizationPanel />
    </div>
  );
}
