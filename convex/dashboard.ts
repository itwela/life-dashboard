import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ───────────────────────────────────────────────────────────────

export const getAccounts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("accounts").collect();
  },
});

export const getTransactions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_date")
      .order("desc")
      .take(30);
  },
});

export const getFinanceFiles = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db
      .query("financeFiles")
      .withIndex("by_added")
      .order("desc")
      .collect();
    return Promise.all(
      files.map(async (f) => ({
        ...f,
        url: await ctx.storage.getUrl(f.storageId),
      }))
    );
  },
});

export const getCourses = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("courses").collect();
  },
});

export const getSchoolProgress = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("schoolProgress").first();
    return doc;
  },
});

export const getBooks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("books").collect();
  },
});

export const getWorkouts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("workouts")
      .withIndex("by_date")
      .order("desc")
      .take(30);
  },
});

export const getWorkoutSchedule = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("workoutSchedule").first();
    return doc?.scheduleDays ?? [0, 2, 4, 5]; // default Sun, Tue, Thu, Fri
  },
});

export const getWorkoutMissedDays = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("workoutMissedDays").collect();
    return docs.map((d) => d.date);
  },
});

export const getContentPosts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contentPosts").collect();
  },
});

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

// ─── Internal (AI finance dump) ─────────────────────────────────────────────

export const upsertAccountsFromDump = internalMutation({
  args: {
    accounts: v.array(
      v.object({
        name: v.string(),
        type: v.union(
          v.literal("checking"),
          v.literal("savings"),
          v.literal("investment"),
          v.literal("debt"),
          v.literal("other")
        ),
        balance: v.number(),
        investmentType: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { accounts: toUpsert }) => {
    const now = Date.now();
    let updated = 0;
    for (const { name, type, balance, investmentType } of toUpsert) {
      const existing = await ctx.db.query("accounts").filter((q) => q.eq(q.field("name"), name)).first();
      const data = { type, balance, updatedAt: now, ...(investmentType != null && { investmentType }) };
      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("accounts", { name, type, balance, updatedAt: now, ...(investmentType != null && { investmentType }) });
      }
      updated++;
    }
    return updated;
  },
});

// ─── Mutations ─────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Profile avatar (uploadable, circular crop transform) ──
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const p = await ctx.db.query("profile").first();
    if (!p) return null;
    return { ...p, avatarUrl: p.avatarStorageId ? await ctx.storage.getUrl(p.avatarStorageId) : null };
  },
});

export const setAvatar = mutation({
  args: { avatarStorageId: v.id("_storage"), scale: v.number(), tx: v.number(), ty: v.number() },
  handler: async (ctx, args) => {
    const p = await ctx.db.query("profile").first();
    if (p) {
      if (p.avatarStorageId && p.avatarStorageId !== args.avatarStorageId) {
        await ctx.storage.delete(p.avatarStorageId);
      }
      await ctx.db.patch(p._id, args);
    } else {
      await ctx.db.insert("profile", args);
    }
  },
});

export const updateAvatarTransform = mutation({
  args: { scale: v.number(), tx: v.number(), ty: v.number() },
  handler: async (ctx, args) => {
    const p = await ctx.db.query("profile").first();
    if (p) await ctx.db.patch(p._id, args);
  },
});

// ── Records / documents (diploma, certs, IDs — personal record vault) ──
export const getDocuments = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("documents").withIndex("by_added").order("desc").collect();
    return Promise.all(docs.map(async (d) => ({ ...d, url: await ctx.storage.getUrl(d.storageId) })));
  },
});

export const saveDocument = mutation({
  args: {
    title: v.string(),
    category: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
    note: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("documents", { ...args, addedAt: Date.now() });
  },
});

export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (doc) {
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(id);
    }
  },
});

