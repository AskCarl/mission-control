import type { RetryPolicy } from "./types";

export function getNextDelayMs(policy: RetryPolicy, attempt: number): number | null {
  // attempt is 1-based current attempt count
  // return null => no retry remaining
  if (attempt >= policy.maxAttempts) return null;

  const exp = Math.max(0, attempt - 1); // attempt 1 => base delay
  const rawDelay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, exp);
  const capped = Math.min(rawDelay, policy.maxDelayMs);

  if (!policy.jitter) return Math.round(capped);

  // full jitter: random [0.5x, 1.0x] of capped to avoid herd retries
  const jittered = capped * (0.5 + Math.random() * 0.5);
  return Math.round(jittered);
}
