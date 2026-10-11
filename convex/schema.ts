import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  accounts: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("checking"),
      v.literal("savings"),
      v.literal("investment"),
      v.literal("debt"),
      v.literal("other")
    ),
    balance: v.number(),
    updatedAt: v.number(),
    investmentType: v.optional(v.string()), // e.g. brokerage, 401k, ira, crypto, other
  }),

  financeFiles: defineTable({
    name: v.string(),
    storageId: v.id("_storage"),
    addedAt: v.number(),
    notes: v.optional(v.string()),
  }).index("by_added", ["addedAt"]),

  // Single-row profile: uploaded avatar + circular crop transform (zoom + pan).
  profile: defineTable({
    avatarStorageId: v.optional(v.id("_storage")),
    scale: v.optional(v.number()),
    tx: v.optional(v.number()),
    ty: v.optional(v.number()),
  }),

  // Personal records vault — diploma, certificates, IDs, anything worth keeping on file.
  documents: defineTable({
    title: v.string(),
    category: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
    note: v.optional(v.string()),
    addedAt: v.number(),
    issuedDate: v.optional(v.string()), // when it was earned/received (YYYY-MM-DD)
  }).index("by_added", ["addedAt"]),

  transactions: defineTable({
    label: v.string(),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.string(),
    date: v.number(),
  }).index("by_date", ["date"]),

  courses: defineTable({
    name: v.string(),
    creditUnits: v.number(),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    startDate: v.optional(v.number()),
    completedDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  }),

  schoolProgress: defineTable({
    totalCU: v.number(),
    earnedCU: v.number(),
    activeCount: v.number(),
    termsCompleted: v.number(),
    termsTotal: v.number(),
    updatedAt: v.number(),
  }),

  books: defineTable({
    title: v.string(),
    author: v.string(),
    status: v.union(
      v.literal("want_to_read"),
      v.literal("reading"),
      v.literal("completed")
    ),
    startDate: v.optional(v.number()),
    completedDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  }),

  workouts: defineTable({
    date: v.number(),
    exerciseType: v.string(),
    duration: v.number(),
    notes: v.optional(v.string()),
  }).index("by_date", ["date"]),

  // Your planned workout days (0=Sun, 1=Mon, ... 6=Sat). Default: Sun, Tue, Thu, Fri
  workoutSchedule: defineTable({
    scheduleDays: v.array(v.number()),
    updatedAt: v.number(),
  }),

  // Days you marked as missed (start-of-day timestamp)
  workoutMissedDays: defineTable({
    date: v.number(),
  }).index("by_date", ["date"]),

  contentPosts: defineTable({
    title: v.string(),
    platform: v.string(),
    type: v.union(
      v.literal("beat"),
      v.literal("video"),
      v.literal("article"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("idea"),
      v.literal("in_progress"),
      v.literal("published")
    ),
    publishedDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  }),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("shipped")
    ),
    revenue: v.number(),
    notes: v.optional(v.string()),
  }),

  todos: defineTable({
    text: v.string(),
    category: v.string(), // vault section, e.g. "Today", "Work", "Creative"
    done: v.boolean(),
    order: v.number(),    // preserves vault ordering
    // ── To-Do member fields (all optional so existing rows/inserts stay valid) ──
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    dueDate: v.optional(v.string()), // "YYYY-MM-DD" — due day. Absent = someday/no date.
    notes: v.optional(v.string()),
    completedAt: v.optional(v.number()), // epoch ms, stamped when marked done
  }).index("by_order", ["order"])
    .index("by_due", ["dueDate"]),

  // Month calendar events. Everything is written from the UI/agent as "manual".
  // "vault" is LEGACY: it came from the retired scripts/sync-calendar.mjs Obsidian
  // import, which no longer exists, so no new vault rows are ever produced. The
  // literal is kept only so the old rows still validate — do not write it again.
  calendarEvents: defineTable({
    date: v.string(), // "YYYY-MM-DD" — start day
    endDate: v.optional(v.string()), // "YYYY-MM-DD" — last day; writers clamp this so it is never before `date`. When set and > date, the event draws as a spanning bar
    title: v.string(),
    source: v.union(v.literal("vault"), v.literal("manual")),
    note: v.optional(v.string()), // full detail (time, who, confirmation #, etc.)
    link: v.optional(v.string()), // associated URL (Zoom, portal, scholarship page…)
    done: v.optional(v.boolean()), // completed — stays on the calendar, struck through
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))), // 3-state; falls back to `done`
    // ── Schedule member fields ──
    startTime: v.optional(v.string()), // "HH:MM" 24h. Absent = all-day / untimed event.
    endTime: v.optional(v.string()),   // "HH:MM" 24h. Clamped >= startTime by writers.
    location: v.optional(v.string()),
    category: v.optional(v.string()),  // "Class" | "Work" | "Personal" | "Health" | anything
  }).index("by_date", ["date"]),

  // ── Schedule member: recurring weekly routines (gym at 07:00, class Tue/Thu 18:00…) ──
  routines: defineTable({
    title: v.string(),
    days: v.array(v.number()), // ISO-ish: 0=Sun … 6=Sat (matches workoutSchedule convention)
    startTime: v.optional(v.string()), // "HH:MM"
    endTime: v.optional(v.string()),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["active"]),

  // ── Recurring weekly series (a show that drops every Sunday, a standing call) ──
  // The rule is the durable record; `materializeRecurring` expands it into real
  // calendarEvents rows so it shows up in the month calendar and the Schedule
  // member's agenda. Instances are keyed by (title, date) and skipped if present,
  // which makes re-running materialization safe.
  recurringEvents: defineTable({
    title: v.string(),
    note: v.optional(v.string()),
    link: v.optional(v.string()),
    category: v.optional(v.string()), // "Entertainment", "Work"…
    recurDays: v.array(v.number()), // 0=Sun … 6=Sat
    startDate: v.string(), // "YYYY-MM-DD" — series anchor; never generates before this
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["active"])
    .index("by_title", ["title"]),

  checkIns: defineTable({
    date: v.string(), // "YYYY-MM-DD"
    timeOfDay: v.union(v.literal("morning"), v.literal("afternoon"), v.literal("night")),
    emotions: v.array(v.string()), // ordered 1–3, index 0 = loudest
    dayTypes: v.optional(v.array(v.string())), // e.g. Study/Music/Build day (legacy field)
    journal: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    // ── Check-In member fields ──
    energy: v.optional(v.number()), // 1–5 self-reported energy
    focus: v.optional(v.number()),  // 1–5 self-reported focus
  }).index("by_date", ["date"]),

  // ── Check-In member: when you *want* to be nudged, and how hard ──
  checkInRoutine: defineTable({
    morningTime: v.string(),   // "HH:MM" local
    afternoonTime: v.string(),
    nightTime: v.string(),
    nudgesEnabled: v.boolean(),
    updatedAt: v.number(),
  }),

  // Mirror of JobKompass job leads, synced via POST /jobLeads/sync.
  // `archived` / `archivedAt` are local-only. The sync upsert never sets or clears them,
  // so a resync cannot un-archive a lead. Archived rows stay in the table.
  jobLeads: defineTable({
    sourceLeadId: v.string(), // the jobLeads _id from jobkompass-v3, used as the upsert key
    company: v.string(),
    role: v.string(),
    sourceType: v.union(v.literal("personal_outreach"), v.literal("digest_listing")),
    status: v.string(),
    isFollowUp: v.optional(v.boolean()),
    emailReceivedAt: v.optional(v.number()), // when the email arrived in Gmail
    accountEmail: v.optional(v.string()), // which connected inbox received it
    updatedAt: v.number(),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
  }).index("by_source_lead", ["sourceLeadId"]),
});
