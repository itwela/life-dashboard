"use client";

import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";
import { prettyTime, type MoodPattern } from "../../../../convex/memberLogic";
import {
  CalendarCheck,
  Flame,
  Trophy,
  Bell,
  BellOff,
  Check,
  Clock,
  ListTodo,
  Dumbbell,
  Sparkles,
  Repeat,
} from "lucide-react";
import {
  ACCENT,
  RANK_COLORS,
  STATUS_COLOR,
  STATUS_COPY,
  dueLabelFor,
  fmtAvg,
  hexA,
  mutedStyle,
  prettyDay,
  sectionLabel,
  surface,
  weekdayLetter,
  type RoutineLike,
  type StreakLike,
} from "./checkinTheme";

type Briefing = FunctionReturnType<typeof api.memberData.getBriefing>;

/* ── Today at a glance ───────────────────────────────────────────────────────── */

/** The headline "how am I doing overall" line plus one row of status chips. */
export function BriefingGlance({
  briefing,
  isDark,
  dayKey,
}: {
  briefing: Briefing | undefined;
  isDark: boolean;
  dayKey: string;
}) {
  const muted = mutedStyle(isDark);

  return (
    <div style={{ ...surface(isDark), padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <span style={sectionLabel(isDark)}>Today at a glance</span>
        {briefing && <span style={{ fontSize: "0.7rem", ...muted }}>{prettyDay(briefing.date)}</span>}
      </div>

      {briefing === undefined ? (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              height: 14,
              width: "58%",
              borderRadius: 7,
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 24,
                  width: 92,
                  borderRadius: 100,
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                }}
              />
            ))}
          </div>
          <p style={{ margin: 0, fontSize: "0.72rem", ...muted }}>Loading today&apos;s briefing…</p>
        </div>
      ) : (
        <>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "1.05rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
            }}
          >
            {briefing.nextEvent ? (
              <>
                Next up: {briefing.nextEvent.title}
                <span style={{ color: ACCENT }}>
                  {" "}
                  · {prettyTime(briefing.nextEvent.startTime) || "all day"}
                </span>
                {briefing.nextEvent.location ? (
                  <span style={{ fontSize: "0.8rem", fontWeight: 500, ...muted }}>
                    {" "}
                    at {briefing.nextEvent.location}
                  </span>
                ) : null}
              </>
            ) : briefing.timedEvents === 0 && briefing.allDayEvents > 0 ? (
              <span style={muted}>All-day items only — nothing timed left today.</span>
            ) : (
              <span style={muted}>Nothing on the calendar today.</span>
            )}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <Chip isDark={isDark}>
              <Clock size={12} /> {briefing.events} event{briefing.events === 1 ? "" : "s"}
            </Chip>
            <Chip isDark={isDark} tint={ACCENT}>
              <ListTodo size={12} /> {briefing.todos.open} open
              {briefing.todos.overdue > 0 && <span style={{ color: "#f87171" }}>· {briefing.todos.overdue} overdue</span>}
              {briefing.todos.dueToday > 0 && <span style={{ color: "#fbbf24" }}>· {briefing.todos.dueToday} due today</span>}
            </Chip>
            <Chip isDark={isDark} tint="#fbbf24" text="#f59e0b">
              <Flame size={12} /> {briefing.streak.current}-day streak
            </Chip>
            <Chip isDark={isDark} tint={briefing.loggedToday ? "#34d399" : "#94a3b8"}>
              <CalendarCheck size={12} /> {briefing.loggedToday ? "Logged today" : "Not logged yet"}
            </Chip>
            <Chip isDark={isDark}>
              <Repeat size={12} /> {briefing.routinesToday} routine{briefing.routinesToday === 1 ? "" : "s"} today
            </Chip>
            <Chip isDark={isDark} tint={briefing.workedOutToday ? "#60a5fa" : "#94a3b8"}>
              <Dumbbell size={12} />{" "}
              {briefing.workedOutToday
                ? `Trained · ${briefing.workoutDaysLast30} days/30`
                : `No workout yet · ${briefing.workoutDaysLast30} days/30`}
            </Chip>
          </div>

          {briefing.todos.focus.length > 0 && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span style={sectionLabel(isDark)}>Needs attention</span>
              {briefing.todos.focus.slice(0, 3).map((t) => {
                const due = dueLabelFor(t.dueDate, dayKey);
                const late = (t.dueDate ?? "") < dayKey;
                return (
                  <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem" }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: late ? "#f87171" : "#fbbf24",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.text}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: late ? "#f87171" : muted.color }}>{due}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({
  children,
  isDark,
  tint,
  text,
}: {
  children: React.ReactNode;
  isDark: boolean;
  tint?: string;
  text?: string;
}) {
  const color = text ?? tint ?? (isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: 100,
        fontSize: "0.74rem",
        fontWeight: 600,
        background: tint ? hexA(tint, 0.12) : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
        color,
      }}
    >
      {children}
    </span>
  );
}

/* ── Streak strip ────────────────────────────────────────────────────────────── */

/** Current/longest streak, a status badge, and the trailing 14 days as dots. */
export function StreakStrip({
  streak,
  isDark,
  dayKey,
  loggedDates,
  last14,
}: {
  streak: StreakLike;
  isDark: boolean;
  dayKey: string;
  loggedDates: Set<string>;
  last14: string[];
}) {
  const statusColor = STATUS_COLOR[streak.status];
  const muted = mutedStyle(isDark);

  return (
    <div style={{ ...surface(isDark), padding: "16px 18px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <span style={{ fontSize: "2.4rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em" }}>
            {streak.current}
          </span>
          <span style={{ fontSize: "0.8rem", fontWeight: 500, paddingBottom: 4, ...muted }}>day streak</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 100,
              fontSize: "0.72rem",
              fontWeight: 700,
              background: hexA("#fbbf24", 0.12),
              color: "#f59e0b",
            }}
          >
            <Trophy size={12} /> Longest {streak.longest}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 100,
              fontSize: "0.72rem",
              fontWeight: 700,
              background: hexA(statusColor, 0.14),
              color: statusColor,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
            {STATUS_COPY[streak.status]}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 5, marginTop: 16 }}>
        {last14.map((d) => {
          const hit = loggedDates.has(d);
          const isToday = d === dayKey;
          return (
            <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 600,
                  color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)",
                }}
              >
                {weekdayLetter(d)}
              </span>
              <div
                title={d}
                style={{
                  width: "100%",
                  maxWidth: 22,
                  aspectRatio: "1 / 1",
                  borderRadius: "50%",
                  background: hit
                    ? "linear-gradient(135deg, #fbbf24, #e8734a)"
                    : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.05)",
                  border: isToday
                    ? `1.5px solid ${ACCENT}`
                    : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                {hit && <Check size={11} color="#fff" strokeWidth={3} />}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: "0.65rem", ...muted }}>{last14[0]}</span>
        <span style={{ fontSize: "0.65rem", color: ACCENT, fontWeight: 600 }}>today</span>
      </div>
    </div>
  );
}