export const saveFinanceFile = mutation({
  args: {
    name: v.string(),
    storageId: v.id("_storage"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { name, storageId, notes }) => {
    await ctx.db.insert("financeFiles", {
      name,
      storageId,
      addedAt: Date.now(),
      notes,
    });
  },
});

export const deleteFinanceFile = mutation({
  args: { id: v.id("financeFiles") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (doc) {
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(id);
    }
  },
});

export const upsertAccount = mutation({
  args: {
    id: v.optional(v.id("accounts")),
    name: v.string(),
    type: v.union(
      v.literal("checking"),
      v.literal("savings"),
      v.literal("investment"),
      v.literal("debt"),
      v.literal("other")
    ),
    balance: v.number(),
    investmentType: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, type, balance, investmentType }) => {
    const now = Date.now();
    const data = { name, type, balance, updatedAt: now, ...(investmentType != null && { investmentType }) };
    if (id) {
      await ctx.db.patch(id, data);
    } else {
      await ctx.db.insert("accounts", { name, type, balance, updatedAt: now, ...(investmentType != null && { investmentType }) });
    }
  },
});

export const addTransaction = mutation({
  args: {
    label: v.string(),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.string(),
  },
  handler: async (ctx, { label, amount, type, category }) => {
    await ctx.db.insert("transactions", {
      label,
      amount,
      type,
      category,
      date: Date.now(),
    });
  },
});

export const upsertCourse = mutation({
  args: {
    id: v.optional(v.id("courses")),
    name: v.string(),
    creditUnits: v.number(),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, creditUnits, status, notes }) => {
    const now = Date.now();
    if (id) {
      const existing = await ctx.db.get(id);
      const completedDate =
        status === "completed" && existing?.status !== "completed" ? now : existing?.completedDate;
      const startDate =
        status === "in_progress" && existing?.status === "not_started" ? now : existing?.startDate;
      await ctx.db.patch(id, { name, creditUnits, status, notes, completedDate, startDate });
    } else {
      await ctx.db.insert("courses", {
        name,
        creditUnits,
        status,
        notes,
        startDate: status === "in_progress" ? now : undefined,
        completedDate: status === "completed" ? now : undefined,
      });
    }
  },
});

export const setSchoolProgress = mutation({
  args: {
    totalCU: v.number(),
    earnedCU: v.number(),
    activeCount: v.number(),
    termsCompleted: v.number(),
    termsTotal: v.number(),
  },
  handler: async (ctx, { totalCU, earnedCU, activeCount, termsCompleted, termsTotal }) => {
    const now = Date.now();
    const existing = await ctx.db.query("schoolProgress").first();
    const data = { totalCU, earnedCU, activeCount, termsCompleted, termsTotal, updatedAt: now };
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("schoolProgress", data);
    }
  },
});

