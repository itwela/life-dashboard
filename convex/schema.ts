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
  }).index("by_order", ["order"]),

  checkIns: defineTable({
    date: v.string(), // "YYYY-MM-DD"
    timeOfDay: v.union(v.literal("morning"), v.literal("afternoon"), v.literal("night")),
    emotions: v.array(v.string()), // ordered 1–3, index 0 = loudest
    dayTypes: v.optional(v.array(v.string())), // e.g. Study/Music/Build day (legacy field)
    journal: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_date", ["date"]),

  // Read-only mirror of JobKompass job leads, synced via the /jobLeads/sync HTTP endpoint.
  jobLeads: defineTable({
    sourceLeadId: v.string(), // the jobLeads _id from jobkompass-v3, used as the upsert key
    company: v.string(),
    role: v.string(),
    sourceType: v.union(v.literal("personal_outreach"), v.literal("digest_listing")),
    status: v.string(),
    isFollowUp: v.optional(v.boolean()),
    emailReceivedAt: v.optional(v.number()), // when the email arrived in Gmail
    updatedAt: v.number(),
  }).index("by_source_lead", ["sourceLeadId"]),
});
