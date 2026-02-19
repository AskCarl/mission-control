import {
  AgentUtilization,
  ContentCard,
  FocusTask,
  MemoryEntry,
  OfficePresence,
  ProjectProgress,
  QuickAddTemplate,
  ScheduledTask,
  TeamAgent,
  WeeklyReviewItem,
  WorkflowCard,
} from "./types";

export const contentCards: ContentCard[] = [
  {
    id: "c1",
    title: "Mission Control morning workflow",
    owner: "Carl",
    stage: "Idea",
    priority: "high",
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    platformTags: ["X", "TikTok"],
    hook: "Run your entire day from one AI dashboard",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c2",
    title: "iMac lag troubleshooting reel",
    owner: "Sean",
    stage: "Filming",
    priority: "medium",
    platformTags: ["IG Reels"],
    script: "3 checks in Activity Monitor",
    updatedAt: new Date().toISOString(),
  },
];

export const scheduledTasks: ScheduledTask[] = [
  {
    id: "t1",
    title: "Morning market sentiment add-on",
    source: "cron",
    owner: "Carl",
    scheduleType: "recurring",
    nextRunAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "active",
    deliveryTarget: "telegram",
    cronExpr: "0 8 * * 1-5",
    lastRunStatus: "ok",
  },
  {
    id: "t2",
    title: "iCloud calendar integration check",
    source: "reminder",
    owner: "Shared",
    scheduleType: "one-time",
    nextRunAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: "active",
    deliveryTarget: "chat",
  },
];

export const memoryEntries: MemoryEntry[] = [
  {
    id: "m1",
    title: "Kalshi trading rules",
    sourcePath: "memory/2026-01-29.md",
    content: "Minimum 2:1 R:R. No 80% trap bets. Max 10% bankroll.",
    tags: ["finance", "rules"],
    status: "active",
    pinned: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m2",
    title: "Fastmail fix confirmed",
    sourcePath: "memory/2026-02-19.md",
    content: "Himalaya credential path stabilized.",
    tags: ["ops", "email"],
    status: "active",
    pinned: false,
    updatedAt: new Date().toISOString(),
  },
];

export const teamAgents: TeamAgent[] = [
  {
    id: "a1",
    name: "Carl",
    label: "Manager / Chief of Staff",
    role: "Orchestrator",
    status: "active",
    currentTask: "Coordinate Mission Control v1",
    lastCompletedTask: "Market sentiment cron upgrade",
    responsibilities: ["Delegation", "QA", "User communication"],
  },
  {
    id: "a2",
    name: "Codezer",
    label: "Developer",
    role: "Software engineer",
    status: "active",
    currentTask: "Build Next.js + Convex modules",
    responsibilities: ["Implementation", "Testing", "Tooling"],
  },
  {
    id: "a3",
    name: "Scribe",
    label: "Writer",
    role: "Content specialist",
    status: "idle",
    responsibilities: ["Scripts", "Comms"],
  },
  {
    id: "a4",
    name: "Forge",
    label: "Designer",
    role: "Creative",
    status: "offline",
    responsibilities: ["Thumbnails", "Visual direction"],
  },
];

export const officePresence: OfficePresence[] = [
  { id: "o1", agentName: "Carl", state: "working", currentTask: "Planning", workstationPosition: "A1" },
  { id: "o2", agentName: "Codezer", state: "blocked", currentTask: "Convex auth wiring", workstationPosition: "A2", blockedSince: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
  { id: "o3", agentName: "Scribe", state: "idle", workstationPosition: "B1" },
  { id: "o4", agentName: "Forge", state: "offline", workstationPosition: "B2" },
];

export const focusThree: FocusTask[] = [
  { id: "f1", title: "Ship Mission Control v1.1 optimization", owner: "Carl", estimateHours: 3, status: "on-track" },
  { id: "f2", title: "Close open pipeline cards older than 48h", owner: "Sean", estimateHours: 2, status: "at-risk" },
  { id: "f3", title: "Finalize weekly review operating rhythm", owner: "Carl", estimateHours: 1, status: "on-track" },
];

export const projectProgress: ProjectProgress[] = [
  {
    id: "p1",
    project: "Mission Control Core",
    owner: "Shared",
    progress: 78,
    milestone: "v1.1 Dashboard polish",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p2",
    project: "Automation Reliability",
    owner: "Carl",
    progress: 62,
    milestone: "Alerting + fallback routing",
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p3",
    project: "Content Engine",
    owner: "Sean",
    progress: 45,
    milestone: "Next 10 scripts queued",
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const workflowCards: WorkflowCard[] = [
  {
    id: "w1",
    period: "AM",
    title: "Morning Execution Block",
    owner: "Shared",
    checklist: ["Standup + top priorities", "Review failed automations", "Queue first content task"],
  },
  {
    id: "w2",
    period: "PM",
    title: "Afternoon Closeout Block",
    owner: "Shared",
    checklist: ["Resolve blockers or escalate", "Update project progress", "Draft weekly review notes"],
  },
];

export const agentUtilization: AgentUtilization[] = [
  { agentId: "a1", agentName: "Carl", capacityHours: 8, allocatedHours: 7 },
  { agentId: "a2", agentName: "Codezer", capacityHours: 8, allocatedHours: 9 },
  { agentId: "a3", agentName: "Scribe", capacityHours: 6, allocatedHours: 3 },
  { agentId: "a4", agentName: "Forge", capacityHours: 6, allocatedHours: 0 },
];

export const quickAddTemplates: QuickAddTemplate[] = [
  { id: "q1", label: "Task", placeholder: "Add task to mission queue…" },
  { id: "q2", label: "Memory", placeholder: "Capture memory note…" },
  { id: "q3", label: "Content", placeholder: "Create pipeline card…" },
];

export const weeklyReviewItems: WeeklyReviewItem[] = [
  {
    id: "r1",
    category: "wins",
    title: "Mission modules shipped",
    detail: "All six v1 modules are in place and mock-backed for deterministic demos.",
  },
  {
    id: "r2",
    category: "misses",
    title: "2 automations still flaky",
    detail: "Cron health checks passed but iCloud sync and fallback routing need hardening.",
  },
  {
    id: "r3",
    category: "next",
    title: "Push reliability sprint",
    detail: "Prioritize alert reliability, unblock Codezer, and tighten WIP adherence next week.",
  },
];
