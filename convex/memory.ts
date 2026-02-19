import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const entries = await ctx.db.query("memoryEntries").collect();
    if (!args.search) return entries;
    const q = args.search.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  },
});

export const updateState = mutation({
  args: {
    id: v.id("memoryEntries"),
    status: v.union(v.literal("active"), v.literal("stale"), v.literal("archived")),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { ...args, updatedAt: Date.now() });
  },
});
