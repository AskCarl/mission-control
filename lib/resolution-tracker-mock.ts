import type { ResolutionDashboard, ResolutionWeekly } from "@/lib/resolution-tracker/types";

export const dailySnapshot: ResolutionDashboard = {
  dateLabel: "Sunday, Feb 22",
  todayScore: 78,
  streakCurrent: 6,
  streakBest: 19,
  weekProgressPercent: 71,
  rings: [
    { label: "Nutrition", percent: 80 },
    { label: "Fitness", percent: 60 },
    { label: "Finance", percent: 90 },
    { label: "Growth", percent: 70 },
  ],
  mostImportant: "Log a 20-min walk after dinner",
  quickActions: [
    { label: "Log Day", href: "/resolution-tracker/checkin" },
    { label: "Update Weight", href: "/resolution-tracker/weekly" },
    { label: "Weekly Review", href: "/resolution-tracker/weekly" },
  ],
  settings: {
    alcoholWeeklyLimit: 1,
    workoutTargetDays: 5,
  },
};

export const weeklySnapshot: ResolutionWeekly = {
  weightTrend7d: "-1.2 lb",
  weightTrend30d: "-3.8 lb",
  alcoholThisWeek: 1,
  alcoholLimit: 1,
  workoutsThisWeek: 4,
  workoutTarget: 5,
  readingMinutesThisMonth: 260,
  readingTarget: 900,
  cashflowProject: {
    name: "MFH",
    status: "research",
    nextStep: "Shortlist 3 brokers for comp pulls",
  },
  themes: [
    { name: "Nutrition", percent: 78 },
    { name: "Fitness", percent: 64 },
    { name: "Finance", percent: 82 },
    { name: "Personal Growth", percent: 58 },
  ],
  review: null,
};
