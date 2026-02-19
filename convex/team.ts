import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listAgents = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("teamAgents").collect(),
});

export const listAssignments = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("agentAssignments").collect(),
});

export const reassignTask = mutation({
  args: {
    assignmentId: v.id("agentAssignments"),
    agentId: v.id("teamAgents"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, { agentId: args.agentId });
  },
});
