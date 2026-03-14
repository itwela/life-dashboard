"use client";

import { useState } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect } from "./AddModal";

const ACCENT = "#c084fc";

interface Props {
  books: Doc<"books">[];
  upsertBook: (args: { id?: Id<"books">; title: string; author: string; status: "want_to_read" | "reading" | "completed"; notes?: string }) => Promise<void>;
}

export default function ReadingSection({ books, upsertBook }: Props) {
  const [open, setOpen]         = useState(false);
  const [editing, setEditing]   = useState<Doc<"books"> | null>(null);
  const [title, setTitle]       = useState("");
  const [author, setAuthor]     = useState("");
  const [status, setStatus]     = useState<"want_to_read" | "reading" | "completed">("want_to_read");
  const [notes, setNotes]       = useState("");

  const reading   = books.filter((b) => b.status === "reading");
  const completed = books.filter((b) => b.status === "completed");
  const queue     = books.filter((b) => b.status === "want_to_read");

  function openAdd() { setEditing(null); setTitle(""); setAuthor(""); setStatus("want_to_read"); setNotes(""); setOpen(true); }
  function openEdit(b: Doc<"books">) { setEditing(b); setTitle(b.title); setAuthor(b.author); setStatus(b.status); setNotes(b.notes ?? ""); setOpen(true); }

  async function handleSubmit() {
    if (!title.trim()) return;
    await upsertBook({ id: editing?._id, title: title.trim(), author: author.trim(), status, notes: notes || undefined });
    setOpen(false);
  }

  return (
    <div
      className="h-full rounded-2xl p-5 flex flex-col overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, rgba(192,132,252,0.08) 0%, rgba(126,34,206,0.05) 100%)",
        border: "1px solid rgba(192,132,252,0.2)",
        boxShadow: "0 0 40px rgba(192,132,252,0.07), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(192,132,252,0.12) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(192,132,252,0.3), rgba(126,34,206,0.15))", border: "1px solid rgba(192,132,252,0.35)", boxShadow: "0 0 16px rgba(192,132,252,0.3)" }}>📚</div>
          <div>
            <h2 className="text-sm font-bold text-white">Reading</h2>
            <p className="text-xs text-white/40">
              <span style={{ color: ACCENT }}>{completed.length}</span> completed · {queue.length} in queue
            </p>
          </div>
        </div>
        <button onClick={openAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, rgba(192,132,252,0.35), rgba(126,34,206,0.2))", border: "1px solid rgba(192,132,252,0.4)", boxShadow: "0 0 12px rgba(192,132,252,0.25)" }}>
          + Add Book
        </button>
      </div>

      {/* 2-col layout */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">

        {/* Left: stats + currently reading */}
        <div className="flex flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[
              { label: "Reading",   value: reading.length,   color: ACCENT },
              { label: "Completed", value: completed.length, color: "#4ade80" },
              { label: "Queue",     value: queue.length,     color: "#94a3b8" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-white/35 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Currently reading */}
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <p className="text-xs text-white/40 uppercase tracking-wider shrink-0">Currently Reading</p>
            {reading.length === 0 ? (
              <div className="rounded-xl p-4 text-center text-sm text-white/25 flex-1 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                Pick up a book. A wealthy mind reads.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {reading.map((b) => (
                  <div key={b._id} className="rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:scale-[1.01] transition-transform"
                    style={{ background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.25)", boxShadow: "0 0 16px rgba(192,132,252,0.1)" }}
                    onClick={() => openEdit(b)}>
                    <span className="text-xl">📖</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{b.title}</p>
                      <p className="text-xs text-white/40">{b.author}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: ACCENT }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: queue + completed */}
        <div className="flex flex-col min-h-0 gap-4">
          {queue.length > 0 && (
            <div className="flex flex-col min-h-0" style={{ flex: queue.length }}>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">Up Next</p>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {queue.map((b) => (
                  <div key={b._id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors" onClick={() => openEdit(b)}>
                    <span className="text-sm text-white/30">○</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 truncate">{b.title}</p>
                      <p className="text-xs text-white/30">{b.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div className="flex flex-col min-h-0" style={{ flex: completed.length }}>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">Completed ({completed.length})</p>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {completed.map((b) => (
                  <div key={b._id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors" onClick={() => openEdit(b)}>
                    <span className="text-sm text-green-400">✓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/60 truncate line-through decoration-white/20">{b.title}</p>
                      <p className="text-xs text-white/25">{b.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {queue.length === 0 && completed.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-white/25 text-center">Add books to your list.</p>
            </div>
          )}
        </div>
      </div>

      <AddModal title={editing ? "Edit Book" : "Add Book"} open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} accentColor={ACCENT}>
        <FormField label="Title"><FormInput value={title} onChange={setTitle} placeholder="e.g. The Richest Man in Babylon" /></FormField>
        <FormField label="Author"><FormInput value={author} onChange={setAuthor} placeholder="e.g. George S. Clason" /></FormField>
        <FormField label="Status"><FormSelect value={status} onChange={(v) => setStatus(v as typeof status)} options={[{ value: "want_to_read", label: "Want to Read" }, { value: "reading", label: "Currently Reading" }, { value: "completed", label: "Completed" }]} /></FormField>
        <FormField label="Notes (optional)"><FormInput value={notes} onChange={setNotes} placeholder="Key takeaways..." /></FormField>
      </AddModal>
    </div>
  );
}
