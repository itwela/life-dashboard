"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";

const EMOTIONS: { label: string; color: string }[] = [
  { label: "Frustrated",  color: "#4ade80" },
  { label: "Happy",       color: "#60a5fa" },
  { label: "Motivated",   color: "#fb923c" },
  { label: "Proud",       color: "#fbbf24" },
  { label: "Grateful",    color: "#34d399" },
  { label: "Anxious",     color: "#fde047" },
  { label: "Meh",         color: "#f97316" },
  { label: "Heavy",       color: "#818cf8" },
  { label: "Numb",        color: "#94a3b8" },
  { label: "Sad",         color: "#3b82f6" },
  { label: "Angry",       color: "#f87171" },
  { label: "Lost",        color: "#c084fc" },
];

const EMOTION_MAP = Object.fromEntries(EMOTIONS.map(e => [e.label, e.color]));

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return { r: 59, g: 130, b: 246 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function emotionCalBg(emotions: string[], selected: boolean) {
  const cols = emotions.slice(0, 3).map(e => EMOTION_MAP[e] ?? "#3b82f6");
  if (!cols.length) return "transparent";
  const a = selected ? 0.25 : 0.14;
  if (cols.length === 1) return `${rgba(cols[0], a)}`;
  return `linear-gradient(150deg, ${rgba(cols[0], a)} 0%, ${rgba(cols[1] ?? cols[0], a * 0.7)} 100%)`;
}

function emotionFeedBg(emotions: string[]) {
  const cols = emotions.slice(0, 3).map(e => EMOTION_MAP[e] ?? "#3b82f6");
  if (!cols.length) return "transparent";
  if (cols.length === 1) return `${rgba(cols[0], 0.08)}`;
  return `linear-gradient(165deg, ${rgba(cols[0], 0.1)} 0%, ${rgba(cols[1], 0.06)} 60%, transparent 100%)`;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function CheckInView({ onClose }: { onClose: () => void }) {
  const today = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [timeOfDay, setTimeOfDay] = useState<"morning"|"afternoon"|"night">("morning");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [journal, setJournal] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [editingDate, setEditingDate] = useState<string|null>(null);
  const [savedDate, setSavedDate] = useState<string|null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [copiedDate, setCopiedDate] = useState<string|null>(null);

  const allCheckIns = useQuery(api.checkIns.list) ?? [];
  const addCheckIn  = useMutation(api.checkIns.add);

  const checkInByDate = useMemo(() => {
    const m: Record<string, typeof allCheckIns[0]> = {};
    for (const c of allCheckIns) m[c.date] = c;
    return m;
  }, [allCheckIns]);

  const feedDays = useMemo(() => {
    const { year, month } = calMonth;
    const n = new Date(year, month+1, 0).getDate();
    return Array.from({ length: n }, (_, i) =>
      `${year}-${String(month+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`
    );
  }, [calMonth]);

  const calDays = useMemo(() => {
    const { year, month } = calMonth;
    const first = new Date(year, month, 1).getDay();
    const n = new Date(year, month+1, 0).getDate();
    const cells: (number|null)[] = Array(first).fill(null);
    for (let d=1; d<=n; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calMonth]);

  const monthLabel = new Date(calMonth.year, calMonth.month, 1)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const dayRefs = useRef<Record<string, HTMLDivElement|null>>({});
  const feedRef = useRef<HTMLDivElement>(null);

  function scrollToDate(ds: string) {
    dayRefs.current[ds]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => { setTimeout(() => scrollToDate(today), 150); }, []);

  useEffect(() => {
    const feed = feedRef.current; if (!feed) return;
    const obs = new IntersectionObserver(entries => {
      let best: IntersectionObserverEntry|null = null;
      for (const e of entries) if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e;
      if (best && best.intersectionRatio > 0.4) {
        const ds = (best.target as HTMLElement).dataset.date;
        if (ds) {
          setSelectedDate(ds);
          const [y, m] = ds.split("-").map(Number);
          setCalMonth(c => c.year===y && c.month===m-1 ? c : { year: y, month: m-1 });
        }
      }
    }, { root: feed, threshold: 0.5 });
    const t = setTimeout(() => Object.values(dayRefs.current).forEach(el => el && obs.observe(el)), 60);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [feedDays]);

  function selectCalDay(day: number) {
    const ds = `${calMonth.year}-${String(calMonth.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSelectedDate(ds);
    setTimeout(() => scrollToDate(ds), 50);
  }

  function resetForm() {
    setTimeOfDay("morning"); setSelectedEmotions([]);
    setJournal(""); setTagInput(""); setTags([]);
  }

  function startEdit(ds: string) {
    const e = checkInByDate[ds];
    if (e) { setTimeOfDay(e.timeOfDay); setSelectedEmotions(e.emotions); setJournal(e.journal??""); setTags(e.tags??[]); }
    else resetForm();
    setEditingDate(ds); setSavedDate(null);
  }

  function toggleEmotion(label: string) {
    setSelectedEmotions(prev =>
      prev.includes(label) ? prev.filter(e => e!==label) : prev.length>=3 ? prev : [...prev, label]
    );
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key==="Enter"||e.key===",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,$/, "");
      if (t && !tags.includes(t)) setTags(p => [...p, t]);
      setTagInput("");
    }
  }

  async function handlePolish() {
    if (!journal.trim() || isPolishing) return;
    setIsPolishing(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "arcee-ai/trinity-large-preview:free",
          messages: [
            { role: "system", content: "Fix grammar, punctuation, and capitalization. Keep voice/tone/meaning exactly. Return only cleaned text." },
            { role: "user", content: journal },
          ],
          temperature: 0.1, max_tokens: 1000,
        }),
      });
      const data = await res.json();
      const cleaned = data.choices?.[0]?.message?.content?.trim();
      if (cleaned) setJournal(cleaned);
    } catch { /* silently fail */ }
    finally { setIsPolishing(false); }
  }

  function buildClaudeText(ds: string, entry: typeof allCheckIns[0]) {
    const [year, mo, day] = ds.split("-").map(Number);
    const dateLabel = new Date(year, mo-1, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const lines = [
      `Hey — I just did my check-in and wanted to talk about it.`, ``,
      `${dateLabel} · ${entry.timeOfDay}`, `Feeling: ${entry.emotions.join(", ")}`,
    ];
    if (entry.journal) lines.push(``, entry.journal);
    if (entry.tags?.length) lines.push(``, entry.tags.map(t => `#${t}`).join("  "));
    return lines.join("\n");
  }

  async function handleCopyForClaude(e: React.MouseEvent, ds: string, entry: typeof allCheckIns[0]) {
    e.stopPropagation();
    await navigator.clipboard.writeText(buildClaudeText(ds, entry));
    setCopiedDate(ds); setTimeout(() => setCopiedDate(null), 2000);
  }

  async function handleSave(ds: string) {
    if (!selectedEmotions.length) return;
    await addCheckIn({ date: ds, timeOfDay, emotions: selectedEmotions, journal: journal.trim()||undefined, tags: tags.length>0?tags:undefined });
    setSavedDate(ds); setEditingDate(null); resetForm();
  }

  // Shared styles using CSS vars so they automatically adapt to dark/light
  const glass: React.CSSProperties = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(12px) saturate(1.8)",
    WebkitBackdropFilter: "blur(12px) saturate(1.8)",
    border: "1px solid var(--glass-border)",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", flexDirection: "column",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        fontFamily: "var(--font-inter)",
      }}>
      {/* Inner panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
        position: "absolute", inset: "20px",
        borderRadius: 32, overflow: "hidden",
        display: "flex", flexDirection: "column",
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px) saturate(1.8)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.1)",
      }}>

        {/* Header */}
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 28px", height: 64,
          borderBottom: "1px solid var(--glass-border)",
        }}>
          <button onClick={onClose} style={{
            background: "rgba(0,0,0,0.04)", border: "none", borderRadius: 100,
            padding: "8px 16px", cursor: "pointer", fontSize: "0.875rem",
            fontWeight: 500, color: "var(--text-muted)",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.3s ease",
            fontFamily: "var(--font-inter)",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-main)"; (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Check-In
          </span>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: "50%", border: "none",
            background: "rgba(0,0,0,0.04)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s ease",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
          >
            <X size={16} color="var(--text-muted)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>

          {/* LEFT — Calendar */}
          <div style={{
            flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
            padding: "24px 20px", overflow: "hidden",
            borderRight: "1px solid var(--glass-border)",
          }}>
            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <button onClick={() => setCalMonth(c => ({ year: c.month===0?c.year-1:c.year, month: c.month===0?11:c.month-1 }))} style={{
                width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--glass-border)",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", transition: "all 0.3s ease",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--text-main)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              ><ChevronLeft size={16} /></button>
              <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
                {monthLabel}
              </span>
              <button onClick={() => setCalMonth(c => ({ year: c.month===11?c.year+1:c.year, month: c.month===11?0:c.month+1 }))} style={{
                width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--glass-border)",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", transition: "all 0.3s ease",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--text-main)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              ><ChevronRight size={16} /></button>
            </div>

            {/* Day labels */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                <div key={d} style={{ textAlign: "center", padding: "4px 0", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em" }}>{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, flex: 1 }}>
              {calDays.map((day, i) => {
                if (!day) return <div key={i} aria-hidden />;
                const ds = `${calMonth.year}-${String(calMonth.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const entry = checkInByDate[ds];
                const isSelected = ds === selectedDate;
                const isToday = ds === today;
                const primaryColor = entry ? (EMOTION_MAP[entry.emotions[0]] ?? "#3b82f6") : null;

                return (
                  <button key={i} onClick={() => selectCalDay(day)} style={{
                    borderRadius: 14, border: isSelected
                      ? `2px solid ${primaryColor ? rgba(primaryColor, 0.5) : "#3b82f6"}`
                      : isToday ? "1.5px solid rgba(59,130,246,0.3)" : "1px solid var(--glass-border)",
                    background: isSelected
                      ? entry ? emotionCalBg(entry.emotions, true) : "rgba(59,130,246,0.08)"
                      : entry ? emotionCalBg(entry.emotions, false) : "transparent",
                    cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    padding: "8px 4px", gap: 4,
                    transition: "all 0.25s ease",
                    minHeight: 56,
                  }}>
                    <span style={{
                      fontSize: "0.9rem", fontWeight: isToday ? 700 : isSelected ? 600 : 400,
                      color: isSelected && primaryColor ? primaryColor : isToday ? "#3b82f6" : "var(--text-main)",
                      lineHeight: 1,
                    }}>{day}</span>
                    {entry && (
                      <div style={{ display: "flex", gap: 2 }}>
                        {entry.emotions.slice(0,3).map(em => (
                          <div key={em} style={{ width: 4, height: 4, borderRadius: "50%", background: EMOTION_MAP[em]??("#3b82f6"), opacity: 0.8 }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
              {EMOTIONS.map(e => (
                <div key={e.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: e.color, boxShadow: `0 0 4px ${e.color}80` }} />
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500 }}>{e.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Snap feed */}
          <div ref={feedRef} style={{
            width: 360, minWidth: 360, overflowY: "scroll",
            scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" as "touch",
          }}>
            {feedDays.map(ds => {
              const entry = checkInByDate[ds];
              const isSelected = ds === selectedDate;
              const isToday = ds === today;
              const isFormOpen = editingDate===ds || (!entry && isToday && editingDate===null) || (!entry && isSelected && editingDate===null);
              const cardRef = (el: HTMLDivElement|null) => { dayRefs.current[ds] = el; };
              const justSaved = savedDate === ds;
              const [, m, d] = ds.split("-").map(Number);
              const dateObj = new Date(parseInt(ds.split("-")[0]), m-1, d);
              const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
              const primaryColor = entry ? (EMOTION_MAP[entry.emotions[0]] ?? "#3b82f6") : null;

              return (
                <div key={ds} ref={cardRef} data-date={ds}
                  onClick={() => { if (!isFormOpen) { setSelectedDate(ds); startEdit(ds); } }}
                  style={{
                    scrollSnapAlign: "start", height: "100%", minHeight: "100%",
                    display: "flex", flexDirection: "column",
                    background: entry ? emotionFeedBg(entry.emotions) : "transparent",
                    borderLeft: `3px solid ${isSelected ? (primaryColor ? rgba(primaryColor, 0.5) : "#3b82f6") : "var(--glass-border)"}`,
                    cursor: isFormOpen ? "default" : "pointer",
                    transition: "border-color 0.3s ease",
                  }}
                >
                  {/* Card top */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {primaryColor && (
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: primaryColor, boxShadow: `0 0 8px ${primaryColor}`, flexShrink: 0 }} />
                      )}
                      <div>
                        <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                          {isToday ? "Today" : `${dayName} ${d}`}
                        </p>
                        {entry && <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>{entry.timeOfDay}</p>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {entry && !isFormOpen && (
                        <button onClick={e => { e.stopPropagation(); setSelectedDate(ds); startEdit(ds); }} style={{
                          background: "rgba(0,0,0,0.04)", border: "1px solid var(--glass-border)", borderRadius: 100,
                          padding: "4px 12px", fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)",
                          cursor: "pointer", transition: "all 0.2s ease",
                        }}>Edit</button>
                      )}
                      {isFormOpen && (
                        <button onClick={e => { e.stopPropagation(); setEditingDate(null); resetForm(); }} style={{
                          width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--glass-border)",
                          background: "rgba(0,0,0,0.04)", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}><X size={12} color="var(--text-muted)" /></button>
                      )}
                    </div>
                  </div>

                  {/* Entry view */}
                  {entry && !isFormOpen && (
                    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {entry.emotions.map((em, i) => {
                          const color = EMOTION_MAP[em] ?? "#3b82f6";
                          return (
                            <div key={em} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, width: 14, textAlign: "right", color: rgba(color, 0.4), flexShrink: 0 }}>{i+1}</span>
                              <span style={{ fontSize: "1.2rem", fontWeight: 600, color, letterSpacing: "-0.02em" }}>{em}</span>
                            </div>
                          );
                        })}
                      </div>
                      {entry.journal && (
                        <p style={{
                          fontSize: "0.875rem", color: "var(--text-main)", lineHeight: 1.65,
                          display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" as "vertical", overflow: "hidden",
                          padding: "12px 14px", borderRadius: 16,
                          background: "rgba(0,0,0,0.03)", border: "1px solid var(--glass-border)",
                        }}>{entry.journal}</p>
                      )}
                      {entry.tags?.length ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {entry.tags.map(t => (
                            <span key={t} style={{
                              fontSize: "0.7rem", padding: "3px 10px", borderRadius: 100,
                              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                              color: "#3b82f6", fontWeight: 500,
                            }}>#{t}</span>
                          ))}
                        </div>
                      ) : null}
                      <button onClick={e => handleCopyForClaude(e, ds, entry)} style={{
                        padding: "8px 0", borderRadius: 12,
                        background: copiedDate===ds ? "rgba(59,130,246,0.06)" : "rgba(0,0,0,0.03)",
                        border: copiedDate===ds ? "1px solid rgba(59,130,246,0.25)" : "1px solid var(--glass-border)",
                        color: copiedDate===ds ? "#3b82f6" : "var(--text-muted)",
                        fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                        transition: "all 0.2s ease", fontFamily: "var(--font-inter)",
                      }}>
                        {copiedDate===ds ? "✓ Copied for Claude" : "Copy for Claude"}
                      </button>
                    </div>
                  )}

                  {/* Empty */}
                  {!entry && !isFormOpen && (
                    <div style={{ padding: "0 20px 20px" }}>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontStyle: "italic" }}>No entry — tap to log</p>
                    </div>
                  )}

                  {/* Form */}
                  {isFormOpen && (
                    <div onClick={e => e.stopPropagation()} style={{
                      padding: "0 20px 20px", display: "flex", flexDirection: "column",
                      gap: 14, overflowY: "auto", flex: 1,
                    }}>
                      {justSaved && (
                        <div style={{ textAlign: "center", padding: "6px 12px", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6", fontSize: "0.75rem", fontWeight: 500 }}>
                          Saved ✓
                        </div>
                      )}

                      {/* Time of day */}
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["morning","afternoon","night"] as const).map(t => (
                          <button key={t} onClick={() => setTimeOfDay(t)} style={{
                            flex: 1, padding: "8px 4px", borderRadius: 12, border: "none",
                            background: timeOfDay===t ? "#3b82f6" : "rgba(0,0,0,0.04)",
                            color: timeOfDay===t ? "#fff" : "var(--text-muted)",
                            fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", textTransform: "capitalize",
                            transition: "all 0.25s ease", fontFamily: "var(--font-inter)",
                          }}>{t}</button>
                        ))}
                      </div>

                      {/* Emotions */}
                      <div>
                        <p style={{ margin: "0 0 8px", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                          Feeling — pick up to 3
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {EMOTIONS.map(e => {
                            const idx = selectedEmotions.indexOf(e.label);
                            const sel = idx !== -1;
                            return (
                              <button key={e.label} onClick={() => toggleEmotion(e.label)} style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "5px 12px", borderRadius: 100,
                                background: sel ? rgba(e.color, 0.12) : "rgba(0,0,0,0.03)",
                                border: sel ? `1.5px solid ${rgba(e.color, 0.4)}` : "1px solid var(--glass-border)",
                                color: sel ? e.color : "var(--text-muted)",
                                fontSize: "0.8rem", fontWeight: sel ? 600 : 400, cursor: "pointer",
                                transition: "all 0.2s ease", fontFamily: "var(--font-inter)",
                              }}>
                                {sel && <span style={{ fontSize: "0.65rem", fontWeight: 700, opacity: 0.6 }}>{idx+1}</span>}
                                {e.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Journal */}
                      <div style={{ position: "relative" }}>
                        <textarea value={journal} onChange={e => setJournal(e.target.value)}
                          placeholder="What's going on today..."
                          rows={5}
                          style={{
                            width: "100%", borderRadius: 16, padding: "12px 14px 36px",
                            resize: "none", outline: "none", boxSizing: "border-box",
                            fontSize: "0.875rem", lineHeight: 1.6,
                            background: "rgba(0,0,0,0.04)", border: "1.5px solid var(--glass-border)",
                            color: "var(--text-main)", fontFamily: "var(--font-inter)",
                            transition: "border-color 0.2s ease",
                          }}
                          onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.4)"}
                          onBlur={e => e.target.style.borderColor = "var(--glass-border)"}
                        />
                        <button onClick={handlePolish} disabled={!journal.trim()||isPolishing} style={{
                          position: "absolute", bottom: 10, right: 10,
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 100,
                          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                          color: isPolishing ? "rgba(59,130,246,0.4)" : "#3b82f6",
                          fontSize: "0.7rem", fontWeight: 500, cursor: !journal.trim()||isPolishing ? "not-allowed" : "pointer",
                          fontFamily: "var(--font-inter)",
                        }}>
                          <Sparkles size={10} /> {isPolishing ? "..." : "Polish"}
                        </button>
                      </div>

                      {/* Tags */}
                      <div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                          {tags.map(t => (
                            <button key={t} onClick={() => setTags(p => p.filter(x => x!==t))} style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "4px 10px", borderRadius: 100,
                              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                              color: "#3b82f6", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                            }}>
                              #{t} <X size={10} />
                            </button>
                          ))}
                        </div>
                        <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                          placeholder="Add tag + Enter"
                          style={{
                            width: "100%", borderRadius: 12, padding: "8px 12px", boxSizing: "border-box",
                            fontSize: "0.8rem", outline: "none",
                            background: "rgba(0,0,0,0.04)", border: "1px solid var(--glass-border)",
                            color: "var(--text-main)", fontFamily: "var(--font-inter)",
                            transition: "border-color 0.2s ease",
                          }}
                          onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.3)"}
                          onBlur={e => e.target.style.borderColor = "var(--glass-border)"}
                        />
                      </div>

                      {/* Save */}
                      <button onClick={() => handleSave(ds)} disabled={!selectedEmotions.length} style={{
                        width: "100%", padding: "12px", borderRadius: 16, border: "none",
                        background: selectedEmotions.length ? "#3b82f6" : "rgba(0,0,0,0.04)",
                        color: selectedEmotions.length ? "#fff" : "var(--text-muted)",
                        fontSize: "0.9rem", fontWeight: 600, cursor: selectedEmotions.length ? "pointer" : "not-allowed",
                        transition: "all 0.3s ease", fontFamily: "var(--font-inter)",
                        letterSpacing: "-0.01em",
                      }}>
                        Save entry
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
