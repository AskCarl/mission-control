"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { memoryEntries } from "@/lib/mock-data";
import { Badge, Panel } from "@/components/ui/primitives";

export function MemoryPanel() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    if (!query) return memoryEntries;
    const q = query.toLowerCase();
    return memoryEntries.filter((m) => m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q));
  }, [query]);

  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Memory Feed</h2>
        <input
          ref={inputRef}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          placeholder="Search memory (/)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {results.map((entry) => (
          <article key={entry.id} className="rounded-lg bg-slate-800 p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="font-medium">{entry.title}</p>
              {entry.pinned && <Badge tone="warning">Pinned</Badge>}
            </div>
            <p className="text-sm text-slate-300">{entry.content}</p>
            <p className="mt-2 text-xs text-slate-400">{entry.sourcePath}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}
