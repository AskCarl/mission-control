import { clsx } from "clsx";

export function ProgressRing({
  label,
  percent,
  tone = "cyan",
}: {
  label: string;
  percent: number;
  tone?: "cyan" | "emerald" | "amber" | "rose";
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const toneColor: Record<string, string> = {
    cyan: "rgb(34 211 238)",
    emerald: "rgb(16 185 129)",
    amber: "rgb(245 158 11)",
    rose: "rgb(244 63 94)",
  };

  const toneText: Record<string, string> = {
    cyan: "text-cyan-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-16 w-16 rounded-full bg-slate-800"
        style={{
          backgroundImage: `conic-gradient(${toneColor[tone]} ${clamped * 3.6}deg, rgb(30 41 59) 0deg)`,
        }}
      >
        <div className="absolute inset-2 rounded-full bg-slate-950" />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
          {clamped}%
        </div>
      </div>
      <div>
        <p className={clsx("text-sm text-slate-400")}>{label}</p>
        <div className={clsx("text-xs font-semibold", toneText[tone])}>{clamped >= 70 ? "On track" : "Build momentum"}</div>
      </div>
    </div>
  );
}
