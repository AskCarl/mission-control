"use client";

import { useEffect, useState } from "react";
import { CheckinForm } from "@/components/resolution-tracker/checkin-form";
import { fetchSettings } from "@/lib/resolution-tracker/api";
import type { ResolutionSettings, ScoreWeights } from "@/lib/resolution-tracker/types";

const defaultWeights: ScoreWeights = {
  nutrition: 35,
  fitness: 25,
  recovery: 15,
  growth: 15,
  finance: 10,
};

export default function ResolutionCheckinPage() {
  const [weights, setWeights] = useState<ScoreWeights>(defaultWeights);

  useEffect(() => {
    fetchSettings()
      .then((data: ResolutionSettings) => {
        if (data.scoreWeights) setWeights(data.scoreWeights);
      })
      .catch(() => {
        // keep defaults
      });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-400">Resolution Tracker</p>
        <h2 className="text-2xl font-semibold">Daily Check-in</h2>
      </div>
      <CheckinForm scoreWeights={weights} />
    </div>
  );
}
