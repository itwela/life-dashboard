"use client";

import { useState, useEffect } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect } from "./AddModal";

const ACCENT = "#60a5fa";

type SchoolProgress = {
  totalCU: number;
  earnedCU: number;
  activeCount: number;
  termsCompleted: number;
  termsTotal: number;
};

interface Props {
  courses: Doc<"courses">[];
  upsertCourse: (args: { id?: Id<"courses">; name: string; creditUnits: number; status: "not_started" | "in_progress" | "completed"; notes?: string }) => Promise<unknown>;
  schoolProgress: SchoolProgress;
  setSchoolProgress: (args: { totalCU: number; earnedCU: number; activeCount: number; termsCompleted: number; termsTotal: number }) => Promise<unknown>;
  seedSchoolData: () => Promise<{ courses: number }>;
  isDark?: boolean;
}

const statusMeta = {
  completed:   { label: "Done",        color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  in_progress: { label: "In Progress", color: "#60a5fa", bg: "rgba(96,165,250,0.15)" },
  not_started: { label: "Not Started", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

export default function SchoolSection({ courses, upsertCourse, schoolProgress, setSchoolProgress, seedSchoolData, isDark = true }: Props) {
  const [open, setOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [seedConfirming, setSeedConfirming] = useState(false);
  const [editing, setEditing] = useState<Doc<"courses"> | null>(null);
  const [name, setName]   = useState("");
  const [cu, setCu]       = useState("3");
  const [status, setStatus] = useState<"not_started" | "in_progress" | "completed">("not_started");
  const [notes, setNotes] = useState("");

  const [totalCUInput, setTotalCUInput] = useState(String(schoolProgress.totalCU));
  const [earnedCUInput, setEarnedCUInput] = useState(String(schoolProgress.earnedCU));
  const [activeCountInput, setActiveCountInput] = useState(String(schoolProgress.activeCount));
  const [termsDoneInput, setTermsDoneInput] = useState(String(schoolProgress.termsCompleted));
  const [termsTotalInput, setTermsTotalInput] = useState(String(schoolProgress.termsTotal));

  const current     = courses.filter((c) => c.status === "in_progress");
  const completed   = courses.filter((c) => c.status === "completed");
  const queued      = courses.filter((c) => c.status === "not_started");
  const earnedCU    = completed.reduce((s, c) => s + c.creditUnits, 0);
  const pct         = schoolProgress.totalCU > 0 ? Math.round((earnedCU / schoolProgress.totalCU) * 100) : 0;
  const cuRemaining = schoolProgress.totalCU - earnedCU;

  const textMain  = isDark ? "text-white"    : "text-black";
  const text80    = isDark ? "text-white/80" : "text-black/70";
  const text60    = isDark ? "text-white/60" : "text-black/50";
  const text40    = isDark ? "text-white/40" : "text-black/40";
  const text35    = isDark ? "text-white/35" : "text-black/35";
  const text30    = isDark ? "text-white/30" : "text-black/30";
  const hoverRow  = isDark ? "hover:bg-white/5" : "hover:bg-black/5";
  const softFill  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const softBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)";
  const trackFill = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  function openAdd() { setEditing(null); setName(""); setCu("3"); setStatus("not_started"); setNotes(""); setOpen(true); }
  function openEdit(c: Doc<"courses">) { setEditing(c); setName(c.name); setCu(String(c.creditUnits)); setStatus(c.status); setNotes(c.notes ?? ""); setOpen(true); }
  function openProgress() {
    setTotalCUInput(String(schoolProgress.totalCU));
    setEarnedCUInput(String(schoolProgress.earnedCU));
    setActiveCountInput(String(schoolProgress.activeCount));
    setTermsDoneInput(String(schoolProgress.termsCompleted));
    setTermsTotalInput(String(schoolProgress.termsTotal));
    setProgressOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    await upsertCourse({ id: editing?._id, name: name.trim(), creditUnits: Number(cu) || 3, status, notes: notes || undefined });
    setOpen(false);
  }

  async function handleProgressSubmit() {
    await setSchoolProgress({
      totalCU: Number(totalCUInput) || 119,
      earnedCU: Number(earnedCUInput) || 0,
      activeCount: Number(activeCountInput) || 0,
      termsCompleted: Number(termsDoneInput) || 0,
      termsTotal: Number(termsTotalInput) || 11,
    });
    setProgressOpen(false);
  }

  function handleSeedClick() {
    if (seedConfirming) {
      runSeed();
      return;
    }
    setSeedConfirming(true);
  }

  async function runSeed() {
    setSeedConfirming(false);
    setSeedLoading(true);
    setSeedSuccess(false);
    try {
      await seedSchoolData();
      setSeedSuccess(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeedLoading(false);
    }
  }

  useEffect(() => {
    if (!seedConfirming) return;
    const t = setTimeout(() => setSeedConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [seedConfirming]);

  useEffect(() => {
    if (!seedSuccess) return;
    const t = setTimeout(() => setSeedSuccess(false), 2200);
    return () => clearTimeout(t);
  }, [seedSuccess]);

  return (
    <div
      className="md:h-full rounded-[28px] p-4 sm:p-8 flex flex-col md:overflow-hidden relative"
      style={{
        background: isDark
          ? "linear-gradient(155deg, rgba(96,165,250,0.14) 0%, rgba(22,22,27,0.99) 42%)"
          : "linear-gradient(155deg, rgba(96,165,250,0.10) 0%, #ffffff 42%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(96,165,250,0.10), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 30px 80px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.3), rgba(59,130,246,0.15))", border: "1px solid rgba(96,165,250,0.35)", boxShadow: "0 0 16px rgba(96,165,250,0.3)" }}>🎓</div>
          <div>
            <h2 className={`text-sm font-bold ${textMain}`}>School / WGU</h2>
            <p className={`text-xs ${text40}`}>Bachelor&apos;s Degree Progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeedClick}
            disabled={seedLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60"
            style={
              seedSuccess
                ? {
                    background: "linear-gradient(135deg, rgba(74,222,128,0.5), rgba(34,197,94,0.35))",
                    border: "1px solid rgba(74,222,128,0.6)",
                    boxShadow: "0 0 20px rgba(74,222,128,0.4)",
                    transform: "scale(1.08)",
                  }
                : seedConfirming
                  ? {
                      background: "linear-gradient(135deg, rgba(251,191,36,0.4), rgba(245,158,11,0.25))",
                      border: "1px solid rgba(251,191,36,0.6)",
                      boxShadow: "0 0 16px rgba(251,191,36,0.3)",
                    }
                  : { background: "linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.15))", border: "1px solid rgba(74,222,128,0.35)" }
            }
          >
            {seedLoading ? "Seeding…" : seedSuccess ? "✓ Restored" : seedConfirming ? "Sure? Click again" : "Restore my WGU data"}
          </button>
          <button onClick={openAdd}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.35), rgba(59,130,246,0.2))", border: "1px solid rgba(96,165,250,0.4)", boxShadow: "0 0 12px rgba(96,165,250,0.25)" }}>
            + Add Course
          </button>
        </div>
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:flex-1 md:min-h-0">

        {/* Left: progress + active courses */}
        <div className="flex flex-col gap-4">
          {/* Progress */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-end justify-between">
              <span className={`text-sm ${text60}`}>Program completed</span>
              <span className="text-2xl font-bold" style={{ color: ACCENT }}>
                {pct}%<span className={`text-sm font-normal ${text40}`}> · {cuRemaining} CU left</span>
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: trackFill }}>
              <div className="h-full rounded-full relative overflow-hidden transition-all duration-700"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)", boxShadow: "0 0 12px rgba(96,165,250,0.6)" }}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 2s infinite" }} />
              </div>
            </div>
            <p className={`text-xs ${text40}`}>{schoolProgress.termsCompleted} / {schoolProgress.termsTotal} terms completed</p>
            <button
              type="button"
              onClick={openProgress}
              className={`text-[10px] ${text35} ${isDark ? "hover:text-white/60" : "hover:text-black/60"} mt-1`}
            >
              Edit WGU progress
            </button>
          </div>

          {/* Stats pills — derived from live course data */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[
              { label: "Done", value: completed.length, color: "#4ade80" },
              { label: "Active", value: current.length, color: ACCENT },
              { label: "Queued", value: queued.length, color: "#94a3b8" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: softFill, border: softBorder }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className={`text-xs ${text35} mt-0.5`}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Currently in progress */}
          {current.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className={`text-xs ${text40} uppercase tracking-wider`}>Currently Enrolled</p>
              {current.map((c) => (
                <div key={c._id} className="rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:scale-[1.01] transition-transform"
                  style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)" }}
                  onClick={() => openEdit(c)}>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${textMain} truncate`}>{c.name}</p>
                    <p className={`text-xs ${text40}`}>{c.creditUnits} CU</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: all other courses */}
        <div className="flex flex-col min-h-0">
          <p className={`text-xs ${text40} uppercase tracking-wider mb-2 shrink-0`}>All Courses</p>
          {courses.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className={`text-sm ${text30} text-center`}>No courses yet.</p>
            </div>
          ) : (
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto space-y-1.5 pr-1">
              {[...courses]
                .sort((a, b) => {
                  const order = { in_progress: 0, completed: 1, not_started: 2 };
                  return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                })
                .map((course) => {
                  const meta = statusMeta[course.status];
                  return (
                    <div key={course._id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${hoverRow} transition-colors`}
                      onClick={() => openEdit(course)}>
                      <span className="text-sm shrink-0" style={{ color: meta.color }}>
                        {course.status === "completed" ? "✓" : course.status === "in_progress" ? "●" : "○"}
                      </span>
                      <span className={`flex-1 text-sm ${text80} truncate`}>{course.name}</span>
                      <span className={`text-xs ${text30} shrink-0`}>{course.creditUnits} CU</span>
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <AddModal title={editing ? "Edit Course" : "Add Course"} open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} accentColor={ACCENT} isDark={isDark}>
        <FormField label="Course Name" isDark={isDark}><FormInput value={name} onChange={setName} placeholder="e.g. C955 Applied Probability" isDark={isDark} /></FormField>
        <FormField label="Credit Units" isDark={isDark}><FormInput value={cu} onChange={setCu} type="number" placeholder="3" isDark={isDark} /></FormField>
        <FormField label="Status" isDark={isDark}><FormSelect value={status} onChange={(v) => setStatus(v as typeof status)} options={[{ value: "not_started", label: "Not Started" }, { value: "in_progress", label: "In Progress" }, { value: "completed", label: "Completed" }]} isDark={isDark} /></FormField>
        <FormField label="Notes (optional)" isDark={isDark}><FormInput value={notes} onChange={setNotes} placeholder="Any notes..." isDark={isDark} /></FormField>
      </AddModal>

      <AddModal title="WGU progress" open={progressOpen} onClose={() => setProgressOpen(false)} onSubmit={handleProgressSubmit} accentColor={ACCENT} submitLabel="Save" isDark={isDark}>
        <FormField label="Total CU (degree)" isDark={isDark}><FormInput value={totalCUInput} onChange={setTotalCUInput} type="number" placeholder="119" isDark={isDark} /></FormField>
        <FormField label="Earned CU (done)" isDark={isDark}><FormInput value={earnedCUInput} onChange={setEarnedCUInput} type="number" placeholder="43" isDark={isDark} /></FormField>
        <FormField label="Active (in progress now)" isDark={isDark}><FormInput value={activeCountInput} onChange={setActiveCountInput} type="number" placeholder="13" isDark={isDark} /></FormField>
        <FormField label="Terms completed" isDark={isDark}><FormInput value={termsDoneInput} onChange={setTermsDoneInput} type="number" placeholder="5" isDark={isDark} /></FormField>
        <FormField label="Terms total" isDark={isDark}><FormInput value={termsTotalInput} onChange={setTermsTotalInput} type="number" placeholder="11" isDark={isDark} /></FormField>
      </AddModal>
    </div>
  );
}