// One-click seed for a new Convex project: your WGU courses + default school progress
const WGU_COURSES_SEED: { name: string; creditUnits: number; status: "completed" | "in_progress" | "not_started" }[] = [
  { name: "Natural Science Lab – C683", creditUnits: 2, status: "completed" },
  { name: "Orientation – ORA1", creditUnits: 0, status: "completed" },
  { name: "Introduction to IT – D322", creditUnits: 4, status: "not_started" },
  { name: "Introduction to Physical and Human Geography – D199", creditUnits: 3, status: "not_started" },
  { name: "American Politics and the US Constitution – C963", creditUnits: 3, status: "in_progress" },
  { name: "Web Development Foundations – D276", creditUnits: 3, status: "completed" },
  { name: "Technical Communication – D339", creditUnits: 3, status: "completed" },
  { name: "Scripting and Programming - Foundations – D278", creditUnits: 3, status: "completed" },
  { name: "Introduction to Programming in Python – D335", creditUnits: 3, status: "completed" },
  { name: "Health, Fitness, and Wellness – C458", creditUnits: 4, status: "completed" },
  { name: "Ethics in Technology – D333", creditUnits: 3, status: "completed" },
  { name: "Network and Security - Foundations – D315", creditUnits: 3, status: "not_started" },
  { name: "Front-End Web Development – D277", creditUnits: 3, status: "completed" },
  { name: "IT Leadership Foundations – D370", creditUnits: 3, status: "completed" },
  { name: "Applied Probability and Statistics – C955", creditUnits: 3, status: "completed" },
  { name: "Introduction to Systems Thinking – D372", creditUnits: 3, status: "completed" },
  { name: "JavaScript Programming – D280", creditUnits: 3, status: "completed" },
  { name: "Composition: Successful Self-Expression – D270", creditUnits: 3, status: "completed" },
  { name: "Applied Algebra – C957", creditUnits: 3, status: "in_progress" },
  { name: "Hardware and Operating Systems Essentials – D386", creditUnits: 3, status: "in_progress" },
  { name: "Cloud Foundations – D282", creditUnits: 3, status: "in_progress" },
  { name: "Version Control – D197", creditUnits: 1, status: "in_progress" },
  { name: "Data Management - Foundations – D426", creditUnits: 3, status: "not_started" },
  { name: "Data Management - Applications – D427", creditUnits: 4, status: "not_started" },
  { name: "Advanced Data Management – D326", creditUnits: 3, status: "not_started" },
  { name: "Data Structures and Algorithms I – C949", creditUnits: 4, status: "not_started" },
  { name: "Business of IT - Applications – D336", creditUnits: 4, status: "not_started" },
  { name: "Business of IT - Project Management – D324", creditUnits: 4, status: "not_started" },
  { name: "User Interface Design – D279", creditUnits: 3, status: "not_started" },
  { name: "User Experience Design – D479", creditUnits: 3, status: "not_started" },
  { name: "Software Engineering – D284", creditUnits: 4, status: "not_started" },
  { name: "Java Fundamentals – D286", creditUnits: 3, status: "not_started" },
  { name: "Java Frameworks – D287", creditUnits: 3, status: "not_started" },
  { name: "Back-End Programming – D288", creditUnits: 3, status: "not_started" },
  { name: "Advanced Java – D387", creditUnits: 3, status: "not_started" },
  { name: "Software Security and Testing – D385", creditUnits: 3, status: "not_started" },
  { name: "Software Design and Quality Assurance – D480", creditUnits: 3, status: "not_started" },
  { name: "Mobile Application Development (Android) – D308", creditUnits: 3, status: "not_started" },
  { name: "Software Engineering Capstone – D424", creditUnits: 4, status: "not_started" },
];

export const seedSchoolData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existingCourses = await ctx.db.query("courses").collect();
    for (const doc of existingCourses) {
      await ctx.db.delete(doc._id);
    }
    for (const c of WGU_COURSES_SEED) {
      await ctx.db.insert("courses", {
        name: c.name,
        creditUnits: c.creditUnits,
        status: c.status,
        startDate: c.status === "in_progress" ? now : undefined,
        completedDate: c.status === "completed" ? now : undefined,
      });
    }
    const existingProgress = await ctx.db.query("schoolProgress").first();
    if (!existingProgress) {
      await ctx.db.insert("schoolProgress", {
        totalCU: 119,
        earnedCU: 43,
        activeCount: 13,
        termsCompleted: 5,
        termsTotal: 11,
        updatedAt: now,
      });
    }
    return { courses: WGU_COURSES_SEED.length };
  },
});

export const upsertBook = mutation({
  args: {
    id: v.optional(v.id("books")),
    title: v.string(),
    author: v.string(),
    status: v.union(
      v.literal("want_to_read"),
      v.literal("reading"),
      v.literal("completed")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, title, author, status, notes }) => {
    const now = Date.now();
    if (id) {
      const existing = await ctx.db.get(id);
      const completedDate =
        status === "completed" && existing?.status !== "completed" ? now : existing?.completedDate;
      const startDate =
        status === "reading" && existing?.status === "want_to_read" ? now : existing?.startDate;
      await ctx.db.patch(id, { title, author, status, notes, completedDate, startDate });
    } else {
      await ctx.db.insert("books", {
        title,
        author,
        status,
        notes,
        startDate: status === "reading" ? now : undefined,
        completedDate: status === "completed" ? now : undefined,
      });
    }
  },
});

