/**
 * Shared palette + tiny pure formatters for the Check-In member panel.
 * Kept separate so CheckinMemberPanel.tsx stays about layout and data flow.
 */

import type { CSSProperties } from "react";
import type { Nudge } from "../../../../convex/memberLogic";

/** Check-In accent — same orange the Check-In view uses. */
export const ACCENT = "#e8734a";

export const URGENCY_COLOR: Record<Nudge["urgency"], string> = {
  low: "#60a5fa",
  medium: "#fbbf24",
  high: "#f87171",
};

export type CheckinStatus = "logged_today" | "streak_at_risk" | "streak_broken" | "no_history";

export const STATUS_COPY: Record<CheckinStatus, string> = {
  logged_today: "Logged today",
  streak_at_risk: "At risk",
  streak_broken: "Broken",
  no_history: "Not started",
};

export const STATUS_COLOR: Record<CheckinStatus, string> = {
  logged_today: "#34d399",
  streak_at_risk: "#fbbf24",
  streak_broken: "#f87171",
  no_history: "#94a3b8",
};

/** Ranked emotion-bar colors, loudest first. */
export const RANK_COLORS = ["#e8734a", "#fbbf24", "#60a5fa", "#c084fc", "#34d399"];

export interface StreakLike {
  current: number;
  longest: number;
  lastDate?: string;
  status: CheckinStatus;
}

export interface RoutineLike {
  morningTime: string;
  afternoonTime: string;
  nightTime: string;
  nudgesEnabled: boolean;
}

/** Hex + alpha → rgba(). Falls back to the accent for malformed input. */
export function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(232,115,74,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Standard block surface: soft fill + hairline border, radius 16–20px. */
export function surface(isDark: boolean): CSSProperties {
  return {
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
    borderRadius: 18,
  };
}

export function sectionLabel(isDark: boolean): CSSProperties {
  return {
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
  };
}

export function mutedStyle(isDark: boolean): CSSProperties {
  return { color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" };
}

/** "2026-10-11" → "Sunday, Oct 11" (local, never UTC-shifted). */
export function prettyDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** "2026-10-11" → "S" — the one-letter column header above each day dot. */
export function weekdayLetter(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", { weekday: "narrow" });
}

/** "Today" / "3d overdue" / "in 5d" for a to-do due date, relative to a day key. */
export function dueLabelFor(due: string | undefined, today: string): string {
  if (!due) return "";
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = due.split("-").map(Number);
  const delta = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  if (delta < 0) return `${-delta}d overdue`;
  return `in ${delta}d`;
}

/** Average score → "3.4 / 5", or an em dash when nothing is logged. */
export function fmtAvg(v: number | undefined): string {
  return typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)} / 5` : "—";
}
