"use client";

import { useState, useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { api } from "../../../../convex/_generated/api";
import {
  buildNudge,
  analyzeMood,
  adaptivePrompts,
  currentSlot,
  addDays,
} from "../../../../convex/memberLogic";
import { X, CalendarCheck, Bell, ArrowRight } from "lucide-react";
import { ACCENT, URGENCY_COLOR, hexA, surface, prettyDay } from "./checkinTheme";
import { BriefingGlance, StreakStrip, MoodInsights, PromptPicker, ReminderRow } from "./CheckinSections";

type Briefing = FunctionReturnType<typeof api.memberData.getBriefing>;
type CheckInDoc = Doc<"checkIns">; // already includes energy?: number, focus?: number

interface Props {
  dayKey: string; // TODAY as "YYYY-MM-DD"
  isDark: boolean;
  checkIns: CheckInDoc[];
  streak: {
    current: number;
    longest: number;
    lastDate?: string;
    status: "logged_today" | "streak_at_risk" | "streak_broken" | "no_history";
  };
  routine: { morningTime: string; afternoonTime: string; nightTime: string; nudgesEnabled: boolean };
  briefing: Briefing | undefined; // undefined while the query loads
  saveCheckInRoutine: (args: {
    morningTime: string;
    afternoonTime: string;
    nightTime: string;
    nudgesEnabled: boolean;
  }) => Promise<unknown>;
  onOpenCheckIn: () => void; // opens the existing full CheckInView flow
  onClose: () => void;
}

/**
 * Check-In member: "how am I doing overall".
 *
 * Reads only what the parent hands it — the daily briefing, the 30-day mood
 * rollup, the streak, and the nudge decision — and hands journaling back to the
 * existing CheckInView via onOpenCheckIn.
 */
export default function CheckinMemberPanel({
  dayKey,
  isDark,
  checkIns,
  streak,
  routine,
  briefing,
  saveCheckInRoutine,
  onOpenCheckIn,
  onClose,
}: Props) {
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const mainText = isDark ? "text-white" : "text-black";
  const mutedText = isDark ? "text-white/40" : "text-black/40";

  // ── Derived data ─────────────────────────────────────────────────────────────

  const loggedDates = useMemo(() => new Set(checkIns.map((c) => c.date)), [checkIns]);

  const last14 = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(dayKey, i - 13)), [dayKey]);

  const nudge = useMemo(
    () =>
      buildNudge({
        checkIns,
        streak,
        loggedToday: briefing?.loggedToday ?? false,
        times: routine,
        nudgesEnabled: routine.nudgesEnabled,
      }),
    [checkIns, streak, briefing?.loggedToday, routine],
  );

  const pattern = useMemo(() => analyzeMood(checkIns, 30, dayKey), [checkIns, dayKey]);

  const slot = currentSlot(new Date(), routine);
  const prompts = useMemo(() => adaptivePrompts(checkIns, slot, dayKey), [checkIns, slot, dayKey]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className={mainText}
      style={{
        fontFamily: "var(--font-inter)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${ACCENT}, #fbbf24)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CalendarCheck size={17} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Check-In</p>
            <p className={mutedText} style={{ margin: "1px 0 0", fontSize: "0.75rem" }}>
              {prettyDay(dayKey)} · how you&apos;re doing overall
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close check-in member"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <X size={14} className={mutedText} />
        </button>
      </div>

      {/* Nudge banner — nothing renders when the engine says quiet */}
      {!nudgeDismissed && nudge.kind !== "quiet" && (
        <div
          style={{
            ...surface(isDark),
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: hexA(URGENCY_COLOR[nudge.urgency], isDark ? 0.12 : 0.07),
            border: `1px solid ${hexA(URGENCY_COLOR[nudge.urgency], 0.35)}`,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: hexA(URGENCY_COLOR[nudge.urgency], 0.16),
              color: URGENCY_COLOR[nudge.urgency],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Bell size={15} />
          </span>
          <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: "0.85rem", fontWeight: 500, lineHeight: 1.45 }}>
            {nudge.message}
          </p>
          <button
            onClick={onOpenCheckIn}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              borderRadius: 100,
              border: "none",
              background: URGENCY_COLOR[nudge.urgency],
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: "var(--font-inter)",
            }}
          >
            Check in now <ArrowRight size={13} />
          </button>
          <button
            onClick={() => setNudgeDismissed(true)}
            aria-label="Dismiss nudge"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              flexShrink: 0,
            }}
          >
            <X size={13} style={{ color: URGENCY_COLOR[nudge.urgency], opacity: 0.7 }} />
          </button>
        </div>
      )}

      {/* Headline: today at a glance */}
      <BriefingGlance briefing={briefing} isDark={isDark} dayKey={dayKey} />

      {/* Streak + 14-day dots */}
      <StreakStrip streak={streak} isDark={isDark} dayKey={dayKey} loggedDates={loggedDates} last14={last14} />

      {/* Mood insights + adaptive prompts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <MoodInsights pattern={pattern} isDark={isDark} />
        <PromptPicker prompts={prompts} slot={slot} isDark={isDark} onUse={onOpenCheckIn} />
      </div>

      {/* Inline reminder settings */}
      <ReminderRow
        routine={routine}
        streak={streak}
        isDark={isDark}
        saveCheckInRoutine={saveCheckInRoutine}
      />
    </div>
  );
}
