import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contentCards: defineTable({
    title: v.string(),
    owner: v.union(v.literal("Sean"), v.literal("Carl")),
    stage: v.union(
      v.literal("Idea"),
      v.literal("Script Draft"),
      v.literal("Thumbnail"),
      v.literal("Filming"),
      v.literal("Editing"),
      v.literal("Scheduled"),
      v.literal("Published"),
    ),
    hook: v.optional(v.string()),
    script: v.optional(v.string()),
    cta: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    dueDate: v.optional(v.string()),
    platformTags: v.array(v.string()),
    attachmentUrls: v.array(v.string()),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_stage", ["stage"]),

  scheduledTasks: defineTable({
    title: v.string(),
    source: v.union(v.literal("cron"), v.literal("manual"), v.literal("reminder")),
    owner: v.union(v.literal("Carl"), v.literal("Sean"), v.literal("Shared")),
    scheduleType: v.union(v.literal("one-time"), v.literal("recurring")),
    nextRunAt: v.string(),
    cronExpr: v.optional(v.string()),
    timezone: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("failed"), v.literal("completed")),
    deliveryTarget: v.string(),
    lastRunAt: v.optional(v.string()),
    lastRunStatus: v.optional(v.union(v.literal("ok"), v.literal("error"), v.literal("skipped"))),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_nextRunAt", ["nextRunAt"]),

  memoryEntries: defineTable({
    title: v.string(),
    sourcePath: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    category: v.string(),
    status: v.union(v.literal("active"), v.literal("stale"), v.literal("archived")),
    pinned: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sourcePath", ["sourcePath"]),

  teamAgents: defineTable({
    name: v.string(),
    label: v.string(),
    role: v.string(),
    status: v.union(v.literal("active"), v.literal("idle"), v.literal("offline")),
    specialties: v.array(v.string()),
    responsibilities: v.array(v.string()),
    defaultTools: v.array(v.string()),
    currentTask: v.optional(v.string()),
    lastCompletedTask: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  agentAssignments: defineTable({
    agentId: v.id("teamAgents"),
    taskTitle: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    dueAt: v.optional(v.string()),
    status: v.union(v.literal("queued"), v.literal("in_progress"), v.literal("blocked"), v.literal("done")),
  }),

  officePresence: defineTable({
    agentName: v.string(),
    state: v.union(v.literal("working"), v.literal("idle"), v.literal("blocked"), v.literal("offline")),
    currentTask: v.optional(v.string()),
    workstationPosition: v.string(),
    avatarStyle: v.string(),
    updatedAt: v.number(),
  }),
});
