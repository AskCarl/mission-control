"use client";

import { useState } from "react";
import { quickAddTemplates } from "@/lib/mock-data";

export function GlobalQuickAdd() {
  const [active, setActive] = useState(quickAddTemplates[0]);
  const [value, setValue] = useState("");

  return (
    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="mb-2 flex flex-wrap gap-2">
        {quickAddTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => setActive(template)}
            className={template.id === active.id ? "rounded bg-cyan-600 px-2 py-1 text-xs" : "rounded bg-slate-700 px-2 py-1 text-xs"}
          >
            {template.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={active.placeholder}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <button
          onClick={() => setValue("")}
          className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white"
          title="Mock action only for v1.1"
        >
          Quick Add
        </button>
      </div>
    </div>
  );
}
