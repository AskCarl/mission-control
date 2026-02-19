import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contentCards").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    owner: v.union(v.literal("Sean"), v.literal("Carl")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("contentCards", {
      ...args,
      stage: "Idea",
      priority: "medium",
      platformTags: [],
      attachmentUrls: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStage = mutation({
  args: {
    id: v.id("contentCards"),
    stage: v.union(
      v.literal("Idea"),
      v.literal("Script Draft"),
      v.literal("Thumbnail"),
      v.literal("Filming"),
      v.literal("Editing"),
      v.literal("Scheduled"),
      v.literal("Published"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stage: args.stage, updatedAt: Date.now() });
  },
});