/* ── Mood insights ───────────────────────────────────────────────────────────── */

/** Top-5 emotions as ranked bars plus energy / focus / consistency. */
export function MoodInsights({ pattern, isDark }: { pattern: MoodPattern; isDark: boolean }) {
  const maxEmotion = pattern.top[0]?.count ?? 0;
  const muted = mutedStyle(isDark);
  const consistency =
    typeof pattern.consistency === "number" && Number.isFinite(pattern.consistency)
      ? `${(pattern.consistency * 100).toFixed(1)}%`
      : "—";

  return (
    <div style={{ ...surface(isDark), padding: "16px 18px" }}>
      <span style={sectionLabel(isDark)}>Mood · last 30 days</span>

      {pattern.top.length === 0 ? (
        <p style={{ margin: "12px 0 0", fontSize: "0.8rem", fontStyle: "italic", ...muted }}>
          No emotions logged in this window yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
          {pattern.top.slice(0, 5).map((e, i) => {
            const color = RANK_COLORS[i] ?? ACCENT;
            const width = maxEmotion > 0 ? Math.max(6, (e.count / maxEmotion) * 100) : 0;
            return (
              <div key={e.emotion} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, width: 78, flexShrink: 0, letterSpacing: "-0.01em" }}>
                  {e.emotion}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 100,
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${width}%`,
                      height: "100%",
                      borderRadius: 100,
                      background: `linear-gradient(90deg, ${color}, ${hexA(color, 0.55)})`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    width: 22,
                    textAlign: "right",
                    flexShrink: 0,
                    ...muted,
                  }}
                >
                  {e.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
        {[
          { label: "Energy", value: fmtAvg(pattern.avgEnergy) },
          { label: "Focus", value: fmtAvg(pattern.avgFocus) },
          { label: "Consistency", value: consistency },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "10px 8px",
              borderRadius: 14,
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                ...muted,
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                margin: "5px 0 0",
                fontSize: "0.95rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: s.value === "—" ? undefined : ACCENT,
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Adaptive prompts ────────────────────────────────────────────────────────── */

/** Clickable prompt chips; "Use prompt" hands off to the existing CheckInView. */
export function PromptPicker({
  prompts,
  slot,
  isDark,
  onUse,
}: {
  prompts: string[];
  slot: string;
  isDark: boolean;
  onUse: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const muted = mutedStyle(isDark);

  return (
    <div style={{ ...surface(isDark), padding: "16px 18px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Sparkles size={13} style={{ color: ACCENT }} />
        <span style={sectionLabel(isDark)}>Prompts for {slot}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, flex: 1 }}>
        {prompts.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8rem", fontStyle: "italic", ...muted }}>
            Nothing to suggest right now.
          </p>
        ) : (
          prompts.map((p) => {
            const active = selected === p;
            return (
              <button
                key={p}
                onClick={() => setSelected(active ? null : p)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  lineHeight: 1.45,
                  fontWeight: active ? 600 : 500,
                  color: active ? ACCENT : isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.72)",
                  background: active ? hexA(ACCENT, 0.1) : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: active
                    ? `1.5px solid ${hexA(ACCENT, 0.45)}`
                    : `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)"}`,
                  transition: "all 0.2s ease",
                  fontFamily: "var(--font-inter)",
                }}
              >
                {p}
              </button>
            );
          })
        )}
      </div>

      <button
        onClick={onUse}
        disabled={!selected}
        style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: 14,
          border: "none",
          background: selected ? ACCENT : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          color: selected ? "#fff" : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: selected ? "pointer" : "not-allowed",
          transition: "all 0.25s ease",
          fontFamily: "var(--font-inter)",
        }}
      >
        {selected ? "Use prompt → log it" : "Pick a prompt to use"}
      </button>
    </div>
  );
}

