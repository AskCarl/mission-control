import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

const DEFAULT_PROFILE_NAME = "default";
const DEFAULT_TIMEZONE = "America/Los_Angeles";

function buildLocalDate(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function diffDays(a: string, b: string): number {
  const aDate = new Date(`${a}T00:00:00Z`);
  const bDate = new Date(`${b}T00:00:00Z`);
  const diffMs = aDate.getTime() - bDate.getTime();
  return Math.round(diffMs / 86400000);
}

function formatWeightTrend(delta: number | null): string {
  if (delta === null) return "–";
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} lb`;
}

async function findProfile(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("resolutionProfiles")
    .withIndex("by_name", (q) => q.eq("name", DEFAULT_PROFILE_NAME))
    .unique();
}

async function requireProfile(ctx: QueryCtx): Promise<Doc<"resolutionProfiles">> {
  const existing = await findProfile(ctx);
  if (!existing) throw new Error("Resolution profile not initialized");
  return existing;
}

async function ensureProfile(ctx: MutationCtx): Promise<Doc<"resolutionProfiles">> {
  const existing = await findProfile(ctx);
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("resolutionProfiles", {
    name: DEFAULT_PROFILE_NAME,
    timezone: DEFAULT_TIMEZONE,
    weightTarget: 180,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create resolution profile");
  return created;
}

function defaultSettings() {
  return {
    fastingDays: ["mon", "wed", "fri"],
    workoutTargetDays: 5,
    alcoholWeeklyLimit: 1,
    readingMonthlyMinutesTarget: 900,
    reminderMorning: "07:00",
    reminderEvening: "20:30",
    scoreWeights: {
      nutrition: 35,
      fitness: 25,
      recovery: 15,
      growth: 15,
      finance: 10,
    },
    scoreWeightsVersion: 1,
  };
}

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireProfile(ctx);
    const settings = await ctx.db
      .query("resolutionSettings")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .unique();

    if (!settings) {
      return {
        profileId: profile._id,
        timezone: profile.timezone,
        weightTarget: profile.weightTarget,
        ...defaultSettings(),
      };
    }

    return {
      profileId: profile._id,
      timezone: profile.timezone,
      weightTarget: profile.weightTarget,
      fastingDays: settings.fastingDays,
      workoutTargetDays: settings.workoutTargetDays,
      alcoholWeeklyLimit: settings.alcoholWeeklyLimit,
      readingMonthlyMinutesTarget: settings.readingMonthlyMinutesTarget,
      reminderMorning: settings.reminderMorning,
      reminderEvening: settings.reminderEvening,
      scoreWeights: settings.scoreWeights,
      scoreWeightsVersion: settings.scoreWeightsVersion,
    };
  },
});

export const upsertSettings = mutation({
  args: {
    fastingDays: v.array(v.string()),
    workoutTargetDays: v.number(),
    alcoholWeeklyLimit: v.number(),
    readingMonthlyMinutesTarget: v.number(),
    reminderMorning: v.string(),
    reminderEvening: v.string(),
    weightTarget: v.number(),
    scoreWeights: v.optional(
      v.object({
        nutrition: v.number(),
        fitness: v.number(),
        recovery: v.number(),
        growth: v.number(),
        finance: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    if (profile.weightTarget !== args.weightTarget) {
      await ctx.db.patch(profile._id, { weightTarget: args.weightTarget, updatedAt: Date.now() });
    }
    const existing = await ctx.db
      .query("resolutionSettings")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .unique();

    const payload = {
      profileId: profile._id,
      fastingDays: args.fastingDays,
      workoutTargetDays: args.workoutTargetDays,
      alcoholWeeklyLimit: args.alcoholWeeklyLimit,
      readingMonthlyMinutesTarget: args.readingMonthlyMinutesTarget,
      reminderMorning: args.reminderMorning,
      reminderEvening: args.reminderEvening,
      scoreWeights: args.scoreWeights,
      scoreWeightsVersion: 1,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("resolutionSettings", payload);
  },
});

export const upsertDailyLog = mutation({
  args: {
    localDate: v.string(),
    antiInflammatory: v.boolean(),
    fastingDone: v.boolean(),
    fakeSugarAvoided: v.boolean(),
    sweetsControlled: v.boolean(),
    avoidArtificialSweeteners: v.boolean(),
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
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const existing = await ctx.db
      .query("resolutionDailyLogs")
      .withIndex("by_profile_date", (q) => q.eq("profileId", profile._id).eq("localDate", args.localDate))
      .unique();

    const payload = {
      profileId: profile._id,
      localDate: args.localDate,
      antiInflammatory: args.antiInflammatory,
      fastingDone: args.fastingDone,
      fakeSugarAvoided: args.fakeSugarAvoided,
      sweetsControlled: args.sweetsControlled,
      avoidArtificialSweeteners: args.avoidArtificialSweeteners,
      gutHealthSupport: args.gutHealthSupport,
      workoutDone: args.workoutDone,
      workoutType: args.workoutType,
      lowImpactFlex: args.lowImpactFlex,
      alcoholDrinks: args.alcoholDrinks,
      nicotineLevel: args.nicotineLevel,
      readingMinutes: args.readingMinutes,
      frugalDay: args.frugalDay,
      notes: args.notes,
      dailyScore: args.dailyScore,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("resolutionDailyLogs", {
      ...payload,
      createdAt: Date.now(),
    });
  },
});

export const upsertWeeklyReview = mutation({
  args: {
    weekStart: v.string(),
    activeCashflowProject: v.string(),
    projectStatus: v.string(),
    nextStep: v.string(),
    workedWell: v.optional(v.string()),
    improveNext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const existing = await ctx.db
      .query("resolutionWeeklyReviews")
      .withIndex("by_profile_week", (q) => q.eq("profileId", profile._id).eq("weekStart", args.weekStart))
      .unique();

    const payload = {
      profileId: profile._id,
      weekStart: args.weekStart,
      activeCashflowProject: args.activeCashflowProject,
      projectStatus: args.projectStatus,
      nextStep: args.nextStep,
      workedWell: args.workedWell,
      improveNext: args.improveNext,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("resolutionWeeklyReviews", {
      ...payload,
      createdAt: Date.now(),
    });
  },
});

export const addWeightLog = mutation({
  args: {
    localDate: v.string(),
    weightLbs: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const existing = await ctx.db
      .query("resolutionWeightLogs")
      .withIndex("by_profile_date", (q) => q.eq("profileId", profile._id).eq("localDate", args.localDate))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { weightLbs: args.weightLbs });
      return existing._id;
    }

    return await ctx.db.insert("resolutionWeightLogs", {
      profileId: profile._id,
      localDate: args.localDate,
      weightLbs: args.weightLbs,
      createdAt: Date.now(),
    });
  },
});

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireProfile(ctx);
    const settings = await ctx.db
      .query("resolutionSettings")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .unique();

    const timezone = profile.timezone ?? DEFAULT_TIMEZONE;
    const today = buildLocalDate(new Date(), timezone);

    const recentLogs = await ctx.db
      .query("resolutionDailyLogs")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(30);

    const todayLog = recentLogs.find((log) => log.localDate === today) ?? null;
    const lastSeven = recentLogs.slice(0, 7);

    let streakCurrent = 0;
    let streakBest = 0;
    let currentRun = 0;
    for (let i = 0; i < recentLogs.length; i += 1) {
      const log = recentLogs[i];
      if (i === 0) {
        currentRun = 1;
      } else {
        const prev = recentLogs[i - 1];
        const gap = diffDays(prev.localDate, log.localDate);
        if (gap === 1) currentRun += 1;
        else currentRun = 1;
      }
      if (i === 0) streakCurrent = currentRun;
      streakBest = Math.max(streakBest, currentRun);
    }

    if (!todayLog) streakCurrent = 0;

    const avgScore = lastSeven.length
      ? Math.round(lastSeven.reduce((acc, log) => acc + log.dailyScore, 0) / lastSeven.length)
      : 0;

    const ringTotals = {
      nutrition: 0,
      fitness: 0,
      finance: 0,
      growth: 0,
    };

    lastSeven.forEach((log) => {
      const nutritionHits = [
        log.antiInflammatory,
        log.fakeSugarAvoided,
        log.sweetsControlled,
        log.avoidArtificialSweeteners ?? false,
        log.gutHealthSupport,
      ].filter(Boolean).length;
      ringTotals.nutrition += nutritionHits / 5;
      const fitnessHits = [log.workoutDone, log.lowImpactFlex].filter(Boolean).length;
      ringTotals.fitness += fitnessHits / 2;
      ringTotals.finance += log.frugalDay ? 1 : 0;
      ringTotals.growth += log.readingMinutes >= 20 ? 1 : 0;
    });

    const ringCount = Math.max(1, lastSeven.length);

    const mostImportant = (() => {
      if (!todayLog) return "Log your day";
      if (!todayLog.workoutDone) return "Get a quick workout in";
      if (!todayLog.antiInflammatory) return "Aim for an anti-inflammatory meal";
      if (todayLog.readingMinutes < 20) return "Read or listen for 20 min";
      if (!todayLog.frugalDay) return "Keep spending light today";
      return "Stay consistent and log tomorrow";
    })();

    const latestReview = await ctx.db
      .query("resolutionWeeklyReviews")
      .withIndex("by_profile_week", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .first();

    return {
      dateLabel: today,
      todayScore: todayLog?.dailyScore ?? 0,
      streakCurrent,
      streakBest,
      weekProgressPercent: avgScore,
      rings: [
        { label: "Nutrition", percent: Math.round((ringTotals.nutrition / ringCount) * 100) },
        { label: "Fitness", percent: Math.round((ringTotals.fitness / ringCount) * 100) },
        { label: "Finance", percent: Math.round((ringTotals.finance / ringCount) * 100) },
        { label: "Growth", percent: Math.round((ringTotals.growth / ringCount) * 100) },
      ],
      mostImportant,
      quickActions: [
        { label: "Log Day", href: "/resolution-tracker/checkin" },
        { label: "Update Weight", href: "/resolution-tracker/weekly" },
        { label: "Weekly Review", href: "/resolution-tracker/weekly" },
      ],
      settings: {
        alcoholWeeklyLimit: settings?.alcoholWeeklyLimit ?? defaultSettings().alcoholWeeklyLimit,
        workoutTargetDays: settings?.workoutTargetDays ?? defaultSettings().workoutTargetDays,
      },
      incomeStream: {
        name: latestReview?.activeCashflowProject ?? "AI-Driven Business Build",
        status: latestReview?.projectStatus ?? "research",
        nextStep: latestReview?.nextStep ?? "Define next income stream milestone",
      },
    };
  },
});

export const getWeekly = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireProfile(ctx);
    const settings = await ctx.db
      .query("resolutionSettings")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .unique();

    const timezone = profile.timezone ?? DEFAULT_TIMEZONE;
    const todayLocal = buildLocalDate(new Date(), timezone);
    const monthKey = todayLocal.slice(0, 7);

    const recentLogs = await ctx.db
      .query("resolutionDailyLogs")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(30);

    const weightLogs = await ctx.db
      .query("resolutionWeightLogs")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(60);

    const lastSeven = recentLogs.slice(0, 7);
    const workoutsThisWeek = lastSeven.filter((log) => log.workoutDone).length;
    const alcoholThisWeek = lastSeven.reduce((acc, log) => acc + log.alcoholDrinks, 0);
    const readingMinutesThisMonth = recentLogs
      .filter((log) => log.localDate.startsWith(monthKey))
      .reduce((acc, log) => acc + log.readingMinutes, 0);

    const latestWeight = weightLogs[0] ?? null;
    let weightTrend7d = "–";
    let weightTrend30d = "–";
    if (latestWeight) {
      const latestDate = latestWeight.localDate;
      const within7 = weightLogs.find((log) => diffDays(latestDate, log.localDate) >= 6) ?? null;
      const within30 = weightLogs.find((log) => diffDays(latestDate, log.localDate) >= 29) ?? null;
      const delta7 = within7 ? latestWeight.weightLbs - within7.weightLbs : null;
      const delta30 = within30 ? latestWeight.weightLbs - within30.weightLbs : null;
      weightTrend7d = formatWeightTrend(delta7);
      weightTrend30d = formatWeightTrend(delta30);
    }

    const themes = [
      { name: "Nutrition", percent: 0 },
      { name: "Fitness", percent: 0 },
      { name: "Finance", percent: 0 },
      { name: "Personal Growth", percent: 0 },
    ];

    if (lastSeven.length > 0) {
      const nutritionAvg =
        lastSeven.reduce(
          (acc, log) =>
            acc +
            ([
              log.antiInflammatory,
              log.fakeSugarAvoided,
              log.sweetsControlled,
              log.avoidArtificialSweeteners ?? false,
              log.gutHealthSupport,
            ].filter(Boolean).length /
              5),
          0
        ) / lastSeven.length;
      const fitnessAvg =
        lastSeven.reduce((acc, log) => acc + ([log.workoutDone, log.lowImpactFlex].filter(Boolean).length / 2), 0) / lastSeven.length;
      const financeAvg = lastSeven.reduce((acc, log) => acc + (log.frugalDay ? 1 : 0), 0) / lastSeven.length;
      const growthAvg = lastSeven.reduce((acc, log) => acc + (log.readingMinutes >= 20 ? 1 : 0), 0) / lastSeven.length;

      themes[0].percent = Math.round(nutritionAvg * 100);
      themes[1].percent = Math.round(fitnessAvg * 100);
      themes[2].percent = Math.round(financeAvg * 100);
      themes[3].percent = Math.round(growthAvg * 100);
    }

    const latestReview = await ctx.db
      .query("resolutionWeeklyReviews")
      .withIndex("by_profile_week", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .first();

    return {
      weightTrend7d,
      weightTrend30d,
      alcoholThisWeek,
      alcoholLimit: settings?.alcoholWeeklyLimit ?? defaultSettings().alcoholWeeklyLimit,
      workoutsThisWeek,
      workoutTarget: settings?.workoutTargetDays ?? defaultSettings().workoutTargetDays,
      readingMinutesThisMonth,
      readingTarget: settings?.readingMonthlyMinutesTarget ?? defaultSettings().readingMonthlyMinutesTarget,
      cashflowProject: {
        name: latestReview?.activeCashflowProject ?? "MFH",
        status: latestReview?.projectStatus ?? "not started",
        nextStep: latestReview?.nextStep ?? "",
      },
      themes,
      review: latestReview
        ? {
            weekStart: latestReview.weekStart,
            activeCashflowProject: latestReview.activeCashflowProject,
            projectStatus: latestReview.projectStatus,
            nextStep: latestReview.nextStep,
            workedWell: latestReview.workedWell ?? "",
            improveNext: latestReview.improveNext ?? "",
          }
        : null,
    };
  },
});

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireProfile(ctx);
    const today = buildLocalDate(new Date(), profile.timezone ?? DEFAULT_TIMEZONE);
    const todayLog = await ctx.db
      .query("resolutionDailyLogs")
      .withIndex("by_profile_date", (q) => q.eq("profileId", profile._id).eq("localDate", today))
      .unique();

    return { today, log: todayLog ?? null };
  },
});

export const ensureProfileSetup = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await ensureProfile(ctx);
    const existingSettings = await ctx.db
      .query("resolutionSettings")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .unique();

    if (!existingSettings) {
      await ctx.db.insert("resolutionSettings", {
        profileId: profile._id,
        ...defaultSettings(),
        updatedAt: Date.now(),
      });
    }

    return profile._id;
  },
});
