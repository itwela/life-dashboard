"use client";

import { useState, useMemo, useEffect } from "react";
import { CalendarCheck, CalendarDays, Clock, Plus, Repeat, X } from "lucide-react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { toSpan, spansOverlap, findFreeGaps, prettyTime, parseTime, formatTime, repeatLabel, type TimeSpan } from "../../../../convex/memberLogic";
import {
  ACCENT,
  HOUR_END,
  HOUR_START,
  AgendaRow,
  AllDayChips,
  NextUpBanner,
  RoutineRow,
  Timeline,
  dayLabel,
  durationLabel,
  hexAlpha,
  isDone,
  readCreated,
  weekdayOf,
  type LaidOutEvent,
  type NextUp,
} from "./parts";

interface Props {
  dayKey: string;                              // TODAY as "YYYY-MM-DD"
  isDark: boolean;
  events: Doc<"calendarEvents">[];             // today's events
  routines: Doc<"routines">[];                 // active recurring routines
  // Weekly series (a show that drops every Sunday). The rule lives here; its
  // individual episodes are materialized into calendarEvents, so they also show
  // in `events` on the day they land.
  recurringEvents: Doc<"recurringEvents">[];
  onExtendRecurring: () => Promise<unknown>;   // top up the materialized horizon
  logRoutinesToToday: (args: { date: string }) => Promise<unknown>;
  setRoutineActive: (args: { id: Id<"routines">; active: boolean }) => Promise<unknown>;
  deleteRoutine: (args: { id: Id<"routines"> }) => Promise<unknown>;
  onAddEvent: () => void;                      // opens the existing CalendarView
  onClose: () => void;
}

interface TimedEvent {
  ev: Doc<"calendarEvents">;
  span: TimeSpan;
}

/**
 * Greedy lane assignment inside each overlap cluster. Touching spans do not
 * overlap (spansOverlap), so back-to-back events keep the same lane.
 */
