"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { ProgressRing } from "@/components/resolution-tracker/progress-ring";
import { dailySnapshot } from "@/lib/resolution-tracker-mock";
import { fetchDashboard } from "@/lib/resolution-tracker/api";
import type { ResolutionDashboard } from "@/lib/resolution-tracker/types";

export default function ResolutionTrackerDashboard() {
  const [data, setData] = useState<ResolutionDashboard | null>(null);

  useEffect(() => {
    fetchDashboard().then(setData).catch(() => setData(dailySnapshot));
  }, []);

  const snapshot = data ?? dailySnapshot;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-400">Resolution Tracker</p>
        <h2 className="text-2xl font-semibold">{snapshot.dateLabel}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Panel>
          <p className="text-sm text-slate-400">Today Score</p>
          <p className="text-3xl font-semibold">{snapshot.todayScore}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">Streak</p>
          <p className="text-3xl font-semibold">{snapshot.streakCurrent} days</p>
          <p className="text-xs text-slate-500">Best: {snapshot.streakBest}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">This Week</p>
          <p className="text-3xl font-semibold">{snapshot.weekProgressPercent}%</p>
          <p className="text-xs text-slate-500">Progress to weekly targets</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">New Income Stream</p>
          <p className="text-lg font-semibold">{snapshot.incomeStream.name}</p>
          <p className="text-xs text-slate-500">Status: {snapshot.incomeStream.status}</p>
          <p className="text-xs text-slate-500">Next: {snapshot.incomeStream.nextStep}</p>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">Daily Pillars</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.rings.map((ring, index) => (
              <ProgressRing
                key={ring.label}
                label={ring.label}
                percent={ring.percent}
                tone={index === 0 ? "emerald" : index === 1 ? "cyan" : index === 2 ? "amber" : "rose"}
              />
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Most Important Today</p>
            <p className="mt-2 text-xl font-semibold">{snapshot.mostImportant}</p>
            <p className="mt-2 text-xs text-slate-500">One action. Small win.</p>
          </div>
          <div className="grid gap-2">
            {snapshot.quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium hover:bg-slate-900"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
