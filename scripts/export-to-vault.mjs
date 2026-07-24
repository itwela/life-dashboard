// Export dashboard todos + calendar to the Obsidian vault as markdown.
// Dashboard (Convex) is the source of truth; this writes an owned, read-only
// markdown mirror into the vault so the data stays portable + Claude-readable.
//
// Usage: node scripts/export-to-vault.mjs
// Env overrides:
//   CONVEX_URL   (default: the life-dashboard dev deployment)
//   VAULT_DIR    (default: this Mac's vault path)

import { ConvexHttpClient } from "convex/browser";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const CONVEX_URL =
  process.env.CONVEX_URL || "https://shiny-sheep-575.convex.cloud";
const VAULT_DIR =
  process.env.VAULT_DIR || "/Users/itwelaibomu/Desktop/Itwela Obsidian";
const OUT = join(VAULT_DIR, "Todos 🟣", "Dashboard Export.md");

const client = new ConvexHttpClient(CONVEX_URL);

const [todos, events] = await Promise.all([
  client.query("dashboard:getTodos", {}),
  client.query("dashboard:getCalendarEvents", {}),
]);

const now = new Date();
const stamp = now.toLocaleString("en-US", {
  timeZone: "America/New_York",
  dateStyle: "medium",
  timeStyle: "short",
});

const box = (done) => (done ? "- [x]" : "- [ ]");

// ---- Todos, grouped by category in a stable order ----
const CAT_ORDER = [
  "Morning",
  "Today",
  "Creative",
  "Care",
  "Mechanics",
  "Work",
  "Content",
];
const byCat = new Map();
for (const t of todos) {
  if (!byCat.has(t.category)) byCat.set(t.category, []);
  byCat.get(t.category).push(t);
}
const cats = [
  ...CAT_ORDER.filter((c) => byCat.has(c)),
  ...[...byCat.keys()].filter((c) => !CAT_ORDER.includes(c)),
];

let out = "";
out += "---\ntags: [todo, dashboard-export]\n---\n\n";
out += "# Dashboard Export\n\n";
out +=
  "> Auto-generated mirror of the Life Dashboard todos + calendar.\n" +
  "> The dashboard is the source of truth — **do not hand-edit this file**, changes get overwritten.\n" +
  `> Last exported: ${stamp} ET\n\n`;

out += "## Todos\n\n";
for (const cat of cats) {
  const items = byCat.get(cat).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const openCount = items.filter((i) => !i.done).length;
  out += `### ${cat} (${openCount} open / ${items.length})\n\n`;
  for (const t of items) out += `${box(t.done)} ${t.text}\n`;
  out += "\n";
}

// ---- Calendar, grouped by date ----
out += "## Calendar\n\n";
const evByDate = new Map();
for (const e of events) {
  if (!evByDate.has(e.date)) evByDate.set(e.date, []);
  evByDate.get(e.date).push(e);
}
const dates = [...evByDate.keys()].sort();
for (const d of dates) {
  out += `### ${d}\n\n`;
  for (const e of evByDate.get(d)) {
    const done = e.done || e.status === "done";
    let line = `${box(done)} ${e.title}`;
    if (e.note) line += ` — ${e.note}`;
    if (e.link) line += ` (${e.link})`;
    out += line + "\n";
  }
  out += "\n";
}

writeFileSync(OUT, out, "utf8");
console.log(
  `Exported ${todos.length} todos + ${events.length} calendar events → ${OUT}`
);