function layoutLanes(items: TimedEvent[]): LaidOutEvent[] {
  const out: LaidOutEvent[] = [];
  let cluster: TimedEvent[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const lanes: TimeSpan[][] = [];
    const placed = cluster.map((item) => {
      let lane = lanes.findIndex((spans) => !spans.some((s) => spansOverlap(s, item.span)));
      if (lane === -1) {
        lane = lanes.length;
        lanes.push([]);
      }
      lanes[lane].push(item.span);
      return { ev: item.ev, span: item.span, lane };
    });
    const laneCount = lanes.length;
    for (const p of placed) out.push({ ...p, lanes: laneCount });
    cluster = [];
  };

  for (const item of items) {
    if (cluster.length > 0 && item.span.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.span.end);
  }
  flush();
  return out;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function ScheduleMemberPanel({ dayKey, isDark, events, routines, recurringEvents, onExtendRecurring, logRoutinesToToday, setRoutineActive, deleteRoutine, onAddEvent, onClose }: Props) {
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [logMsg, setLogMsg] = useState<string | null>(null);
  const [extending, setExtending] = useState(false);
  const [extendMsg, setExtendMsg] = useState<string | null>(null);

  async function handleExtend() {
    setExtending(true);
    setExtendMsg(null);
    try {
      await onExtendRecurring();
      setExtendMsg("Extended by 6 months.");
    } catch {
      setExtendMsg("Couldn't extend — try again.");
    } finally {
      setExtending(false);
    }
  }

  // Live clock (client-only, so SSR and hydration never disagree).
  useEffect(() => {
    const tick = () => setNowMin(nowMinutes());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const todayWeekday = useMemo(() => weekdayOf(dayKey), [dayKey]);

  // All-day / untimed events never hit the timeline.
  const allDay = useMemo(
    () => events.filter((ev) => toSpan(ev.startTime, ev.endTime) === null),
    [events],
  );

  const timed = useMemo(
    () =>
      events
        .map((ev) => ({ ev, span: toSpan(ev.startTime, ev.endTime) }))
        .filter((x): x is TimedEvent => x.span !== null)
        .sort((a, b) => a.span.start - b.span.start || a.span.end - b.span.end),
    [events],
  );

  const laidOut = useMemo(() => layoutLanes(timed), [timed]);

  // Done items sink to the bottom of the agenda; both halves stay time-ordered.
  const agenda = useMemo(
    () => [...timed.filter((t) => !isDone(t.ev)), ...timed.filter((t) => isDone(t.ev))],
    [timed],
  );

  const gaps = useMemo(() => findFreeGaps(timed.map((t) => t.span)), [timed]);
  const bestGap = useMemo(
    () => gaps.reduce<TimeSpan | null>((best, g) => (!best || g.end - g.start > best.end - best.start ? g : best), null),
    [gaps],
  );

  const next = useMemo<NextUp>(() => {
    if (nowMin === null) return { state: "waiting" };
    if (timed.length === 0) return { state: "empty" };
    const active = timed.filter((t) => !isDone(t.ev));
    if (active.length === 0) return { state: "done" };
    const current = active.find((t) => nowMin >= t.span.start && nowMin < t.span.end);
    if (current) return { state: "now", ev: current.ev, span: current.span };
    const upcoming = active.find((t) => t.span.start > nowMin);
    if (upcoming) return { state: "soon", ev: upcoming.ev, span: upcoming.span, inMin: upcoming.span.start - nowMin };
    return { state: "done" };
  }, [timed, nowMin]);

  const sortedRoutines = useMemo(
    () =>
      [...routines].sort(
        (a, b) =>
          (a.active === b.active ? 0 : a.active ? -1 : 1) ||
          (parseTime(a.startTime) ?? 1440) - (parseTime(b.startTime) ?? 1440) ||
          a.title.localeCompare(b.title),
      ),
    [routines],
  );

  const routinesToday = useMemo(
    () => routines.filter((r) => r.active && r.days.includes(todayWeekday)).length,
    [routines, todayWeekday],
  );

  const doneCount = timed.filter((t) => isDone(t.ev)).length;

  async function handleLogRoutines() {
    if (logging) return;
    setLogging(true);
    setLogMsg(null);
    try {
      const created = readCreated(await logRoutinesToToday({ date: dayKey }));
      setLogMsg(
        created > 0
          ? `Added ${created} routine${created === 1 ? "" : "s"} to today's calendar.`
          : "Today's routines are already on the calendar.",
      );
    } catch {
      setLogMsg("Couldn't add routines just now — try again.");
    } finally {
      setLogging(false);
    }
  }

  const main = isDark ? "text-white" : "text-black";
  const text40 = isDark ? "text-white/40" : "text-black/40";
  const text30 = isDark ? "text-white/30" : "text-black/30";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const rowBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)";

  return (
    <div
      className="rounded-[28px] p-6 sm:p-8 flex flex-col gap-4"
      style={{
        background: isDark
          ? "linear-gradient(155deg, rgba(59,130,246,0.14) 0%, rgba(22,22,27,0.99) 42%)"
          : "linear-gradient(155deg, rgba(59,130,246,0.10) 0%, #ffffff 42%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,130,246,0.10), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 30px 80px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.32), rgba(37,99,235,0.14))",
            border: "1px solid rgba(59,130,246,0.38)",
            boxShadow: "0 0 16px rgba(59,130,246,0.28)",
          }}
        >
          <CalendarDays size={20} style={{ color: ACCENT }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-lg font-bold ${main}`}>Schedule</h2>
          <p className={`text-xs truncate ${text40}`}>
            {dayLabel(dayKey)} · {allDay.length} all-day · {timed.length} timed · {doneCount} done
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close schedule panel"
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: rowFill, border: rowBorder, color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => void handleLogRoutines()}
          disabled={logging}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl text-white transition-opacity disabled:opacity-60"
          style={{ background: ACCENT, boxShadow: "0 0 16px rgba(59,130,246,0.35)" }}
        >
          <CalendarCheck size={14} />
          {logging
            ? "Adding…"
            : routinesToday > 0
              ? `Add ${routinesToday} routine${routinesToday === 1 ? "" : "s"} to today`
              : "Add today's routines"}
        </button>
        <button
          type="button"
          onClick={onAddEvent}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
          style={{ background: rowFill, border: rowBorder, color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)" }}
        >
          <Plus size={14} />
          Add event
        </button>
        {bestGap ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl"
            style={{ background: hexAlpha(ACCENT, 0.12), border: `1px solid ${hexAlpha(ACCENT, 0.28)}`, color: ACCENT }}
          >
            <Clock size={13} />
            {durationLabel(bestGap.end - bestGap.start)} free at {formatTime(bestGap.start)}
          </span>
        ) : (
          <span className={`text-xs ${text30}`}>No 30m+ gaps in 06:00–22:00</span>
        )}
        {logMsg ? (
          <span className="text-xs" style={{ color: ACCENT }}>
            {logMsg}
          </span>
        ) : null}
      </div>

      <NextUpBanner next={next} isDark={isDark} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 min-w-0">
        {/* Timeline */}
        <section className="rounded-[20px] p-4 min-w-0" style={{ background: rowFill, border: rowBorder }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${main}`}>Day timeline</h3>
            <span className={`text-[11px] ${text40}`}>
              {formatTime(HOUR_START)}–{formatTime(HOUR_END)}
            </span>
          </div>
          <Timeline laidOut={laidOut} isDark={isDark} nowMin={nowMin} onAddEvent={onAddEvent} />
          <p className={`mt-3 text-xs ${text40}`}>
            {bestGap ? (
              <>
                Biggest opening:{" "}
                <span style={{ color: ACCENT }}>{durationLabel(bestGap.end - bestGap.start)} free at {prettyTime(formatTime(bestGap.start))}</span>
              </>
            ) : (
              "No free gaps of 30 minutes or more between 06:00 and 22:00."
            )}
          </p>
        </section>

        {/* Agenda + routines */}
        <div className="flex flex-col gap-4 min-w-0">
          <section className="rounded-[20px] p-4 min-w-0" style={{ background: rowFill, border: rowBorder }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${main}`}>Agenda</h3>
              <span className={`text-[11px] ${text40}`}>{timed.length} timed · {doneCount} done</span>
            </div>

            <AllDayChips events={allDay} isDark={isDark} />

            <div className="mt-3 space-y-2">
              {agenda.length === 0 ? (
                <p className={`text-xs ${text30}`}>No timed events today. Add one to block out time.</p>
              ) : (
                agenda.map(({ ev }) => <AgendaRow key={ev._id} ev={ev} isDark={isDark} nowMin={nowMin} />)
              )}
            </div>
          </section>

          <section className="rounded-[20px] p-4 min-w-0" style={{ background: rowFill, border: rowBorder }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${main}`}>
                <Repeat size={14} style={{ color: ACCENT }} />
                Routines
              </h3>
              <span className={`text-[11px] ${text40}`}>
                {routines.length} total · {routinesToday} today
              </span>
            </div>

            {sortedRoutines.length === 0 ? (
              <p className={`text-xs ${text30}`}>No routines yet.</p>
            ) : (
              <div className="space-y-2">
                {sortedRoutines.map((r) => (
                  <RoutineRow
                    key={r._id}
                    routine={r}
                    isDark={isDark}
                    todayWeekday={todayWeekday}
                    onToggle={(id, active) => void setRoutineActive({ id, active })}
                    onDelete={(id) => void deleteRoutine({ id })}
                  />
                ))}
              </div>
            )}
          </section>

          {recurringEvents.length > 0 && (
            <section className="rounded-[20px] p-4 min-w-0" style={{ background: rowFill, border: rowBorder }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${main}`}>
                  <Repeat size={14} style={{ color: ACCENT }} />
                  Weekly series
                </h3>
                <span className={`text-[11px] ${text40}`}>{recurringEvents.length} active</span>
              </div>

              <div className="space-y-2">
                {recurringEvents.map((s) => {
                  const landsToday = s.recurDays.includes(todayWeekday);
                  return (
                    <div
                      key={s._id}
                      className="flex items-center justify-between gap-3 rounded-[14px] px-3 py-2"
                      style={{ background: hexAlpha(ACCENT, 0.08), border: rowBorder }}
                    >
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold truncate ${main}`}>{s.title}</div>
                        <div className={`text-[11px] ${text40}`}>
                          {repeatLabel(s.recurDays)}
                          {landsToday && (
                            <span style={{ color: ACCENT, fontWeight: 600 }}> · lands today</span>
                          )}
                        </div>
                      </div>
                      {s.category && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: hexAlpha(ACCENT, 0.15), color: isDark ? "#c7d2fe" : "#3730a3" }}
                        >
                          {s.category}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 mt-3">
                <p className={`text-[11px] ${text30}`}>
                  Episodes are on the calendar. Extend to keep them rolling.
                </p>
                <button
                  onClick={() => void handleExtend()}
                  disabled={extending}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: hexAlpha(ACCENT, 0.15),
                    color: isDark ? "#c7d2fe" : "#3730a3",
                    border: `1px solid ${hexAlpha(ACCENT, 0.3)}`,
                    cursor: extending ? "wait" : "pointer",
                    opacity: extending ? 0.6 : 1,
                  }}
                  title="Materialize another 6 months of episodes"
                >
                  {extending ? "Extending…" : "Extend 6 months"}
                </button>
              </div>
              {extendMsg && <p className={`text-[11px] mt-2 ${text40}`}>{extendMsg}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
