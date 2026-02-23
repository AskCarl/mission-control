"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { WeeklyReviewForm } from "@/components/resolution-tracker/weekly-form";
import { weeklySnapshot } from "@/lib/resolution-tracker-mock";
import { fetchWeekly } from "@/lib/resolution-tracker/api";
import type { ResolutionWeekly } from "@/lib/resolution-tracker/types";

export default function ResolutionWeeklyPage() {
  const [data, setData] = useState<ResolutionWeekly | null>(null);

  useEffect(() => {
    fetchWeekly().then(setData).catch(() => setData(weeklySnapshot));
  }, []);

  const snapshot = data ?? weeklySnapshot;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-400">Resolution Tracker</p>
        <h2 className="text-2xl font-semibold">Weekly Review</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <p className="text-sm text-slate-400">Weight Trend</p>
          <p className="text-2xl font-semibold">{snapshot.weightTrend7d} (7d)</p>
          <p className="text-xs text-slate-500">{snapshot.weightTrend30d} over 30d</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">Alcohol</p>
          <p className="text-2xl font-semibold">{snapshot.alcoholThisWeek} / {snapshot.alcoholLimit}</p>
          <p className="text-xs text-slate-500">Weekly limit</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">Workouts</p>
          <p className="text-2xl font-semibold">{snapshot.workoutsThisWeek} / {snapshot.workoutTarget}</p>
          <p className="text-xs text-slate-500">Target days</p>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <p className="text-sm text-slate-400">Reading</p>
          <p className="text-2xl font-semibold">{snapshot.readingMinutesThisMonth} / {snapshot.readingTarget} min</p>
          <p className="text-xs text-slate-500">Monthly target</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">New Income Streams</p>
          <p className="text-lg font-semibold">{snapshot.cashflowProject.name}</p>
          <p className="text-sm text-slate-300">Status: {snapshot.cashflowProject.status}</p>
          <p className="text-xs text-slate-500">Next step: {snapshot.cashflowProject.nextStep}</p>
        </Panel>
      </div>

      <Panel className="space-y-3">
        <p className="text-sm font-semibold">Weekly Pillar Breakdown</p>
        <div className="grid gap-2 md:grid-cols-2">
          {snapshot.themes.map((theme) => (
            <div key={theme.name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
              <span>{theme.name}</span>
              <span className="text-slate-300">{theme.percent}%</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="space-y-3">
        <WeeklyReviewForm data={snapshot} />
      </Panel>
    </div>
  );
}