// ─── Todos (synced from the Obsidian vault Hub) ─────────────────────────────

export const getTodos = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("todos").withIndex("by_order").collect();
  },
});

export const seedTodos = mutation({
  args: {
    todos: v.array(
      v.object({
        text: v.string(),
        category: v.string(),
        done: v.boolean(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, { todos }) => {
    const existing = await ctx.db.query("todos").collect();
    for (const doc of existing) await ctx.db.delete(doc._id);
    for (const t of todos) await ctx.db.insert("todos", t);
    return { count: todos.length };
  },
});

export const toggleTodo = mutation({
  args: { id: v.id("todos"), done: v.boolean() },
  handler: async (ctx, { id, done }) => {
    await ctx.db.patch(id, { done });
  },
});

export const addTodo = mutation({
  args: { text: v.string(), category: v.string() },
  handler: async (ctx, { text, category }) => {
    const all = await ctx.db.query("todos").withIndex("by_order").collect();
    const maxOrder = all.reduce((m, t) => Math.max(m, t.order), -1);
    await ctx.db.insert("todos", { text, category, done: false, order: maxOrder + 1 });
  },
});

// Persist a new ordering: order = index in the provided id list
export const reorderTodos = mutation({
  args: { ids: v.array(v.id("todos")) },
  handler: async (ctx, { ids }) => {
    for (let i = 0; i < ids.length; i++) {
      await ctx.db.patch(ids[i], { order: i });
    }
  },
});

export const logWorkout = mutation({
  args: {
    exerciseType: v.string(),
    duration: v.number(),
    notes: v.optional(v.string()),
    date: v.optional(v.number()),
  },
  handler: async (ctx, { exerciseType, duration, notes, date }) => {
    const ts = date ?? Date.now();
    await ctx.db.insert("workouts", {
      date: ts,
      exerciseType,
      duration,
      notes,
    });
  },
});

export const setWorkoutSchedule = mutation({
  args: {
    scheduleDays: v.array(v.number()),
  },
  handler: async (ctx, { scheduleDays }) => {
    const existing = await ctx.db.query("workoutSchedule").first();
    const data = { scheduleDays, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("workoutSchedule", data);
    }
  },
});

export const addMissedDay = mutation({
  args: { date: v.number() },
  handler: async (ctx, { date }) => {
    const existing = await ctx.db
      .query("workoutMissedDays")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();
    if (!existing) await ctx.db.insert("workoutMissedDays", { date });
  },
});

export const removeMissedDay = mutation({
  args: { date: v.number() },
  handler: async (ctx, { date }) => {
    const doc = await ctx.db
      .query("workoutMissedDays")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();
    if (doc) await ctx.db.delete(doc._id);
  },
});

export const addContentPost = mutation({
  args: {
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
  },
  handler: async (ctx, { title, platform, type, status }) => {
    await ctx.db.insert("contentPosts", {
      title,
      platform,
      type,
      status,
      publishedDate: status === "published" ? Date.now() : undefined,
    });
  },
});

export const updateContentPost = mutation({
  args: {
    id: v.id("contentPosts"),
    status: v.union(
      v.literal("idea"),
      v.literal("in_progress"),
      v.literal("published")
    ),
    publishedDate: v.optional(v.number()),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, publishedDate, title, notes }) => {
    await ctx.db.patch(id, {
      status,
      publishedDate: status === "published" ? (publishedDate ?? Date.now()) : undefined,
      ...(title !== undefined && { title }),
      ...(notes !== undefined && { notes }),
    });
  },
});

export const upsertProject = mutation({
  args: {
    id: v.optional(v.id("projects")),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("shipped")
    ),
    revenue: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, description, status, revenue, notes }) => {
    if (id) {
      await ctx.db.patch(id, { name, description, status, revenue: revenue ?? 0, notes });
    } else {
      await ctx.db.insert("projects", { name, description, status, revenue: revenue ?? 0, notes });
    }
  },
});

// ─── Calendar (vault-derived + manual events) ────────────────────────────────

export const getCalendarEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("calendarEvents").withIndex("by_date").collect();
  },
});

