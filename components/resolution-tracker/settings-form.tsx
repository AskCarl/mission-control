"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import type { ResolutionSettings, SettingsPayload } from "@/lib/resolution-tracker/types";
import { saveSettings } from "@/lib/resolution-tracker/api";

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function SettingsForm({ data }: { data: ResolutionSettings }) {
  const [fastingDays, setFastingDays] = useState<string[]>(data.fastingDays);
  const [workoutTargetDays, setWorkoutTargetDays] = useState(data.workoutTargetDays);
  const [weightTarget, setWeightTarget] = useState(data.weightTarget);
  const [alcoholWeeklyLimit, setAlcoholWeeklyLimit] = useState(data.alcoholWeeklyLimit);
  const [reminderMorning, setReminderMorning] = useState(data.reminderMorning);
  const [reminderEvening, setReminderEvening] = useState(data.reminderEvening);
  const [readingTarget, setReadingTarget] = useState(data.readingMonthlyMinutesTarget);
  const [weights, setWeights] = useState(
    data.scoreWeights ?? { nutrition: 35, fitness: 25, recovery: 15, growth: 15, finance: 10 }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo<SettingsPayload>(
    () => ({
      fastingDays,
      workoutTargetDays,
      alcoholWeeklyLimit,
      readingMonthlyMinutesTarget: readingTarget,
      reminderMorning,
      reminderEvening,
      weightTarget,
      scoreWeights: weights,
    }),
    [
      fastingDays,
      workoutTargetDays,
      alcoholWeeklyLimit,
      readingTarget,
      reminderMorning,
      reminderEvening,
      weightTarget,
      weights,
    ]
  );

  const toggleDay = (day: string) => {
    setSaved(false);
    setFastingDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    saveSettings(payload)
      .then(() => setSaved(true))
      .catch((err) => setError(String(err)))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <p className="text-sm text-rose-300">Save failed: {error}</p> : null}

      <Panel className="space-y-4">
        <div>
          <label className="text-sm font-medium">Fasting days</label>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg border px-3 py-2 ${
                  fastingDays.includes(day)
                    ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                    : "border-slate-800 bg-slate-950"
                }`}
              >
                {day.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Workout target days / week</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              type="number"
              value={workoutTargetDays}
              onChange={(event) => {
                setSaved(false);
                setWorkoutTargetDays(Number(event.target.value));
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Weight target (lbs)</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              type="number"
              value={weightTarget}
              onChange={(event) => {
                setSaved(false);
                setWeightTarget(Number(event.target.value));
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Alcohol weekly limit</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              type="number"
              min={0}
              max={14}
              value={alcoholWeeklyLimit}
              onChange={(event) => {
                setSaved(false);
                setAlcoholWeeklyLimit(Number(event.target.value));
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Daily reminder (morning)</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              type="time"
              value={reminderMorning}
              onChange={(event) => {
                setSaved(false);
                setReminderMorning(event.target.value);
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Daily reminder (evening)</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              type="time"
              value={reminderEvening}
              onChange={(event) => {
                setSaved(false);
                setReminderEvening(event.target.value);
              }}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Monthly reading target (minutes)</label>
          <input
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
            type="number"
            value={readingTarget}
            onChange={(event) => {
              setSaved(false);
              setReadingTarget(Number(event.target.value));
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Score weights (advanced)</label>
          <textarea
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm"
            rows={4}
            value={JSON.stringify(weights)}
            onChange={(event) => {
              setSaved(false);
              try {
                const parsed = JSON.parse(event.target.value) as typeof weights;
                setWeights(parsed);
              } catch {
                // ignore invalid JSON
              }
            }}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-cyan-500 py-2 text-sm font-semibold text-slate-950"
          disabled={saving}
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Settings"}
        </button>
      </Panel>
    </form>
  );
}
