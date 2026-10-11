"use client";

import { useState } from "react";
import { Check, Clock, Pause, Play, Trash2 } from "lucide-react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { formatTime, prettyTime, toSpan, type TimeSpan } from "../../../../convex/memberLogic";

// ── Shared constants ───────────────────────────────────────────────────────────

export const ACCENT = "#3b82f6";
export const HOUR_START = 6 * 60;
export const HOUR_END = 23 * 60;
export const TRACK_H = 720; // px per 06:00→23:00 window; the page scrolls, nothing clips
export const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Pure helpers ───────────────────────────────────────────────────────────────

/** Weekday (0=Sun…6=Sat) for a "YYYY-MM-DD" key, timezone-safe (local components). */
export function weekdayOf(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1).getDay();
}

/** "Sunday, Oct 11" — no Intl, so server and client always agree. */
export function dayLabel(dayKey: string): string {
  const [, m, d] = dayKey.split("-").map(Number);
  return `${DAY_NAMES[weekdayOf(dayKey)] ?? ""}, ${MONTHS[(m || 1) - 1] ?? ""} ${d ?? ""}`;
}

export function isDone(ev: Doc<"calendarEvents">): boolean {
  return ev.status === "done" || ev.done === true;
}

export type EventStatus = "todo" | "in_progress" | "done";

export function statusOf(ev: Doc<"calendarEvents">): EventStatus {
  if (ev.status) return ev.status;
  return ev.done ? "done" : "todo";
}

export const STATUS_META: Record<EventStatus, { label: string; color: string }> = {
  todo: { label: "To do", color: "#60a5fa" },
  in_progress: { label: "In progress", color: "#fbbf24" },
  done: { label: "Done", color: "#34d399" },
};

const CATEGORY_COLORS: Record<string, string> = {
  class: "#60a5fa",
  work: "#818cf8",
  health: "#34d399",
  personal: "#fbbf24",
  focus: "#3b82f6",
};

export function categoryColor(category?: string): string {
  if (!category) return ACCENT;
  return CATEGORY_COLORS[category.toLowerCase()] ?? ACCENT;
}

