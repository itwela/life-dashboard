// components/CalendarView.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Check, Smile } from "lucide-react";

const ACCENT = "#38bdf8";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

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

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string>(fmt(now.getFullYear(), now.getMonth(), now.getDate()));
  const [newTitle, setNewTitle] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [editingId, setEditingId] = useState<Id<"calendarEvents"> | null>(null);
  const [editText, setEditText] = useState("");

  const textMain = isDark ? "text-white" : "text-black";
  const text40 = isDark ? "text-white/40" : "text-black/40";
  const text60 = isDark ? "text-white/60" : "text-black/60";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const rowBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)";
  const mutedText = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";

  const byDate = new Map<string, typeof events>();
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  const todayStr = fmt(now.getFullYear(), now.getMonth(), now.getDate());
  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const nav = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const openTodos = [...todos].filter((t) => !t.done).slice(0, 40);

  const selectedEvents = (byDate.get(selected) ?? []).slice().sort((a, b) => a.title.localeCompare(b.title));
  const selectedLabel = new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const submitNew = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    await addEvent({ date: selected, title });
  };

  // Apply a drop onto a day cell: move an event to that day, or turn a todo into an event.
  const dropOnDay = async (date: string) => {
    setDragOver(null);
    const payload = drag;
    setDrag(null);
    if (!payload) return;
    if (payload.kind === "event") {
      await updateEvent({ id: payload.id, date });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ background: isDark ? "rgba(8,8,10,0.85)" : "rgba(240,240,244,0.9)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[92vh] rounded-[30px] p-6 sm:p-9 flex flex-col overflow-hidden"
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
        <div className="shrink-0 flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.3), rgba(14,116,180,0.15))",
              border: "1px solid rgba(56,189,248,0.35)",
              boxShadow: "0 0 16px rgba(56,189,248,0.3)",
            }}
          >
            📅
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${textMain}`}>{monthName}</h2>
            <p className={`text-xs ${text40}`}>Drag todos onto a day · drag events to reschedule · click an event to edit</p>
          </div>
          {onCheckIn && (
            <button
              onClick={() => onCheckIn(selected)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ border: rowBorder, color: mutedText }}
              title="Mood check-in for the selected day"
            >
              <Smile size={15} /> Check-in
            </button>
          )}
          <button onClick={() => nav(-1)} className="p-2.5 rounded-xl" style={{ border: rowBorder, color: mutedText }}>
            <ChevronLeft size={17} />
          </button>
          <button onClick={() => nav(1)} className="p-2.5 rounded-xl" style={{ border: rowBorder, color: mutedText }}>
            <ChevronRight size={17} />
          </button>
          <button onClick={onClose} className="p-2.5 rounded-xl ml-1" style={{ border: rowBorder, color: mutedText }}>
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex gap-5 overflow-hidden">
          {/* Todo drag source */}
          <div className="w-52 shrink-0 hidden md:flex flex-col">
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${text40}`}>Todos — drag onto a day</p>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
              {openTodos.length === 0 ? (
                <p className={`text-xs ${text40}`}>No open todos.</p>
              ) : (
                openTodos.map((t) => (
                  <div
                    key={t._id}
                    draggable
                    onDragStart={() => setDrag({ kind: "todo", title: t.text })}
                    onDragEnd={() => { setDrag(null); setDragOver(null); }}
                    className="px-3 py-2 rounded-xl text-xs cursor-grab active:cursor-grabbing"
                    style={{ background: rowFill, border: rowBorder, color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)" }}
                    title={t.text}
                  >
                    <span className="line-clamp-2">{t.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Month grid */}
          <div className="flex-[2] min-w-0 flex flex-col">
            <div className="grid grid-cols-7 mb-1.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className={`text-center text-[11px] font-semibold py-1 ${text40}`}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0 auto-rows-fr">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const date = fmt(year, month, day);
                const dayEvents = byDate.get(date) ?? [];
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
                    className="rounded-xl p-1.5 text-left flex flex-col overflow-hidden transition-colors cursor-pointer"
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
                      className="text-[12px] font-bold mb-0.5"
                      style={{ color: isToday ? ACCENT : isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)" }}
                    >
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 min-h-0 overflow-hidden">
                      {dayEvents.slice(0, 4).map((e) => (
                        <span
                          key={e._id}
                          draggable
                          onDragStart={(ev) => { ev.stopPropagation(); setDrag({ kind: "event", id: e._id }); }}
                          onDragEnd={() => { setDrag(null); setDragOver(null); }}
                          className="text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-grab active:cursor-grabbing"
                          style={{
                            background: e.source === "manual" ? "rgba(52,211,153,0.18)" : "rgba(56,189,248,0.16)",
                            color: e.source === "manual" ? "#34d399" : ACCENT,
                          }}
                          title={e.title}
                        >
                          {e.title}
                        </span>
                      ))}
                      {dayEvents.length > 4 && (
                        <span className={`text-[9px] ${text40}`}>+{dayEvents.length - 4} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          <div className="w-64 shrink-0 flex flex-col">
            <p className={`text-sm font-bold mb-2 ${textMain}`}>{selectedLabel}</p>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
              {selectedEvents.length === 0 ? (
                <p className={`text-xs ${text40} py-3`}>Nothing scheduled. Drag a todo here or add one below.</p>
              ) : (
                selectedEvents.map((e) => (
                  <div
                    key={e._id}
                    className="group flex items-start gap-2 px-3 py-2 rounded-xl"
                    style={{ background: rowFill, border: rowBorder }}
                  >
                    <span
                      className="mt-1 w-2 h-2 rounded-full shrink-0"
                      style={{ background: e.source === "manual" ? "#34d399" : ACCENT }}
                    />
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
                          className={`w-full px-1.5 py-1 rounded text-xs outline-none ${textMain}`}
                          style={{ background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.9)", border: `1px solid ${ACCENT}66` }}
                        />
                      ) : (
                        <p
                          className={`text-xs font-medium cursor-text ${textMain}`}
                          onClick={() => { setEditingId(e._id); setEditText(e.title); }}
                          title="Click to edit"
                        >
                          {e.title}
                        </p>
                      )}
                      {e.note && <p className={`text-[10px] ${text40}`}>{e.note}</p>}
                      <p className={`text-[9px] uppercase tracking-wide ${text40}`}>
                        {e.source === "manual" ? "added" : "from vault"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {editingId === e._id ? (
                        <button onMouseDown={(ev) => ev.preventDefault()} onClick={() => saveEdit(e._id)} style={{ color: "#34d399" }} title="Save">
                          <Check size={13} />
                        </button>
                      ) : null}
                      <button
                        style={{ color: mutedText }}
                        title={e.source === "vault" ? "Delete (returns on next vault sync)" : "Delete"}
                        onClick={() => deleteEvent({ id: e._id })}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="shrink-0 flex gap-2 mt-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitNew(); }}
                placeholder="Add to this day…"
                className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-xs outline-none ${textMain}`}
                style={{ background: rowFill, border: rowBorder }}
              />
              <button onClick={submitNew} className="px-3 rounded-xl flex items-center justify-center" style={{ background: ACCENT, color: "#fff" }}>
                <Plus size={15} />
              </button>
            </div>
            <p className={`text-[10px] mt-2 ${text60}`}>
              Blue = from vault, green = added or moved. Editing or dragging a vault event keeps your change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
