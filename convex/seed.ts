import { mutation } from "./_generated/server";

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const cards = await ctx.db.query("contentCards").take(1);
    if (!cards.length) {
      await ctx.db.insert("contentCards", {
        title: "AI vs Human: morning routine experiment",
        owner: "Carl",
        stage: "Script Draft",
        hook: "What if your AI ran your morning in 15 minutes?",
        script: "Open with chaos. Show checklist. Reveal outcome.",
        cta: "Follow for more mission control experiments",
        notes: "Need b-roll of desk setup",
        priority: "high",
        dueDate: new Date(now + 86400000).toISOString(),
        platformTags: ["YouTube Shorts", "TikTok"],
        attachmentUrls: ["/mock/thumbnail-1.png"],
        createdAt: now,
        updatedAt: now,
      });
    }

    const tasks = await ctx.db.query("scheduledTasks").take(1);
    if (!tasks.length) {
      await ctx.db.insert("scheduledTasks", {
        title: "Morning market sentiment via Grok",
        source: "cron",
        owner: "Carl",
        scheduleType: "recurring",
        nextRunAt: new Date(now + 3600000).toISOString(),
        cronExpr: "0 8 * * 1-5",
        timezone: "America/Los_Angeles",
        status: "active",
        deliveryTarget: "telegram",
        lastRunAt: new Date(now - 86400000).toISOString(),
        lastRunStatus: "ok",
        notes: "Include BTC, NQ, VIX summary",
        createdAt: now,
        updatedAt: now,
      });
    }

    const memory = await ctx.db.query("memoryEntries").take(1);
    if (!memory.length) {
      await ctx.db.insert("memoryEntries", {
        title: "Kalshi risk rule",
        sourcePath: "memory/2026-01-29.md",
        content: "Minimum 2:1 reward:risk. Avoid 80% trap bets.",
        tags: ["finance", "risk"],
        category: "decisions",
        status: "active",
        pinned: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