export const addCalendarEvent = mutation({
  args: { date: v.string(), endDate: v.optional(v.string()), title: v.string(), note: v.optional(v.string()), link: v.optional(v.string()) },
  handler: async (ctx, { date, endDate, title, note, link }) => {
    await ctx.db.insert("calendarEvents", { date, endDate: endDate || undefined, title, note, link, source: "manual" });
  },
});

// Bulk insert (recurring events / habits) — one call instead of N.
export const addCalendarEventsBulk = mutation({
  args: {
    events: v.array(v.object({
      date: v.string(),
      title: v.string(),
      note: v.optional(v.string()),
      link: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { events }) => {
    for (const e of events) {
      await ctx.db.insert("calendarEvents", { ...e, source: "manual" });
    }
    return { inserted: events.length };
  },
});

export const deleteCalendarEvent = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Mark an event done/undone. It stays on the calendar (struck through) either way.
export const setCalendarEventDone = mutation({
  args: { id: v.id("calendarEvents"), done: v.boolean() },
  handler: async (ctx, { id, done }) => {
    await ctx.db.patch(id, { done });
  },
});

export const setCalendarEventStatus = mutation({
  args: {
    id: v.id("calendarEvents"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
  },
  handler: async (ctx, { id, status }) => {
    // keep `done` in sync so legacy views (grid dots, strikethrough) still work
    await ctx.db.patch(id, { status, done: status === "done" });
  },
});

// Edit an event: change its day (drag-drop reschedule) and/or its text. A vault-derived
// event that gets edited becomes "manual" so the next sync doesn't wipe the change.
export const updateCalendarEvent = mutation({
  args: {
    id: v.id("calendarEvents"),
    date: v.optional(v.string()),
    endDate: v.optional(v.string()),
    title: v.optional(v.string()),
    note: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, { id, date, endDate, title, note, link }) => {
    const patch: Record<string, unknown> = { source: "manual" };
    if (date !== undefined) patch.date = date;
    // Empty string clears the multi-day span back to a single-day event.
    if (endDate !== undefined) patch.endDate = endDate || undefined;
    if (title !== undefined) patch.title = title;
    if (note !== undefined) patch.note = note;
    if (link !== undefined) patch.link = link;
    await ctx.db.patch(id, patch);
  },
});

// Re-seed the vault-derived events (manual ones are left alone). Called by
// scripts/sync-calendar.mjs after parsing the Obsidian vault.
export const seedCalendarEvents = mutation({
  args: {
    events: v.array(
      v.object({
        date: v.string(),
        title: v.string(),
        note: v.optional(v.string()),
        link: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { events }) => {
    const existing = await ctx.db.query("calendarEvents").collect();
    // Preserve done state across re-sync: a recurring vault event you marked done on a
    // given day should stay done after the next sync, without being duplicated.
    const doneKeys = new Set(
      existing.filter((e) => e.source === "vault" && e.done).map((e) => `${e.date}|${e.title}`)
    );
    for (const doc of existing) {
      if (doc.source === "vault") await ctx.db.delete(doc._id);
    }
    for (const e of events) {
      const done = doneKeys.has(`${e.date}|${e.title}`) || undefined;
      await ctx.db.insert("calendarEvents", { ...e, source: "vault", done });
    }
    return { count: events.length };
  },
});
