"use client";

import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { prettyTime } from "../../../convex/memberLogic";
import { CalendarDays, ListChecks, Sparkles, Dumbbell, Flame } from "lucide-react";

type Briefing = FunctionReturnType<typeof api.memberData.getBriefing>;

interface Props {
  briefing: Briefing | undefined;
  isDark: boolean;
  /** "card" is the compact dashboard tile; "full" is the panel-opening view. */
  variant?: "card" | "full";
}

/**
 * "Today at a glance" — the cross-domain rollup that answers "how am I doing".
 *
 * Lives in its own file because it is rendered twice: as the Briefing dashboard
 * card and as a standalone section. Reads only from the `getBriefing` query, so
 * there is one source of truth for the numbers.
 */
export default function DailyBriefingPanel({ briefing, isDark, variant = "full" }: Props) {
  const textMain = isDark ? "text-white" : "text-black";
  const textMuted = isDark ? "text-white/45" : "text-black/45";
  const card = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)";

  if (briefing === undefined) {
    return (
      <div className={`flex items-center justify-center py-8 text-sm ${textMuted}`}>
        Loading today's briefing…
      </div>
    );
  }

  const { todos, streak, nextEvent, loggedToday, workedOutToday, workoutDaysLast30 } = briefing;

  // The one-line verdict: what deserves attention first.
  const verdict = (() => {
    if (todos.overdue > 0) return `${todos.overdue} thing${todos.overdue === 1 ? "" : "s"} overdue.`;
    if (!loggedToday && streak.status === "streak_at_risk")
      return `${streak.current}-day streak needs today's check-in.`;
    if (todos.dueToday > 0) return `${todos.dueToday} due today.`;
    if (nextEvent) return `Next up: ${nextEvent.title}.`;
    return "Nothing overdue. Steady.";
  })();

  const stats: { label: string; value: string; tone: string; icon: React.ReactNode }[] = [
    {
      label: "Open to-dos",
      value: `${todos.open}`,
      tone: todos.overdue > 0 ? "#f87171" : "#818cf8",
      icon: <ListChecks size={14} />,
    },
    {
      label: "Check-in",
      value: loggedToday ? "Logged" : streak.current > 0 ? `${streak.current}d` : "—",
      tone: loggedToday ? "#34d399" : streak.status === "streak_at_risk" ? "#fbbf24" : "#e8734a",
      icon: <Flame size={14} />,
    },
    {
      label: "Today's events",
      value: `${briefing.events}`,
      tone: "#3b82f6",
      icon: <CalendarDays size={14} />,
    },
    {
      label: "Workouts · 30d",
      value: `${workoutDaysLast30}`,
      tone: workedOutToday ? "#34d399" : "#e8734a",
      icon: <Dumbbell size={14} />,
    },
  ];

  const focused = variant === "card" ? stats.slice(0, 3) : stats;

  return (
    <div className="flex flex-col gap-3">
      {/* Verdict line */}
      <div className="flex items-start gap-2">
        <Sparkles size={15} style={{ color: "#e8734a", marginTop: 2, flexShrink: 0 }} />
        <p className={`m-0 text-[0.95rem] leading-snug ${textMain}`} style={{ fontWeight: 500 }}>
          {verdict}
        </p>
      </div>

      {/* Next event */}
      <div className="flex items-center gap-2 text-xs">
        <CalendarDays size={13} className={textMuted} />
        {nextEvent ? (
          <span className={textMain}>
            <span style={{ fontWeight: 600 }}>{nextEvent.title}</span>
            {nextEvent.startTime && (
              <span className={textMuted}>
                {" · "}
                {prettyTime(nextEvent.startTime)}
                {nextEvent.endTime ? `–${prettyTime(nextEvent.endTime)}` : ""}
              </span>
            )}
            {nextEvent.location && <span className={textMuted}> · {nextEvent.location}</span>}
          </span>
        ) : (
          <span className={textMuted}>No timed events left today</span>
        )}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2">
        {focused.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-1 rounded-2xl px-3 py-2"
            style={{ background: card, border }}
          >
            <div className="flex items-center gap-1.5" style={{ color: s.tone }}>
              {s.icon}
              <span className="text-[0.62rem] uppercase tracking-wide" style={{ fontWeight: 600 }}>
                {s.label}
              </span>
            </div>
            <span className="text-lg leading-none" style={{ fontWeight: 700, color: s.tone }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Detail rows — full view only */}
      {variant === "full" && (
        <div className="flex flex-col gap-1.5 pt-1">
          <Row label="Overdue" value={`${todos.overdue}`} isDark={isDark} danger={todos.overdue > 0} />
          <Row label="Due today" value={`${todos.dueToday}`} isDark={isDark} />
          <Row label="Completed to-dos" value={`${todos.done}`} isDark={isDark} />
          <Row
            label="Check-in streak"
            value={`${streak.current}d · best ${streak.longest}d`}
            isDark={isDark}
          />
          <Row label="Routines today" value={`${briefing.routinesToday}`} isDark={isDark} />
          <Row
            label="Workout today"
            value={workedOutToday ? "Done" : "Not logged"}
            isDark={isDark}
            danger={!workedOutToday}
          />
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  isDark,
  danger,
}: {
  label: string;
  value: string;
  isDark: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={isDark ? "text-white/45" : "text-black/45"}>{label}</span>
      <span
        style={{ fontWeight: 600, color: danger ? "#f87171" : isDark ? "#fff" : "#000" }}
      >
        {value}
      </span>
    </div>
  );
}
