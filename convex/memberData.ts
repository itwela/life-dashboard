import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { computeStreak, todoSummary, toDayKey, type CheckInLike, type TodoLike } from "./memberLogic";

/**
 * Data + mutations for the three dashboard assistant members.
 *
 * Kept in its own module (rather than bolted onto dashboard.ts) so each member
 * has one obvious backend home. Reads reuse the existing dashboard queries where
 * they already exist; everything here is either new or a cross-domain rollup.
 */

const DEFAULT_ROUTINE = {
  morningTime: "08:00",
  afternoonTime: "14:00",
  nightTime: "21:00",
  nudgesEnabled: true,
};

// ── Schedule member: recurring routines ───────────────────────────────────────

export const getRoutines = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("routines").withIndex("by_active", (q) => q.eq("active", true)).collect();
  },
});

export const addRoutine = mutation({
  args: {
    title: v.string(),
    days: v.array(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.title.trim().length === 0) throw new Error("Routine needs a title");
    if (args.days.length === 0) throw new Error("Pick at least one day");
    if (args.days.some((d) => d < 0 || d > 6)) throw new Error("Days must be 0 (Sun) – 6 (Sat)");
    return await ctx.db.insert("routines", {
      title: args.title.trim(),
      days: [...new Set(args.days)].sort((a, b) => a - b),
      startTime: args.startTime,
      endTime: args.endTime,
      category: args.category,
      location: args.location,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const setRoutineActive = mutation({
  args: { id: v.id("routines"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await ctx.db.patch(id, { active });
  },
});

export const deleteRoutine = mutation({
  args: { id: v.id("routines") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/**
 * Stamp today's routines onto the calendar as real events.
 * `source` is "manual" — the legacy vault re-seed is gone, so nothing will ever
 * wipe these rows. Existing same-title events on that date are skipped, so
 * tapping the button twice doesn't duplicate anything.
 */
export const logRoutinesToToday = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const routines = await ctx.db
      .query("routines")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const weekday = new Date(`${date}T12:00:00`).getDay();
    const due = routines.filter((r) => r.days.includes(weekday));
    if (due.length === 0) return { created: 0 };

    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    const taken = new Set(existing.map((e) => e.title.toLowerCase()));

    let created = 0;
    for (const r of due) {
      if (taken.has(r.title.toLowerCase())) continue;
      await ctx.db.insert("calendarEvents", {
        date,
        title: r.title,
        source: "manual",
        startTime: r.startTime,
        endTime: r.endTime,
        location: r.location,
        category: r.category,
        status: "todo",
      });
      created++;
    }
    return { created };
  },
});

// ── To-Do member: priority + due-date fields ──────────────────────────────────

export const addTodoDetailed = mutation({
  args: {
    text: v.string(),
    category: v.string(),
    dueDate: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (text.length === 0) throw new Error("To-do needs text");
    if (args.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(args.dueDate)) {
      throw new Error("dueDate must be YYYY-MM-DD");
    }
    const all = await ctx.db.query("todos").withIndex("by_order").collect();
    const maxOrder = all.reduce((m, t) => Math.max(m, t.order), 0);
    return await ctx.db.insert("todos", {
      text,
      category: args.category,
      done: false,
      order: maxOrder + 1,
      dueDate: args.dueDate,
      priority: args.priority ?? "medium",
      notes: args.notes,
    });
  },
});

/** Patch the member-owned fields without disturbing text/category/order. */
export const setTodoMeta = mutation({
  args: {
    id: v.id("todos"),
    dueDate: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { id, dueDate, priority, notes }) => {
    const patch: Record<string, unknown> = {};
    if (dueDate !== undefined) {
      if (dueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        throw new Error("dueDate must be YYYY-MM-DD or null");
      }
      patch.dueDate = dueDate === null ? undefined : dueDate;
    }
    if (priority !== undefined) patch.priority = priority;
    if (notes !== undefined) patch.notes = notes === null ? undefined : notes;
    await ctx.db.patch(id, patch);
  },
});

/** Toggle done and keep `completedAt` consistent with the flag. */
export const setTodoDoneDetailed = mutation({
  args: { id: v.id("todos"), done: v.boolean() },
  handler: async (ctx, { id, done }) => {
    await ctx.db.patch(id, { done, completedAt: done ? Date.now() : undefined });
  },
});

// ── Check-In member: preferences + insights ───────────────────────────────────

export const getCheckInRoutine = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("checkInRoutine").first();
    return row ?? null;
  },
});

export const saveCheckInRoutine = mutation({
  args: {
    morningTime: v.string(),
    afternoonTime: v.string(),
    nightTime: v.string(),
    nudgesEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    for (const t of [args.morningTime, args.afternoonTime, args.nightTime]) {
      if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(t)) throw new Error(`Bad time: ${t}`);
    }
    const row = await ctx.db.query("checkInRoutine").first();
    if (row) {
      await ctx.db.patch(row._id, { ...args, updatedAt: Date.now() });
      return row._id;
    }
    return await ctx.db.insert("checkInRoutine", { ...args, updatedAt: Date.now() });
  },
});

/** Everything the Check-In panel needs, in one round trip. */
export const getCheckInBoard = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const checkIns = await ctx.db.query("checkIns").withIndex("by_date").collect();
    const routine = (await ctx.db.query("checkInRoutine").first()) ?? DEFAULT_ROUTINE;
    // Field order mirrors the checkIns table so the payload is structurally
    // identical to Doc<"checkIns"> plus the two derived fields.
    const asLike: CheckInLike[] = checkIns.map((c) => ({
      date: c.date,
      timeOfDay: c.timeOfDay,
      emotions: c.emotions,
      journal: c.journal,
      tags: c.tags,
      createdAt: c.createdAt,
      energy: c.energy,
      focus: c.focus,
    }));
    return {
      // `_id` here is the date key, not a real Convex id — this board is keyed for
      // display, so it must NOT be typed as Id<"checkIns">. Mutations take a date.
      checkIns: asLike.map((c) => ({
        _id: c.date,
        _creationTime: c.createdAt,
        date: c.date,
        timeOfDay: c.timeOfDay,
        emotions: c.emotions,
        journal: c.journal,
        tags: c.tags,
        createdAt: c.createdAt,
        energy: c.energy,
        focus: c.focus,
      })),
      routine,
      streak: computeStreak(asLike, today),
    };
  },
});

