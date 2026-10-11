"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import {
  parseQuickCapture,
  bucketFor,
  BUCKET_ORDER,
  sortTodos,
  dueLabel,
  todoSummary,
  PRIORITY_META,
  type TodoBucket,
  type Priority,
} from "../../../../convex/memberLogic";
import { Plus, X, CalendarDays, Flag, Trash2 } from "lucide-react";

interface Props {
  dayKey: string;                              // TODAY as "YYYY-MM-DD"
  isDark: boolean;
  todos: Doc<"todos">[];                       // every todo, done and open
  addTodoDetailed: (args: { text: string; category: string; dueDate?: string; priority?: "low" | "medium" | "high"; notes?: string }) => Promise<unknown>;
  setTodoDone: (args: { id: Id<"todos">; done: boolean }) => Promise<unknown>;
  setTodoMeta: (args: { id: Id<"todos">; dueDate?: string | null; priority?: "low" | "medium" | "high"; notes?: string | null }) => Promise<unknown>;
  deleteTodo: (args: { id: Id<"todos"> }) => Promise<unknown>;
  onClose: () => void;
}

const ACCENT = "#818cf8";
const CAT_ORDER = ["Today", "Morning", "Work", "Creative", "Care", "Mechanics", "Content"];

const BUCKET_LABEL: Record<TodoBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This Week",
  later: "Later",
  someday: "Someday",
};

const BUCKET_COLOR: Record<TodoBucket, string> = {
  overdue: PRIORITY_META.high.color,
  today: ACCENT,
  tomorrow: "#22d3ee",
  this_week: "#94a3b8",
  later: "#94a3b8",
  someday: "#94a3b8",
};

const PRIORITY_CYCLE: Record<Priority, Priority> = {
  low: "medium",
  medium: "high",
  high: "low",
};

const FALLBACK_CATEGORY = "Today";

