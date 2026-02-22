import { NextResponse } from "next/server";
import { runResearchTask } from "@/lib/research/worker";
import { convexQueue } from "@/lib/research/convex-queue";
import type { ResearchDomain } from "@/lib/research/types";

export async function POST(req: Request) {
  const start = Date.now();

  let body: { prompt?: string; domain?: string; requestedBy?: string } = {};
  try {
    body = await req.json();
  } catch {
    // use defaults
  }

  const domain = (body.domain ?? "equities") as ResearchDomain;
  const prompt =
    body.prompt ??
    "Brief market pulse: one key change, one opportunity, one risk, confidence score.";

  try {
    const task = await runResearchTask({
      title: "[smoke] daily ARA health check",
      prompt,
      domain,
      requestedBy: body.requestedBy ?? "smoke-api",
      idempotencyKey: `smoke-${new Date().toISOString().slice(0, 10)}`,
      retryPolicy: { maxAttempts: 1, retryableErrorCodes: [] },
      queue: convexQueue,
    });

    const elapsedMs = Date.now() - start;

    if (task.state === "completed") {
      return NextResponse.json({
        state: task.state,
        taskId: task.id,
        confidence: task.result?.brief?.confidenceAggregate,
        elapsedMs,
      });
    }

    return NextResponse.json(
      {
        state: task.state,
        taskId: task.id,
        error: task.failure?.errorCode,
        message: task.failure?.message,
        elapsedMs,
      },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json(
      { state: "error", error: String(err), elapsedMs: Date.now() - start },
      { status: 500 }
    );
  }
}
