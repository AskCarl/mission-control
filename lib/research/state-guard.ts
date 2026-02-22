import type { TaskState } from "./types";

const ALLOWED_TRANSITIONS: Record<TaskState, TaskState[]> = {
  queued: ["running", "failed"],
  running: ["completed", "failed"],
  completed: [],
  failed: ["queued"], // only when retryable=true (see opts)
};

export function canTransition(
  from: TaskState,
  to: TaskState,
  opts?: { retryable?: boolean }
): boolean {
  if (from === "failed" && to === "queued") {
    return opts?.retryable === true;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: TaskState,
  to: TaskState,
  opts?: { retryable?: boolean }
): void {
  if (!canTransition(from, to, opts)) {
    const detail = from === "failed" && to === "queued" ? " (retryable must be true)" : "";
    throw new Error(`Invalid task state transition: ${from} -> ${to}${detail}`);
  }
}
