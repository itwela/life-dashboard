"use client";

import { useState } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect } from "./AddModal";

const ACCENT = "#fbbf24";

interface Props {
  projects: Doc<"projects">[];
  upsertProject: (args: { id?: Id<"projects">; name: string; description?: string; status: "active" | "paused" | "shipped"; revenue?: number; notes?: string }) => Promise<unknown>;
  isDark?: boolean;
}

const statusMeta = {
  active: { label: "Active",  color: "#4ade80", bg: "rgba(74,222,128,0.15)",  icon: "🟢" },
  paused: { label: "Paused",  color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  icon: "⏸️" },
  shipped:{ label: "Shipped", color: "#60a5fa", bg: "rgba(96,165,250,0.15)",  icon: "🚀" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function ProjectsSection({ projects, upsertProject, isDark = true }: Props) {
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<Doc<"projects"> | null>(null);
  const [name, setName]           = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus]       = useState<"active" | "paused" | "shipped">("active");
  const [revenue, setRevenue]     = useState("0");
  const [notes, setNotes]         = useState("");

  const textMain  = isDark ? "text-white"    : "text-black";
  const text40    = isDark ? "text-white/40" : "text-black/40";
  const text35    = isDark ? "text-white/35" : "text-black/35";
  const text30    = isDark ? "text-white/30" : "text-black/30";
  const text25    = isDark ? "text-white/25" : "text-black/25";
  const softFill  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const softBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)";
  const cardFill  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)";

  const rel = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 86400000);
    if (d <= 0) return "today";
    if (d === 1) return "yesterday";
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    if (d < 365) return `${Math.floor(d / 30)}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
  };

  const totalRevenue = projects.reduce((s, p) => s + p.revenue, 0);
  const active       = projects.filter((p) => p.status === "active");
  const paused       = projects.filter((p) => p.status === "paused");
  const shipped      = projects.filter((p) => p.status === "shipped");

  function openAdd() { setEditing(null); setName(""); setDescription(""); setStatus("active"); setRevenue("0"); setNotes(""); setOpen(true); }
  function openEdit(p: Doc<"projects">) { setEditing(p); setName(p.name); setDescription(p.description ?? ""); setStatus(p.status); setRevenue(String(p.revenue)); setNotes(p.notes ?? ""); setOpen(true); }

  async function handleSubmit() {
    if (!name.trim()) return;
    await upsertProject({ id: editing?._id, name: name.trim(), description: description || undefined, status, revenue: Number(revenue) || 0, notes: notes || undefined });
    setOpen(false);
  }

  return (
    <div
      className="md:h-full rounded-[28px] p-4 sm:p-8 flex flex-col md:overflow-hidden relative"
      style={{
        background: isDark
          ? "linear-gradient(155deg, rgba(251,191,36,0.14) 0%, rgba(22,22,27,0.99) 42%)"
          : "linear-gradient(155deg, rgba(251,191,36,0.10) 0%, #ffffff 42%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(251,191,36,0.10), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 30px 80px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.3), rgba(180,83,9,0.15))", border: "1px solid rgba(251,191,36,0.35)", boxShadow: "0 0 16px rgba(251,191,36,0.3)" }}>⚡</div>
          <div>
            <h2 className={`text-sm font-bold ${textMain}`}>Projects / Business</h2>
            <p className={`text-xs ${text40}`}>Build things that generate value.</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.35), rgba(180,83,9,0.2))", border: "1px solid rgba(251,191,36,0.4)", boxShadow: "0 0 12px rgba(251,191,36,0.25)" }}>
          + New Project
        </button>
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:flex-1 md:min-h-0">

        {/* Left: revenue stats + status breakdown */}
        <div className="flex flex-col gap-4">
          {/* Revenue */}
          <div className="rounded-xl p-5 shrink-0" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.04))", border: "1px solid rgba(251,191,36,0.2)", boxShadow: "0 0 20px rgba(251,191,36,0.1)" }}>
            <p className={`text-xs ${text40} uppercase tracking-widest mb-1`}>Total Revenue</p>
            <p className="text-4xl font-black" style={{ color: ACCENT, textShadow: "0 0 30px rgba(251,191,36,0.5)" }}>{fmt(totalRevenue)}</p>
          </div>

          {/* Status counts */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[
              { label: "Active",  value: active.length,  color: "#4ade80" },
              { label: "Paused",  value: paused.length,  color: ACCENT },
              { label: "Shipped", value: shipped.length, color: "#60a5fa" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: softFill, border: softBorder }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className={`text-xs ${text35} mt-0.5`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: project list */}
        <div className="flex flex-col min-h-0">
          <p className={`text-xs ${text40} uppercase tracking-wider mb-2 shrink-0`}>All Projects</p>
          {projects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className={`text-sm ${text25} text-center`}>No projects yet. Every empire started as an idea.</p>
            </div>
          ) : (
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto space-y-2 pr-1">
              {[...active, ...paused, ...shipped].map((p) => {
                const sm = statusMeta[p.status];
                return (
                  <div key={p._id} onClick={() => openEdit(p)}
                    className="rounded-2xl cursor-pointer hover:scale-[1.01] transition-transform overflow-hidden flex"
                    style={{ background: cardFill, border: cardBorder }}>
                    {/* status accent bar */}
                    <div style={{ width: 4, background: sm.color, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0 p-4">
                      {/* name + status */}
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{sm.icon}</span>
                          <p className={`text-[15px] font-bold ${textMain} truncate`}>{p.name}</p>
                        </div>
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                      </div>
                      {/* full description */}
                      {p.description && <p className={`text-xs ${text40} leading-relaxed mb-2`}>{p.description}</p>}
                      {/* full notes */}
                      {p.notes && (
                        <div className="rounded-lg px-3 py-2 mb-2" style={{ background: softFill, border: softBorder }}>
                          <p className={`text-xs ${text35} leading-relaxed`}>📝 {p.notes}</p>
                        </div>
                      )}
                      {/* meta footer */}
                      <div className="flex items-center justify-between pt-2 mt-0.5" style={{ borderTop: softBorder }}>
                        <span className={`text-[11px] ${text30}`}>Added {rel(p._creationTime)}</span>
                        {p.revenue > 0
                          ? <span className="text-sm font-bold text-yellow-400">{fmt(p.revenue)}</span>
                          : <span className={`text-[11px] ${text30}`}>no revenue yet</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddModal title={editing ? "Edit Project" : "New Project"} open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} accentColor={ACCENT} isDark={isDark}>
        <FormField label="Project Name" isDark={isDark}><FormInput value={name} onChange={setName} placeholder="e.g. Beat Pack Vol. 1" isDark={isDark} /></FormField>
        <FormField label="Description (optional)" isDark={isDark}><FormInput value={description} onChange={setDescription} placeholder="What is this?" isDark={isDark} /></FormField>
        <FormField label="Status" isDark={isDark}><FormSelect value={status} onChange={(v) => setStatus(v as typeof status)} options={[{ value: "active", label: "🟢 Active" }, { value: "paused", label: "⏸️ Paused" }, { value: "shipped", label: "🚀 Shipped" }]} isDark={isDark} /></FormField>
        <FormField label="Revenue ($)" isDark={isDark}><FormInput value={revenue} onChange={setRevenue} type="number" placeholder="0" isDark={isDark} /></FormField>
        <FormField label="Notes (optional)" isDark={isDark}><FormInput value={notes} onChange={setNotes} placeholder="Next steps, ideas..." isDark={isDark} /></FormField>
      </AddModal>
    </div>
  );
}
