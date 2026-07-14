"use client";

import { useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Upload, Trash2, FileText, X } from "lucide-react";

type DocItem = {
  _id: Id<"documents">;
  title: string;
  category?: string;
  url: string | null;
  mimeType?: string;
  note?: string;
  addedAt: number;
  issuedDate?: string;
};

interface Props {
  isDark?: boolean;
  documents: DocItem[];
  generateUploadUrl: () => Promise<string>;
  saveDocument: (args: { title: string; category?: string; storageId: Id<"_storage">; mimeType?: string; note?: string; issuedDate?: string }) => Promise<unknown>;
  updateDocument: (args: { id: Id<"documents">; title?: string; category?: string; issuedDate?: string }) => Promise<unknown>;
  deleteDocument: (args: { id: Id<"documents"> }) => Promise<unknown>;
}

const CATEGORIES = ["Certification", "Diploma", "ID", "Award", "Other"];
const ACCENT = "#a085c4";

export default function RecordsSection({ isDark = true, documents, generateUploadUrl, saveDocument, updateDocument, deleteDocument }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Certification");
  const [issuedDate, setIssuedDate] = useState("");
  const [viewing, setViewing] = useState<DocItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Id<"documents"> | null>(null);

  const textMain = isDark ? "#fff" : "#1a1a1a";
  const textMuted = isDark ? "rgba(255,255,255,0.6)" : "#6b7280";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "#fff";
  const border = `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await saveDocument({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        category,
        storageId,
        mimeType: file.type,
        issuedDate: issuedDate || undefined,
      });
      setTitle("");
      setIssuedDate("");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Upload bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional — defaults to filename)"
          style={{ flex: "1 1 220px", minWidth: 0, padding: "10px 14px", borderRadius: 12, border, background: cardBg, color: textMain, fontSize: "0.9rem", outline: "none" }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 12, border, background: cardBg, color: textMain, fontSize: "0.9rem" }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="date"
          value={issuedDate}
          onChange={(e) => setIssuedDate(e.target.value)}
          title="Date received (optional)"
          style={{ padding: "10px 14px", borderRadius: 12, border, background: cardBg, color: textMain, fontSize: "0.9rem", colorScheme: isDark ? "dark" : "light" }}
        />
        <input ref={fileRef} type="file" onChange={handleFile} style={{ display: "none" }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, border: "none", background: ACCENT, color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: uploading ? "wait" : "pointer" }}
        >
          <Upload size={16} /> {uploading ? "Uploading…" : "Upload record"}
        </button>
      </div>

      {/* Grid */}
      {documents.length === 0 ? (
        <p style={{ color: textMuted, fontSize: "0.95rem", padding: "20px 0" }}>
          No records yet. Upload your diploma, certificates, IDs — anything you want to keep on file.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {documents.map((d) => {
            const isImage = (d.mimeType ?? "").startsWith("image/");
            return (
              <div key={d._id} style={{ borderRadius: 16, border, background: cardBg, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
                <div
                  onClick={() => setViewing(d)}
                  style={{ height: 140, cursor: "pointer", background: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
                >
                  {isImage && d.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.url} alt={d.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <FileText size={40} color={textMuted} />
                  )}
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                      {d.category && <div style={{ fontSize: "0.72rem", color: ACCENT, marginTop: 2 }}>{d.category}</div>}
                    </div>
                    <button onClick={() => setPendingDelete(d._id)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, flexShrink: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <input
                    type="date"
                    value={d.issuedDate ?? ""}
                    onChange={(e) => updateDocument({ id: d._id, issuedDate: e.target.value })}
                    title="Date received"
                    style={{ marginTop: 8, width: "100%", padding: "5px 8px", borderRadius: 8, border, background: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.03)", color: textMuted, fontSize: "0.72rem", colorScheme: isDark ? "dark" : "light" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Viewer */}
      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <button onClick={() => setViewing(null)} style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          {(viewing.mimeType ?? "").startsWith("image/") && viewing.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewing.url} alt={viewing.title} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }} />
          ) : (
            <a href={viewing.url ?? "#"} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#fff", fontSize: "1rem" }}>Open {viewing.title} ↗</a>
          )}
          <div style={{ color: "#fff", marginTop: 14, fontSize: "0.95rem", fontWeight: 600 }}>{viewing.title}</div>
        </div>
      )}

      {/* Delete confirm */}
      {pendingDelete && (
        <div onClick={() => setPendingDelete(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: isDark ? "#1a1a1a" : "#fff", borderRadius: 16, padding: 20, maxWidth: 340, border }}>
            <p style={{ color: textMain, fontWeight: 600, margin: "0 0 6px" }}>Delete this record?</p>
            <p style={{ color: textMuted, fontSize: "0.85rem", margin: "0 0 16px" }}>This removes the file permanently.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setPendingDelete(null)} style={{ padding: "8px 14px", borderRadius: 10, border, background: "none", color: textMuted, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { deleteDocument({ id: pendingDelete }); setPendingDelete(null); }} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
