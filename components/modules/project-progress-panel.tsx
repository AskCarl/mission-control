import { format } from "date-fns";
import { projectProgress } from "@/lib/mock-data";
import { Panel } from "@/components/ui/primitives";

export function ProjectProgressPanel() {
  return (
    <Panel>
      <h3 className="mb-3 text-lg font-semibold">Project Progress</h3>
      <div className="space-y-3">
        {projectProgress.map((project) => (
          <div key={project.id} className="rounded-lg bg-slate-800 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">{project.project}</p>
              <span className="text-xs text-slate-400">{project.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${project.progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {project.milestone} · due {format(new Date(project.dueDate), "EEE MMM d")}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
