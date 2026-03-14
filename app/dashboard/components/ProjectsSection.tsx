"use client";

import { useState } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect } from "./AddModal";

const ACCENT = "#fbbf24";

interface Props {
  projects: Doc<"projects">[];
  upsertProject: (args: { id?: Id<"projects">; name: string; description?: string; status: "active" | "paused" | "shipped"; revenue?: number; notes?: string }) => Promise<void>;
}

const statusMeta = {
  active: { label: "Active",  color: "#4ade80", bg: "rgba(74,222,128,0.15)",  icon: "🟢" },
  paused: { label: "Paused",  color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  icon: "⏸️" },
  shipped:{ label: "Shipped", color: "#60a5fa", bg: "rgba(96,165,250,0.15)",  icon: "🚀" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function ProjectsSection({ projects, upsertProject }: Props) {
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<Doc<"projects"> | null>(null);
  const [name, setName]           = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus]       = useState<"active" | "paused" | "shipped">("active");
  const [revenue, setRevenue]     = useState("0");
  const [notes, setNotes]         = useState("");

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
      className="h-full rounded-2xl p-5 flex flex-col overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(180,83,9,0.05) 100%)",
        border: "1px solid rgba(251,191,36,0.2)",
        boxShadow: "0 0 40px rgba(251,191,36,0.07), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.3), rgba(180,83,9,0.15))", border: "1px solid rgba(251,191,36,0.35)", boxShadow: "0 0 16px rgba(251,191,36,0.3)" }}>⚡</div>
          <div>
            <h2 className="text-sm font-bold text-white">Projects / Business</h2>
            <p className="text-xs text-white/40">Build things that generate value.</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.35), rgba(180,83,9,0.2))", border: "1px solid rgba(251,191,36,0.4)", boxShadow: "0 0 12px rgba(251,191,36,0.25)" }}>
          + New Project
        </button>
      </div>

      {/* 2-col layout */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">

        {/* Left: revenue stats + status breakdown */}
        <div className="flex flex-col gap-4">
          {/* Revenue */}
          <div className="rounded-xl p-5 shrink-0" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.04))", border: "1px solid rgba(251,191,36,0.2)", boxShadow: "0 0 20px rgba(251,191,36,0.1)" }}>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-4xl font-black" style={{ color: ACCENT, textShadow: "0 0 30px rgba(251,191,36,0.5)" }}>{fmt(totalRevenue)}</p>
          </div>

          {/* Status counts */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[
              { label: "Active",  value: active.length,  color: "#4ade80" },
              { label: "Paused",  value: paused.length,  color: ACCENT },
              { label: "Shipped", value: shipped.length, color: "#60a5fa" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-white/35 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: project list */}
        <div className="flex flex-col min-h-0">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">All Projects</p>
          {projects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-white/25 text-center">No projects yet. Every empire started as an idea.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {[...active, ...paused, ...shipped].map((p) => {
                const sm = statusMeta[p.status];
                return (
                  <div key={p._id} className="rounded-xl p-3.5 cursor-pointer hover:scale-[1.01] transition-transform"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onClick={() => openEdit(p)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm">{sm.icon}</span>
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                        </div>
                        {p.description && <p className="text-xs text-white/40 truncate">{p.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-yellow-400">{fmt(p.revenue)}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                      </div>
                    </div>
                    {p.notes && <p className="text-xs text-white/30 mt-1.5 truncate">📝 {p.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddModal title={editing ? "Edit Project" : "New Project"} open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} accentColor={ACCENT}>
        <FormField label="Project Name"><FormInput value={name} onChange={setName} placeholder="e.g. Beat Pack Vol. 1" /></FormField>
        <FormField label="Description (optional)"><FormInput value={description} onChange={setDescription} placeholder="What is this?" /></FormField>
        <FormField label="Status"><FormSelect value={status} onChange={(v) => setStatus(v as typeof status)} options={[{ value: "active", label: "🟢 Active" }, { value: "paused", label: "⏸️ Paused" }, { value: "shipped", label: "🚀 Shipped" }]} /></FormField>
        <FormField label="Revenue ($)"><FormInput value={revenue} onChange={setRevenue} type="number" placeholder="0" /></FormField>
        <FormField label="Notes (optional)"><FormInput value={notes} onChange={setNotes} placeholder="Next steps, ideas..." /></FormField>
      </AddModal>
    </div>
  );
}
