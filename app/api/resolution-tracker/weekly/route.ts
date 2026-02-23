import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { makeConvexClient } from "@/lib/resolution-tracker/convex-client";
import type { WeeklyReviewPayload } from "@/lib/resolution-tracker/types";

export async function GET() {
  const client = makeConvexClient();
  try {
    await client.mutation(api.resolutionTracker.ensureProfileSetup, {});
    const data = await client.query(api.resolutionTracker.getWeekly, {});
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = makeConvexClient();
  try {
    const payload = (await req.json()) as WeeklyReviewPayload;
    const result = await client.mutation(api.resolutionTracker.upsertWeeklyReview, {
      ...payload,
      workedWell: payload.workedWell ?? undefined,
      improveNext: payload.improveNext ?? undefined,
    });
    return NextResponse.json({ ok: true, id: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
