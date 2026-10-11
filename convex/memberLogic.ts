/**
 * Pure logic for the three dashboard assistant members.
 *
 * No Convex imports and no side effects, so this is trivially unit-testable and
 * can be reasoned about without a live deployment:
 *   • To-Do member   — natural-language dates, priority, due-date bucketing
 *   • Schedule member — time helpers, overlap detection, free-gap finding
 *   • Check-In member — streaks, mood patterns, adaptive prompts, daily briefing
 */

// ── Shared date helpers ────────────────────────────────────────────────────────

/** Local-time "YYYY-MM-DD" (never use toISOString — it shifts by timezone). */
export function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a "YYYY-MM-DD" key as *local* midnight. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Add n days to a day key (calendar-safe across DST). */
export function addDays(key: string, n: number): string {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

/** Whole days from day key `a` to day key `b` (b - a). Negative = b is in the past. */
export function daysBetween(a: string, b: string): number {
  const MS = 86_400_000;
  const da = fromDayKey(a);
  const db = fromDayKey(b);
  return Math.round((db.getTime() - da.getTime()) / MS);
}

// ── Time-of-day helpers (Schedule member) ──────────────────────────────────────

/** "HH:MM" → minutes since midnight. Returns null for malformed input. */
export function parseTime(t?: string): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** minutes since midnight → "HH:MM". */
export function formatTime(mins: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(mins)));
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "07:30" → "7:30 AM" for display. */
export function prettyTime(t?: string): string {
  const mins = parseTime(t);
  if (mins === null) return "";
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export interface TimeSpan {
  start: number; // minutes since midnight
  end: number;
}

/** Normalize a timed item to a span. Untimed or inverted spans return null. */
export function toSpan(start?: string, end?: string): TimeSpan | null {
  const s = parseTime(start);
  if (s === null) return null;
  const rawEnd = parseTime(end);
  // An event with a start but no end gets a 30-minute default so it still draws.
  const e = rawEnd === null ? s + 30 : rawEnd;
  if (e <= s) return null;
  return { start: s, end: e };
}

export function spansOverlap(a: TimeSpan, b: TimeSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Free gaps inside the `[from, to]` window that no span occupies.
 * Gaps shorter than `minGap` minutes are dropped. Used for the agenda's
 * "you have 2h free at 14:00" line.
 *
 * Takes an options object on purpose — this was briefly positional and was
 * trivially mis-callable (`findFreeGaps(spans, 360)` reads like a 360-minute
 * minimum gap but actually moved the window start to 06:00).
 */
export function findFreeGaps(
  spans: TimeSpan[],
  opts: { from?: string; to?: string; minGap?: number } = {},
): TimeSpan[] {
  const fromM = parseTime(opts.from ?? "06:00") ?? 6 * 60;
  const toM = parseTime(opts.to ?? "22:00") ?? 22 * 60;
  const minGap = opts.minGap ?? 30;
  if (toM <= fromM) return [];

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const gaps: TimeSpan[] = [];
  let cursor = fromM;
  for (const s of sorted) {
    if (s.start > cursor && s.start - cursor >= minGap) {
      gaps.push({ start: cursor, end: s.start });
    }
    cursor = Math.max(cursor, s.end);
  }
  if (toM - cursor >= minGap) {
    gaps.push({ start: cursor, end: toM });
  }
  return gaps;
}

// ── Recurrence (weekly series) ─────────────────────────────────────────────────

/**
 * First `dayOfWeek` (0=Sun…6=Sat) on or after `from`.
 * Calling this with today's date is what makes a weekly series include today
 * when today already *is* the drop day.
 */
export function nextOccurrenceOnOrAfter(from: string, dayOfWeek: number): string {
  const current = fromDayKey(from).getDay();
  const delta = (dayOfWeek - current + 7) % 7;
  return addDays(from, delta);
}

/**
 * Every weekly occurrence in the inclusive window `[from, to]`.
 *
 * Hard-capped at 600 iterations so a fat-fingered horizon (year 3000) can never
 * spin forever — the caller gets a truncated list instead of a hung function.
 */
export function occurrencesWithin(
  start: string,
  dayOfWeek: number,
  from: string,
  to: string,
): string[] {
  const out: string[] = [];
  if (to < from) return out;
  let cursor = nextOccurrenceOnOrAfter(start, dayOfWeek);
  if (cursor < from) cursor = nextOccurrenceOnOrAfter(from, dayOfWeek);
  let guard = 0;
  while (cursor <= to && guard++ < 600) {
    out.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return out;
}

/** "Every Sunday" / "Every Mon, Wed" — human label for a recurrence rule. */
export function repeatLabel(days: number[]): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  if (sorted.length === 1) return `Every ${names[sorted[0]]}`;
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `Every ${sorted.map((d) => short[d]).join(", ")}`;
}

// ── To-Do member ───────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high";
export type TodoBucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "later"
  | "someday";

/** Minimal shape the logic needs — structurally compatible with Doc<"todos">. */
export interface TodoLike {
  text: string;
  category: string;
  done: boolean;
  order: number;
  priority?: Priority;
  dueDate?: string;
  completedAt?: number;
}

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_META: Record<Priority, { label: string; color: string; rank: number }> = {
  high: { label: "High", color: "#f87171", rank: 0 },
  medium: { label: "Medium", color: "#fbbf24", rank: 1 },
  low: { label: "Low", color: "#60a5fa", rank: 2 },
};

export const DEFAULT_PRIORITY: Priority = "medium";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export interface ParsedCapture {
  text: string;
  dueDate?: string;
  priority: Priority;
}

/**
 * Pull a due date and a priority out of a quick-capture string.
 *
 *   "pay rent friday !high"   → { text: "pay rent", dueDate: <this/next Fri>, priority: "high" }
 *   "call mom tomorrow"       → { text: "call mom", dueDate: <tomorrow>,     priority: "medium" }
 *   "read chapter"            → { text: "read chapter",                       priority: "medium" }
 *
 * Only the *first* matching date phrase is consumed, and the remaining text is
 * tidied so the stored to-do stays readable.
 */
export function parseQuickCapture(raw: string, today = toDayKey(new Date())): ParsedCapture {
  let rest = ` ${raw.trim()} `;
  let priority: Priority = DEFAULT_PRIORITY;
  let dueDate: string | undefined;

  // Priority: "!high", "!h", "p1".."p3", or trailing "high priority".
  const bang = /!(high|med|medium|low|h|m|l)\b/i.exec(rest);
  if (bang) {
    priority = normalizePriorityToken(bang[1]);
    rest = rest.replace(bang[0], " ");
  } else {
    const pNum = /\bp([123])\b/i.exec(rest);
    if (pNum) {
      priority = pNum[1] === "1" ? "high" : pNum[1] === "2" ? "medium" : "low";
      rest = rest.replace(pNum[0], " ");
    }
  }

  // Date phrases, most specific first.
  const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(rest);
  if (iso) {
    dueDate = iso[1];
    rest = rest.replace(iso[0], " ");
  } else {
    const rel = /\b(today|tonight|tomorrow|tmrw|next week|next month)\b/i.exec(rest);
    if (rel) {
      const tok = rel[1].toLowerCase();
      if (tok === "today" || tok === "tonight") dueDate = today;
      else if (tok === "tomorrow" || tok === "tmrw") dueDate = addDays(today, 1);
      else if (tok === "next week") dueDate = addDays(today, 7);
      else dueDate = addDays(today, 30);
      rest = rest.replace(rel[0], " ");
    } else {
      const inDays = /\bin (\d{1,3}) (day|days|week|weeks)\b/i.exec(rest);
      if (inDays) {
        const n = Number(inDays[1]);
        dueDate = addDays(today, /week/i.test(inDays[2]) ? n * 7 : n);
        rest = rest.replace(inDays[0], " ");
      } else {
        // "friday", "fri", or "on friday"
        const wd = new RegExp(`\\b(on\\s+)?(${WEEKDAYS.map((w) => `${w}|${w.slice(0, 3)}`).join("|")})\\b`, "i").exec(rest);
        if (wd) {
          const idx = WEEKDAYS.findIndex(
            (w) => w === wd[2].toLowerCase() || w.slice(0, 3) === wd[2].toLowerCase(),
          );
          if (idx >= 0) {
            let delta = (idx - fromDayKey(today).getDay() + 7) % 7;
            if (delta === 0) delta = 7; // "friday" said on a Friday means next Friday
            dueDate = addDays(today, delta);
            rest = rest.replace(wd[0], " ");
          }
        } else {
          // "oct 24", "october 24"
          const md = new RegExp(`\\b(${MONTHS.map((m) => `${m}|${m.slice(0, 3)}`).join("|")})\\.?\\s+(\\d{1,2})\\b`, "i").exec(rest);
          if (md) {
            const mi = MONTHS.findIndex(
              (m) => m === md[1].toLowerCase() || m.slice(0, 3) === md[1].toLowerCase(),
            );
            const day = Number(md[2]);
            if (mi >= 0 && day >= 1 && day <= 31) {
              let year = fromDayKey(today).getFullYear();
              const candidate = new Date(year, mi, day);
              // A date already behind us rolls to next year.
              if (toDayKey(candidate) < today) candidate.setFullYear(++year);
              dueDate = toDayKey(candidate);
              rest = rest.replace(md[0], " ");
            }
          }
        }
      }
    }
  }

  return { text: tidy(rest), dueDate, priority };
}

function normalizePriorityToken(tok: string): Priority {
  const t = tok.toLowerCase();
  if (t === "high" || t === "h") return "high";
  if (t === "low" || t === "l") return "low";
  return "medium";
}

/** Collapse the whitespace left behind by removing date/priority tokens. */
function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Bucket an open to-do by its due date relative to `today`. */
export function bucketFor(todo: TodoLike, today: string): TodoBucket {
  if (!todo.dueDate) return "someday";
  const delta = daysBetween(today, todo.dueDate);
  if (delta < 0) return "overdue";
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta <= 7) return "this_week";
  return "later";
}

export const BUCKET_ORDER: TodoBucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "later",
  "someday",
];

