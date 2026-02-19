import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("scheduledTasks").collect(),
});

export const upsertTask = mutation({
  args: {
    id: v.optional(v.id("scheduledTasks")),
    title: v.string(),
    source: v.union(v.literal("cron"), v.literal("manual"), v.literal("reminder")),
    owner: v.union(v.literal("Carl"), v.literal("Sean"), v.literal("Shared")),
    scheduleType: v.union(v.literal("one-time"), v.literal("recurring")),
    nextRunAt: v.string(),
    timezone: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("failed"), v.literal("completed")),
    deliveryTarget: v.string(),
    cronExpr: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.id) {
      const { id, ...rest } = args;
      await ctx.db.patch(id, { ...rest, updatedAt: now });
      return id;
    }

    return await ctx.db.insert("scheduledTasks", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});
