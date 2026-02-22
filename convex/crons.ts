import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily ARA smoke run — 6:05 AM PT (14:05 UTC)
 * Fires after the morning market report so any API issues are already surfaced.
 * Uses internal.smoke.dailySmoke which runs a single low-cost equities check.
 */
crons.daily(
  "ara-daily-smoke",
  { hourUTC: 14, minuteUTC: 5 },
  internal.smoke.dailySmoke,
);

export default crons;
