"use client";

import { useState } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect, FormTextarea } from "./AddModal";

const ACCENT = "#22d3ee";

interface Props {
  posts: Doc<"contentPosts">[];
  addContentPost: (args: { title: string; platform: string; type: "beat" | "video" | "article" | "other"; status: "idea" | "in_progress" | "published" }) => Promise<void>;
  updateContentPost: (args: { id: Id<"contentPosts">; status: "idea" | "in_progress" | "published"; publishedDate?: number; title?: string; notes?: string }) => Promise<void>;
  expandContentIdea: (args: { title: string; platform: string; type: string; brainstorm: string }) => Promise<{ betterTitle: string; plan: string }>;
  isDark?: boolean;
}

const statusColors = {
  idea:        { label: "Idea",        color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  in_progress: { label: "In Progress", color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
  published:   { label: "Published",   color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
};

const typeIcons = { beat: "🎵", video: "🎬", article: "📝", other: "✨" };

const platformColors: Record<string, string> = {
  youtube: "#ff4444", instagram: "#e1306c", twitter: "#1da1f2", tiktok: "#69c9d0",
  x: "#e7e9ea", linkedin: "#0a66c2", spotify: "#1db954", soundcloud: "#ff5500",
  medium: "#00ab6c", substack: "#ff6719", other: "#94a3b8",
};

export default function ContentSection({ posts, addContentPost, updateContentPost, expandContentIdea, isDark = true }: Props) {
  const [addOpen, setAddOpen]         = useState(false);
  const [editOpen, setEditOpen]       = useState(false);
  const [viewOpen, setViewOpen]       = useState(false);
  const [editingPost, setEditingPost] = useState<Doc<"contentPosts"> | null>(null);
  const [viewingPost, setViewingPost] = useState<Doc<"contentPosts"> | null>(null);

  // Add form
  const [title, setTitle]       = useState("");
  const [platform, setPlatform] = useState("");
  const [type, setType]         = useState<"beat" | "video" | "article" | "other">("video");
  const [status, setStatus]     = useState<"idea" | "in_progress" | "published">("idea");

  // Edit form
  const [editTitle, setEditTitle]   = useState("");
  const [editNotes, setEditNotes]   = useState("");
  const [editStatus, setEditStatus] = useState<"idea" | "in_progress" | "published">("idea");

  // Brainstorm
  const [brainstorm, setBrainstorm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState("");

  const textMain  = isDark ? "text-white"    : "text-black";
  const text80    = isDark ? "text-white/80" : "text-black/70";
  const text75    = isDark ? "text-white/75" : "text-black/65";
  const text50    = isDark ? "text-white/50" : "text-black/45";
  const text40    = isDark ? "text-white/40" : "text-black/40";
  const text35    = isDark ? "text-white/35" : "text-black/35";
  const text30    = isDark ? "text-white/30" : "text-black/30";
  const text25    = isDark ? "text-white/25" : "text-black/25";
  const softFill  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const softBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)";
  const editBtnCls = isDark
    ? { color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }
    : { color: "rgba(0,0,0,0.5)", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)" };
  const detailBorder = isDark ? "border-b border-white/10" : "border-b border-black/10";
  const detailBorderT = isDark ? "border-t border-white/10" : "border-t border-black/10";
  const closeBtnCls = isDark ? "text-white/50 hover:text-white hover:bg-white/10" : "text-black/40 hover:text-black hover:bg-black/5";
  const cancelBtnCls = isDark ? "text-white/60 hover:text-white hover:bg-white/10" : "text-black/50 hover:text-black hover:bg-black/5";

  const ideas      = posts.filter((p) => p.status === "idea").length;
  const inProgress = posts.filter((p) => p.status === "in_progress").length;
  const published  = posts.filter((p) => p.status === "published").length;

  const recent = [...posts].sort((a, b) => b._creationTime - a._creationTime);

  async function handleAdd() {
    if (!title.trim()) return;
    await addContentPost({ title: title.trim(), platform: platform || "Other", type, status });
    setAddOpen(false); setTitle(""); setPlatform(""); setType("video"); setStatus("idea");
  }

  function openView(p: Doc<"contentPosts">) {
    setViewingPost(p);
    setViewOpen(true);
  }

  function openEdit(p: Doc<"contentPosts">) {
    setEditingPost(p);
    setEditTitle(p.title);
    setEditNotes(p.notes ?? "");
    setEditStatus(p.status);
    setBrainstorm("");
    setGenError("");
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editingPost) return;
    await updateContentPost({
      id: editingPost._id,
      status: editStatus,
      publishedDate: editStatus === "published" ? Date.now() : undefined,
      title: editTitle.trim() || editingPost.title,
      notes: editNotes,
    });
    setEditOpen(false);
  }

  async function handleGenerate() {
    if (!editingPost || !brainstorm.trim()) return;
    setGenerating(true);
    setGenError("");
    try {
      const result = await expandContentIdea({
        title: editTitle || editingPost.title,
        platform: editingPost.platform,
        type: editingPost.type,
        brainstorm: brainstorm.trim(),
      });
      setEditTitle(result.betterTitle);
      setEditNotes(result.plan);
      setBrainstorm("");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  const getPlatformColor = (pl: string) => platformColors[pl.toLowerCase()] ?? platformColors.other;

  return (
    <div
      className="md:h-full rounded-[28px] p-4 sm:p-8 flex flex-col md:overflow-hidden relative"
      style={{
        background: isDark
          ? "linear-gradient(155deg, rgba(34,211,238,0.14) 0%, rgba(22,22,27,0.99) 42%)"
          : "linear-gradient(155deg, rgba(34,211,238,0.10) 0%, #ffffff 42%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(34,211,238,0.10), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 30px 80px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.3), rgba(8,145,178,0.15))", border: "1px solid rgba(34,211,238,0.35)", boxShadow: "0 0 16px rgba(34,211,238,0.3)" }}>🎨</div>
          <div>
            <h2 className={`text-sm font-bold ${textMain}`}>Content / Creative</h2>
            <p className={`text-xs ${text40}`}>Create consistently. Ship relentlessly.</p>
          </div>
        </div>
        <button onClick={() => { setAddOpen(true); setTitle(""); setPlatform(""); setType("video"); setStatus("idea"); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.35), rgba(8,145,178,0.2))", border: "1px solid rgba(34,211,238,0.4)", boxShadow: "0 0 12px rgba(34,211,238,0.25)" }}>
          + Add Content
        </button>
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:flex-1 md:min-h-0">

        {/* Left: stats */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: "Ideas",       value: ideas,      color: "#94a3b8", sub: "waiting to be made" },
              { label: "In Progress", value: inProgress, color: ACCENT,     sub: "being built right now" },
              { label: "Published",   value: published,  color: "#4ade80",  sub: "shipped to the world" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: `rgba(${s.color === "#94a3b8" ? "148,163,184" : s.color === ACCENT ? "34,211,238" : "74,222,128"},0.07)`, border: `1px solid ${s.color}25` }}>
                <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                <div>
                  <p className={`text-sm font-semibold ${textMain}`}>{s.label}</p>
                  <p className={`text-xs ${text35}`}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: content list */}
        <div className="flex flex-col min-h-0">
          <p className={`text-xs ${text40} uppercase tracking-wider mb-2 shrink-0`}>All Content</p>
          {posts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className={`text-sm ${text25} text-center`}>No content yet. Start with an idea.</p>
            </div>
          ) : (
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto space-y-2 pr-1">
              {recent.map((p) => {
                const sm     = statusColors[p.status];
                const icon   = typeIcons[p.type];
                const pColor = getPlatformColor(p.platform);
                return (
                  <div key={p._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: softFill, border: softBorder }}>
                    <span className="text-base shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${text80} truncate`}>{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: pColor, background: `${pColor}18` }}>{p.platform}</span>
                        {p.notes && <span className={`text-xs ${text25}`}>· has plan</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                      {p.notes && (
                        <button
                          type="button"
                          onClick={() => openView(p)}
                          className="ml-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
                          style={{ color: ACCENT, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}
                        >
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="px-2 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
                        style={editBtnCls}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail View Modal */}
      {viewOpen && viewingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setViewOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div
            className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              background: isDark
                ? "linear-gradient(135deg, rgba(10,20,40,0.97) 0%, rgba(5,15,30,0.99) 100%)"
                : "linear-gradient(135deg, #ffffff 0%, #f6f7f9 100%)",
              border: "1px solid rgba(34,211,238,0.25)",
              maxHeight: "80vh",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)" }} />

            {/* Header */}
            <div className={`px-6 py-4 flex items-start justify-between gap-4 shrink-0 ${detailBorder}`}>
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${text40} uppercase tracking-wider mb-1`}>{typeIcons[viewingPost.type]} {viewingPost.type} · {viewingPost.platform}</p>
                <h2 className={`text-base font-bold ${textMain} leading-snug`}>{viewingPost.title}</h2>
                <span
                  className="inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full"
                  style={{ color: statusColors[viewingPost.status].color, background: statusColors[viewingPost.status].bg }}
                >
                  {statusColors[viewingPost.status].label}
                </span>
              </div>
              <button
                onClick={() => setViewOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${closeBtnCls}`}
              >
                ✕
              </button>
            </div>

            {/* Plan body */}
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto px-6 py-5">
              {viewingPost.notes ? (
                <div className="space-y-1">
                  {viewingPost.notes.split("\n").map((line, i) => {
                    const isSection = /^(HOOK|CORE MESSAGE|KEY POINTS|CALL TO ACTION|PERSONAL NOTES):?/.test(line.trim());
                    const isBullet  = line.trim().startsWith("- ");
                    if (!line.trim()) return <div key={i} className="h-2" />;
                    if (isSection) return (
                      <p key={i} className="text-xs font-bold uppercase tracking-widest mt-4 mb-1" style={{ color: ACCENT }}>
                        {line.replace(/:$/, "")}
                      </p>
                    );
                    if (isBullet) return (
                      <p key={i} className={`text-sm ${text75} pl-3 before:content-['·'] before:mr-2 ${isDark ? "before:text-white/30" : "before:text-black/30"}`}>
                        {line.replace(/^-\s*/, "")}
                      </p>
                    );
                    return <p key={i} className={`text-sm ${text80} leading-relaxed`}>{line}</p>;
                  })}
                </div>
              ) : (
                <p className={`text-sm ${text30} text-center py-8`}>No plan yet. Hit Edit to add one or generate with AI.</p>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 pb-5 pt-3 flex justify-end gap-3 shrink-0 ${detailBorderT}`}>
              <button
                onClick={() => setViewOpen(false)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${cancelBtnCls}`}
              >
                Close
              </button>
              <button
                onClick={() => { setViewOpen(false); openEdit(viewingPost); }}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.4), rgba(8,145,178,0.25))", border: "1px solid rgba(34,211,238,0.4)", boxShadow: "0 0 16px rgba(34,211,238,0.2)" }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <AddModal title="Add Content" open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd} accentColor={ACCENT} isDark={isDark}>
        <FormField label="Title" isDark={isDark}><FormInput value={title} onChange={setTitle} placeholder="e.g. How I Built My Wealth Dashboard" isDark={isDark} /></FormField>
        <FormField label="Platform" isDark={isDark}><FormInput value={platform} onChange={setPlatform} placeholder="YouTube, TikTok, LinkedIn..." isDark={isDark} /></FormField>
        <FormField label="Type" isDark={isDark}><FormSelect value={type} onChange={(v) => setType(v as typeof type)} options={[{ value: "beat", label: "🎵 Beat" }, { value: "video", label: "🎬 Video" }, { value: "article", label: "📝 Article" }, { value: "other", label: "✨ Other" }]} isDark={isDark} /></FormField>
        <FormField label="Status" isDark={isDark}><FormSelect value={status} onChange={(v) => setStatus(v as typeof status)} options={[{ value: "idea", label: "Idea" }, { value: "in_progress", label: "In Progress" }, { value: "published", label: "Published" }]} isDark={isDark} /></FormField>
      </AddModal>

      {/* Edit / Brainstorm Modal */}
      <AddModal title="Develop Idea" open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit} accentColor={ACCENT} submitLabel="Save" size="lg" isDark={isDark}>
        {editingPost && (
          <>
            <FormField label="Title" isDark={isDark}>
              <FormInput value={editTitle} onChange={setEditTitle} placeholder="Give it a compelling title..." isDark={isDark} />
            </FormField>

            <FormField label="Status" isDark={isDark}>
              <FormSelect value={editStatus} onChange={(v) => setEditStatus(v as typeof editStatus)} options={[{ value: "idea", label: "Idea" }, { value: "in_progress", label: "In Progress" }, { value: "published", label: "Published ✅" }]} isDark={isDark} />
            </FormField>

            <FormField label="Plan / Notes" isDark={isDark}>
              <FormTextarea
                value={editNotes}
                onChange={setEditNotes}
                placeholder="Your content plan will appear here after you generate it, or write one yourself..."
                rows={4}
                isDark={isDark}
              />
            </FormField>

            {/* Brainstorm section */}
            <div className={`pt-1 ${isDark ? "border-t border-white/10" : "border-t border-black/10"}`}>
              <p className={`text-xs ${text40} uppercase tracking-wider mb-3`}>Generate Plan with AI</p>
              <FormField label="Tell me about this idea" isDark={isDark}>
                <FormTextarea
                  value={brainstorm}
                  onChange={setBrainstorm}
                  placeholder="Just talk — what's this about? What happened? What do you want people to feel? The more you share, the better the plan..."
                  rows={3}
                  isDark={isDark}
                />
              </FormField>
              {genError && <p className="text-xs text-red-400 mt-1">{genError}</p>}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !brainstorm.trim()}
                className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: generating
                    ? "rgba(34,211,238,0.15)"
                    : "linear-gradient(135deg, rgba(34,211,238,0.35), rgba(8,145,178,0.2))",
                  border: "1px solid rgba(34,211,238,0.4)",
                  boxShadow: generating ? "none" : "0 0 16px rgba(34,211,238,0.2)",
                }}
              >
                {generating ? "Generating plan..." : "✦ Generate Plan"}
              </button>
            </div>
          </>
        )}
      </AddModal>
    </div>
  );
}
