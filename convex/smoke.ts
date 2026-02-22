import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const SMOKE_PROMPT =
  "Brief equities market pulse: one key change, one opportunity, one risk, confidence score.";

/**
 * Daily smoke action — called by Convex cron.
 * Calls the ARA smoke API route so the full Node.js stack (adapters, env vars) runs normally.
 * Falls back to logging a clear failure that surfaces in the Convex dashboard.
 *
 * NOTE: set NEXT_PUBLIC_APP_URL in Convex env when the Next.js app is deployed:
 *   npx convex env set NEXT_PUBLIC_APP_URL https://your-app.vercel.app
 */
export const dailySmoke = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = `${appUrl}/api/ara/smoke`;

    console.log(`[ara-smoke] triggering smoke via ${url}`);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: SMOKE_PROMPT,
          domain: "equities",
          requestedBy: "convex-cron",
        }),
      });
    } catch (err) {
      console.error(`[ara-smoke] fetch failed: ${String(err)}`);
      throw new Error(`ARA smoke fetch failed: ${String(err)}`);
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok || body?.state !== "completed") {
      console.error(
        `[ara-smoke] FAIL status=${res.status} state=${body?.state} error=${body?.error ?? "unknown"}`
      );
      throw new Error(
        `ARA smoke failed: HTTP ${res.status} state=${body?.state ?? "?"} error=${body?.error ?? "unknown"}`
      );
    }

    console.log(
      `[ara-smoke] PASS taskId=${body.taskId} confidence=${body.confidence} elapsed=${body.elapsedMs}ms`
    );
  },
});