/** Backfill energy/focus on an existing check-in (or the one for `date`). */
export const setCheckInMetrics = mutation({
  args: {
    date: v.string(),
    energy: v.optional(v.number()),
    focus: v.optional(v.number()),
  },
  handler: async (ctx, { date, energy, focus }) => {
    const clamp = (n?: number) =>
      typeof n === "number" ? Math.max(1, Math.min(5, Math.round(n))) : undefined;
    const existing = await ctx.db
      .query("checkIns")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();
    if (!existing) throw new Error(`No check-in for ${date}`);
    await ctx.db.patch(existing._id, { energy: clamp(energy), focus: clamp(focus) });
  },
});

// ── Daily briefing: the "how am I doing" rollup ───────────────────────────────

/**
 * One cross-domain read for the briefing card: today's schedule, open to-dos,
 * check-in streak, and the next concrete commitment.
 */
export const getBriefing = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const [allTodos, checkIns, events, routines, workouts] = await Promise.all([
      ctx.db.query("todos").withIndex("by_order").collect(),
      ctx.db.query("checkIns").withIndex("by_date").collect(),
      ctx.db.query("calendarEvents").withIndex("by_date", (q) => q.eq("date", today)).collect(),
      ctx.db.query("routines").withIndex("by_active", (q) => q.eq("active", true)).collect(),
      ctx.db.query("workouts").withIndex("by_date").collect(),
    ]);

    const asLike: CheckInLike[] = checkIns.map((c) => ({
      date: c.date,
      timeOfDay: c.timeOfDay,
      emotions: c.emotions,
      journal: c.journal,
      tags: c.tags,
      createdAt: c.createdAt,
      energy: c.energy,
      focus: c.focus,
    }));
    const todoLikes: TodoLike[] = allTodos.map((t) => ({
      text: t.text,
      category: t.category,
      done: t.done,
      order: t.order,
      priority: t.priority,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
    }));

    const openEvents = events.filter((e) => !e.done);
    const timed = openEvents
      .filter((e) => e.startTime)
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    const nextEvent = timed[0] ?? null;

    // Trailing 30-day workout count, matching how the fitness card reads.
    const workoutDays = new Set(workouts.map((w) => toDayKey(new Date(w.date))));
    const workedOutToday = workoutDays.has(today);

    return {
      date: today,
      events: openEvents.length,
      timedEvents: timed.length,
      allDayEvents: openEvents.length - timed.length,
      nextEvent: nextEvent
        ? {
            title: nextEvent.title,
            startTime: nextEvent.startTime,
            endTime: nextEvent.endTime,
            location: nextEvent.location,
          }
        : null,
      todos: todoSummary(todoLikes, today),
      streak: computeStreak(asLike, today),
      loggedToday: asLike.some((c) => c.date === today),
      routinesToday: routines.filter(
        (r) => r.days.includes(new Date(`${today}T12:00:00`).getDay()),
      ).length,
      workedOutToday,
      workoutDaysLast30: [...workoutDays].filter((d) => d <= today && d >= addDaysLocal(today, -29))
        .length,
    };
  },
});

function addDaysLocal(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + n);
  return toDayKey(dt);
}
