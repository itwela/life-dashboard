"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

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

const EMOTION_MAP = Object.fromEntries(EMOTIONS.map((e) => [e.label, e.color]));

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CheckInView({ onClose }: { onClose: () => void }) {
  const today = toDateStr(new Date());

  const [selectedDate, setSelectedDate] = useState(today);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "night">("morning");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [journal, setJournal] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [savedDate, setSavedDate] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);

  const allCheckIns = useQuery(api.checkIns.list) ?? [];
  const addCheckIn = useMutation(api.checkIns.add);

  const checkInByDate = useMemo(() => {
    const map: Record<string, typeof allCheckIns[0]> = {};
    for (const c of allCheckIns) map[c.date] = c;
    return map;
  }, [allCheckIns]);

  const feedDays = useMemo(() => {
    const { year, month } = calMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return days;
  }, [calMonth]);

  const calDays = useMemo(() => {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calMonth]);

  const monthLabel = new Date(calMonth.year, calMonth.month, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const feedRef = useRef<HTMLDivElement>(null);

  function scrollToDate(ds: string) {
    const el = dayRefs.current[ds];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    setTimeout(() => scrollToDate(today), 150);
  }, []);

  // Sync calendar highlight when feed scrolls
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
            best = entry;
          }
        }
        if (best && best.intersectionRatio > 0.4) {
          const ds = (best.target as HTMLElement).dataset.date;
          if (ds) {
            setSelectedDate(ds);
            const [y, m] = ds.split("-").map(Number);
            setCalMonth((c) => (c.year === y && c.month === m - 1 ? c : { year: y, month: m - 1 }));
          }
        }
      },
      { root: feed, threshold: 0.5 }
    );

    const timeout = setTimeout(() => {
      Object.values(dayRefs.current).forEach((el) => { if (el) observer.observe(el); });
    }, 60);

    return () => { clearTimeout(timeout); observer.disconnect(); };
  }, [feedDays]);

  function selectCalDay(day: number) {
    const ds = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(ds);
    setTimeout(() => scrollToDate(ds), 50);
  }

  function prevMonth() {
    setCalMonth((c) => ({ year: c.month === 0 ? c.year - 1 : c.year, month: c.month === 0 ? 11 : c.month - 1 }));
  }
  function nextMonth() {
    setCalMonth((c) => ({ year: c.month === 11 ? c.year + 1 : c.year, month: c.month === 11 ? 0 : c.month + 1 }));
  }

  function resetForm() {
    setTimeOfDay("morning");
    setSelectedEmotions([]);
    setJournal("");
    setTagInput("");
    setTags([]);
  }

  function startEdit(ds: string) {
    const entry = checkInByDate[ds];
    if (entry) {
      setTimeOfDay(entry.timeOfDay);
      setSelectedEmotions(entry.emotions);
      setJournal(entry.journal ?? "");
      setTags(entry.tags ?? []);
    } else {
      resetForm();
    }
    setEditingDate(ds);
    setSavedDate(null);
  }

  function toggleEmotion(label: string) {
    setSelectedEmotions((prev) => {
      if (prev.includes(label)) return prev.filter((e) => e !== label);
      if (prev.length >= 3) return prev;
      return [...prev, label];
    });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,$/, "");
      if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
      setTagInput("");
    }
  }

  async function handlePolish() {
    if (!journal.trim() || isPolishing) return;
    setIsPolishing(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "arcee-ai/trinity-large-preview:free",
          messages: [
            { role: "system", content: "Fix grammar, punctuation, and capitalization in the user's journal entry. Keep their voice, tone, and meaning exactly as-is. Return only the cleaned text, nothing else." },
            { role: "user", content: journal },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });
      const data = await res.json();
      const cleaned = data.choices?.[0]?.message?.content?.trim();
      if (cleaned) {
        console.log("Polish — before:", journal);
        console.log("Polish — after:", cleaned);
        setJournal(cleaned);
      }
    } catch { /* silently fail */ }
    finally { setIsPolishing(false); }
  }

  async function handleSave(ds: string) {
    if (selectedEmotions.length === 0) return;
    await addCheckIn({
      date: ds,
      timeOfDay,
      emotions: selectedEmotions,
      journal: journal.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    setSavedDate(ds);
    setEditingDate(null);
    resetForm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "linear-gradient(160deg, #060d05 0%, #090f07 50%, #0c1509 100%)",
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-5 h-14"
        style={{ borderBottom: "1px solid rgba(122,176,90,0.1)", background: "rgba(6,10,5,0.92)", backdropFilter: "blur(16px)" }}
      >
        <button
          onClick={onClose}
          className="text-sm transition-colors"
          style={{ color: "rgba(232,224,204,0.85)", fontFamily: "var(--font-dm-sans)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(196,145,42,0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(232,224,204,0.85)")}
        >
          ← Back
        </button>
        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "20px", fontStyle: "italic", fontWeight: 500, color: "rgba(232,224,204,0.85)" }}>
          Check-In
        </span>
        <div className="w-16" />
      </div>

      {/* Body + legend footer */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* LEFT — Big calendar */}
        <div className="flex-1 min-w-0 flex flex-col p-5 overflow-hidden" style={{ borderRight: "1px solid rgba(122,176,90,0.08)" }}>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="text-2xl transition-colors w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "rgba(232,224,204,0.78)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(196,145,42,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(232,224,204,0.78)")}
            >‹</button>
            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", fontStyle: "italic", fontWeight: 500, color: "rgba(232,224,204,0.88)" }}>
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="text-2xl transition-colors w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "rgba(232,224,204,0.78)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(196,145,42,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(232,224,204,0.78)")}
            >›</button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
              <div key={d} className="text-center py-1" style={{ fontSize: "9px", color: "rgba(232,224,204,0.88)", fontFamily: "var(--font-dm-sans)", letterSpacing: "0.06em" }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7" style={{ gap: 3 }}>
            {calDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const ds = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const entry = checkInByDate[ds];
              const primaryColor = entry ? (EMOTION_MAP[entry.emotions[0]] ?? "#7ab05a") : null;
              const isSelected = ds === selectedDate;
              const isToday = ds === today;

              return (
                <button
                  key={i}
                  onClick={() => selectCalDay(day)}
                  className="relative flex flex-col items-center justify-center rounded-md transition-all"
                  style={{
                    aspectRatio: "1",
                    background: isSelected
                      ? primaryColor ? `${primaryColor}18` : "rgba(196,145,42,0.12)"
                      : isToday
                      ? "rgba(232,224,204,0.04)"
                      : "rgba(232,224,204,0.01)",
                    border: isSelected
                      ? `1px solid ${primaryColor ? primaryColor + "45" : "rgba(196,145,42,0.35)"}`
                      : isToday
                      ? "1px solid rgba(196,145,42,0.2)"
                      : "1px solid rgba(122,176,90,0.06)",
                    boxShadow: isSelected && primaryColor ? `0 0 8px ${primaryColor}15` : "none",
                  }}
                >
                  <span style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: "18px",
                    lineHeight: 1,
                    fontWeight: isToday ? 600 : 400,
                    color: isSelected
                      ? primaryColor ?? "rgba(196,145,42,0.9)"
                      : isToday
                      ? "rgba(232,224,204,0.95)"
                      : "rgba(232,224,204,0.85)",
                  }}>
                    {day}
                  </span>
                  {entry && (
                    <div className="flex gap-0.5" style={{ marginTop: 2 }}>
                      {entry.emotions.slice(0, 3).map((em) => {
                        const c = EMOTION_MAP[em] ?? "#7ab05a";
                        return <div key={em} className="rounded-full" style={{ width: 3, height: 3, background: c }} />;
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* RIGHT — TikTok-style snap feed */}
        <div
          ref={feedRef}
          className="overflow-y-scroll"
          style={{ width: 340, minWidth: 340, scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {feedDays.map((ds) => {
            const entry = checkInByDate[ds];
            const isSelected = ds === selectedDate;
            const isToday = ds === today;
            const isFormOpen = editingDate === ds || (!entry && isToday && editingDate === null) || (!entry && isSelected && editingDate === null);
            const cardRef = (el: HTMLDivElement | null) => { dayRefs.current[ds] = el; };
            const justSaved = savedDate === ds;

            const [, m, d] = ds.split("-").map(Number);
            const dateObj = new Date(parseInt(ds.split("-")[0]), m - 1, d);
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const primaryColor = entry ? (EMOTION_MAP[entry.emotions[0]] ?? "#7ab05a") : null;

            return (
              <div
                key={ds}
                ref={cardRef}
                data-date={ds}
                onClick={() => { if (!isFormOpen) { setSelectedDate(ds); startEdit(ds); } }}
                className="overflow-hidden flex flex-col"
                style={{
                  scrollSnapAlign: "start",
                  height: "100%",
                  minHeight: "100%",
                  background: primaryColor
                    ? `linear-gradient(160deg, ${primaryColor}0d, rgba(6,10,5,0.99))`
                    : "rgba(232,224,204,0.01)",
                  borderLeft: isSelected
                    ? `2px solid ${primaryColor ? primaryColor + "50" : "rgba(196,145,42,0.3)"}`
                    : "2px solid rgba(122,176,90,0.06)",
                  cursor: isFormOpen ? "default" : "pointer",
                }}
              >
                {/* Card top bar */}
                <div className="flex items-center justify-between px-4 pt-5 pb-2">
                  <div className="flex items-center gap-2.5">
                    {primaryColor && (
                      <div className="rounded-full shrink-0" style={{ width: 8, height: 8, background: primaryColor, boxShadow: `0 0 7px ${primaryColor}` }} />
                    )}
                    <div>
                      <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "26px", fontStyle: "italic", fontWeight: 500, color: isToday ? "rgba(232,224,204,0.95)" : "rgba(232,224,204,0.75)" }}>
                        {isToday ? "Today" : `${dayName} ${d}`}
                      </p>
                      {entry && <p style={{ fontSize: "12px", color: "rgba(232,224,204,0.75)", letterSpacing: "0.06em", textTransform: "capitalize" }}>{entry.timeOfDay}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry && !isFormOpen && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedDate(ds); startEdit(ds); }}
                        style={{ fontSize: "14px", color: "rgba(196,145,42,0.35)", fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.color = "rgba(196,145,42,0.7)")}
                        onMouseLeave={(ev) => (ev.currentTarget.style.color = "rgba(196,145,42,0.35)")}
                      >
                        Edit
                      </button>
                    )}
                    {isFormOpen && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingDate(null); resetForm(); }}
                        style={{ fontSize: "16px", lineHeight: 1, color: "rgba(232,224,204,0.88)", fontFamily: "var(--font-dm-sans)" }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.color = "rgba(232,224,204,0.75)")}
                        onMouseLeave={(ev) => (ev.currentTarget.style.color = "rgba(232,224,204,0.88)")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Entry view */}
                {entry && !isFormOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      {entry.emotions.map((em, i) => {
                        const color = EMOTION_MAP[em] ?? "#7ab05a";
                        return (
                          <div key={em} className="flex items-center gap-2">
                            <span style={{ fontSize: "13px", fontWeight: 700, width: 16, textAlign: "right", flexShrink: 0, color: `${color}55` }}>{i + 1}</span>
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", fontStyle: "italic", color }}>{em}</span>
                          </div>
                        );
                      })}
                    </div>
                    {entry.journal && (
                      <p style={{ fontSize: "14px", color: "rgba(232,224,204,0.85)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {entry.journal}
                      </p>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {entry.tags.map((t) => (
                          <span key={t} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: 99, background: "rgba(196,145,42,0.08)", border: "1px solid rgba(196,145,42,0.18)", color: "rgba(196,145,42,0.5)" }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!entry && !isFormOpen && (
                  <div className="px-4 pb-4">
                    <p style={{ fontSize: "16px", color: "rgba(232,224,204,0.68)", fontStyle: "italic", fontFamily: "var(--font-cormorant)" }}>No entry — tap to log</p>
                  </div>
                )}

                {/* Form */}
                {isFormOpen && (
                  <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1" onClick={(e) => e.stopPropagation()}>
                    {justSaved && (
                      <div style={{ fontSize: "11px", textAlign: "center", padding: "4px", borderRadius: 8, background: "rgba(122,176,90,0.1)", border: "1px solid rgba(122,176,90,0.2)", color: "rgba(122,176,90,0.85)" }}>Saved</div>
                    )}

                    {/* Time of day */}
                    <div className="flex gap-1.5">
                      {(["morning", "afternoon", "night"] as const).map((t) => (
                        <button key={t} onClick={() => setTimeOfDay(t)}
                          className="flex-1 py-1 rounded-lg capitalize transition-all"
                          style={{
                            fontSize: "13px",
                            background: timeOfDay === t ? "rgba(196,145,42,0.15)" : "rgba(232,224,204,0.03)",
                            border: timeOfDay === t ? "1px solid rgba(196,145,42,0.38)" : "1px solid rgba(122,176,90,0.08)",
                            color: timeOfDay === t ? "rgba(196,145,42,0.9)" : "rgba(232,224,204,0.78)",
                          }}
                        >{t}</button>
                      ))}
                    </div>

                    {/* Emotions */}
                    <div>
                      <p style={{ fontSize: "12px", color: "rgba(232,224,204,0.6)", marginBottom: 6, letterSpacing: "0.04em" }}>
                        Key — pick up to 3 &nbsp;<span style={{ color: "rgba(232,224,204,0.68)" }}>(first = loudest)</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {EMOTIONS.map((e) => {
                          const idx = selectedEmotions.indexOf(e.label);
                          const sel = idx !== -1;
                          return (
                            <button key={e.label} onClick={() => toggleEmotion(e.label)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
                              style={{
                                fontSize: "13px",
                                fontFamily: sel ? "var(--font-cormorant)" : "var(--font-dm-sans)",
                                fontStyle: sel ? "italic" : "normal",
                                background: sel ? `${e.color}15` : "rgba(232,224,204,0.03)",
                                border: sel ? `1px solid ${e.color}40` : "1px solid rgba(122,176,90,0.08)",
                                color: sel ? e.color : "rgba(232,224,204,0.78)",
                              }}
                            >
                              {sel && <span style={{ fontSize: "10px", fontWeight: 700, color: `${e.color}70` }}>{idx + 1}</span>}
                              {e.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Journal */}
                    <div className="relative">
                      <textarea
                        value={journal}
                        onChange={(e) => setJournal(e.target.value)}
                        placeholder="What's going on today..."
                        rows={5}
                        className="w-full rounded-xl p-3 pb-8 resize-none outline-none transition-colors"
                        style={{
                          fontSize: "14px",
                          fontFamily: "var(--font-dm-sans)",
                          background: "rgba(232,224,204,0.03)",
                          border: "1px solid rgba(122,176,90,0.1)",
                          color: "rgba(232,224,204,0.88)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(196,145,42,0.3)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(122,176,90,0.1)")}
                      />
                      <button
                        onClick={handlePolish}
                        disabled={!journal.trim() || isPolishing}
                        className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md transition-all"
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-cormorant)",
                          fontStyle: "italic",
                          background: "rgba(196,145,42,0.1)",
                          border: "1px solid rgba(196,145,42,0.25)",
                          color: isPolishing ? "rgba(196,145,42,0.3)" : "rgba(196,145,42,0.75)",
                          cursor: !journal.trim() || isPolishing ? "not-allowed" : "pointer",
                        }}
                      >
                        ✦ {isPolishing ? "..." : "Polish"}
                      </button>
                    </div>

                    {/* Tags */}
                    <div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {tags.map((t) => (
                          <button key={t} onClick={() => setTags((p) => p.filter((x) => x !== t))}
                            className="flex items-center gap-1 rounded-full"
                            style={{ fontSize: "12px", padding: "3px 10px", background: "rgba(196,145,42,0.08)", border: "1px solid rgba(196,145,42,0.2)", color: "rgba(196,145,42,0.65)" }}
                          >#{t} <span style={{ color: "rgba(232,224,204,0.75)" }}>×</span></button>
                        ))}
                      </div>
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Add tag + Enter"
                        className="w-full rounded-lg px-3 py-1.5 outline-none"
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-dm-sans)",
                          background: "rgba(232,224,204,0.03)",
                          border: "1px solid rgba(122,176,90,0.1)",
                          color: "rgba(232,224,204,0.78)",
                        }}
                      />
                    </div>

                    {/* Save */}
                    <button
                      onClick={() => handleSave(ds)}
                      disabled={selectedEmotions.length === 0}
                      className="w-full py-2 rounded-xl transition-all"
                      style={{
                        fontFamily: "var(--font-cormorant)",
                        fontSize: "15px",
                        fontStyle: "italic",
                        fontWeight: 500,
                        background: selectedEmotions.length > 0
                          ? "linear-gradient(135deg, rgba(196,145,42,0.22), rgba(122,176,90,0.15))"
                          : "rgba(232,224,204,0.03)",
                        border: selectedEmotions.length > 0
                          ? "1px solid rgba(196,145,42,0.35)"
                          : "1px solid rgba(122,176,90,0.08)",
                        color: selectedEmotions.length > 0 ? "rgba(232,224,204,0.88)" : "rgba(232,224,204,0.42)",
                        cursor: selectedEmotions.length > 0 ? "pointer" : "not-allowed",
                      }}
                    >
                      Save entry
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Emotion legend — always visible footer */}
      <div
        className="shrink-0 flex items-center gap-x-4 gap-y-1.5 flex-wrap px-5 py-2.5"
        style={{ borderTop: "1px solid rgba(122,176,90,0.08)", background: "rgba(5,10,4,0.85)", backdropFilter: "blur(12px)" }}
      >
        <span style={{ fontSize: "8px", color: "rgba(232,224,204,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", flexShrink: 0 }}>
          Legend
        </span>
        {EMOTIONS.map((e) => (
          <div key={e.label} className="flex items-center gap-1.5">
            <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: e.color, boxShadow: `0 0 4px ${e.color}80` }} />
            <span style={{ fontSize: "10px", color: "rgba(232,224,204,0.78)", fontFamily: "var(--font-dm-sans)" }}>{e.label}</span>
          </div>
        ))}
      </div>

      </div>
    </div>
  );
}
