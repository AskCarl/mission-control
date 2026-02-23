import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { makeConvexClient } from "@/lib/resolution-tracker/convex-client";

export async function GET() {
  const client = makeConvexClient();
  try {
    await client.mutation(api.resolutionTracker.ensureProfileSetup, {});
    const data = await client.query(api.resolutionTracker.getDashboard, {});
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