export default function TodosMemberPanel({ dayKey, isDark, todos, addTodoDetailed, setTodoDone, setTodoMeta, deleteTodo, onClose }: Props) {
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("Today");
  const [openBuckets, setOpenBuckets] = useState<Record<TodoBucket, boolean>>({
    overdue: true,
    today: true,
    tomorrow: false,
    this_week: false,
    later: false,
    someday: false,
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"todos"> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Click anywhere outside the armed row (or Escape) cancels a pending delete.
  useEffect(() => {
    if (!pendingDeleteId) return;
    const onPointerDown = (e: MouseEvent) => {
      const node = rowRefs.current[pendingDeleteId];
      if (node && e.target instanceof Node && node.contains(e.target)) return;
      setPendingDeleteId(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingDeleteId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pendingDeleteId]);

  const preview = useMemo(() => parseQuickCapture(input, dayKey), [input, dayKey]);
  const canSubmit = preview.text.trim().length > 0;

  const categoryOptions = useMemo(() => {
    const extras = [...new Set(todos.map((t) => t.category))].filter(
      (c) => c && !CAT_ORDER.includes(c),
    );
    return [...CAT_ORDER, ...extras];
  }, [todos]);

  // Prefer a category that actually occurs in the data before falling back.
  const resolvedCategory = useMemo(() => {
    if (categoryOptions.includes(category)) return category;
    const firstUsed = todos.find((t) => t.category)?.category;
    if (firstUsed) return firstUsed;
    return FALLBACK_CATEGORY;
  }, [category, categoryOptions, todos]);

  const summary = useMemo(() => todoSummary(todos, dayKey), [todos, dayKey]);

  const grouped = useMemo(() => {
    const open = sortTodos(
      todos.filter((t) => !t.done),
      dayKey,
    );
    const buckets = new Map<TodoBucket, Doc<"todos">[]>();
    for (const t of open) {
      const b = bucketFor(t, dayKey);
      const list = buckets.get(b);
      if (list) list.push(t);
      else buckets.set(b, [t]);
    }
    return BUCKET_ORDER.map((b) => ({
      bucket: b,
      label: BUCKET_LABEL[b],
      color: BUCKET_COLOR[b],
      items: buckets.get(b) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [todos, dayKey]);

  // ── Styling tokens ──────────────────────────────────────────────────────────
  const textMain = isDark ? "text-white" : "text-black";
  const text40 = isDark ? "text-white/40" : "text-black/40";
  const text30 = isDark ? "text-white/30" : "text-black/30";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const rowBorder = `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`;
  const mutedText = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const insetFill = isDark ? "rgba(0,0,0,0.25)" : "#ffffff";

  function submit() {
    if (!canSubmit) return;
    void addTodoDetailed({
      text: preview.text,
      category: resolvedCategory,
      dueDate: preview.dueDate,
      priority: preview.priority,
    });
    setInput("");
    setPendingDeleteId(null);
    inputRef.current?.focus();
  }

  function cyclePriority(t: Doc<"todos">) {
    const current: Priority = t.priority ?? "medium";
    void setTodoMeta({ id: t._id, priority: PRIORITY_CYCLE[current] });
  }

  function confirmDelete(id: Id<"todos">) {
    void deleteTodo({ id });
    setPendingDeleteId(null);
  }

  const focus = summary.focus.slice(0, 4);

  return (
    <div
      className="h-full flex flex-col overflow-hidden rounded-[28px]"
      style={{
        background: isDark
          ? "linear-gradient(155deg, rgba(129,140,248,0.14) 0%, rgba(22,22,27,0.99) 42%)"
          : "linear-gradient(155deg, rgba(129,140,248,0.10) 0%, #ffffff 42%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(129,140,248,0.10), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 30px 80px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-start gap-3 p-5 sm:p-6 pb-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(129,140,248,0.3), rgba(79,70,229,0.15))",
            border: "1px solid rgba(129,140,248,0.35)",
            boxShadow: "0 0 16px rgba(129,140,248,0.3)",
            color: ACCENT,
          }}
        >
          ✓
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-lg font-bold ${textMain}`}>To-Do</h2>
          <p className={`text-xs ${text40}`}>
            {summary.open} open · {summary.overdue} overdue · {summary.dueToday} due today
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Stat label="open" value={summary.open} color={ACCENT} text40={text40} rowFill={rowFill} rowBorder={rowBorder} textMain={textMain} />
          <Stat label="overdue" value={summary.overdue} color={PRIORITY_META.high.color} text40={text40} rowFill={rowFill} rowBorder={rowBorder} textMain={textMain} />
          <Stat label="today" value={summary.dueToday} color="#22d3ee" text40={text40} rowFill={rowFill} rowBorder={rowBorder} textMain={textMain} />
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="shrink-0 p-2 rounded-xl transition-colors"
          style={{ color: mutedText, border: rowBorder, background: rowFill }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Focus strip ────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 sm:px-6 pb-4">
        <div className="rounded-2xl p-3" style={{ background: rowFill, border: rowBorder }}>
          <p className={`text-[10px] uppercase tracking-wider mb-2 ${text40}`}>Do this next</p>
          {focus.length === 0 ? (
            <p className={`text-xs ${text30}`}>Nothing overdue or due today — you're clear.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {focus.map((t, i) => {
                const overdue = bucketFor(t, dayKey) === "overdue";
                const color = overdue
                  ? PRIORITY_META.high.color
                  : PRIORITY_META[t.priority ?? "medium"].color;
                return (
                  <span
                    key={`${t.text}-${i}`}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full max-w-full`}
                    style={{
                      background: `${color}1f`,
                      border: `1px solid ${color}55`,
                      color: isDark ? undefined : "#1f2937",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="truncate max-w-[16rem]">{t.text}</span>
                    <span className="shrink-0 opacity-70">{dueLabel(t.dueDate, dayKey)}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick capture ──────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 sm:px-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Plus
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: mutedText }}
            />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") {
                  setInput("");
                  setPendingDeleteId(null);
                }
              }}
              placeholder="Add a to-do — &quot;pay rent friday !high&quot;"
              className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none ${textMain}`}
              style={{ background: rowFill, border: rowBorder }}
            />
          </div>
          <select
            value={resolvedCategory}
            onChange={(e) => setCategory(e.target.value)}
            title="Category"
            className="shrink-0 text-xs px-2 py-2.5 rounded-xl outline-none max-w-[7.5rem]"
            style={{ background: insetFill, border: rowBorder, color: mutedText }}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="shrink-0 text-sm font-semibold px-3.5 py-2.5 rounded-xl text-white transition-opacity"
            style={{
              background: ACCENT,
              opacity: canSubmit ? 1 : 0.35,
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? `0 0 14px ${ACCENT}55` : "none",
            }}
          >
            Add
          </button>
        </div>

        {/* Live parse preview */}
        {input.trim().length > 0 && (
          <div className={`flex items-center gap-2 flex-wrap mt-2 text-xs ${text40}`}>
            <span>will save:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${textMain}`}
              style={{ background: rowFill, border: rowBorder }}
            >
              {canSubmit ? preview.text : "…"}
            </span>
            {preview.dueDate && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(34,211,238,0.14)",
                  border: "1px solid rgba(34,211,238,0.4)",
                  color: "#22d3ee",
                }}
              >
                <CalendarDays size={11} />
                {dueLabel(preview.dueDate, dayKey)}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${PRIORITY_META[preview.priority].color}22`,
                border: `1px solid ${PRIORITY_META[preview.priority].color}66`,
                color: PRIORITY_META[preview.priority].color,
              }}
            >
              <Flag size={11} />
              {PRIORITY_META[preview.priority].label}
            </span>
            <span className="opacity-60">in {resolvedCategory}</span>
          </div>
        )}
      </div>

      {/* ── Bucketed list ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 pb-6 space-y-4">
        {grouped.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className={`text-sm ${text30}`}>
              {todos.length === 0 ? "No to-dos yet — add one above." : "All caught up."}
            </p>
          </div>
        ) : (
          grouped.map(({ bucket, label, color, items }) => {
            const open = openBuckets[bucket];
            return (
              <div key={bucket}>
                <button
                  type="button"
                  onClick={() => setOpenBuckets((prev) => ({ ...prev, [bucket]: !prev[bucket] }))}
                  className="w-full flex items-center gap-2 mb-2 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span
                    className={`text-xs uppercase tracking-wider font-semibold ${open ? textMain : text40}`}
                  >
                    {label}
                  </span>
                  <span className={`text-[11px] ${text30}`}>{items.length}</span>
                  <span
                    className={`ml-auto text-[11px] transition-transform ${text30}`}
                    style={{ transform: open ? "rotate(90deg)" : "none" }}
                  >
                    ›
                  </span>
                </button>

                {open && (
                  <div className="space-y-1.5">
                    {items.map((t) => {
                      const priority: Priority = t.priority ?? "medium";
                      const meta = PRIORITY_META[priority];
                      const isHigh = priority === "high";
                      const armed = pendingDeleteId === t._id;
                      const label = dueLabel(t.dueDate, dayKey);
                      return (
                        <div
                          key={t._id}
                          ref={(node) => {
                            rowRefs.current[t._id] = node;
                          }}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[14px] transition-colors"
                          style={{
                            background: armed
                              ? "rgba(220,38,38,0.10)"
                              : isDark
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(0,0,0,0.03)",
                            border: armed ? "1px solid rgba(220,38,38,0.5)" : rowBorder,
                            borderLeft: isHigh
                              ? `3px solid ${PRIORITY_META.high.color}`
                              : undefined,
                          }}
                        >
                          <button
                            type="button"
                            title={t.done ? "Mark as not done" : "Mark as done"}
                            onClick={() => void setTodoDone({ id: t._id, done: !t.done })}
                            className="w-[18px] h-[18px] rounded-md shrink-0 flex items-center justify-center text-[11px] text-white"
                            style={{
                              border: t.done
                                ? `1px solid ${ACCENT}`
                                : `1.5px solid ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"}`,
                              background: t.done ? ACCENT : "transparent",
                            }}
                          >
                            {t.done ? "✓" : ""}
                          </button>

                          <span
                            className={`text-sm leading-snug min-w-0 flex-1 break-words ${
                              t.done
                                ? `${text30} line-through`
                                : isDark
                                  ? "text-white/85"
                                  : "text-black/85"
                            }`}
                          >
                            {t.text}
                          </span>

                          {t.notes && (
                            <span className={`text-[11px] truncate max-w-[8rem] ${text30}`} title={t.notes}>
                              {t.notes}
                            </span>
                          )}

                          {label && (
                            <span
                              className="shrink-0 text-[11px] px-1.5 py-0.5 rounded-md"
                              style={{
                                background: rowFill,
                                color: bucket === "overdue" ? PRIORITY_META.high.color : mutedText,
                              }}
                            >
                              {label}
                            </span>
                          )}

                          <button
                            type="button"
                            title="Cycle priority"
                            onClick={() => cyclePriority(t)}
                            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg"
                            style={{
                              background: `${meta.color}1f`,
                              border: `1px solid ${meta.color}55`,
                              color: meta.color,
                            }}
                          >
                            <Flag size={11} />
                            {meta.label}
                          </button>

                          <input
                            type="date"
                            value={t.dueDate ?? ""}
                            title="Set due date"
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) void setTodoMeta({ id: t._id, dueDate: v });
                            }}
                            className="shrink-0 text-[11px] rounded-lg px-1.5 py-1 outline-none w-[7.5rem]"
                            style={{ background: insetFill, border: rowBorder, color: mutedText }}
                          />

                          {t.dueDate && (
                            <button
                              type="button"
                              title="Clear due date"
                              onClick={() => void setTodoMeta({ id: t._id, dueDate: null })}
                              className="shrink-0 p-1 rounded-md"
                              style={{ color: mutedText }}
                            >
                              <X size={12} />
                            </button>
                          )}

                          {armed ? (
                            <span className="shrink-0 flex items-center gap-1">
                              <span className="text-[11px] font-semibold" style={{ color: "#f87171" }}>
                                Delete?
                              </span>
                              <button
                                type="button"
                                onClick={() => confirmDelete(t._id)}
                                className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-white"
                                style={{ background: "#dc2626" }}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(null)}
                                className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                                style={{ color: mutedText, border: rowBorder }}
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              title="Delete to-do"
                              onClick={() => setPendingDeleteId(t._id)}
                              className="shrink-0 p-1 rounded-md"
                              style={{ color: mutedText }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  text40,
  rowFill,
  rowBorder,
  textMain,
}: {
  label: string;
  value: number;
  color: string;
  text40: string;
  rowFill: string;
  rowBorder: string;
  textMain: string;
}) {
  return (
    <div
      className="px-2.5 py-1.5 rounded-xl text-center min-w-[3.5rem]"
      style={{ background: rowFill, border: rowBorder }}
    >
      <p className={`text-lg font-black leading-none ${textMain}`} style={{ color }}>
        {value}
      </p>
      <p className={`text-[10px] uppercase tracking-wider mt-0.5 ${text40}`}>{label}</p>
    </div>
  );
}
