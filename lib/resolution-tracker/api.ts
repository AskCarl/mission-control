import type {
  DailyCheckinPayload,
  ResolutionDashboard,
  ResolutionSettings,
  ResolutionWeekly,
  SettingsPayload,
  WeightLogPayload,
  WeeklyReviewPayload,
} from "@/lib/resolution-tracker/types";

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchDashboard(): Promise<ResolutionDashboard> {
  const res = await fetch("/api/resolution-tracker/dashboard", { cache: "no-store" });
  return handleJson(res);
}

export async function fetchWeekly(): Promise<ResolutionWeekly> {
  const res = await fetch("/api/resolution-tracker/weekly", { cache: "no-store" });
  return handleJson(res);
}

export async function fetchSettings(): Promise<ResolutionSettings> {
  const res = await fetch("/api/resolution-tracker/settings", { cache: "no-store" });
  return handleJson(res);
}

export async function saveDaily(payload: DailyCheckinPayload) {
  const res = await fetch("/api/resolution-tracker/daily", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<{ ok: true; id: string; localDate: string }>(res);
}

export async function saveWeekly(payload: WeeklyReviewPayload) {
  const res = await fetch("/api/resolution-tracker/weekly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<{ ok: true; id: string }>(res);
}

export async function saveWeight(payload: WeightLogPayload) {
  const res = await fetch("/api/resolution-tracker/weight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<{ ok: true; id: string; localDate: string }>(res);
}

export async function saveSettings(payload: SettingsPayload) {
  const res = await fetch("/api/resolution-tracker/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<{ ok: true; id: string }>(res);
}
