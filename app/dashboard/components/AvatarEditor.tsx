"use client";

import { useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Upload, X } from "lucide-react";

interface Props {
  isDark?: boolean;
  currentUrl: string | null;
  currentScale: number;
  currentTx: number;
  currentTy: number;
  generateUploadUrl: () => Promise<string>;
  setAvatar: (a: { avatarStorageId: Id<"_storage">; scale: number; tx: number; ty: number }) => Promise<unknown>;
  updateAvatarTransform: (a: { scale: number; tx: number; ty: number }) => Promise<unknown>;
  onClose: () => void;
}

const EDITOR_SIZE = 260;

export default function AvatarEditor({
  isDark = true, currentUrl, currentScale, currentTx, currentTy,
  generateUploadUrl, setAvatar, updateAvatarTransform, onClose,
}: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(currentUrl);
  const [pendingStorageId, setPendingStorageId] = useState<Id<"_storage"> | null>(null);
  const [scale, setScale] = useState(currentScale || 1);
  const [tx, setTx] = useState(currentTx || 0);
  const [ty, setTy] = useState(currentTy || 0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const textMain = isDark ? "#fff" : "#1a1a1a";
  const textMuted = isDark ? "rgba(255,255,255,0.6)" : "#6b7280";
  const panel = isDark ? "#1a1a1a" : "#fff";
  const border = `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      setPendingStorageId(storageId);
      setImgUrl(URL.createObjectURL(file));
      setScale(1); setTx(0); setTy(0);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!imgUrl) return;
    drag.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    // translate % is relative to element size; divide by scale so on-screen drag matches pointer
    setTx((t) => t + (dx / (scale * EDITOR_SIZE)) * 100);
    setTy((t) => t + (dy / (scale * EDITOR_SIZE)) * 100);
  }
  function onPointerUp() { drag.current = null; }

  async function save() {
    setSaving(true);
    try {
      if (pendingStorageId) await setAvatar({ avatarStorageId: pendingStorageId, scale, tx, ty });
      else await updateAvatarTransform({ scale, tx, ty });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: panel, borderRadius: 24, padding: 28, width: "100%", maxWidth: 340, border, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: textMain, fontSize: "1.1rem", fontWeight: 600 }}>Profile photo</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted }}><X size={18} /></button>
        </div>

        {/* Circular preview — drag to reposition */}
        <div
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={{
            width: EDITOR_SIZE, height: EDITOR_SIZE, maxWidth: "100%", borderRadius: "50%", overflow: "hidden",
            margin: "0 auto", position: "relative", touchAction: "none",
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
            cursor: imgUrl ? "grab" : "default",
            border: `2px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl} alt="avatar" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translate(${tx}%, ${ty}%)`, transformOrigin: "center", userSelect: "none", pointerEvents: "none" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted, fontSize: "0.9rem" }}>No photo yet</div>
          )}
        </div>

        {imgUrl && (
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: "0.8rem", color: textMuted }}>Zoom</label>
            <input type="range" min={1} max={3} step={0.01} value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#3b82f6" }} />
            <p style={{ fontSize: "0.75rem", color: textMuted, textAlign: "center", margin: "2px 0 0" }}>Drag the photo to reposition</p>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border, background: "none", color: textMain, fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
            <Upload size={16} /> {uploading ? "Uploading…" : imgUrl ? "Change photo" : "Upload photo"}
          </button>
          <button onClick={save} disabled={saving || !imgUrl} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, cursor: (saving || !imgUrl) ? "not-allowed" : "pointer", opacity: (saving || !imgUrl) ? 0.6 : 1, fontSize: "0.9rem" }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
