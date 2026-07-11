// scripts/sync-calendar.mjs
// Parse the Obsidian vault Hub for calendar-worthy items and seed the dashboard's
// calendarEvents table (source="vault"; manual events are untouched).
//
//   node scripts/sync-calendar.mjs
//
// What it extracts from open `- [ ]` todos:
//   1. Explicit dates ("Sep 5", "Jul 14") -> one event on that date (current year,
//      only if today or later so the calendar isn't littered with stale dates).
//   2. Weekday recurrences ("Mon/Wed/Fri", "— Monday", "Sun, Wed, Fri") -> one event
//      per matching day of the CURRENT month.
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

function cleanTitle(raw) {
  return raw
    .replace(/\*\*/g, "")
    .replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const hub = readFileSync(HUB_PATH, "utf8");
const events = [];

for (const line of hub.split("\n")) {
  const open = line.match(/^\s*- \[ \] (.+)$/);
  if (!open) continue;
  const text = open[1];
  const title = cleanTitle(text.split(/—|--/)[0] || text);

  // 1. Explicit "Mon D" dates anywhere in the line
  for (const m of text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/gi)) {
    const d = new Date(year, MONTHS[m[1].toLowerCase().slice(0, 3)], Number(m[2]));
    const date = fmt(d);
    if (date >= todayStr) {
      events.push({ date, title });
    }
  }

  // 2. Weekday recurrences: require a separator-delimited run of weekday names
  //    ("Sun, Wed, Fri", "Mon/Wed/Fri", "— Monday") so prose mentions don't match.
  const recur = text.match(/(?:—|-)?\s*\b((?:sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?(?:\s*[,/]\s*(?:sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?)*)\b/i);
  if (recur) {
    const days = recur[1]
      .toLowerCase()
      .split(/[,/]/)
      .map((s) => WEEKDAYS[s.trim()])
      .filter((n) => n !== undefined);
    // Single weekday mention must be a real schedule marker ("— Monday"), not prose.
    const isSchedule = days.length >= 2 || /(?:—|-)\s*(sun|mon|tue|wed|thu|fri|sat)/i.test(text);
    if (days.length > 0 && isSchedule) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const date = fmt(d);
        if (days.includes(d.getDay()) && date >= todayStr) {
          events.push({ date, title });
        }
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
for (const e of unique.slice(0, 30)) console.log(` ${e.date}  ${e.title}`);
if (unique.length > 30) console.log(` … and ${unique.length - 30} more`);

const client = new ConvexHttpClient(convexUrl);
const result = await client.mutation(api.dashboard.seedCalendarEvents, { events: unique });
console.log(`Seeded ${result.count} events into the dashboard calendar.`);
