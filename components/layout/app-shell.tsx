"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Calendar, GitBranch, LayoutDashboard, Library, NotebookPen, Users, Workflow } from "lucide-react";
import { clsx } from "clsx";
import { GlobalQuickAdd } from "./global-quick-add";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Content Pipeline", icon: GitBranch },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/memory", label: "Memory", icon: Library },
  { href: "/team", label: "Team", icon: Users },
  { href: "/office", label: "Office", icon: Workflow },
  { href: "/research", label: "Research", icon: BrainCircuit },
  { href: "/review", label: "Weekly Review", icon: NotebookPen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl gap-6 p-6">
        <aside className="sticky top-6 h-fit w-64 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h1 className="mb-4 text-lg font-semibold">Mission Control v1</h1>
          <nav className="space-y-2">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                    pathname === item.href ? "bg-cyan-600 text-white" : "text-slate-300 hover:bg-slate-800",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1">
          <GlobalQuickAdd />
          {children}
        </main>
      </div>
    </div>
  );
}
