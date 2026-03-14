"use client";

import { useState, useEffect, useMemo } from "react";
import { Doc } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect } from "./AddModal";

const ACCENT = "#fb923c";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Default: Sun, Tue, Thu, Fri
const DEFAULT_SCHEDULE = [0, 2, 4, 5];

interface Props {
  workouts: Doc<"workouts">[];
  logWorkout: (args: { exerciseType: string; duration: number; notes?: string; date?: number }) => Promise<void>;
  workoutSchedule: number[];
  workoutMissedDays: number[];
  addMissedDay: (args: { date: number }) => Promise<void>;
  removeMissedDay: (args: { date: number }) => Promise<void>;
}

function getWeekDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
}

/** Get scheduled days from recent past (6 days) through next 2 weeks — no old months. */
function getScheduledDatesAroundToday(
  scheduleDays: number[],
  daysBack = 6,
  daysForward = 14
): { date: Date; label: string; isPast: boolean }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const result: { date: Date; label: string; isPast: boolean }[] = [];
  for (let offset = -daysBack; offset <= daysForward; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    if (!scheduleDays.includes(d.getDay())) continue;
    const ts = d.getTime();
    result.push({
      date: d,
      label: `${DAY_LABELS[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`,
      isPast: ts < todayTs,
    });
  }
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const EXERCISE_TYPES = [
  { value: "strength", label: "Strength Training" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "Yoga / Stretching" },
  { value: "basketball", label: "Basketball" },
  { value: "running", label: "Running" },
  { value: "swimming", label: "Swimming" },
  { value: "cycling", label: "Cycling" },
  { value: "boxing", label: "Boxing" },
  { value: "other", label: "Other" },
];

const ICONS: Record<string, string> = {
  strength: "🏋️",
  cardio: "🏃",
  hiit: "⚡",
  yoga: "🧘",
  basketball: "🏀",
  running: "👟",
  swimming: "🏊",
  cycling: "🚴",
  boxing: "🥊",
  other: "💪",
};

