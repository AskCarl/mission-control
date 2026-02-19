export type ContentStage =
  | "Idea"
  | "Script Draft"
  | "Thumbnail"
  | "Filming"
  | "Editing"
  | "Scheduled"
  | "Published";

export type ContentCard = {
  id: string;
  title: string;
  owner: "Sean" | "Carl";
  stage: ContentStage;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  platformTags: string[];
  hook?: string;
  script?: string;
  cta?: string;
  notes?: string;
  updatedAt: string;
};

export type ScheduledTask = {
  id: string;
  title: string;
  source: "cron" | "manual" | "reminder";
  owner: "Carl" | "Sean" | "Shared";
  scheduleType: "one-time" | "recurring";
  nextRunAt: string;
  status: "active" | "paused" | "failed" | "completed";
  deliveryTarget: string;
  cronExpr?: string;
  lastRunStatus?: "ok" | "error" | "skipped";
};

export type MemoryEntry = {
  id: string;
  title: string;
  sourcePath: string;
  content: string;
  tags: string[];
  status: "active" | "stale" | "archived";
  pinned: boolean;
  updatedAt: string;
};

export type TeamAgent = {
  id: string;
  name: string;
  label: string;
  role: string;
  status: "active" | "idle" | "offline";
  currentTask?: string;
  lastCompletedTask?: string;
  responsibilities: string[];
};

export type OfficePresence = {
  id: string;
  agentName: string;
  state: "working" | "idle" | "blocked" | "offline";
  currentTask?: string;
  workstationPosition: string;
};
