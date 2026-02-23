"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { saveDaily } from "@/lib/resolution-tracker/api";
import type { ScoreWeights } from "@/lib/resolution-tracker/types";

const workoutTypes = ["swim", "resistance", "yoga", "walk", "other"] as const;

type WorkoutType = (typeof workoutTypes)[number] | "";

type CheckinState = {
  antiInflammatory: boolean;
  fastingDone: boolean;
  fakeSugarAvoided: boolean;
  sweetsControlled: boolean;
  gutHealthSupport: boolean;
  workoutDone: boolean;
  workoutType: WorkoutType;
  lowImpactFlex: boolean;
  alcoholDrinks: number;
  nicotineLevel: number;
  readingMinutes: number;
  frugalDay: boolean;
  notes: string;
};

const defaultState: CheckinState = {
  antiInflammatory: false,
  fastingDone: false,
  fakeSugarAvoided: false,
  sweetsControlled: false,
  gutHealthSupport: false,
  workoutDone: false,
  workoutType: "",
  lowImpactFlex: false,
  alcoholDrinks: 0,
  nicotineLevel: 0,
  readingMinutes: 0,
  frugalDay: false,
  notes: "",
};

const defaultWeights: ScoreWeights = {
  nutrition: 35,
  fitness: 25,
  recovery: 15,
  growth: 15,
  finance: 10,
};

function computeScore(state: CheckinState, weights: ScoreWeights = defaultWeights) {
  let score = 0;

  const nutritionBase =
    (state.antiInflammatory ? 10 : 0) +
    (state.fakeSugarAvoided ? 10 : 0) +
    (state.sweetsControlled ? 5 : 0) +
    (state.gutHealthSupport ? 10 : 0);
  score += (weights.nutrition / 35) * nutritionBase;

  const fitnessBase = (state.workoutDone ? 15 : 0) + (state.lowImpactFlex ? 10 : 0);
  score += (weights.fitness / 25) * fitnessBase;

  const alcoholBase = state.alcoholDrinks === 0 ? 10 : state.alcoholDrinks === 1 ? 5 : 0;
  const nicotineBase = Math.max(0, 5 * (1 - state.nicotineLevel / 10));
  const recoveryBase = alcoholBase + nicotineBase;
  score += (weights.recovery / 15) * recoveryBase;

  const readingBase =
    state.readingMinutes >= 40 ? 15 : state.readingMinutes >= 20 ? 10 : state.readingMinutes >= 1 ? 5 : 0;
  score += (weights.growth / 15) * readingBase;

  const financeBase = state.frugalDay ? 10 : 0;
  score += (weights.finance / 10) * financeBase;

  if (state.fastingDone) score += 5;

  return Math.min(100, Math.round(score));
}

export function CheckinForm({ scoreWeights = defaultWeights }: { scoreWeights?: ScoreWeights }) {
  const [state, setState] = useState<CheckinState>(defaultState);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => computeScore(state, scoreWeights), [state, scoreWeights]);

  const setField = <K extends keyof CheckinState>(key: K, value: CheckinState[K]) => {
    setSaved(false);
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    saveDaily({
      antiInflammatory: state.antiInflammatory,
      fastingDone: state.fastingDone,
      fakeSugarAvoided: state.fakeSugarAvoided,
      sweetsControlled: state.sweetsControlled,
      gutHealthSupport: state.gutHealthSupport,
      workoutDone: state.workoutDone,
      workoutType: state.workoutType || null,
      lowImpactFlex: state.lowImpactFlex,
      alcoholDrinks: state.alcoholDrinks,
      nicotineLevel: state.nicotineLevel,
      readingMinutes: state.readingMinutes,
      frugalDay: state.frugalDay,
      notes: state.notes || null,
      dailyScore: score,
    })
      .then(() => setSaved(true))
      .catch((err) => setError(String(err)))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-24">
      <Panel className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Today Score</p>
          <p className="text-3xl font-semibold">{score}</p>
        </div>
        <div className="text-right text-sm text-slate-400">
          <p>Fast input, no guilt.</p>
          <p>Skip what doesn’t apply.</p>
        </div>
      </Panel>

      <Panel className="space-y-3">
        <ToggleRow label="Anti-inflammatory day" checked={state.antiInflammatory} onChange={(value) => setField("antiInflammatory", value)} />
        <ToggleRow label="Fasting completed" checked={state.fastingDone} onChange={(value) => setField("fastingDone", value)} helper="Only on scheduled fasting days" />
        <ToggleRow label="Fake sugar avoided" checked={state.fakeSugarAvoided} onChange={(value) => setField("fakeSugarAvoided", value)} />
        <ToggleRow label="Sweets controlled" checked={state.sweetsControlled} onChange={(value) => setField("sweetsControlled", value)} />
        <ToggleRow label="Gut-health supportive meals" checked={state.gutHealthSupport} onChange={(value) => setField("gutHealthSupport", value)} />
      </Panel>

      <Panel className="space-y-3">
        <ToggleRow label="Workout done" checked={state.workoutDone} onChange={(value) => setField("workoutDone", value)} />
        <SelectRow
          label="Workout type"
          value={state.workoutType}
          onChange={(value) => setField("workoutType", value as WorkoutType)}
          options={[{ label: "Select", value: "" }, ...workoutTypes.map((item) => ({ label: item, value: item }))]}
        />
        <ToggleRow label="Low-impact / flexibility included" checked={state.lowImpactFlex} onChange={(value) => setField("lowImpactFlex", value)} />
      </Panel>

      <Panel className="space-y-3">
        <RangeRow label="Alcohol drinks" value={state.alcoholDrinks} min={0} max={5} onChange={(value) => setField("alcoholDrinks", value)} />
        <RangeRow label="Nicotine level" value={state.nicotineLevel} min={0} max={10} onChange={(value) => setField("nicotineLevel", value)} />
        <RangeRow label="Reading / listening minutes" value={state.readingMinutes} min={0} max={180} step={5} onChange={(value) => setField("readingMinutes", value)} />
        <ToggleRow label="Frugal day" checked={state.frugalDay} onChange={(value) => setField("frugalDay", value)} />
      </Panel>

      <Panel className="space-y-2">
        <label className="text-sm text-slate-400">Notes (optional)</label>
        <textarea
          value={state.notes}
          onChange={(event) => setField("notes", event.target.value.slice(0, 140))}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"
          rows={3}
          placeholder="Any quick context for today..."
        />
        <div className="text-right text-xs text-slate-500">{state.notes.length}/140</div>
      </Panel>

      <div className="sticky bottom-4 space-y-2">
        {error ? <p className="text-sm text-rose-300">Save failed: {error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-2xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 shadow-lg"
          disabled={saving}
        >
          {saving ? "Saving..." : saved ? "Logged ✓" : "Log Day"}
        </button>
      </div>
    </form>
  );
}

function ToggleRow({
  label,
  helper,
  checked,
  onChange,
}: {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-cyan-400"
      />
    </label>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-slate-300">{value}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