/** Urgency-first ordering: overdue → soonest due → highest priority → manual order. */
export function sortTodos<T extends TodoLike>(todos: T[], today: string): T[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ad = a.dueDate ?? "9999-99-99";
    const bd = b.dueDate ?? "9999-99-99";
    if (ad !== bd) return ad < bd ? -1 : 1;
    const ap = PRIORITY_WEIGHT[a.priority ?? DEFAULT_PRIORITY];
    const bp = PRIORITY_WEIGHT[b.priority ?? DEFAULT_PRIORITY];
    if (ap !== bp) return ap - bp;
    return a.order - b.order;
  });
}

/** "Today", "Tomorrow", "Fri Oct 24" — the short label shown on a to-do row. */
export function dueLabel(dueDate: string | undefined, today: string): string {
  if (!dueDate) return "";
  const delta = daysBetween(today, dueDate);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  if (delta < 0) return `${Math.abs(delta)}d overdue`;
  if (delta <= 6) {
    return fromDayKey(dueDate).toLocaleDateString("en-US", { weekday: "short" });
  }
  return fromDayKey(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * The to-do member's headline stats. `focus` is the "do this next" shortlist the
 * dashboard card surfaces: overdue + due today, most urgent first.
 */
export function todoSummary(todos: TodoLike[], today: string): {
  open: number;
  done: number;
  overdue: number;
  dueToday: number;
  focus: TodoLike[];
} {
  const open = todos.filter((t) => !t.done);
  const done = todos.length - open.length;
  const sorted = sortTodos(open, today);
  return {
    open: open.length,
    done,
    overdue: open.filter((t) => bucketFor(t, today) === "overdue").length,
    dueToday: open.filter((t) => bucketFor(t, today) === "today").length,
    focus: sorted.filter((t) => {
      const b = bucketFor(t, today);
      return b === "overdue" || b === "today";
    }),
  };
}

// ── Check-In member ────────────────────────────────────────────────────────────

export interface CheckInLike {
  date: string;
  timeOfDay: "morning" | "afternoon" | "night";
  emotions: string[];
  journal?: string;
  tags?: string[];
  createdAt: number;
  energy?: number;
  focus?: number;
}

export type CheckInStatus = "logged_today" | "streak_at_risk" | "streak_broken" | "no_history";

export interface StreakInfo {
  current: number;
  longest: number;
  lastDate?: string;
  status: CheckInStatus;
}

/**
 * Consecutive-day streak over check-ins.
 *
 * A day still counts as "alive" until it ends, so checking in yesterday but not
 * yet today keeps the streak intact and reports `streak_at_risk` rather than
 * silently resetting it.
 */
export function computeStreak(checkIns: CheckInLike[], today = toDayKey(new Date())): StreakInfo {
  const dates = [...new Set(checkIns.map((c) => c.date))].sort();
  if (dates.length === 0) {
    return { current: 0, longest: 0, status: "no_history" };
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const last = dates[dates.length - 1];
  const gap = daysBetween(last, today); // 0 = today, 1 = yesterday
  let current = 0;
  let status: CheckInStatus;

  if (gap === 0) {
    current = run;
    status = "logged_today";
  } else if (gap === 1) {
    current = run;
    status = "streak_at_risk";
  } else {
    current = 0;
    status = "streak_broken";
  }

  return { current, longest, lastDate: last, status };
}

export interface MoodPattern {
  /** Emotion → number of appearances, loudest-first ordering. */
  top: { emotion: string; count: number }[];
  avgEnergy?: number;
  avgFocus?: number;
  /** Share of days logged in the window, 0–1. */
  consistency: number;
  /** timeOfDay → count. */
  byTimeOfDay: Record<string, number>;
  /** How many days the current top emotion has repeated in a row. */
  topEmotionRun: number;
}

/** Aggregate emotions/energy over the trailing `windowDays`. */
export function analyzeMood(
  checkIns: CheckInLike[],
  windowDays = 30,
  today = toDayKey(new Date()),
): MoodPattern {
  const cutoff = addDays(today, -(windowDays - 1));
  const inWindow = checkIns.filter((c) => c.date >= cutoff && c.date <= today);

  const counts = new Map<string, number>();
  for (const c of inWindow) {
    for (const e of c.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count || a.emotion.localeCompare(b.emotion));

  const withEnergy = inWindow.filter((c) => typeof c.energy === "number");
  const withFocus = inWindow.filter((c) => typeof c.focus === "number");
  const mean = (ns: number[]) =>
    ns.length === 0 ? undefined : ns.reduce((s, n) => s + n, 0) / ns.length;

  const byTimeOfDay: Record<string, number> = {};
  for (const c of inWindow) {
    byTimeOfDay[c.timeOfDay] = (byTimeOfDay[c.timeOfDay] ?? 0) + 1;
  }

  // Walk back from the most recent check-in while the loudest emotion repeats.
  const chronological = [...inWindow].sort((a, b) => (a.date < b.date ? -1 : 1));
  let topEmotionRun = 0;
  const latestTop = chronological[chronological.length - 1]?.emotions[0];
  if (latestTop) {
    for (let i = chronological.length - 1; i >= 0; i--) {
      if (chronological[i].emotions[0] === latestTop) topEmotionRun++;
      else break;
    }
  }

  return {
    top,
    avgEnergy: mean(withEnergy.map((c) => c.energy as number)),
    avgFocus: mean(withFocus.map((c) => c.focus as number)),
    consistency: inWindow.length / windowDays,
    byTimeOfDay,
    topEmotionRun,
  };
}

/** The time-of-day slot that matches the current clock time. */
export function currentSlot(
  now = new Date(),
  times: { morningTime: string; afternoonTime: string; nightTime: string },
): "morning" | "afternoon" | "night" {
  const mins = now.getHours() * 60 + now.getMinutes();
  const morning = parseTime(times.morningTime) ?? 8 * 60;
  const afternoon = parseTime(times.afternoonTime) ?? 14 * 60;
  const night = parseTime(times.nightTime) ?? 21 * 60;
  if (mins < afternoon) return mins < morning ? "morning" : "morning";
  if (mins < night) return "afternoon";
  return "night";
}

export interface Nudge {
  kind: "checkin_due" | "streak_risk" | "streak_broken" | "streak_milestone" | "quiet";
  message: string;
  urgency: "low" | "medium" | "high";
  /** Time-of-day the nudge is asking about. */
  slot: "morning" | "afternoon" | "night";
}

export interface NudgeContext {
  checkIns: CheckInLike[];
  streak: StreakInfo;
  now?: Date;
  times?: { morningTime: string; afternoonTime: string; nightTime: string };
  nudgesEnabled?: boolean;
  /** True when today already has a check-in. */
  loggedToday: boolean;
}

/**
 * Decide what (if anything) to say to you right now. Silence is a valid answer:
 * when everything's on track this returns the `quiet` kind so the UI can hide.
 */
export function buildNudge(ctx: NudgeContext): Nudge {
  const now = ctx.now ?? new Date();
  const times = ctx.times ?? { morningTime: "08:00", afternoonTime: "14:00", nightTime: "21:00" };
  const slot = currentSlot(now, times);

  if (ctx.nudgesEnabled === false) {
    return { kind: "quiet", message: "", urgency: "low", slot };
  }

  if (ctx.loggedToday) {
    if (ctx.streak.current > 0 && ctx.streak.current % 7 === 0) {
      return {
        kind: "streak_milestone",
        message: `${ctx.streak.current} days in a row — logged and steady.`,
        urgency: "low",
        slot,
      };
    }
    return { kind: "quiet", message: "", urgency: "low", slot };
  }

  if (ctx.streak.status === "no_history") {
    return {
      kind: "checkin_due",
      message: "No check-ins yet. One line about today is enough to start.",
      urgency: "low",
      slot,
    };
  }

  if (ctx.streak.status === "streak_at_risk") {
    return {
      kind: "streak_risk",
      message: `${ctx.streak.current}-day streak — today isn't logged yet.`,
      urgency: slot === "night" ? "high" : "medium",
      slot,
    };
  }

  return {
    kind: "streak_broken",
    message:
      ctx.streak.current === 0
        ? "Streak restarted at zero. Pick it back up with today."
        : "A gap showed up in your check-ins — worth logging today.",
    urgency: "medium",
    slot,
  };
}

/**
 * Adaptive journal prompts. Picks 2–3 follow-ups that reference what you
 * actually logged recently instead of asking the same generic question.
 */
export function adaptivePrompts(
  checkIns: CheckInLike[],
  slot: "morning" | "afternoon" | "night",
  today = toDayKey(new Date()),
): string[] {
  const recent = [...checkIns].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  const patterns = analyzeMood(checkIns, 30, today);
  const prompts: string[] = [];

  if (recent.length === 0) {
    return slot === "morning"
      ? ["What's the one thing that would make today count?", "How are you arriving today — rested, wired, flat?"]
      : ["What actually happened today?", "What's one thing you'd keep from today?"];
  }

  const latest = recent[0];
  const loudest = latest.emotions[0];

  if (loudest && patterns.topEmotionRun >= 2) {
    prompts.push(`"${loudest}" has shown up ${patterns.topEmotionRun} days running — what's feeding it?`);
  } else if (loudest) {
    prompts.push(`You named "${loudest}" last time. Has that moved?`);
  }

  if (typeof patterns.avgEnergy === "number" && patterns.avgEnergy < 3) {
    prompts.push("Energy has been running low this stretch — what's draining it?");
  } else if (typeof patterns.avgEnergy === "number" && patterns.avgEnergy >= 4) {
    prompts.push("Energy's been high lately. What's been working?");
  }

  if (typeof patterns.avgFocus === "number" && patterns.avgFocus < 3) {
    prompts.push("Focus has been scattered — what's one thing you could cut?");
  }

  if (latest.journal && latest.journal.trim().length < 40) {
    prompts.push("Last entry was short. What's the part you left out?");
  }

  if (slot === "night") prompts.push("What's one thing worth carrying into tomorrow?");
  if (slot === "morning") prompts.push("What would make this a good day, not just a busy one?");

  return [...new Set(prompts)].slice(0, 3);
}
