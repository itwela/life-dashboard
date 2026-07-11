// components/CalendarView.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

const ACCENT = "#38bdf8";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarView({ onClose, isDark = true }: { onClose: () => void; isDark?: boolean }) {
  const events = useQuery(api.dashboard.getCalendarEvents, {}) ?? [];
  const addEvent = useMutation(api.dashboard.addCalendarEvent);
  const deleteEvent = useMutation(api.dashboard.deleteCalendarEvent);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string>(fmt(now.getFullYear(), now.getMonth(), now.getDate()));
  const [newTitle, setNewTitle] = useState("");

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: isDark ? "rgba(8,8,10,0.82)" : "rgba(240,240,244,0.88)", backdropFilter: "blur(14px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] rounded-[28px] p-6 sm:p-8 flex flex-col overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(155deg, rgba(56,189,248,0.13) 0%, rgba(22,22,27,0.99) 42%)"
            : "linear-gradient(155deg, rgba(56,189,248,0.10) 0%, #ffffff 42%)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          boxShadow: isDark
            ? "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.10)"
            : "0 30px 80px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.3), rgba(14,116,180,0.15))",
              border: "1px solid rgba(56,189,248,0.35)",
              boxShadow: "0 0 16px rgba(56,189,248,0.3)",
            }}
          >
            📅
          </div>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${textMain}`}>{monthName}</h2>
            <p className={`text-xs ${text40}`}>From the vault Hub + anything you add here</p>
          </div>
          <button onClick={() => nav(-1)} className="p-2 rounded-xl" style={{ border: rowBorder, color: mutedText }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => nav(1)} className="p-2 rounded-xl" style={{ border: rowBorder, color: mutedText }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={onClose} className="p-2 rounded-xl ml-1" style={{ border: rowBorder, color: mutedText }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex gap-6 overflow-hidden">
          {/* Month grid */}
          <div className="flex-[1.7] min-w-0 flex flex-col">
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className={`text-center text-[11px] font-semibold py-1 ${text40}`}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0 auto-rows-fr overflow-y-auto">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const date = fmt(year, month, day);
                const dayEvents = byDate.get(date) ?? [];
                const isToday = date === todayStr;
                const isSelected = date === selected;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(date)}
                    className="rounded-xl p-1.5 text-left flex flex-col min-h-[64px] overflow-hidden transition-colors"
                    style={{
                      background: isSelected ? `${ACCENT}22` : rowFill,
                      border: isToday ? `1.5px solid ${ACCENT}` : isSelected ? `1px solid ${ACCENT}66` : rowBorder,
                      boxShadow: isToday ? `0 0 10px ${ACCENT}44` : undefined,
                    }}
                  >
                    <span
                      className="text-[11px] font-bold mb-0.5"
                      style={{ color: isToday ? ACCENT : (isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)") }}
                    >
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 min-h-0 overflow-hidden">
                      {dayEvents.slice(0, 2).map((e) => (
                        <span
                          key={e._id}
                          className="text-[9.5px] leading-tight px-1 py-0.5 rounded truncate"
                          style={{
                            background: e.source === "manual" ? "rgba(52,211,153,0.18)" : "rgba(56,189,248,0.16)",
                            color: e.source === "manual" ? "#34d399" : ACCENT,
                          }}
                          title={e.title}
                        >
                          {e.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className={`text-[9px] ${text40}`}>+{dayEvents.length - 2} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          <div className="flex-1 min-w-[220px] flex flex-col">
            <p className={`text-sm font-bold mb-2 ${textMain}`}>{selectedLabel}</p>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
              {selectedEvents.length === 0 ? (
                <p className={`text-xs ${text40} py-3`}>Nothing scheduled.</p>
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
                      <p className={`text-xs font-medium ${textMain}`}>{e.title}</p>
                      {e.note && <p className={`text-[10px] ${text40}`}>{e.note}</p>}
                      <p className={`text-[9px] uppercase tracking-wide ${text40}`}>
                        {e.source === "manual" ? "added" : "from vault"}
                      </p>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                      style={{ color: mutedText }}
                      title={e.source === "vault" ? "Delete (returns on next vault sync)" : "Delete"}
                      onClick={() => deleteEvent({ id: e._id })}
                    >
                      <Trash2 size={13} />
                    </button>
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
              <button
                onClick={submitNew}
                className="px-3 rounded-xl flex items-center justify-center"
                style={{ background: ACCENT, color: "#fff" }}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
