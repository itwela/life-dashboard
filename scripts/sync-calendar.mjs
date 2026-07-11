// scripts/sync-calendar.mjs
// Parse the Obsidian vault Hub for calendar-worthy items and seed the dashboard's
// calendarEvents table (source="vault"; manual events are untouched).
//
//   node scripts/sync-calendar.mjs
//
// Each event carries a concise `title` (the label shown on the month grid) plus the
// FULL `note` (time, who, confirmation #, etc.) and any `link` (Zoom, portal…) so the
// detail shows on the day panel. Two kinds of dated item:
//   1. A line with an explicit "Mon D" date -> one event on that date (this-year, today
//      or later). An explicit date wins: the line is NOT also treated as recurring even
//      if it says "Wed, Jul 22" (the "Wed" is describing that one date, not a schedule).
//   2. A line with NO explicit date but a weekday schedule ("Mon, Wed, Fri", "— Monday")
//      -> one event per matching weekday of the CURRENT month.
import { readFileSync } from "fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const HUB_PATH = "/Users/itwelaibomu/Desktop/Itwela Obsidian/Todos 🟣/! Hub.md";

const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const convexUrl = envLocal.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m)?.[1]?.trim();
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL not found in .env.local");

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const WEEKDAYS = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();
const todayStr = fmt(now);

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// First URL in the line: markdown [text](url) first, else a bare http(s) URL.
function extractLink(text) {
  const md = text.match(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
  if (md) return md[1];
  const bare = text.match(/https?:\/\/[^\s)\]]+/);
  return bare ? bare[0] : undefined;
}

// Full human-readable detail: strip bold, turn [text](url) into "text (url)", turn
// [[wikilink|alias]] into its alias, collapse whitespace. Keeps everything (time, who,
// confirmation #, purpose) so nothing is lost on the day panel.
function cleanNote(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Concise label for the grid chip: the bold segment if present, else the text before the
// first em-dash, capped short.
function makeTitle(text) {
  const bold = text.match(/\*\*([^*]+)\*\*/);
  const base = bold ? bold[1] : text.split(/—|--/)[0] || text;
  return base
    .replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42);
}

// Vague / non-event todos to skip entirely (they aren't calendar-worthy).
const SKIP = [/^career move/i];

const hub = readFileSync(HUB_PATH, "utf8");
const events = [];

for (const line of hub.split("\n")) {
  const open = line.match(/^\s*- \[ \] (.+)$/);
  if (!open) continue;
  const text = open[1];
  const title = makeTitle(text);
  if (SKIP.some((re) => re.test(title))) continue;

  const note = cleanNote(text);
  const link = extractLink(text);
  const base = { title, note, link };

  // 1. Explicit "Mon D" dates — one-time events. If any exist, this line is dated, so
  //    skip weekday recurrence for it entirely.
  const explicit = [...text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/gi)];
  if (explicit.length > 0) {
    for (const m of explicit) {
      const d = new Date(year, MONTHS[m[1].toLowerCase().slice(0, 3)], Number(m[2]));
      const date = fmt(d);
      if (date >= todayStr) events.push({ date, ...base });
    }
    continue;
  }

  // 2. Weekday recurrences (only when there is NO explicit date): a separator-delimited
  //    run of weekday names ("Mon, Wed, Fri", "Mon / Wed / Fri", "— Monday").
  const recur = text.match(/(?:—|-)?\s*\b((?:sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?(?:\s*[,/]\s*(?:sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?)*)\b/i);
  if (recur) {
    const days = recur[1]
      .toLowerCase()
      .split(/[,/]/)
      .map((s) => WEEKDAYS[s.trim()])
      .filter((n) => n !== undefined);
    const isSchedule = days.length >= 2 || /(?:—|-)\s*(sun|mon|tue|wed|thu|fri|sat)/i.test(text);
    if (days.length > 0 && isSchedule) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const date = fmt(d);
        if (days.includes(d.getDay()) && date >= todayStr) events.push({ date, ...base });
      }
    }
  }
}

// Dedupe date+title
const seen = new Set();
const unique = events.filter((e) => {
  const key = `${e.date}|${e.title}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`Parsed ${unique.length} vault events:`);
for (const e of unique.slice(0, 40)) {
  console.log(` ${e.date}  ${e.title}${e.link ? "  🔗" : ""}`);
}
if (unique.length > 40) console.log(` … and ${unique.length - 40} more`);

const client = new ConvexHttpClient(convexUrl);
const result = await client.mutation(api.dashboard.seedCalendarEvents, { events: unique });
console.log(`Seeded ${result.count} events into the dashboard calendar.`);
