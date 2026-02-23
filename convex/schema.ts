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

  researchTasks: defineTable({
    // app-level identity (separate from Convex _id)
    taskId: v.string(),
    idempotencyKey: v.optional(v.string()),
    taskType: v.literal("autonomous_research"),

    // state machine
    state: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),

    // request envelope
    title: v.string(),
    prompt: v.string(),
    domain: v.optional(v.string()),
    requestedBy: v.optional(v.string()),

    // orchestration metadata
    adapterSequence: v.array(v.string()),
    currentAdapterId: v.optional(v.string()),
    assignedWorkerId: v.optional(v.string()),
    attempt: v.number(),
    maxAttempts: v.number(),
    retryPolicy: v.any(),

    // timing
    createdAtMs: v.number(),
    queuedAtMs: v.optional(v.number()),
    startedAtMs: v.optional(v.number()),
    updatedAtMs: v.number(),
    completedAtMs: v.optional(v.number()),
    failedAtMs: v.optional(v.number()),
    nextRetryAtMs: v.optional(v.number()),

    // outcome — stored as any to accommodate deep nested types
    result: v.optional(v.any()),
    failure: v.optional(v.any()),
    history: v.optional(v.any()),
  })
    .index("by_taskId", ["taskId"])
    .index("by_state", ["state"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  resolutionProfiles: defineTable({
    name: v.string(),
    timezone: v.string(),
    weightTarget: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  resolutionDailyLogs: defineTable({
    profileId: v.id("resolutionProfiles"),
    localDate: v.string(),
    antiInflammatory: v.boolean(),
    fastingDone: v.boolean(),
    fakeSugarAvoided: v.boolean(),
    sweetsControlled: v.boolean(),
    gutHealthSupport: v.boolean(),
    workoutDone: v.boolean(),
    workoutType: v.optional(v.string()),
    lowImpactFlex: v.boolean(),
    alcoholDrinks: v.number(),
    nicotineLevel: v.number(),
    readingMinutes: v.number(),
    frugalDay: v.boolean(),
    notes: v.optional(v.string()),
    dailyScore: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_profile_date", ["profileId", "localDate"]),

  resolutionWeeklyReviews: defineTable({
    profileId: v.id("resolutionProfiles"),
    weekStart: v.string(),
    activeCashflowProject: v.string(),
    projectStatus: v.string(),
    nextStep: v.string(),
    workedWell: v.optional(v.string()),
    improveNext: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_profile_week", ["profileId", "weekStart"]),

  resolutionWeightLogs: defineTable({
    profileId: v.id("resolutionProfiles"),
    localDate: v.string(),
    weightLbs: v.number(),
    createdAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_profile_date", ["profileId", "localDate"]),

  resolutionSettings: defineTable({
    profileId: v.id("resolutionProfiles"),
    fastingDays: v.array(v.string()),
    workoutTargetDays: v.number(),
    alcoholWeeklyLimit: v.number(),
    readingMonthlyMinutesTarget: v.number(),
    reminderMorning: v.string(),
    reminderEvening: v.string(),
    scoreWeights: v.optional(
      v.object({
        nutrition: v.number(),
        fitness: v.number(),
        recovery: v.number(),
        growth: v.number(),
        finance: v.number(),
      })
    ),
    scoreWeightsVersion: v.number(),
    updatedAt: v.number(),
  }).index("by_profileId", ["profileId"]),
});
