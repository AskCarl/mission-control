import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createTask = mutation({
  args: {
    taskId: v.string(),
    idempotencyKey: v.optional(v.string()),
    taskType: v.literal("autonomous_research"),
    state: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    title: v.string(),
    prompt: v.string(),
    domain: v.optional(v.string()),
    requestedBy: v.optional(v.string()),
    adapterSequence: v.array(v.string()),
    attempt: v.number(),
    maxAttempts: v.number(),
    retryPolicy: v.any(),
    createdAtMs: v.number(),
    queuedAtMs: v.optional(v.number()),
    updatedAtMs: v.number(),
  },
  handler: async (ctx, args) => {
    // idempotency guard
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("researchTasks")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey!))
        .first();
      if (existing) return existing._id;
    }
    return ctx.db.insert("researchTasks", args);
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.string(),
    state: v.optional(v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    )),
    currentAdapterId: v.optional(v.string()),
    assignedWorkerId: v.optional(v.string()),
    attempt: v.optional(v.number()),
    updatedAtMs: v.number(),
    startedAtMs: v.optional(v.number()),
    completedAtMs: v.optional(v.number()),
    failedAtMs: v.optional(v.number()),
    nextRetryAtMs: v.optional(v.number()),
    result: v.optional(v.any()),
    failure: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { taskId, ...patch } = args;
    const record = await ctx.db
      .query("researchTasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
      .first();
    if (!record) throw new Error(`researchTask not found: ${taskId}`);

    // strip undefined keys before patching
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(record._id, clean);
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getByTaskId = query({
  args: { taskId: v.string() },
  handler: async (ctx, { taskId }) => {
    return ctx.db
      .query("researchTasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
      .first();
  },
});

export const listByState = query({
  args: {
    state: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, { state }) => {
    return ctx.db
      .query("researchTasks")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return ctx.db
      .query("researchTasks")
      .order("desc")
      .take(limit ?? 20);
  },
});
