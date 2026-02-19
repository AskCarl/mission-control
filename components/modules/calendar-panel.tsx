"use client";

import { format } from "date-fns";
import { scheduledTasks } from "@/lib/mock-data";
import { Badge, Panel } from "@/components/ui/primitives";

export function CalendarPanel() {
  const failed = scheduledTasks.filter((t) => t.status === "failed" || t.lastRunStatus === "error");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <p className="text-sm text-slate-400">Today Summary</p>
          <p className="mt-2 text-2xl font-semibold">{scheduledTasks.length} tasks</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">Needs Attention</p>
          <p className="mt-2 text-2xl font-semibold text-rose-300">{failed.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">On Schedule</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{scheduledTasks.length - failed.length}</p>
        </Panel>
      </div>

      <Panel>
        <h2 className="mb-3 text-lg font-semibold">Agenda</h2>
        <div className="space-y-2">
          {scheduledTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-lg bg-slate-800 p-3">
              <div>
                <p>{task.title}</p>
                <p className="text-xs text-slate-400">
                  {format(new Date(task.nextRunAt), "EEE MMM d, h:mm a")} · {task.owner} · {task.source}
                </p>
              </div>
              <Badge tone={task.status === "failed" ? "danger" : "success"}>{task.status}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
