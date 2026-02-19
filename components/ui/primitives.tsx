import { clsx } from "clsx";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-2xl border border-slate-800 bg-slate-900/60 p-4", className)} {...props} />;
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-slate-700 text-slate-100",
    success: "bg-emerald-700/70 text-emerald-100",
    warning: "bg-amber-700/70 text-amber-100",
    danger: "bg-rose-700/70 text-rose-100",
  };
  return <span className={clsx("rounded-full px-2 py-1 text-xs", tones[tone])}>{children}</span>;
}
