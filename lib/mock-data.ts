import { ContentCard, MemoryEntry, OfficePresence, ScheduledTask, TeamAgent } from "./types";

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
  { id: "o2", agentName: "Codezer", state: "working", currentTask: "Coding", workstationPosition: "A2" },
  { id: "o3", agentName: "Scribe", state: "idle", workstationPosition: "B1" },
  { id: "o4", agentName: "Forge", state: "offline", workstationPosition: "B2" },
];