/* ── Reminder settings ───────────────────────────────────────────────────────── */

/** Inline editable row: three times + nudges toggle + save. No nested modal. */
export function ReminderRow({
  routine,
  streak,
  isDark,
  saveCheckInRoutine,
}: {
  routine: RoutineLike;
  streak: StreakLike;
  isDark: boolean;
  saveCheckInRoutine: (args: RoutineLike) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<RoutineLike | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const muted = mutedStyle(isDark);

  // Uncontrolled until edited, so a late-loading routine prop is still reflected.
  const reminder: RoutineLike = draft ?? routine;
  const dirty =
    reminder.morningTime !== routine.morningTime ||
    reminder.afternoonTime !== routine.afternoonTime ||
    reminder.nightTime !== routine.nightTime ||
    reminder.nudgesEnabled !== routine.nudgesEnabled;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await saveCheckInRoutine(reminder);
      setDraft(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...surface(isDark), padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Bell size={13} style={{ color: ACCENT }} />
          <span style={sectionLabel(isDark)}>Reminders</span>
        </div>
        {saved && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#34d399",
            }}
          >
            <Check size={12} strokeWidth={3} /> Saved
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        {(
          [
            { key: "morningTime", label: "Morning" },
            { key: "afternoonTime", label: "Afternoon" },
            { key: "nightTime", label: "Night" },
          ] as const
        ).map((f) => (
          <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                ...muted,
              }}
            >
              {f.label}
            </span>
            <input
              type="time"
              value={reminder[f.key]}
              onChange={(e) => setDraft({ ...reminder, [f.key]: e.target.value })}
              style={{
                padding: "7px 9px",
                borderRadius: 12,
                fontSize: "0.8rem",
                fontWeight: 600,
                colorScheme: isDark ? "dark" : "light",
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                color: isDark ? "#fff" : "#000",
                outline: "none",
                fontFamily: "var(--font-inter)",
              }}
            />
          </label>
        ))}

        <button
          onClick={() => setDraft({ ...reminder, nudgesEnabled: !reminder.nudgesEnabled })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 12px",
            borderRadius: 100,
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: 600,
            alignSelf: "flex-end",
            background: reminder.nudgesEnabled
              ? hexA(ACCENT, 0.12)
              : isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)",
            border: reminder.nudgesEnabled
              ? `1px solid ${hexA(ACCENT, 0.4)}`
              : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
            color: reminder.nudgesEnabled ? ACCENT : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
            transition: "all 0.2s ease",
            fontFamily: "var(--font-inter)",
          }}
        >
          {reminder.nudgesEnabled ? <Bell size={13} /> : <BellOff size={13} />}
          Nudges {reminder.nudgesEnabled ? "on" : "off"}
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{
            padding: "9px 16px",
            borderRadius: 100,
            border: "none",
            alignSelf: "flex-end",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: saving || !dirty ? "default" : "pointer",
            background: dirty ? ACCENT : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            color: dirty ? "#fff" : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            transition: "all 0.25s ease",
            fontFamily: "var(--font-inter)",
          }}
        >
          {saving ? "Saving…" : "Save times"}
        </button>
      </div>

      <p style={{ margin: "10px 0 0", fontSize: "0.7rem", lineHeight: 1.5, ...muted }}>
        {streak.lastDate
          ? `Last check-in ${streak.lastDate}. Journaling itself stays in the full Check-In view.`
          : "Journaling itself stays in the full Check-In view."}
      </p>
    </div>
  );
}
