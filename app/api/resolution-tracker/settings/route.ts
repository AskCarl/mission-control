import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { makeConvexClient } from "@/lib/resolution-tracker/convex-client";
import type { SettingsPayload } from "@/lib/resolution-tracker/types";

export async function GET() {
  const client = makeConvexClient();
  try {
    await client.mutation(api.resolutionTracker.ensureProfileSetup, {});
    const data = await client.query(api.resolutionTracker.getSettings, {});
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = makeConvexClient();
  try {
    const payload = (await req.json()) as SettingsPayload;
    const result = await client.mutation(api.resolutionTracker.upsertSettings, {
      ...payload,
      scoreWeights: payload.scoreWeights ?? undefined,
    });
    return NextResponse.json({ ok: true, id: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
