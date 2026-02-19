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
      <Panel>
        <h3 className="mb-2 font-semibold">v1 status</h3>
        <p className="text-sm text-slate-300">
          All requested modules are scaffolded with shared design system, navigation, and Convex schema/functions.
          UI currently runs with mock seed data for safe local development.
        </p>
      </Panel>
    </div>
  );
}
