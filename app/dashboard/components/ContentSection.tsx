"use client";

import { useState } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect } from "./AddModal";

const ACCENT = "#22d3ee";

interface Props {
  posts: Doc<"contentPosts">[];
  addContentPost: (args: { title: string; platform: string; type: "beat" | "video" | "article" | "other"; status: "idea" | "in_progress" | "published" }) => Promise<void>;
  updateContentPost: (args: { id: Id<"contentPosts">; status: "idea" | "in_progress" | "published"; publishedDate?: number }) => Promise<void>;
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

export default function ContentSection({ posts, addContentPost, updateContentPost }: Props) {
  const [addOpen, setAddOpen]       = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [editingPost, setEditingPost] = useState<Doc<"contentPosts"> | null>(null);

  const [title, setTitle]     = useState("");
  const [platform, setPlatform] = useState("");
  const [type, setType]       = useState<"beat" | "video" | "article" | "other">("video");
  const [status, setStatus]   = useState<"idea" | "in_progress" | "published">("idea");
  const [editStatus, setEditStatus] = useState<"idea" | "in_progress" | "published">("idea");

  const ideas      = posts.filter((p) => p.status === "idea").length;
  const inProgress = posts.filter((p) => p.status === "in_progress").length;
  const published  = posts.filter((p) => p.status === "published").length;

  const recent = [...posts].sort((a, b) => b._creationTime - a._creationTime);

  async function handleAdd() {
    if (!title.trim()) return;
    await addContentPost({ title: title.trim(), platform: platform || "Other", type, status });
    setAddOpen(false); setTitle(""); setPlatform(""); setType("video"); setStatus("idea");
  }

  function openEdit(p: Doc<"contentPosts">) { setEditingPost(p); setEditStatus(p.status); setEditOpen(true); }

  async function handleEdit() {
    if (!editingPost) return;
    await updateContentPost({ id: editingPost._id, status: editStatus, publishedDate: editStatus === "published" ? Date.now() : undefined });
    setEditOpen(false);
  }

  const getPlatformColor = (pl: string) => platformColors[pl.toLowerCase()] ?? platformColors.other;

  return (
    <div
      className="h-full rounded-2xl p-5 flex flex-col overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(8,145,178,0.05) 100%)",
        border: "1px solid rgba(34,211,238,0.2)",
        boxShadow: "0 0 40px rgba(34,211,238,0.07), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.3), rgba(8,145,178,0.15))", border: "1px solid rgba(34,211,238,0.35)", boxShadow: "0 0 16px rgba(34,211,238,0.3)" }}>🎨</div>
          <div>
            <h2 className="text-sm font-bold text-white">Content / Creative</h2>
            <p className="text-xs text-white/40">Create consistently. Ship relentlessly.</p>
          </div>
        </div>
        <button onClick={() => { setAddOpen(true); setTitle(""); setPlatform(""); setType("video"); setStatus("idea"); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.35), rgba(8,145,178,0.2))", border: "1px solid rgba(34,211,238,0.4)", boxShadow: "0 0 12px rgba(34,211,238,0.25)" }}>
          + Add Content
        </button>
      </div>

      {/* 2-col layout */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">

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
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  <p className="text-xs text-white/35">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: content list */}
        <div className="flex flex-col min-h-0">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">All Content</p>
          {posts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-white/25 text-center">No content yet. Start with an idea.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recent.map((p) => {
                const sm     = statusColors[p.status];
                const icon   = typeIcons[p.type];
                const pColor = getPlatformColor(p.platform);
                return (
                  <div key={p._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:scale-[1.01] transition-transform"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    onClick={() => openEdit(p)}>
                    <span className="text-base shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{p.title}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: pColor, background: `${pColor}18` }}>{p.platform}</span>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap shrink-0" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AddModal title="Add Content" open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd} accentColor={ACCENT}>
        <FormField label="Title"><FormInput value={title} onChange={setTitle} placeholder="e.g. How I Built My Wealth Dashboard" /></FormField>
        <FormField label="Platform"><FormInput value={platform} onChange={setPlatform} placeholder="YouTube, TikTok, SoundCloud..." /></FormField>
        <FormField label="Type"><FormSelect value={type} onChange={(v) => setType(v as typeof type)} options={[{ value: "beat", label: "🎵 Beat" }, { value: "video", label: "🎬 Video" }, { value: "article", label: "📝 Article" }, { value: "other", label: "✨ Other" }]} /></FormField>
        <FormField label="Status"><FormSelect value={status} onChange={(v) => setStatus(v as typeof status)} options={[{ value: "idea", label: "Idea" }, { value: "in_progress", label: "In Progress" }, { value: "published", label: "Published" }]} /></FormField>
      </AddModal>

      {/* Edit Modal */}
      <AddModal title="Update Status" open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit} accentColor={ACCENT} submitLabel="Update">
        {editingPost && (
          <>
            <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-sm font-medium text-white">{editingPost.title}</p>
              <p className="text-xs text-white/40 mt-0.5">{editingPost.platform} · {editingPost.type}</p>
            </div>
            <FormField label="Status">
              <FormSelect value={editStatus} onChange={(v) => setEditStatus(v as typeof editStatus)} options={[{ value: "idea", label: "Idea" }, { value: "in_progress", label: "In Progress" }, { value: "published", label: "Published ✅" }]} />
            </FormField>
          </>
        )}
      </AddModal>
    </div>
  );
}
