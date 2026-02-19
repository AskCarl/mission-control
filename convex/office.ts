import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listPresence = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("officePresence").collect(),
});

export const updatePresence = mutation({
  args: {
    id: v.id("officePresence"),
    state: v.union(v.literal("working"), v.literal("idle"), v.literal("blocked"), v.literal("offline")),
    currentTask: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      state: args.state,
      currentTask: args.currentTask,
      updatedAt: Date.now(),
    });
  },
});
