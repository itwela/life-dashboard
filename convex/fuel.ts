"use node";

import { action } from "./_generated/server";

// Pull completed workout sessions from FuelLog (the fuel agent API) and return the
// distinct ISO days (YYYY-MM-DD) worked out in the last `days`. Server-side so the
// FuelLog API key never reaches the browser. FuelLog is the source of truth for what
// Itwela actually did (he logs workouts there); the dashboard just reads it.
export const getWorkoutDays = action({
  args: {},
  handler: async (): Promise<{ days: string[] }> => {
    const key = process.env.FUEL_API_KEY;
    const base = process.env.FUEL_BASE_URL;
    if (!key || !base) {
      console.error("FuelLog not configured (FUEL_API_KEY / FUEL_BASE_URL)");
      return { days: [] };
    }
    try {
      const res = await fetch(`${base}/agent/workouts`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        console.error(`FuelLog /agent/workouts returned ${res.status}`);
        return { days: [] };
      }
      const body = await res.json();
      const sessions: Array<{ startedAt?: number; completedAt?: number }> = body?.data ?? [];
      const daySet = new Set<string>();
      for (const s of sessions) {
        // Count a session as a worked-out day only if it was completed.
        if (!s.completedAt) continue;
        const d = new Date(s.startedAt ?? s.completedAt);
        daySet.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        );
      }
      return { days: [...daySet] };
    } catch (error) {
      console.error("FuelLog fetch failed:", error);
      return { days: [] };
    }
  },
});
