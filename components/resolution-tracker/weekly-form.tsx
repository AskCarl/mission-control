"use client";

import { useMemo, useState } from "react";
import type { ResolutionWeekly, WeeklyReviewPayload } from "@/lib/resolution-tracker/types";
import { saveWeekly, saveWeight } from "@/lib/resolution-tracker/api";

function getWeekStart(date: Date) {
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

export function WeeklyReviewForm({ data }: { data: ResolutionWeekly }) {
  const initial = data.review ?? {
    weekStart: getWeekStart(new Date()),
    activeCashflowProject: data.cashflowProject.name,
    projectStatus: data.cashflowProject.status,
    nextStep: data.cashflowProject.nextStep,
    workedWell: "",
    improveNext: "",
  };

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [weightSaved, setWeightSaved] = useState(false);

  const payload = useMemo<WeeklyReviewPayload>(
    () => ({
      weekStart: form.weekStart,
      activeCashflowProject: form.activeCashflowProject,
      projectStatus: form.projectStatus,
      nextStep: form.nextStep,
      workedWell: form.workedWell || null,
      improveNext: form.improveNext || null,
    }),
    [form]
  );

  const update = (key: keyof typeof form, value: string) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    saveWeekly(payload)
      .then(() => setSaved(true))
      .catch((err) => setError(String(err)))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? <p className="text-sm text-rose-300">Save failed: {error}</p> : null}
      <label className="text-sm font-medium">Update weight</label>
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
          placeholder="lbs"
          type="number"
          min={0}
          step="0.1"
          value={weight}
          onChange={(event) => {
            setWeightSaved(false);
            setWeight(event.target.value);
          }}
        />
        <button
          type="button"
          className="rounded-xl border border-slate-800 px-3 py-2 text-sm"
          onClick={() => {
            const value = Number(weight);
            if (!Number.isFinite(value) || value <= 0) return;
            setError(null);
            saveWeight({ weightLbs: value })
              .then(() => setWeightSaved(true))
              .catch((err) => setError(String(err)));
          }}
        >
          {weightSaved ? "Saved" : "Log"}
        </button>
      </div>
      <label className="text-sm font-medium">This week’s step</label>
      <input
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
        value={form.nextStep}
        onChange={(event) => update("nextStep", event.target.value)}
        placeholder="One concrete step for next week..."
      />
      <label className="text-sm font-medium">Active income stream</label>
      <input
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
        value={form.activeCashflowProject}
        onChange={(event) => update("activeCashflowProject", event.target.value)}
        placeholder="Cashflow Real Estate, AI-Driven Business Build..."
      />
      <label className="text-sm font-medium">Income stream status</label>
      <input
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
        value={form.projectStatus}
        onChange={(event) => update("projectStatus", event.target.value)}
        placeholder="not started / research / in progress / launched"
      />
      <label className="text-sm font-medium">What worked?</label>
      <textarea
        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"
        rows={3}
        value={form.workedWell}
        onChange={(event) => update("workedWell", event.target.value)}
      />
      <label className="text-sm font-medium">What to improve?</label>
      <textarea
        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"
        rows={3}
        value={form.improveNext}
        onChange={(event) => update("improveNext", event.target.value)}
      />
      <button
        type="submit"
        className="w-full rounded-xl bg-cyan-500 py-2 text-sm font-semibold text-slate-950"
        disabled={saving}
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Weekly Plan"}
      </button>
    </form>
  );
}
