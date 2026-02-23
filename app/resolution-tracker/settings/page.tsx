"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { SettingsForm } from "@/components/resolution-tracker/settings-form";
import { fetchSettings } from "@/lib/resolution-tracker/api";
import type { ResolutionSettings } from "@/lib/resolution-tracker/types";

export default function ResolutionSettingsPage() {
  const [data, setData] = useState<ResolutionSettings | null>(null);

  useEffect(() => {
    fetchSettings()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-400">Resolution Tracker</p>
        <h2 className="text-2xl font-semibold">Settings</h2>
      </div>

      {data ? <SettingsForm data={data} /> : <Panel><p className="text-sm text-slate-400">Loading settings...</p></Panel>}
    </div>
  );
}