/** "#3b82f6" → "rgba(59, 130, 246, 0.2)". */
export function hexAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** 135 → "2h 15m", 45 → "45m", 120 → "2h". */
export function durationLabel(mins: number): string {
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** "9:00 AM – 10:30 AM", or just the start when there is no end. */
export function timeRange(start?: string, end?: string): string {
  const s = prettyTime(start);
  const e = prettyTime(end);
  if (!s) return "Anytime";
  return e ? `${s} – ${e}` : s;
}

/** Read `{ created }` off the unresolved logRoutinesToToday result. */
export function readCreated(res: unknown): number {
  if (typeof res !== "object" || res === null || !("created" in res)) return 0;
  const value = (res as { created?: unknown }).created;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// ── Layout types ───────────────────────────────────────────────────────────────

export interface LaidOutEvent {
  ev: Doc<"calendarEvents">;
  span: TimeSpan;
  lane: number;
  lanes: number;
}

export type NextUp =
  | { state: "waiting" }
  | { state: "empty" }
  | { state: "done" }
  | { state: "now"; ev: Doc<"calendarEvents">; span: TimeSpan }
  | { state: "soon"; ev: Doc<"calendarEvents">; span: TimeSpan; inMin: number };

// ── Next up banner ─────────────────────────────────────────────────────────────

export function NextUpBanner({ next, isDark }: { next: NextUp; isDark: boolean }) {
  const main = isDark ? "text-white" : "text-black";
  const muted = isDark ? "text-white/50" : "text-black/50";

  const wrap = {
    background: isDark
      ? "linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.05) 70%)"
      : "linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0.03) 70%)",
    border: `1px solid rgba(59,130,246,${isDark ? 0.34 : 0.24})`,
    borderRadius: 20,
  };

  let icon = <Clock size={18} style={{ color: ACCENT }} />;
  let title = "Nothing timed today";
  let sub = "Add a start time to an event to block it out.";
  let badge: string | null = null;

  if (next.state === "waiting") {
    title = "Checking the clock…";
    sub = "Working out what's next.";
  } else if (next.state === "empty") {
    title = "No timed events";
    sub = "All-day items only — the timeline is clear.";
  } else if (next.state === "done") {
    icon = <Check size={18} style={{ color: "#34d399" }} />;
    title = "Done for today";
    sub = "Every timed event has wrapped up.";
  } else if (next.state === "now") {
    title = next.ev.title;
    sub = `Happening now · ${timeRange(next.ev.startTime, next.ev.endTime)}${next.ev.location ? ` · ${next.ev.location}` : ""}`;
    badge = "NOW";
  } else {
    title = next.ev.title;
    sub = `${timeRange(next.ev.startTime, next.ev.endTime)}${next.ev.location ? ` · ${next.ev.location}` : ""}`;
    badge = `in ${durationLabel(next.inMin)}`;
  }

  return (
    <div className="rounded-[20px] px-4 py-3.5 flex items-center gap-3.5" style={wrap}>
      <div
        className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
        style={{ background: hexAlpha(ACCENT, 0.16), border: `1px solid ${hexAlpha(ACCENT, 0.3)}` }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] uppercase tracking-wider ${muted}`}>
          {next.state === "now" ? "Happening now" : "Next up"}
        </p>
        <p className={`text-sm font-semibold truncate ${main}`}>{title}</p>
        <p className={`text-[11px] truncate ${muted}`}>{sub}</p>
      </div>
      {badge ? (
        <span
          className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${next.state === "now" ? "animate-pulse" : ""}`}
          style={{ background: "#f87171", color: "#fff" }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

// ── All-day chips ──────────────────────────────────────────────────────────────

export function AllDayChips({ events, isDark }: { events: Doc<"calendarEvents">[]; isDark: boolean }) {
  const muted = isDark ? "text-white/40" : "text-black/40";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)";

  if (events.length === 0) {
    return <p className={`text-xs ${muted}`}>No all-day items today.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {events.map((ev) => {
        const done = isDone(ev);
        const color = categoryColor(ev.category);
        return (
          <span
            key={ev._id}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${done ? "opacity-60" : ""}`}
            style={{ background: rowFill, border, color: isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.78)" }}
            title={ev.note ?? ev.title}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: done ? "rgba(148,163,184,0.7)" : color }} />
            <span className={done ? "line-through" : ""}>{ev.title}</span>
            {ev.category ? <span style={{ color: muted }}>{ev.category}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

// ── Timeline (06:00 → 23:00, lane-split overlaps) ──────────────────────────────

export function Timeline({
  laidOut,
  isDark,
  nowMin,
  onAddEvent,
}: {
  laidOut: LaidOutEvent[];
  isDark: boolean;
  nowMin: number | null;
  onAddEvent: () => void;
}) {
  const total = HOUR_END - HOUR_START;
  const axis = isDark ? "text-white/30" : "text-black/30";
  const grid = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)";
  const pct = (mins: number) => ((mins - HOUR_START) / total) * 100;

  const hours: number[] = [];
  for (let m = HOUR_START; m <= HOUR_END; m += 60) hours.push(m);

  return (
    <div className="flex gap-1.5">
      <div className="relative w-10 shrink-0" style={{ height: TRACK_H }}>
        {hours.map((m) => (
          <span
            key={m}
            className={`absolute right-0 -translate-y-1/2 text-[10px] tabular-nums ${axis}`}
            style={{ top: `${pct(m)}%` }}
          >
            {formatTime(m)}
          </span>
        ))}
      </div>
      <div
        className="relative flex-1 rounded-2xl cursor-copy"
        style={{ height: TRACK_H, background: rowFill, border }}
        onClick={onAddEvent}
        title="Click to add an event"
      >
        {hours.map((m) => (
          <div key={m} className="absolute left-0 right-0" style={{ top: `${pct(m)}%`, height: 1, background: grid }} />
        ))}

        {laidOut.map((item) => {
          const start = Math.max(item.span.start, HOUR_START);
          const end = Math.min(item.span.end, HOUR_END);
          if (end <= start) return null;
          const heightPct = ((end - start) / total) * 100;
          const heightPx = (heightPct / 100) * TRACK_H;
          const compact = heightPx < 42;
          const done = isDone(item.ev);
          const color = categoryColor(item.ev.category);
          return (
            <div
              key={item.ev._id}
              onClick={(e) => e.stopPropagation()}
              title={`${item.ev.title} · ${timeRange(item.ev.startTime, item.ev.endTime)}${item.ev.location ? ` · ${item.ev.location}` : ""}`}
              className="absolute overflow-hidden px-1.5 py-1 text-[10px] leading-tight"
              style={{
                top: `${pct(start)}%`,
                height: `${heightPct}%`,
                left: `calc(${(item.lane / item.lanes) * 100}% + 3px)`,
                width: `calc(${100 / item.lanes}% - 6px)`,
                background: hexAlpha(color, done ? 0.08 : isDark ? 0.2 : 0.16),
                border: `1px solid ${hexAlpha(color, done ? 0.25 : 0.45)}`,
                borderLeft: `3px solid ${hexAlpha(color, done ? 0.4 : 1)}`,
                borderRadius: 10,
                opacity: done ? 0.55 : 1,
              }}
            >
              <p
                className={`font-semibold truncate ${done ? "line-through" : ""}`}
                style={{ color: isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.88)" }}
              >
                {item.ev.title}
              </p>
              {!compact ? (
                <p className="truncate" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                  {timeRange(item.ev.startTime, item.ev.endTime)}
                  {item.ev.location ? ` · ${item.ev.location}` : ""}
                </p>
              ) : null}
            </div>
          );
        })}

        {nowMin !== null && nowMin >= HOUR_START && nowMin <= HOUR_END ? (
          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${pct(nowMin)}%` }}>
            <div style={{ height: 1.5, background: "#f87171" }} />
            <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full" style={{ background: "#f87171" }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Agenda row ─────────────────────────────────────────────────────────────────

export function AgendaRow({
  ev,
  isDark,
  nowMin,
}: {
  ev: Doc<"calendarEvents">;
  isDark: boolean;
  nowMin: number | null;
}) {
  const span = toSpan(ev.startTime, ev.endTime);
  const done = isDone(ev);
  const status = statusOf(ev);
  const meta = STATUS_META[status];
  const color = categoryColor(ev.category);
  const muted = isDark ? "text-white/40" : "text-black/40";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)";
  const live = !done && span !== null && nowMin !== null && nowMin >= span.start && nowMin < span.end;

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[16px]" style={{ background: rowFill, border }}>
      <span
        className="w-1.5 h-9 rounded-full shrink-0"
        style={{ background: done ? "rgba(148,163,184,0.6)" : color }}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${done ? "line-through" : ""} ${isDark ? "text-white/90" : "text-black/85"}`}>
          {ev.title}
          {live ? (
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle" style={{ background: "#f87171", color: "#fff" }}>
              NOW
            </span>
          ) : null}
        </p>
        <p className={`text-[11px] truncate ${muted}`}>
          {timeRange(ev.startTime, ev.endTime)}
          {ev.location ? ` · ${ev.location}` : ""}
          {ev.category ? ` · ${ev.category}` : ""}
        </p>
      </div>
      <span
        className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ color: meta.color, background: hexAlpha(meta.color, 0.14), border: `1px solid ${hexAlpha(meta.color, 0.3)}` }}
      >
        {meta.label}
      </span>
    </div>
  );
}

// ── Routine row ────────────────────────────────────────────────────────────────

export function RoutineRow({
  routine,
  isDark,
  todayWeekday,
  onToggle,
  onDelete,
}: {
  routine: Doc<"routines">;
  isDark: boolean;
  todayWeekday: number;
  onToggle: (id: Id<"routines">, active: boolean) => void;
  onDelete: (id: Id<"routines">) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const muted = isDark ? "text-white/40" : "text-black/40";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)";
  const runsToday = routine.days.includes(todayWeekday);
  const time = routine.startTime
    ? routine.endTime
      ? `${prettyTime(routine.startTime)} – ${prettyTime(routine.endTime)}`
      : prettyTime(routine.startTime)
    : "Anytime";

  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-[16px]" style={{ background: rowFill, border, opacity: routine.active ? 1 : 0.55 }}>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${routine.active ? "" : "line-through"} ${isDark ? "text-white/90" : "text-black/85"}`}>
          {routine.title}
          {runsToday ? (
            <span className="ml-2 text-[10px] font-semibold" style={{ color: ACCENT }}>
              today
            </span>
          ) : null}
        </p>
        <p className={`text-[11px] truncate ${muted}`}>
          {time}
          {routine.location ? ` · ${routine.location}` : ""}
          {routine.category ? ` · ${routine.category}` : ""}
        </p>
        <div className="flex gap-1 mt-1.5" title={routine.days.length === 0 ? "No days set" : undefined}>
          {DAY_LETTERS.map((letter, idx) => {
            const on = routine.days.includes(idx);
            return (
              <span
                key={idx}
                className="w-4 h-4 rounded-full text-[9px] font-semibold flex items-center justify-center"
                style={{
                  background: on ? hexAlpha(ACCENT, 0.2) : "transparent",
                  color: on ? ACCENT : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
                  border: idx === todayWeekday ? `1px solid ${hexAlpha(ACCENT, 0.8)}` : "1px solid transparent",
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggle(routine._id, !routine.active)}
        className="shrink-0 p-1.5 rounded-lg"
        style={{ color: routine.active ? ACCENT : muted, border }}
        title={routine.active ? "Pause routine" : "Activate routine"}
      >
        {routine.active ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {confirming ? (
        <span className="shrink-0 flex items-center gap-1">
          <span className="text-[11px]" style={{ color: "#f87171" }}>
            Delete?
          </span>
          <button
            type="button"
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-white"
            style={{ background: "#dc2626" }}
            onClick={() => {
              onDelete(routine._id);
              setConfirming(false);
            }}
          >
            Yes
          </button>
          <button
            type="button"
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ color: muted, border }}
            onClick={() => setConfirming(false)}
          >
            No
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="shrink-0 p-1.5 rounded-lg"
          style={{ color: muted, border }}
          title="Delete routine"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
