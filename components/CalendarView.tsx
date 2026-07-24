// components/CalendarView.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Check, Smile, ExternalLink, Minus } from "lucide-react";

const ACCENT = "#38bdf8";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// "YYYY-MM-DD" math. Dates are zero-padded so string comparison is chronological.
function addDaysStr(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return fmt(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
function diffDays(from: string, to: string) {
  const [ay, am, ad] = from.split("-").map(Number);
  const [by, bm, bd] = to.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}
type EvLike = { date: string; endDate?: string };
function isMultiDay(e: EvLike) {
  return !!(e.endDate && e.endDate > e.date);
}
function coversDate(e: EvLike, date: string) {
  if (isMultiDay(e)) return e.date <= date && date <= (e.endDate as string);
  return e.date === date;
}

type EvStatus = "todo" | "in_progress" | "done";
function statusOf(e: { status?: EvStatus | string; done?: boolean }): EvStatus {
  if (e.status === "todo" || e.status === "in_progress" || e.status === "done") return e.status;
  return e.done ? "done" : "todo";
}
const NEXT_STATUS: Record<EvStatus, EvStatus> = { todo: "in_progress", in_progress: "done", done: "todo" };
const STATUS_RANK: Record<EvStatus, number> = { todo: 0, in_progress: 1, done: 2 };

type DragPayload =
  | { kind: "event"; id: Id<"calendarEvents"> }
  | { kind: "todo"; title: string };

export default function CalendarView({
  onClose,
  isDark = true,
  onCheckIn,
}: {
  onClose: () => void;
  isDark?: boolean;
  onCheckIn?: (date: string) => void;
}) {
  const events = useQuery(api.dashboard.getCalendarEvents, {}) ?? [];
  const todos = useQuery(api.dashboard.getTodos, {}) ?? [];
  const addEvent = useMutation(api.dashboard.addCalendarEvent);
  const deleteEvent = useMutation(api.dashboard.deleteCalendarEvent);
  const updateEvent = useMutation(api.dashboard.updateCalendarEvent);
  const setStatus = useMutation(api.dashboard.setCalendarEventStatus);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string>(fmt(now.getFullYear(), now.getMonth(), now.getDate()));
  const [newTitle, setNewTitle] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [editingId, setEditingId] = useState<Id<"calendarEvents"> | null>(null);
  const [editText, setEditText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<Id<"calendarEvents"> | null>(null);
  const [noteText, setNoteText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: Id<"calendarEvents">; title: string } | null>(null);

  const textMain = isDark ? "text-white" : "text-black";
  const text40 = isDark ? "text-white/40" : "text-black/40";
  const text60 = isDark ? "text-white/60" : "text-black/60";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const rowBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)";
  const mutedText = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";

  // Single-day events keyed by their day (desktop in-cell chips). Multi-day events
  // are drawn separately as spanning bars, so they're excluded here to avoid double-render.
  const singleByDate = new Map<string, typeof events>();
  for (const e of events) {
    if (isMultiDay(e)) continue;
    if (!singleByDate.has(e.date)) singleByDate.set(e.date, []);
    singleByDate.get(e.date)!.push(e);
  }
  const multiDayEvents = events.filter(isMultiDay);
  // All events (single + multi) that touch a given day — for mobile dots.
  const eventsOn = (date: string) => events.filter((e) => coversDate(e, date));

  const todayStr = fmt(now.getFullYear(), now.getMonth(), now.getDate());
  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Spanning-bar layout constants (px). Bars float in a per-week overlay below the day number.
  const BAR_H = 18;
  const BAR_TOP = 22;
  const DAY_NUM_H = 16;

  // Chunk the flat cell list into week rows so bars can be laid out and wrapped per week.
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // For each week, build the multi-day bar segments (clamped to the visible days),
  // then greedily pack overlapping spans into stacked lanes.
  type Seg = {
    key: string;
    startCol: number;
    span: number;
    leftRound: boolean; // the event truly starts here (not continued from a prior week)
    rightRound: boolean; // the event truly ends here
    lane: number;
    event: (typeof events)[number];
  };
  const weekSegments: Seg[][] = [];
  const weekLaneCount: number[] = [];
  for (const week of weeks) {
    const dates = week.map((d) => (d === null ? null : fmt(year, month, d)));
    const raw: Omit<Seg, "lane">[] = [];
    for (const e of multiDayEvents) {
      const cols = dates.map((dt, i) => (dt && coversDate(e, dt) ? i : -1)).filter((i) => i >= 0);
      if (cols.length === 0) continue;
      const startCol = cols[0];
      const endCol = cols[cols.length - 1];
      raw.push({
        key: e._id,
        startCol,
        span: endCol - startCol + 1,
        leftRound: dates[startCol] === e.date,
        rightRound: dates[endCol] === e.endDate,
        event: e,
      });
    }
    raw.sort((a, b) => a.startCol - b.startCol);
    const laneEnds: number[] = []; // last occupied column index per lane
    const segs: Seg[] = raw.map((r) => {
      let lane = laneEnds.findIndex((end) => end < r.startCol);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(-1); }
      laneEnds[lane] = r.startCol + r.span - 1;
      return { ...r, lane };
    });
    weekSegments.push(segs);
    weekLaneCount.push(laneEnds.length);
  }

  const nav = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const openTodos = [...todos].filter((t) => !t.done).slice(0, 40);

  const selectedEvents = events.filter((e) => coversDate(e, selected)).slice().sort(
    (a, b) => STATUS_RANK[statusOf(a)] - STATUS_RANK[statusOf(b)] || a.title.localeCompare(b.title)
  );
  const selectedLabel = new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const submitNew = async () => {
    const raw = newTitle.trim();
    if (!raw) return;
    setNewTitle("");
    // Pull a pasted URL out of the text so it becomes a clickable link on the event.
    const urlMatch = raw.match(/https?:\/\/\S+/);
    const link = urlMatch ? urlMatch[0] : undefined;
    const title = (link ? raw.replace(link, "").trim() : raw).replace(/\s+/g, " ") || "Link";
    await addEvent({ date: selected, title, note: link ? raw : undefined, link });
  };

  // Apply a drop onto a day cell: move an event to that day, or turn a todo into an event.
  const dropOnDay = async (date: string) => {
    setDragOver(null);
    const payload = drag;
    setDrag(null);
    if (!payload) return;
    if (payload.kind === "event") {
      const ev = events.find((x) => x._id === payload.id);
      if (ev && isMultiDay(ev)) {
        // Move the whole span: shift the end date by the same number of days as the start.
        const delta = diffDays(ev.date, date);
        await updateEvent({ id: payload.id, date, endDate: addDaysStr(ev.endDate as string, delta) });
      } else {
        await updateEvent({ id: payload.id, date });
      }
    } else {
      await addEvent({ date, title: payload.title });
    }
    setSelected(date);
  };

  const saveEdit = async (id: Id<"calendarEvents">) => {
    const title = editText.trim();
    setEditingId(null);
    if (title) await updateEvent({ id, title });
  };

  const saveNote = async (id: Id<"calendarEvents">) => {
    const note = noteText.trim();
    setEditingNoteId(null);
    await updateEvent({ id, note });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-5"
      style={{ background: isDark ? "rgba(8,8,10,0.85)" : "rgba(240,240,244,0.9)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
    >
      <div
        className="w-full h-full max-w-[1800px] rounded-2xl sm:rounded-[30px] p-3 sm:p-9 flex flex-col overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(155deg, rgba(56,189,248,0.13) 0%, rgba(20,20,25,0.99) 40%)"
            : "linear-gradient(155deg, rgba(56,189,248,0.10) 0%, #ffffff 40%)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          boxShadow: isDark
            ? "0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(56,189,248,0.10)"
            : "0 40px 100px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl flex items-center justify-center text-lg sm:text-xl"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.3), rgba(14,116,180,0.15))",
              border: "1px solid rgba(56,189,248,0.35)",
              boxShadow: "0 0 16px rgba(56,189,248,0.3)",
            }}
          >
            📅
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg sm:text-2xl font-bold truncate ${textMain}`}>{monthName}</h2>
            <p className={`text-xs hidden sm:block ${text40}`}>Drag todos onto a day · drag events to reschedule · click an event to edit</p>
          </div>
          {onCheckIn && (
            <button
              onClick={() => onCheckIn(selected)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
              style={{ border: rowBorder, color: mutedText }}
              title="Mood check-in for the selected day"
            >
              <Smile size={15} /> <span className="hidden sm:inline">Check-in</span>
            </button>
          )}
          <button onClick={() => nav(-1)} className="p-2 sm:p-2.5 rounded-xl shrink-0" style={{ border: rowBorder, color: mutedText }}>
            <ChevronLeft size={17} />
          </button>
          <button onClick={() => nav(1)} className="p-2 sm:p-2.5 rounded-xl shrink-0" style={{ border: rowBorder, color: mutedText }}>
            <ChevronRight size={17} />
          </button>
          <button onClick={onClose} className="p-2 sm:p-2.5 rounded-xl shrink-0" style={{ border: rowBorder, color: mutedText }}>
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 md:gap-5 overflow-y-auto md:overflow-hidden">
          {/* Todo drag source */}
          <div className="w-72 shrink-0 hidden md:flex flex-col">
            <p className={`text-sm font-bold uppercase tracking-wide mb-3 ${text40}`}>Todos — drag onto a day</p>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
              {openTodos.length === 0 ? (
                <p className={`text-base ${text40}`}>No open todos.</p>
              ) : (
                openTodos.map((t) => (
                  <div
                    key={t._id}
                    draggable
                    onDragStart={() => setDrag({ kind: "todo", title: t.text })}
                    onDragEnd={() => { setDrag(null); setDragOver(null); }}
                    className="px-4 py-3.5 rounded-xl text-base leading-snug cursor-grab active:cursor-grabbing"
                    style={{ background: rowFill, border: rowBorder, color: isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.8)" }}
                    title={t.text}
                  >
                    <span className="line-clamp-2">{t.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Month grid */}
          <div className="md:flex-[2] min-w-0 flex flex-col shrink-0 h-[46vh] md:h-auto">
            <div className="grid grid-cols-7 mb-1.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className={`text-center text-[10px] sm:text-[11px] font-semibold py-1 ${text40}`}>{w}</div>
              ))}
            </div>
            <div className="flex flex-col gap-1 sm:gap-1.5 flex-1 min-h-0">
              {weeks.map((week, wi) => {
                const segs = weekSegments[wi];
                const lanes = weekLaneCount[wi];
                // Reserve vertical room in each cell below the day number so single-day
                // chips don't sit under the floating bars.
                const spacerH = lanes > 0 ? BAR_TOP - DAY_NUM_H + lanes * BAR_H : 0;
                return (
                  <div key={wi} className="relative grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 min-h-0">
                    {week.map((day, di) => {
                      const i = wi * 7 + di;
                      if (day === null) return <div key={i} />;
                      const date = fmt(year, month, day);
                      const singleEvents = singleByDate.get(date) ?? [];
                      const mobileEvents = eventsOn(date);
                      const isToday = date === todayStr;
                      const isSelected = date === selected;
                      const isDragTarget = dragOver === date;
                      return (
                        <div
                          key={i}
                          onClick={() => setSelected(date)}
                          onDragOver={(e) => { e.preventDefault(); if (dragOver !== date) setDragOver(date); }}
                          onDragLeave={() => setDragOver((prev) => (prev === date ? null : prev))}
                          onDrop={() => dropOnDay(date)}
                          className="rounded-lg sm:rounded-xl p-1 sm:p-1.5 text-left flex flex-col overflow-hidden transition-colors cursor-pointer"
                          style={{
                            background: isDragTarget ? `${ACCENT}33` : isSelected ? `${ACCENT}1f` : rowFill,
                            border: isToday
                              ? `1.5px solid ${ACCENT}`
                              : isDragTarget
                                ? `1.5px dashed ${ACCENT}`
                                : isSelected
                                  ? `1px solid ${ACCENT}66`
                                  : rowBorder,
                            boxShadow: isToday ? `0 0 10px ${ACCENT}44` : undefined,
                          }}
                        >
                          <span
                            className="text-[11px] sm:text-[12px] font-bold mb-0.5"
                            style={{ color: isToday ? ACCENT : isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)" }}
                          >
                            {day}
                          </span>
                          {/* Reserve space for the spanning bars floating in the week overlay (desktop) */}
                          {spacerH > 0 && <div className="hidden md:block shrink-0" style={{ height: spacerH }} />}
                          {/* Mobile: compact dots — includes multi-day events (no overlay on mobile) */}
                          {mobileEvents.length > 0 && (
                            <div className="flex md:hidden flex-wrap gap-0.5 mt-auto">
                              {mobileEvents.slice(0, 4).map((e) => {
                                const st = statusOf(e);
                                return (
                                <span
                                  key={e._id}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: st === "in_progress" ? "#eab308" : st === "done" ? (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)") : e.source === "manual" ? "#34d399" : ACCENT }}
                                />
                                );
                              })}
                            </div>
                          )}
                          {/* Desktop: full text chips for single-day events only */}
                          <div className="hidden md:flex flex-col gap-0.5 min-h-0 overflow-hidden">
                            {singleEvents.slice(0, 4).map((e) => {
                              const st = statusOf(e);
                              return (
                              <span
                                key={e._id}
                                draggable
                                onDragStart={(ev) => { ev.stopPropagation(); setDrag({ kind: "event", id: e._id }); }}
                                onDragEnd={() => { setDrag(null); setDragOver(null); }}
                                className="text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-grab active:cursor-grabbing"
                                style={{
                                  background: st === "done" ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)") : st === "in_progress" ? "rgba(234,179,8,0.18)" : e.source === "manual" ? "rgba(52,211,153,0.18)" : "rgba(56,189,248,0.16)",
                                  color: st === "done" ? (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)") : st === "in_progress" ? "#eab308" : e.source === "manual" ? "#34d399" : ACCENT,
                                  textDecoration: st === "done" ? "line-through" : undefined,
                                }}
                                title={e.note || e.title}
                              >
                                {st === "done" ? "✓ " : st === "in_progress" ? "◐ " : e.link ? "🔗 " : ""}{e.title}
                              </span>
                              );
                            })}
                            {singleEvents.length > 4 && (
                              <span className={`text-[9px] ${text40}`}>+{singleEvents.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* Desktop spanning-bar overlay — same 7-col grid geometry so bars align to day columns */}
                    {segs.length > 0 && (
                      <div className="hidden md:grid grid-cols-7 gap-1 sm:gap-1.5 absolute inset-0 pointer-events-none">
                        {segs.map((seg) => {
                          const e = seg.event;
                          const st = statusOf(e);
                          return (
                            <div
                              key={seg.key}
                              className="text-[10px] leading-tight px-1.5 flex items-center overflow-hidden whitespace-nowrap font-medium"
                              style={{
                                gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                                gridRow: 1,
                                marginTop: BAR_TOP + seg.lane * BAR_H,
                                marginLeft: seg.leftRound ? 2 : 0,
                                marginRight: seg.rightRound ? 2 : 0,
                                height: BAR_H - 3,
                                background: st === "done" ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)") : st === "in_progress" ? "rgba(234,179,8,0.22)" : e.source === "manual" ? "rgba(52,211,153,0.22)" : "rgba(56,189,248,0.20)",
                                color: st === "done" ? (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)") : st === "in_progress" ? "#eab308" : e.source === "manual" ? "#34d399" : ACCENT,
                                borderTopLeftRadius: seg.leftRound ? 5 : 0,
                                borderBottomLeftRadius: seg.leftRound ? 5 : 0,
                                borderTopRightRadius: seg.rightRound ? 5 : 0,
                                borderBottomRightRadius: seg.rightRound ? 5 : 0,
                                textDecoration: st === "done" ? "line-through" : undefined,
                              }}
                              title={e.note || e.title}
                            >
                              {seg.leftRound ? `${st === "done" ? "✓ " : st === "in_progress" ? "◐ " : ""}${e.title}` : ""}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          <div className="w-full md:w-96 shrink-0 flex flex-col min-h-0 md:min-h-full">
            <p className={`text-base sm:text-lg font-bold mb-3 ${textMain}`}>{selectedLabel}</p>
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto space-y-2.5 md:pr-1">
              {selectedEvents.length === 0 ? (
                <p className={`text-base ${text40} py-3`}>Nothing scheduled. Drag a todo here or add one below.</p>
              ) : (
                selectedEvents.map((e) => {
                  const draggableCard = editingId !== e._id && editingNoteId !== e._id;
                  const st = statusOf(e);
                  return (
                  <div
                    key={e._id}
                    draggable={draggableCard}
                    onDragStart={(ev) => { ev.stopPropagation(); setDrag({ kind: "event", id: e._id }); }}
                    onDragEnd={() => { setDrag(null); setDragOver(null); }}
                    className={`group flex items-start gap-3 px-4 py-3.5 rounded-xl ${draggableCard ? "cursor-grab active:cursor-grabbing" : ""}`}
                    style={{ background: rowFill, border: rowBorder, opacity: e.done ? 0.6 : 1 }}
                    title={draggableCard ? "Drag onto any day to move it there" : undefined}
                  >
                    <button
                      className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-colors"
                      title={st === "todo" ? "Mark in progress" : st === "in_progress" ? "Mark done" : "Mark not started"}
                      onClick={() => setStatus({ id: e._id, status: NEXT_STATUS[st] })}
                      style={{
                        background: st === "done" ? "#34d399" : st === "in_progress" ? "#eab308" : "transparent",
                        border: `1.5px solid ${st === "done" ? "#34d399" : st === "in_progress" ? "#eab308" : (isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)")}`,
                        color: "#fff",
                      }}
                    >
                      {st === "done" ? <Check size={13} /> : st === "in_progress" ? <Minus size={13} /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      {editingId === e._id ? (
                        <input
                          autoFocus
                          value={editText}
                          onChange={(ev) => setEditText(ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") saveEdit(e._id);
                            if (ev.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => saveEdit(e._id)}
                          className={`w-full px-2 py-1.5 rounded text-sm outline-none ${textMain}`}
                          style={{ background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.9)", border: `1px solid ${ACCENT}66` }}
                        />
                      ) : (
                        <p
                          className={`text-base font-medium leading-snug cursor-text ${textMain}`}
                          onClick={() => { setEditingId(e._id); setEditText(e.title); }}
                          title="Click to edit"
                          style={{ textDecoration: e.done ? "line-through" : undefined }}
                        >
                          {e.title}
                        </p>
                      )}
                      {editingNoteId === e._id ? (
                        <textarea
                          autoFocus
                          value={noteText}
                          onChange={(ev) => setNoteText(ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); saveNote(e._id); }
                            if (ev.key === "Escape") setEditingNoteId(null);
                          }}
                          onBlur={() => saveNote(e._id)}
                          rows={2}
                          placeholder="Add a note…"
                          className={`w-full mt-1 px-2 py-1.5 rounded text-sm outline-none resize-none ${textMain}`}
                          style={{ background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.9)", border: `1px solid ${ACCENT}66` }}
                        />
                      ) : e.note && e.note !== e.title ? (
                        <p
                          className={`text-sm mt-1 leading-snug cursor-text ${text60}`}
                          onClick={() => { setEditingNoteId(e._id); setNoteText(e.note || ""); }}
                          title="Click to edit note"
                        >
                          {e.note}
                        </p>
                      ) : (
                        <button
                          className={`text-xs mt-1 ${text40} hover:underline`}
                          onClick={() => { setEditingNoteId(e._id); setNoteText(""); }}
                        >
                          + add note
                        </button>
                      )}
                      {e.link && (
                        <a
                          href={e.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(ev) => ev.stopPropagation()}
                          className="inline-flex items-center gap-1 text-sm mt-1.5 font-medium hover:underline"
                          style={{ color: ACCENT }}
                        >
                          <ExternalLink size={13} /> Open link
                        </a>
                      )}
                      {/* Multi-day span: set an end date to draw this as a bar across days */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[11px] ${text40}`}>{isMultiDay(e) ? "ends" : "spans to"}</span>
                        <input
                          type="date"
                          value={e.endDate ?? ""}
                          min={e.date}
                          onClick={(ev) => ev.stopPropagation()}
                          onChange={(ev) => updateEvent({ id: e._id, endDate: ev.target.value })}
                          className="text-[11px] px-1.5 py-0.5 rounded outline-none"
                          style={{ background: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.9)", border: rowBorder, color: mutedText }}
                        />
                        {isMultiDay(e) && (
                          <button
                            className={`text-[11px] ${text40} hover:underline`}
                            onClick={() => updateEvent({ id: e._id, endDate: "" })}
                            title="Make it a single-day event again"
                          >
                            clear
                          </button>
                        )}
                      </div>
                      <p className={`text-[11px] uppercase tracking-wide mt-1.5 ${text40}`}>
                        {e.source === "manual" ? "added" : "from vault"}
                        {st === "in_progress" && <span style={{ color: "#eab308" }}> · in progress</span>}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {editingId === e._id ? (
                        <button onMouseDown={(ev) => ev.preventDefault()} onClick={() => saveEdit(e._id)} style={{ color: "#34d399" }} title="Save">
                          <Check size={15} />
                        </button>
                      ) : null}
                      <button
                        style={{ color: mutedText }}
                        title={e.source === "vault" ? "Delete (returns on next vault sync)" : "Delete"}
                        onClick={() => setPendingDelete({ id: e._id, title: e.title })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
            <div className="shrink-0 flex gap-2 mt-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitNew(); }}
                placeholder="Add to this day…"
                className={`flex-1 min-w-0 px-4 py-3 rounded-xl text-base outline-none ${textMain}`}
                style={{ background: rowFill, border: rowBorder }}
              />
              <button onClick={submitNew} className="px-4 rounded-xl flex items-center justify-center" style={{ background: ACCENT, color: "#fff" }}>
                <Plus size={19} />
              </button>
            </div>
            <p className={`text-[11px] mt-2 ${text60}`}>
              Blue = from vault, green = added or moved. Editing or dragging a vault event keeps your change.
            </p>
          </div>
        </div>

        {/* Delete confirmation */}
        {pendingDelete && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", borderRadius: "inherit" }}
            onClick={() => setPendingDelete(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-5"
              style={{
                background: isDark ? "rgba(24,24,29,0.99)" : "#fff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className={`text-base font-bold mb-1 ${textMain}`}>Delete this event?</p>
              <p className={`text-sm mb-4 ${text60}`}>
                &ldquo;{pendingDelete.title}&rdquo; will be removed from the calendar. This can&apos;t be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3.5 py-2 rounded-xl text-sm font-medium"
                  style={{ border: rowBorder, color: mutedText }}
                  onClick={() => setPendingDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#dc2626" }}
                  onClick={() => { deleteEvent({ id: pendingDelete.id }); setPendingDelete(null); }}
                >
                  Yes, delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
