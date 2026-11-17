import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Savings goals for the dashboard card and its full-view editor.
 *
 * Auth matches the rest of this app: Clerk guards every page in proxy.ts, and
 * the Convex functions themselves do not add a second identity check.
 *
 * `target: null` on update clears the target (it was unknown, or no longer is).
 * Omitting `target` leaves it alone. The same null-vs-omit rule applies to notes.
 */

export const getSavingsGoals = query({
  args: {},
  handler: async (ctx) => {
    const goals = await ctx.db.query("savingsGoals").withIndex("by_order").collect();
    return goals.sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt - b.createdAt,
    );
  },
});

export const addSavingsGoal = mutation({
  args: {
    name: v.string(),
    target: v.optional(v.number()),
    current: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { name, target, current, notes }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Goal name cannot be empty");
    const trimmedNotes = notes?.trim();
    const now = Date.now();
    const existing = await ctx.db.query("savingsGoals").withIndex("by_order").collect();
    const maxOrder = existing.reduce((m, g) => Math.max(m, g.order ?? -1), -1);
    return await ctx.db.insert("savingsGoals", {
      name: trimmed,
      current: current ?? 0,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      ...(target !== undefined ? { target } : {}),
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    });
  },
});

export const updateSavingsGoal = mutation({
  args: {
    id: v.id("savingsGoals"),
    name: v.optional(v.string()),
    // null clears the target; omitting it leaves the stored value alone.
    target: v.optional(v.union(v.number(), v.null())),
    current: v.optional(v.number()),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { id, name, target, current, notes }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Savings goal not found");

    const patch: {
      name?: string;
      target?: number;
      current?: number;
      notes?: string;
      updatedAt?: number;
    } = {};

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Goal name cannot be empty");
      patch.name = trimmed;
    }
    if (target === null) patch.target = undefined;
    else if (target !== undefined) patch.target = target;
    if (current !== undefined) patch.current = current;
    if (notes === null) patch.notes = undefined;
    else if (notes !== undefined) {
      const trimmed = notes.trim();
      patch.notes = trimmed.length > 0 ? trimmed : undefined;
    }

    // Keys set to undefined still count — that is how a field gets cleared.
    if (Object.keys(patch).length === 0) return;
    patch.updatedAt = Date.now();
    await ctx.db.patch(id, patch);
  },
});

export const deleteSavingsGoal = mutation({
  args: { id: v.id("savingsGoals") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (existing) await ctx.db.delete(id);
  },
});