export default function WorkoutsSection({
  workouts,
  logWorkout,
  workoutSchedule,
  workoutMissedDays,
  addMissedDay,
  removeMissedDay,
}: Props) {
  const [open, setOpen] = useState(false);
  const [exerciseType, setExerciseType] = useState("strength");
  const [duration, setDuration] = useState("45");
  const [notes, setNotes] = useState("");
  const [logForDate, setLogForDate] = useState<number | null>(null);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [missedPendingTs, setMissedPendingTs] = useState<number | null>(null);

  const schedule = workoutSchedule.length ? workoutSchedule : DEFAULT_SCHEDULE;
  const scheduleLabel = schedule
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ");

  useEffect(() => {
    setWeekDays(getWeekDays());
  }, []);

  const workedOutDays = useMemo(
    () =>
      new Set(
        workouts.map((w) => {
          const d = new Date(w.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      ),
    [workouts]
  );
  const missedSet = useMemo(() => new Set(workoutMissedDays), [workoutMissedDays]);

  const scheduledRows = useMemo(() => {
    const rows = getScheduledDatesAroundToday(schedule, 6, 14);
    const cutoff = new Date(new Date().getFullYear(), 2, 13); // Friday March 13
    cutoff.setHours(0, 0, 0, 0);
    const cutoffTs = cutoff.getTime();
    return rows.filter((r) => r.date.getTime() >= cutoffTs);
  }, [schedule]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const nextWeekTs = todayStart.getTime() + 7 * 24 * 60 * 60 * 1000;
  const scheduledInNext7Days = useMemo(
    () => scheduledRows.filter((r) => {
      const ts = r.date.getTime();
      return ts >= todayStart.getTime() && ts < nextWeekTs;
    }),
    [scheduledRows]
  );
  const weekCount = scheduledInNext7Days.filter((r) => workedOutDays.has(r.date.getTime())).length;
  const weekTotal = scheduledInNext7Days.length;

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const check = new Date(todayStart);
    check.setDate(todayStart.getDate() - i);
    if (workedOutDays.has(check.getTime())) streak++;
    else break;
  }

  function openLogForDay(dateTs: number | null) {
    setLogForDate(dateTs);
    setOpen(true);
    setDuration("45");
    setNotes("");
    setExerciseType("strength");
  }

  async function handleSubmit() {
    if (!duration) return;
    await logWorkout({
      exerciseType,
      duration: Number(duration),
      notes: notes || undefined,
      date: logForDate ?? undefined,
    });
    setOpen(false);
    setLogForDate(null);
  }

  async function markMissed(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const ts = d.getTime();
    setMissedPendingTs(ts);
    try {
      await addMissedDay({ date: ts });
    } finally {
      setMissedPendingTs(null);
    }
  }

  async function unmarkMissed(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const ts = d.getTime();
    setMissedPendingTs(ts);
    try {
      await removeMissedDay({ date: ts });
    } finally {
      setMissedPendingTs(null);
    }
  }

  return (
    <div
      className="h-full rounded-2xl p-5 flex flex-col overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(194,65,12,0.05) 100%)",
        border: "1px solid rgba(251,146,60,0.2)",
        boxShadow: "0 0 40px rgba(251,146,60,0.07), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 70%)" }}
      />

      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(251,146,60,0.3), rgba(194,65,12,0.15))",
              border: "1px solid rgba(251,146,60,0.35)",
              boxShadow: "0 0 16px rgba(251,146,60,0.3)",
            }}
          >
            🔥
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Workouts</h2>
            <p className="text-xs text-white/40">Your days: {scheduleLabel}</p>
          </div>
        </div>
        <button
          onClick={() => openLogForDay(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(251,146,60,0.35), rgba(194,65,12,0.2))",
            border: "1px solid rgba(251,146,60,0.4)",
            boxShadow: "0 0 12px rgba(251,146,60,0.25)",
          }}
        >
          + Log Workout
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-4 min-h-0">
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: streak > 0 ? "rgba(251,146,60,0.12)" : "rgba(255,255,255,0.04)",
                border: streak > 0 ? "1px solid rgba(251,146,60,0.25)" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: streak > 0 ? "0 0 20px rgba(251,146,60,0.15)" : "none",
              }}
            >
              <p className="text-xs text-white/40 mb-1">Streak</p>
              <p
                className="text-3xl font-black"
                style={{
                  color: streak > 0 ? ACCENT : "#475569",
                  textShadow: streak > 0 ? "0 0 20px rgba(251,146,60,0.6)" : "none",
                }}
              >
                {streak}
              </p>
              <p className="text-xs text-white/30 mt-0.5">days</p>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: weekTotal > 0 && weekCount >= weekTotal ? "rgba(251,146,60,0.12)" : "rgba(255,255,255,0.04)",
                border:
                  weekTotal > 0 && weekCount >= weekTotal
                    ? "1px solid rgba(251,146,60,0.25)"
                    : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-xs text-white/40 mb-1">Next 7 days</p>
              <p className="text-3xl font-black" style={{ color: weekCount >= weekTotal && weekTotal ? ACCENT : "#e2e8f0" }}>
                {weekCount}/{weekTotal}
              </p>
              <p className="text-xs text-white/30 mt-0.5">scheduled</p>
            </div>
          </div>

          {/* Quick Done / Missed for each scheduled day — scrollable */}
          <div className="flex-1 min-h-0 flex flex-col">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">Quick mark</p>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {scheduledRows.map(({ date, label }) => {
                const ts = date.getTime();
                const done = workedOutDays.has(ts);
                const missed = missedSet.has(ts);
                const isFuture = ts > todayStart.getTime();
                return (
                  <div
                    key={ts}
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl"
                    style={{
                      background: done ? "rgba(74,222,128,0.1)" : missed ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${done ? "rgba(74,222,128,0.25)" : missed ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <span className="text-sm text-white/90 truncate">
                      {DAY_LABELS[date.getDay()]} {date.getMonth() + 1}/{date.getDate()}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => (done ? undefined : openLogForDay(ts))}
                        disabled={isFuture}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: done ? "rgba(74,222,128,0.25)" : "rgba(74,222,128,0.15)",
                          border: "1px solid rgba(74,222,128,0.35)",
                          color: done ? "#4ade80" : "rgba(226,240,255,0.9)",
                        }}
                      >
                        {done ? "✓ Done" : "Done"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (missed) unmarkMissed(date);
                          else markMissed(date);
                        }}
                        disabled={isFuture || missedPendingTs === ts}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: missed ? "rgba(248,113,113,0.25)" : "rgba(248,113,113,0.1)",
                          border: "1px solid rgba(248,113,113,0.35)",
                          color: missed ? "#f87171" : "rgba(226,240,255,0.7)",
                        }}
                      >
                        {missedPendingTs === ts ? "…" : missed ? "Undo miss" : "Missed"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">Recent sessions</p>
          {workouts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-white/25 text-center">No workouts logged yet.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {workouts.map((w) => {
                const d = new Date(w.date);
                return (
                  <div
                    key={w._id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span className="text-base shrink-0">{ICONS[w.exerciseType] ?? "💪"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 capitalize">{w.exerciseType}</p>
                      {w.notes && <p className="text-xs text-white/30 truncate">{w.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: ACCENT }}>
                        {w.duration}m
                      </p>
                      <p className="text-xs text-white/30">
                        {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddModal
        title={logForDate != null ? `Log workout for ${new Date(logForDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}` : "Log Workout"}
        open={open}
        onClose={() => {
          setOpen(false);
          setLogForDate(null);
        }}
        onSubmit={handleSubmit}
        accentColor={ACCENT}
        submitLabel="Log It 🔥"
      >
        <FormField label="Exercise Type">
          <FormSelect value={exerciseType} onChange={setExerciseType} options={EXERCISE_TYPES} />
        </FormField>
        <FormField label="Duration (minutes)">
          <FormInput value={duration} onChange={setDuration} type="number" placeholder="45" />
        </FormField>
        <FormField label="Notes (optional)">
          <FormInput value={notes} onChange={setNotes} placeholder="PRs, energy level..." />
        </FormField>
      </AddModal>
    </div>
  );
}
