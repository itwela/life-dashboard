"use client";

import { useState, useEffect, useRef } from "react";
import { Search, GripVertical, Trash2 } from "lucide-react";
import { Doc, Id } from "../../../convex/_generated/dataModel";

const ACCENT = "#818cf8";
const CAT_ORDER = ["Today", "Morning", "Work", "Creative", "Care", "Mechanics", "Content"];
const catRank = (c: string) => {
  const i = CAT_ORDER.indexOf(c);
  return i < 0 ? 99 : i;
};

interface Props {
  todos: Doc<"todos">[];
  toggleTodo: (args: { id: Id<"todos">; done: boolean }) => Promise<unknown>;
  updateTodo: (args: { id: Id<"todos">; text?: string; category?: string; done?: boolean }) => Promise<unknown>;
  deleteTodo: (args: { id: Id<"todos"> }) => Promise<unknown>;
  reorderTodos: (args: { ids: Id<"todos">[] }) => Promise<unknown>;
  isDark?: boolean;
}

export default function TodosSection({ todos, toggleTodo, updateTodo, deleteTodo, reorderTodos, isDark = true }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [status, setStatus] = useState<"open" | "all" | "done">("open");

  // Local optimistic ordering (ids), synced from server order
  const [orderIds, setOrderIds] = useState<Id<"todos">[]>([]);
  const [dragId, setDragId] = useState<Id<"todos"> | null>(null);
  const [overId, setOverId] = useState<Id<"todos"> | null>(null);
  const draggedRef = useRef(false);
  const [editingId, setEditingId] = useState<Id<"todos"> | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"todos"> | null>(null);
  // Blur fires after Enter and after Escape. This skips a second save or a cancelled one.
  const editClosedRef = useRef(false);

  useEffect(() => {
    const ids = [...todos]
      .sort((a, b) => catRank(a.category) - catRank(b.category) || a.order - b.order)
      .map((t) => t._id);
    setOrderIds(ids);
  }, [todos]);

  const textMain = isDark ? "text-white" : "text-black";
  const text40 = isDark ? "text-white/40" : "text-black/40";
  const text30 = isDark ? "text-white/30" : "text-black/30";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const rowBorder = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)";
  const mutedText = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";

  const byId = new Map(todos.map((t) => [t._id, t]));
  const total = todos.length;
  const done = todos.filter((t) => t.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const allCats = [
    ...CAT_ORDER.filter((c) => todos.some((t) => t.category === c)),
    ...[...new Set(todos.map((t) => t.category))].filter((c) => !CAT_ORDER.includes(c)),
  ];
  const categoryOptions = [
    ...CAT_ORDER,
    ...allCats.filter((c) => !CAT_ORDER.includes(c)),
  ];

  const query = q.trim().toLowerCase();
  const canDrag = !query; // reordering a search-filtered subset isn't meaningful
  const matchesFilter = (t: Doc<"todos">) =>
    (status === "all" || (status === "open" ? !t.done : t.done)) &&
    (!cat || t.category === cat) &&
    (!query || t.text.toLowerCase().includes(query));

  // Ordered, visible docs grouped by category (preserving orderIds sequence)
  const orderedDocs = orderIds.map((id) => byId.get(id)).filter(Boolean) as Doc<"todos">[];
  const visible = orderedDocs.filter(matchesFilter);
  const groups = new Map<string, Doc<"todos">[]>();
  for (const t of visible) {
    if (!groups.has(t.category)) groups.set(t.category, []);
    groups.get(t.category)!.push(t);
  }
  const shownCats = [
    ...CAT_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !CAT_ORDER.includes(c)),
  ];

  function startEdit(t: Doc<"todos">) {
    editClosedRef.current = false;
    setEditingId(t._id);
    setEditText(t.text);
  }

  function commitEdit(id: Id<"todos">) {
    if (editClosedRef.current) return;
    editClosedRef.current = true;
    const text = editText.trim();
    setEditingId(null);
    const current = byId.get(id);
    if (!text || !current || current.text === text) return;
    void updateTodo({ id, text });
  }

  function cancelEdit() {
    editClosedRef.current = true;
    setEditingId(null);
  }

  function handleDrop(targetId: Id<"todos">) {
    const drag = dragId ? byId.get(dragId) : null;
    const target = byId.get(targetId);
    setOverId(null);
    const from = dragId;
    setDragId(null);
    if (!from || !drag || !target || from === targetId || drag.category !== target.category) return;
    setOrderIds((prev) => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(from);
      if (fromIdx < 0) return prev;
      arr.splice(fromIdx, 1);
      const toIdx = arr.indexOf(targetId);
      if (toIdx < 0) return prev;
      arr.splice(toIdx, 0, from); // insert before target
      reorderTodos({ ids: arr });
      return arr;
    });
  }

  return (
    <div
      className="h-full rounded-[28px] p-6 sm:p-8 flex flex-col overflow-hidden relative"
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
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, rgba(129,140,248,0.3), rgba(79,70,229,0.15))", border: "1px solid rgba(129,140,248,0.35)", boxShadow: "0 0 16px rgba(129,140,248,0.3)" }}>✓</div>
        <div className="flex-1">
          <h2 className={`text-lg font-bold ${textMain}`}>To-Do</h2>
          <p className={`text-xs ${text40}`}>{canDrag ? "Drag the handle to reorder · click text to edit" : "Clear search to reorder"} · {total - done} open</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: ACCENT }}>{pct}%</p>
          <p className={`text-[11px] ${text30}`}>{done}/{total} done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 mb-4 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: ACCENT, boxShadow: `0 0 12px ${ACCENT}` }} />
      </div>

      {/* Search + status filter */}
      <div className="shrink-0 flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: mutedText }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search todos…"
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none ${textMain}`}
            style={{ background: rowFill, border: rowBorder }}
          />
        </div>
        <div className="flex rounded-xl overflow-hidden shrink-0" style={{ border: rowBorder }}>
          {(["open", "all", "done"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="px-3 py-2 text-xs font-semibold capitalize transition-colors"
              style={{ background: status === s ? ACCENT : rowFill, color: status === s ? "#fff" : mutedText }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div className="shrink-0 flex gap-2 flex-wrap mb-4">
        {[null, ...allCats].map((c) => {
          const active = cat === c;
          const count = c === null ? total : todos.filter((t) => t.category === c).length;
          return (
            <button
              key={c ?? "all"}
              onClick={() => setCat(c)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
              style={{
                background: active ? "rgba(129,140,248,0.18)" : rowFill,
                color: active ? ACCENT : mutedText,
                border: active ? "1px solid rgba(129,140,248,0.4)" : rowBorder,
              }}
            >
              {c ?? "All"} <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grouped, reorderable list */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm ${text30}`}>{total === 0 ? "No todos yet." : "No todos match your filters."}</p>
          </div>
        ) : (
          shownCats.map((c) => {
            const items = groups.get(c)!;
            const openCount = items.filter((t) => !t.done).length;
            return (
              <div key={c}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs ${text40} uppercase tracking-wider`}>{c}</p>
                  <p className={`text-[11px] ${text30}`}>{openCount} open</p>
                </div>
                <div className="space-y-1.5">
                  {items.map((t) => {
                    const isDragging = dragId === t._id;
                    const isOver = overId === t._id && dragId !== null && dragId !== t._id && byId.get(dragId)?.category === t.category;
                    const isEditing = editingId === t._id;
                    return (
                      <div
                        key={t._id}
                        onDragOver={(e) => { if (canDrag) { e.preventDefault(); setOverId(t._id); } }}
                        onDragLeave={() => setOverId((o) => (o === t._id ? null : o))}
                        onDrop={(e) => { e.preventDefault(); handleDrop(t._id); }}
                        onClick={() => { if (draggedRef.current || isEditing) return; toggleTodo({ id: t._id, done: !t.done }); }}
                        className="flex items-start gap-2 px-2.5 py-2.5 rounded-xl transition-all cursor-pointer"
                        style={{
                          background: rowFill,
                          border: isOver ? `1px solid ${ACCENT}` : rowBorder,
                          boxShadow: isOver ? `0 -2px 0 ${ACCENT} inset` : "none",
                          opacity: isDragging ? 0.4 : 1,
                        }}
                      >
                        {canDrag && (
                          <span
                            className="mt-0.5 shrink-0"
                            draggable
                            onDragStart={(e) => { setDragId(t._id); draggedRef.current = true; e.dataTransfer.effectAllowed = "move"; e.stopPropagation(); }}
                            onDragEnd={() => { setDragId(null); setOverId(null); setTimeout(() => { draggedRef.current = false; }, 0); }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: "grab", color: mutedText, touchAction: "none" }}
                            title="Drag to reorder"
                          >
                            <GripVertical size={15} />
                          </span>
                        )}
                        <span
                          className="mt-0.5 w-4 h-4 rounded-md shrink-0 flex items-center justify-center text-[10px]"
                          style={{
                            border: t.done ? `1px solid ${ACCENT}` : `1.5px solid ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"}`,
                            background: t.done ? ACCENT : "transparent",
                            color: "#fff",
                          }}
                        >
                          {t.done ? "✓" : ""}
                        </span>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); commitEdit(t._id); }
                              if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                            }}
                            onBlur={() => commitEdit(t._id)}
                            className={`text-sm leading-snug min-w-0 flex-1 rounded-md px-1.5 py-0.5 outline-none ${textMain}`}
                            style={{ background: isDark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.9)", border: `1px solid ${ACCENT}66` }}
                          />
                        ) : (
                          <span
                            className={`text-sm leading-snug min-w-0 flex-1 break-words cursor-text ${t.done ? `${text30} line-through` : isDark ? "text-white/80" : "text-black/80"}`}
                            title="Click to edit"
                            onClick={(e) => { e.stopPropagation(); startEdit(t); }}
                          >
                            {t.text}
                          </span>
                        )}
                        {pendingDeleteId !== t._id && (
                        <select
                          value={t.category}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const category = e.target.value;
                            if (category && category !== t.category) void updateTodo({ id: t._id, category });
                          }}
                          className="shrink-0 text-[11px] px-1.5 py-1 rounded-lg outline-none max-w-[6.5rem]"
                          style={{ background: isDark ? "rgba(0,0,0,0.25)" : "#fff", color: mutedText, border: rowBorder }}
                          title="Change category"
                        >
                          {(categoryOptions.includes(t.category) ? categoryOptions : [t.category, ...categoryOptions]).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        )}
                        {pendingDeleteId === t._id ? (
                          <span
                            className="shrink-0 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <span className="text-[11px]" style={{ color: "#f87171" }}>Delete?</span>
                            <button
                              type="button"
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-white"
                              style={{ background: "#dc2626" }}
                              onClick={() => { void deleteTodo({ id: t._id }); setPendingDeleteId(null); }}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ color: mutedText, border: rowBorder }}
                              onClick={() => setPendingDeleteId(null)}
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="shrink-0 p-1 rounded-md"
                            style={{ color: mutedText }}
                            title="Delete todo"
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(t._id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
