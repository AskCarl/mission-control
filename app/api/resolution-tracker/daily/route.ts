import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { makeConvexClient } from "@/lib/resolution-tracker/convex-client";
import type { DailyCheckinPayload } from "@/lib/resolution-tracker/types";

export async function POST(req: Request) {
  const client = makeConvexClient();
  try {
    await client.mutation(api.resolutionTracker.ensureProfileSetup, {});
    const payload = (await req.json()) as DailyCheckinPayload & { localDate?: string };
    const today = payload.localDate ?? (await client.query(api.resolutionTracker.getToday, {})).today;

    const result = await client.mutation(api.resolutionTracker.upsertDailyLog, {
      localDate: today,
      antiInflammatory: payload.antiInflammatory,
      fastingDone: payload.fastingDone,
      fakeSugarAvoided: payload.fakeSugarAvoided,
      sweetsControlled: payload.sweetsControlled,
      avoidArtificialSweeteners: payload.avoidArtificialSweeteners,
      gutHealthSupport: payload.gutHealthSupport,
      workoutDone: payload.workoutDone,
      workoutType: payload.workoutType ?? undefined,
      lowImpactFlex: payload.lowImpactFlex,
      alcoholDrinks: payload.alcoholDrinks,
      nicotineLevel: payload.nicotineLevel,
      readingMinutes: payload.readingMinutes,
      frugalDay: payload.frugalDay,
      notes: payload.notes ?? undefined,
      dailyScore: payload.dailyScore,
    });

    return NextResponse.json({ ok: true, id: result, localDate: today });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
