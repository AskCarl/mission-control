import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { makeConvexClient } from "@/lib/resolution-tracker/convex-client";

export async function POST(req: Request) {
  const client = makeConvexClient();
  try {
    await client.mutation(api.resolutionTracker.ensureProfileSetup, {});
    const payload = (await req.json()) as { weightLbs: number; localDate?: string };
    const today = payload.localDate ?? (await client.query(api.resolutionTracker.getToday, {})).today;
    const result = await client.mutation(api.resolutionTracker.addWeightLog, {
      localDate: today,
      weightLbs: payload.weightLbs,
    });
    return NextResponse.json({ ok: true, id: result, localDate: today });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
